import React, { useEffect, useState } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { AppState, AppStateStatus, Text } from 'react-native';
import { api } from '../src/api/client';
import { DataProvider, useData } from '../src/context/DataContext';

const mockExpire = jest.fn();
const mockSocket = { on: jest.fn(), disconnect: jest.fn() };
jest.mock('../src/api/client', () => ({
  ...jest.requireActual('../src/api/client'),
  api: jest.fn(),
}));
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    session: { token: 'test-token' },
    baseUrl: 'https://school.example',
    expire: mockExpire,
  }),
}));
jest.mock('socket.io-client', () => ({ io: () => mockSocket }));

let screen: TestRenderer.ReactTestRenderer;
let current: ReturnType<typeof useData>;
let setDraft: (value: string) => void;
let appStateChanged: (state: AppStateStatus) => void;
let mounts: number;
let holdRequests: boolean;
let completeRequests: (() => void)[];
let vehicleName: string;
const loadingStates: boolean[] = [];

function Probe() {
  current = useData();
  const [draft, updateDraft] = useState('');
  setDraft = updateDraft;
  loadingStates.push(current.loading);
  useEffect(() => {
    mounts++;
  }, []);
  return <Text>{draft}</Text>;
}

beforeEach(() => {
  jest.useFakeTimers();
  mounts = 0;
  holdRequests = false;
  completeRequests = [];
  vehicleName = 'Morning bus';
  loadingStates.length = 0;
  mockExpire.mockReset();
  mockSocket.on.mockClear();
  mockSocket.disconnect.mockClear();
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_event, handler) => {
      appStateChanged = handler;
      return { remove: jest.fn() };
    });
  Object.defineProperty(AppState, 'currentState', {
    configurable: true,
    value: 'active',
    writable: true,
  });
  jest
    .mocked(api)
    .mockReset()
    .mockImplementation(async (_base, path) => {
      const value =
        path === '/vehicles'
          ? {
              vehicles: [
                {
                  id: 'bus-1',
                  imei: '123456789012345',
                  plate: 'DHAKA-123',
                  name: vehicleName,
                },
              ],
            }
          : path === '/locations'
          ? { devices: [] }
          : [];
      if (holdRequests)
        return new Promise(resolve => {
          completeRequests.push(() => resolve(value));
        });
      return value;
    });
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
  jest.restoreAllMocks();
  jest.useRealTimers();
});
async function renderProvider() {
  await act(async () => {
    screen = TestRenderer.create(
      <DataProvider>
        <Probe />
      </DataProvider>,
    );
  });
}
async function finishRequests() {
  await act(async () => {
    completeRequests.splice(0).forEach(finish => finish());
  });
}

it('updates automatically after 20 seconds without showing a spinner or resetting screen state', async () => {
  await renderProvider();
  expect(loadingStates[0]).toBe(true);
  expect(current.loading).toBe(false);
  await act(async () => setDraft('Unfinished form'));
  vehicleName = 'Updated bus';
  holdRequests = true;
  loadingStates.length = 0;
  await act(async () => {
    jest.advanceTimersByTime(20_000);
  });
  expect(current.loading).toBe(false);
  expect(current.data.vehicles[0].name).toBe('Morning bus');
  await finishRequests();
  expect(current.data.vehicles[0].name).toBe('Updated bus');
  expect(loadingStates).not.toContain(true);
  expect(mounts).toBe(1);
  expect(screen.root.findByType(Text).props.children).toBe('Unfinished form');
});

it('refreshes silently on returning to the app and ignores duplicate active events', async () => {
  await renderProvider();
  jest.mocked(api).mockClear();
  await act(async () => appStateChanged('active'));
  expect(api).not.toHaveBeenCalled();
  await act(async () => appStateChanged('background'));
  holdRequests = true;
  await act(async () => appStateChanged('active'));
  expect(api).toHaveBeenCalledTimes(11);
  expect(current.loading).toBe(false);
  await finishRequests();
  expect(current.loading).toBe(false);
});

it('still shows a loading indicator for an explicit pull-to-refresh', async () => {
  await renderProvider();
  holdRequests = true;
  let refreshing!: Promise<void>;
  await act(async () => {
    refreshing = current.refresh();
  });
  expect(current.loading).toBe(true);
  await finishRequests();
  await act(async () => refreshing);
  expect(current.loading).toBe(false);
});

it('refreshes data after saving without triggering the page loading indicator', async () => {
  await renderProvider();
  loadingStates.length = 0;
  await act(async () => {
    await current.mutate('/example', { note: 'Saved' });
  });
  expect(api).toHaveBeenCalledWith(
    'https://school.example',
    '/example',
    'test-token',
    { note: 'Saved' },
    'POST',
  );
  expect(loadingStates).not.toContain(true);
  expect(mounts).toBe(1);
});

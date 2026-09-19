import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { AppState } from 'react-native';
import { api } from '../src/api/client';
import {
  DataProvider,
  useCoreData,
  useData,
  useDataActions,
} from '../src/context/DataContext';
import {
  ManagementProvider,
  useManagement,
} from '../src/context/ManagementContext';

const mockExpire = jest.fn();
const mockSocket = { on: jest.fn(), disconnect: jest.fn() };
jest.mock('../src/api/client', () => ({ api: jest.fn() }));
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    session: { token: 'token' },
    baseUrl: 'https://school.example',
    expire: mockExpire,
  }),
}));
jest.mock('socket.io-client', () => ({ io: () => mockSocket }));

let screen: TestRenderer.ReactTestRenderer;
beforeEach(() => {
  jest.useFakeTimers();
  jest
    .spyOn(AppState, 'addEventListener')
    .mockReturnValue({ remove: jest.fn() });
  Object.defineProperty(AppState, 'currentState', {
    configurable: true,
    writable: true,
    value: 'active',
  });
  mockSocket.on.mockClear();
  jest
    .mocked(api)
    .mockReset()
    .mockImplementation(async (_base, path) => {
      // Return fresh JSON identities on every request, just like response.json().
      if (path === '/vehicles') return { vehicles: [] };
      if (path === '/locations') return { devices: [] };
      if (path === '/management/overview')
        return { students: [], settings: { businessName: 'School' } };
      return [];
    });
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
  jest.restoreAllMocks();
  jest.useRealTimers();
});

it('measures combined providers: 12 initial, 32 GETs/minute (baseline 36), no unchanged poll renders or GPS core renders', async () => {
  const renders = { core: 0, actions: 0, management: 0, legacy: 0 };
  function Core() {
    useCoreData();
    renders.core++;
    return null;
  }
  function Actions() {
    useDataActions();
    renders.actions++;
    return null;
  }
  function Management() {
    useManagement();
    renders.management++;
    return null;
  }
  function Legacy() {
    useData();
    renders.legacy++;
    return null;
  }
  await act(async () => {
    screen = TestRenderer.create(
      <DataProvider>
        <ManagementProvider>
          <Core />
          <Actions />
          <Management />
          <Legacy />
        </ManagementProvider>
      </DataProvider>,
    );
  });
  expect(api).toHaveBeenCalledTimes(12);
  const before = { ...renders };
  jest.mocked(api).mockClear();
  for (const total of [10, 20, 32]) {
    await act(async () => {
      jest.advanceTimersByTime(20_000);
    });
    expect(api).toHaveBeenCalledTimes(total);
    expect(renders).toEqual(before);
  }
  const update = mockSocket.on.mock.calls.find(
    ([event]) => event === 'location:update',
  )![1];
  for (let i = 0; i < 20; i++) {
    await act(async () =>
      update({
        imei: 'one',
        status: 'live',
        latitude: i,
        longitude: 90,
        lastSeen: String(i),
      }),
    );
  }
  expect(renders).toEqual({ ...before, legacy: before.legacy + 20 });
  await act(async () =>
    update({
      imei: 'one',
      status: 'live',
      latitude: 19,
      longitude: 90,
      lastSeen: '19',
    }),
  );
  expect(renders).toEqual({ ...before, legacy: before.legacy + 20 });
});

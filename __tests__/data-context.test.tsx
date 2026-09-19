import React, { useEffect, useState } from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { AppState, AppStateStatus, Text } from 'react-native';
import { api, ApiError } from '../src/api/client';
import {
  DataProvider,
  useData,
  useCoreData,
  useDataActions,
  useLocations,
} from '../src/context/DataContext';
import { Location } from '../src/api/types';

const mockExpire = jest.fn();
let mockToken: string | undefined = 'test-token';
let mockBaseUrl = 'https://school.example';
const mockSocket = { on: jest.fn(), disconnect: jest.fn() };
jest.mock('../src/api/client', () => ({
  ...jest.requireActual('../src/api/client'),
  api: jest.fn(),
}));
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    session: mockToken ? { token: mockToken } : null,
    baseUrl: mockBaseUrl,
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
let renders: number;
const loadingStates: boolean[] = [];

function Probe() {
  renders++;
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
  mockToken = 'test-token';
  mockBaseUrl = 'https://school.example';
  renders = 0;
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

it('keeps the context value stable when the parent rerenders without data changes', async () => {
  await renderProvider();
  const previous = current;
  await act(async () => {
    screen.update(
      <DataProvider>
        <Probe />
      </DataProvider>,
    );
  });
  expect(current).toBe(previous);
});

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

it('ignores a late 401 from an overview loaded under an old session', async () => {
  let rejectOld!: (error: Error) => void;
  jest.mocked(api).mockReturnValueOnce(
    new Promise((_resolve, reject) => {
      rejectOld = reject;
    }),
  );
  await renderProvider();
  mockToken = 'replacement-token';
  await act(async () =>
    screen.update(
      <DataProvider>
        <Probe />
      </DataProvider>,
    ),
  );
  await act(async () => rejectOld(new ApiError('Old session expired', 401)));
  expect(mockExpire).not.toHaveBeenCalled();
  expect(current.data.vehicles[0].name).toBe('Morning bus');
});

it('does not revoke auth when an old mutation fails after unmount', async () => {
  await renderProvider();
  let rejectWrite!: (error: Error) => void;
  jest.mocked(api).mockReturnValueOnce(
    new Promise((_resolve, reject) => {
      rejectWrite = reject;
    }),
  );
  let failure: unknown;
  const pending = current.mutate('/example', {}).catch(error => {
    failure = error;
  });
  await act(async () => screen.unmount());
  await act(async () => {
    rejectWrite(new ApiError('Old session expired', 401));
    await pending;
  });
  expect(failure).toBeInstanceOf(ApiError);
  expect(mockExpire).not.toHaveBeenCalled();
});

it('measures unchanged polls: 11 initial GETs, then 9/9/11, with zero consumer renders', async () => {
  await renderProvider();
  expect(api).toHaveBeenCalledTimes(11);
  const initialRenders = renders;
  const previous = current;
  for (const requests of [9, 9, 11]) {
    jest.mocked(api).mockClear();
    await act(async () => {
      jest.advanceTimersByTime(20_000);
    });
    expect(api).toHaveBeenCalledTimes(requests);
    expect(current).toBe(previous);
    expect(renders).toBe(initialRenders);
  }
});

it('coalesces overlapping timer polls and reuses the pending initial snapshot', async () => {
  holdRequests = true;
  await renderProvider();
  expect(api).toHaveBeenCalledTimes(11);
  await act(async () => {
    jest.advanceTimersByTime(60_000);
  });
  expect(api).toHaveBeenCalledTimes(11);
  await finishRequests();
  expect(current.loading).toBe(false);
  expect(current.data.vehicles[0].name).toBe('Morning bus');
});

it('manual refresh and mutation refresh bypass every cached configuration endpoint', async () => {
  await renderProvider();
  jest.mocked(api).mockClear();
  await act(async () => current.refresh());
  expect(api).toHaveBeenCalledTimes(11);
  jest.mocked(api).mockClear();
  await act(async () => current.mutate('/example', {}));
  expect(api).toHaveBeenCalledTimes(12); // one write plus all eleven reads
});

it('post-mutation refresh supersedes a pending poll and cannot publish pre-write data', async () => {
  await renderProvider();
  holdRequests = true;
  await act(async () => {
    jest.advanceTimersByTime(20_000);
  });
  const old = completeRequests.splice(0);
  holdRequests = false;
  vehicleName = 'Saved bus';
  await act(async () => current.mutate('/example', {}));
  expect(current.data.vehicles[0].name).toBe('Saved bus');
  await act(async () => {
    old.forEach(finish => finish());
  });
  expect(current.data.vehicles[0].name).toBe('Saved bus');
});

it('preserves data on poll failure, clears the error on recovery, and expires current 401s', async () => {
  await renderProvider();
  const previous = current.data;
  jest.mocked(api).mockRejectedValueOnce(new Error('Connection lost'));
  await act(async () => {
    jest.advanceTimersByTime(20_000);
  });
  expect(current.data).toBe(previous);
  expect(current.error).toBe('Connection lost');
  expect(current.loading).toBe(false);
  await act(async () => {
    jest.advanceTimersByTime(20_000);
  });
  expect(current.error).toBe('');
  jest.mocked(api).mockRejectedValueOnce(new ApiError('Expired', 401));
  await act(async () => current.refresh());
  expect(mockExpire).toHaveBeenCalledTimes(1);
});

const point: Location = {
  imei: '123456789012345',
  status: 'live',
  latitude: 23,
  longitude: 90,
  lastSeen: '2026-09-19T10:00:00Z',
};
function socketUpdate() {
  return mockSocket.on.mock.calls
    .filter(([event]) => event === 'location:update')
    .slice(-1)[0][1] as (location: Location) => void;
}

it('measures socket renders: core/actions 0, legacy/locations 1 per change, duplicates 0', async () => {
  const counts = { core: 0, actions: 0, locations: 0, legacy: 0 };
  let core!: ReturnType<typeof useCoreData>;
  function Core() {
    core = useCoreData();
    counts.core++;
    return null;
  }
  function Actions() {
    useDataActions();
    counts.actions++;
    return null;
  }
  function Locations() {
    useLocations();
    counts.locations++;
    return null;
  }
  function Legacy() {
    current = useData();
    counts.legacy++;
    return null;
  }
  await act(async () => {
    screen = TestRenderer.create(
      <DataProvider>
        <Core />
        <Actions />
        <Locations />
        <Legacy />
      </DataProvider>,
    );
  });
  expect(core.data).not.toHaveProperty('locations');
  const before = { ...counts };
  for (let i = 0; i < 10; i++) {
    await act(async () => socketUpdate()({ ...point, latitude: 23 + i }));
  }
  expect(counts).toEqual({
    core: before.core,
    actions: before.actions,
    locations: before.locations + 10,
    legacy: before.legacy + 10,
  });
  const changed = { ...counts };
  await act(async () => socketUpdate()({ ...point, latitude: 32 }));
  expect(counts).toEqual(changed);
  expect(current.data.locations[0].latitude).toBe(32);
});

it('does not overwrite socket events arriving during a dashboard request', async () => {
  await renderProvider();
  holdRequests = true;
  await act(async () => {
    jest.advanceTimersByTime(20_000);
  });
  await act(async () => socketUpdate()(point));
  await finishRequests();
  expect(current.data.locations).toEqual([point]);
  // A subsequent authoritative snapshot can remove a device.
  holdRequests = false;
  await act(async () => {
    jest.advanceTimersByTime(20_000);
  });
  expect(current.data.locations).toEqual([]);
});

it('does not poll or apply sockets in background, and reloads all resources on foreground', async () => {
  await renderProvider();
  jest.mocked(api).mockClear();
  AppState.currentState = 'background';
  await act(async () => {
    appStateChanged('background');
    jest.advanceTimersByTime(60_000);
    socketUpdate()(point);
  });
  expect(api).not.toHaveBeenCalled();
  expect(current.data.locations).toEqual([]);
  AppState.currentState = 'active';
  await act(async () => appStateChanged('active'));
  expect(api).toHaveBeenCalledTimes(11);
});

it.each(['token', 'server'] as const)(
  'isolates cached data, callbacks, and sockets when %s changes',
  async field => {
    await renderProvider();
    const oldActions = current;
    const oldSocket = socketUpdate();
    holdRequests = true;
    if (field === 'token') mockToken = 'replacement-token';
    else mockBaseUrl = 'https://other.example';
    jest.mocked(api).mockClear();
    await act(async () =>
      screen.update(
        <DataProvider>
          <Probe />
        </DataProvider>,
      ),
    );
    expect(current.data.vehicles).toEqual([]);
    expect(current.loading).toBe(true);
    expect(api).toHaveBeenCalledTimes(11);
    await act(async () => oldSocket(point));
    expect(current.data.locations).toEqual([]);
    await expect(oldActions.mutate('/example', {})).rejects.toThrow(
      'Please sign in again.',
    );
    await act(async () => oldActions.refresh());
    expect(api).toHaveBeenCalledTimes(11);
    await finishRequests();
  },
);

it('does not request or mutate without a session', async () => {
  mockToken = undefined;
  await renderProvider();
  expect(api).not.toHaveBeenCalled();
  expect(current.loading).toBe(false);
  await expect(current.mutate('/example', {})).rejects.toThrow(
    'Please sign in again.',
  );
});

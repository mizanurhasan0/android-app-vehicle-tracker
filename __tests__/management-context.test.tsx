import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { AppState, Text } from 'react-native';
import { api, ApiError } from '../src/api/client';
import { ManagementOverview } from '../src/api/management';
import {
  ManagementProvider,
  useManagement,
} from '../src/context/ManagementContext';

const mockExpire = jest.fn();
const mockRefreshCore = jest.fn();
let mockToken: string | undefined = 'first-token';
jest.mock('../src/api/client', () => ({
  ...jest.requireActual('../src/api/client'),
  api: jest.fn(),
}));
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    session: mockToken ? { token: mockToken } : null,
    baseUrl: 'https://school.example',
    expire: mockExpire,
  }),
}));
jest.mock('../src/context/DataContext', () => ({
  useData: () => ({ refresh: mockRefreshCore }),
}));
let screen: TestRenderer.ReactTestRenderer;
let current: ReturnType<typeof useManagement>;
function Probe() {
  current = useManagement();
  return <Text>{current.data?.settings.businessName || ''}</Text>;
}
const overview = (name: string): ManagementOverview => ({
  students: [],
  drivers: [],
  attendance: [],
  maintenance: [],
  ledger: [],
  notices: [],
  requests: [],
  schedules: [],
  settings: {
    businessName: name,
    phone: '',
    address: '',
    emergencyPhone: '',
    whatsappNumber: '',
    paymentReminder: '',
    absenceMessage: '',
    delayMessage: '',
    holidayMessage: '',
    emergencyMessage: '',
  },
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
async function render() {
  await act(async () => {
    screen = TestRenderer.create(
      <ManagementProvider>
        <Probe />
      </ManagementProvider>,
    );
  });
}
beforeEach(() => {
  jest.useFakeTimers();
  mockToken = 'first-token';
  mockExpire.mockReset().mockResolvedValue(undefined);
  mockRefreshCore.mockReset().mockResolvedValue(undefined);
  jest.mocked(api).mockReset().mockResolvedValue(overview('First school'));
  jest
    .spyOn(AppState, 'addEventListener')
    .mockReturnValue({ remove: jest.fn() });
  Object.defineProperty(AppState, 'currentState', {
    configurable: true,
    value: 'active',
    writable: true,
  });
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
  jest.restoreAllMocks();
  jest.useRealTimers();
});

it('preserves loaded data when a background refresh fails without showing a blocking spinner', async () => {
  await render();
  const previous = current.data;
  jest.mocked(api).mockRejectedValueOnce(new Error('Connection lost'));
  await act(async () => {
    jest.advanceTimersByTime(20_000);
  });
  expect(current.data).toBe(previous);
  expect(current.error).toBe('Connection lost');
  expect(current.loading).toBe(false);
  expect(mockExpire).not.toHaveBeenCalled();
});
it('refreshes core and management data after a mutation and returns the saved result', async () => {
  await render();
  jest
    .mocked(api)
    .mockResolvedValueOnce({ id: 'saved' })
    .mockResolvedValueOnce(overview('Updated school'));
  let result: unknown;
  await act(async () => {
    result = await current.mutate('/admin/notices', { title: 'Notice' });
  });
  expect(result).toEqual({ id: 'saved' });
  expect(api).toHaveBeenCalledWith(
    'https://school.example',
    '/admin/notices',
    'first-token',
    { title: 'Notice' },
    'POST',
  );
  expect(mockRefreshCore).toHaveBeenCalledTimes(1);
  expect(current.data?.settings.businessName).toBe('Updated school');
  expect(current.loading).toBe(false);
});
it('revokes the current session when overview or mutation receives 401', async () => {
  jest.mocked(api).mockRejectedValueOnce(new ApiError('Expired', 401));
  await render();
  expect(mockExpire).toHaveBeenCalledTimes(1);
  mockExpire.mockClear();
  jest.mocked(api).mockRejectedValueOnce(new ApiError('Expired', 401));
  await act(async () => {
    await expect(current.mutate('/admin/notices', {})).rejects.toThrow(
      'Expired',
    );
  });
  expect(mockExpire).toHaveBeenCalledTimes(1);
});
it('ignores a late overview response when a newer refresh has completed', async () => {
  await render();
  const older = deferred<ManagementOverview>();
  jest
    .mocked(api)
    .mockReturnValueOnce(older.promise)
    .mockResolvedValueOnce(overview('Latest'));
  let pending!: Promise<void>;
  await act(async () => {
    pending = current.refresh();
  });
  await act(async () => current.refresh());
  await act(async () => {
    older.resolve(overview('Stale'));
    await pending;
  });
  expect(current.data?.settings.businessName).toBe('Latest');
});
it('does not revoke a replacement session when an old overview returns 401', async () => {
  const first = deferred<ManagementOverview>();
  jest.mocked(api).mockReturnValueOnce(first.promise);
  await render();
  mockToken = 'replacement-token';
  jest.mocked(api).mockResolvedValueOnce(overview('Replacement school'));
  await act(async () =>
    screen.update(
      <ManagementProvider>
        <Probe />
      </ManagementProvider>,
    ),
  );
  await act(async () => first.reject(new ApiError('Old session expired', 401)));
  expect(mockExpire).not.toHaveBeenCalled();
  expect(current.data?.settings.businessName).toBe('Replacement school');
});
it('does not revoke auth after provider unmount', async () => {
  const first = deferred<ManagementOverview>();
  jest.mocked(api).mockReturnValueOnce(first.promise);
  await render();
  await act(async () => screen.unmount());
  await act(async () => first.reject(new ApiError('Expired', 401)));
  expect(mockExpire).not.toHaveBeenCalled();
});
it('does not refresh old credentials after an in-flight mutation completes during an auth change', async () => {
  await render();
  const write = deferred<{ id: string }>();
  jest.mocked(api).mockReturnValueOnce(write.promise);
  let pending!: Promise<{ id: string }>;
  await act(async () => {
    pending = current.mutate('/admin/notices', {});
  });
  mockToken = 'replacement-token';
  jest.mocked(api).mockResolvedValue(overview('Replacement school'));
  await act(async () =>
    screen.update(
      <ManagementProvider>
        <Probe />
      </ManagementProvider>,
    ),
  );
  jest.mocked(api).mockClear();
  await act(async () => {
    write.resolve({ id: 'saved' });
    await pending;
  });
  expect(mockRefreshCore).not.toHaveBeenCalled();
  expect(api).not.toHaveBeenCalled();
  expect(current.data?.settings.businessName).toBe('Replacement school');
});
it('does not load or mutate without an authenticated session', async () => {
  mockToken = undefined;
  await render();
  expect(current.loading).toBe(false);
  expect(current.data).toBeNull();
  await expect(current.mutate('/admin/notices', {})).rejects.toThrow(
    'Please sign in again.',
  );
  expect(api).not.toHaveBeenCalled();
});

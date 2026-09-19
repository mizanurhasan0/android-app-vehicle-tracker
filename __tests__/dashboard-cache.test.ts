import { api } from '../src/api/client';
import { createDashboardLoader, CONFIG_CACHE_MS } from '../src/api/dashboard';

jest.mock('../src/api/client', () => ({ api: jest.fn() }));
const response = (path: string) =>
  path === '/vehicles'
    ? { vehicles: [] }
    : path === '/locations'
    ? { devices: [] }
    : [];
beforeEach(() => {
  jest.useFakeTimers();
  jest
    .mocked(api)
    .mockReset()
    .mockImplementation(async (_base, path) => response(path));
});
afterEach(() => jest.useRealTimers());

it('bounds configuration age without caching billing, permissions, notification, or vehicle state', async () => {
  const load = createDashboardLoader('https://school.example', 'token');
  await load();
  jest.mocked(api).mockClear();
  jest.advanceTimersByTime(CONFIG_CACHE_MS - 1);
  await load();
  expect(jest.mocked(api).mock.calls.map(call => call[1])).toEqual([
    '/vehicles',
    '/locations',
    '/subscriptions',
    '/payments/monthly',
    '/payments/submissions',
    '/requests/mine',
    '/complaints',
    '/stop-requests',
    '/notifications',
  ]);
  jest.advanceTimersByTime(1);
  jest.mocked(api).mockClear();
  await load();
  expect(api).toHaveBeenCalledTimes(11);
});

it('does not share caches between provider sessions or servers', async () => {
  await createDashboardLoader('https://one.example', 'token')();
  await createDashboardLoader('https://one.example', 'token')();
  await createDashboardLoader('https://two.example', 'token')();
  expect(api).toHaveBeenCalledTimes(33);
});

it('failed full snapshots do not seed cache; forced failures invalidate old configuration', async () => {
  const load = createDashboardLoader('https://school.example', 'token');
  jest.mocked(api).mockRejectedValueOnce(new Error('offline'));
  await expect(load()).rejects.toThrow('offline');
  jest.mocked(api).mockClear();
  await load();
  expect(api).toHaveBeenCalledTimes(11);
  jest.mocked(api).mockRejectedValueOnce(new Error('write refresh failed'));
  await expect(load(true)).rejects.toThrow('write refresh failed');
  jest.mocked(api).mockClear();
  await load();
  expect(api).toHaveBeenCalledTimes(11);
});

it('an obsolete successful request cannot overwrite configuration fetched after a mutation', async () => {
  const load = createDashboardLoader('https://school.example', 'token');
  let resolveOld!: (value: unknown) => void;
  jest.mocked(api).mockImplementation(async (_base, path) => {
    if (path === '/routes')
      return new Promise(resolve => {
        resolveOld = resolve;
      });
    return response(path);
  });
  const old = load();
  jest
    .mocked(api)
    .mockImplementation(async (_base, path) =>
      path === '/routes' ? [{ id: 'saved' }] : response(path),
    );
  await load(true);
  resolveOld([{ id: 'old' }]);
  await old;
  const result = await load();
  expect(result.routes).toEqual([{ id: 'saved' }]);
});

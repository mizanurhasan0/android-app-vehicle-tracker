import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { useVehicleHistory } from '../src/hooks/useVehicleHistory';
import { api, ApiError } from '../src/api/client';
const mockExpire = jest.fn();
let mockRole = 'ADMIN';
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    baseUrl: 'https://server.test',
    session: { token: 'secret', user: { role: mockRole } },
    expire: mockExpire,
  }),
}));
jest.mock('../src/api/client', () => ({
  api: jest.fn(),
  ApiError: jest.requireActual('../src/api/client').ApiError,
}));
const mockedApi = api as jest.Mock;
let latest: ReturnType<typeof useVehicleHistory>;
function Fixture({ imei }: { imei: string }) {
  latest = useVehicleHistory(
    imei,
    '2026-09-04T18:00:00Z',
    '2026-09-05T18:00:00Z',
  );
  return null;
}
beforeEach(() => {
  mockRole = 'ADMIN';
  mockedApi.mockReset();
  mockExpire.mockReset();
});
it('does not query for guardians', async () => {
  mockRole = 'GUARDIAN';
  let screen!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    screen = TestRenderer.create(<Fixture imei="123" />);
  });
  expect(mockedApi).not.toHaveBeenCalled();
  expect(latest.error).toContain('administrators');
  await act(async () => screen.unmount());
});
it('aborts old requests and ignores late completion after selecting another device', async () => {
  const pending: { resolve: (value: unknown) => void; signal: AbortSignal }[] =
    [];
  mockedApi.mockImplementation(
    (...args: unknown[]) =>
      new Promise(resolve =>
        pending.push({ resolve, signal: args[5] as AbortSignal }),
      ),
  );
  let screen!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    screen = TestRenderer.create(<Fixture imei="123" />);
  });
  await act(async () => screen.update(<Fixture imei="456" />));
  expect(pending[0].signal.aborted).toBe(true);
  await act(async () => {
    pending[2].resolve({ imei: '456' });
    pending[3].resolve({ imei: '456' });
  });
  await act(async () => {
    pending[0].resolve({ imei: '123' });
    pending[1].resolve({ imei: '123' });
  });
  expect(latest.route?.imei).toBe('456');
  await act(async () => screen.unmount());
  expect(pending[2].signal.aborted).toBe(true);
});
it('shows storage outage distinctly and expires invalid sessions', async () => {
  mockedApi.mockRejectedValue(new ApiError('Offline', 503));
  let screen!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    screen = TestRenderer.create(<Fixture imei="123" />);
  });
  expect(latest.error).toContain('storage is temporarily unavailable');
  mockedApi.mockRejectedValue(new ApiError('Expired', 401));
  await act(async () => latest.retry());
  expect(mockExpire).toHaveBeenCalledTimes(1);
  await act(async () => screen.unmount());
});

it('retains daily summaries when a dense route exceeds the display bound', async () => {
  mockedApi.mockImplementation((_base: string, path: string) =>
    path.includes('/summary')
      ? Promise.resolve({ days: [{ date: '2026-09-05' }] })
      : Promise.reject(new ApiError('Dense route', 413)),
  );
  let screen!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    screen = TestRenderer.create(<Fixture imei="123" />);
  });
  expect(latest.summary?.days).toHaveLength(1);
  expect(latest.error).toContain('individual day');
  await act(async () => screen.unmount());
});

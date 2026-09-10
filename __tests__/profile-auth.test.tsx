import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import * as Keychain from 'react-native-keychain';
import { api, ApiError } from '../src/api/client';
import { DEFAULT_SERVER_URL } from '../src/api/server';
import { AuthProvider, useAuth } from '../src/context/AuthContext';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) =>
      key === 'transport.server'
        ? require('../src/api/server').DEFAULT_SERVER_URL
        : '1',
    ),
    setItem: jest.fn(),
  },
}));
jest.mock('react-native-keychain', () => ({
  getGenericPassword: jest.fn(),
  setGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
}));
jest.mock('../src/api/client', () => ({
  ...jest.requireActual('../src/api/client'),
  api: jest.fn(),
}));
const original = {
  id: 'user-1',
  name: 'Original name',
  phone: '01700000001',
  role: 'ADMIN' as const,
  verified: 1,
};
let auth: ReturnType<typeof useAuth>;
let screen: TestRenderer.ReactTestRenderer;
function Probe() {
  auth = useAuth();
  return null;
}
beforeEach(async () => {
  jest.clearAllMocks();
  jest.mocked(Keychain.getGenericPassword).mockResolvedValue({
    username: 'session',
    password: JSON.stringify({ token: 'token-1', user: original }),
    service: 'transport.session',
    storage: 'test',
  } as never);
  jest.mocked(api).mockResolvedValue(original);
  await act(async () => {
    screen = TestRenderer.create(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
  });
});
afterEach(async () => {
  await act(async () => screen.unmount());
});
it('persists the trimmed name through the API and updates the current profile', async () => {
  jest.mocked(api).mockResolvedValueOnce({ ...original, name: 'New name' });
  await act(async () => {
    await auth.updateProfile({ name: '  New name  ' });
  });
  expect(api).toHaveBeenLastCalledWith(
    DEFAULT_SERVER_URL,
    '/auth/me',
    'token-1',
    { name: 'New name' },
    'PATCH',
  );
  expect(auth.session?.user.name).toBe('New name');
  expect(auth.session?.user.phone).toBe(original.phone);
});
it('rejects invalid names without sending a request and preserves the profile on server error', async () => {
  jest.mocked(api).mockClear();
  await expect(auth.updateProfile({ name: ' ' })).rejects.toThrow(
    'Enter a name between 2 and 80 characters.',
  );
  expect(api).not.toHaveBeenCalled();
  jest.mocked(api).mockRejectedValueOnce(new Error('Offline'));
  await act(async () => {
    await expect(auth.updateProfile({ name: 'New name' })).rejects.toThrow(
      'Offline',
    );
  });
  expect(auth.session?.user.name).toBe(original.name);
});
it('does not restore a signed-out session when an older profile request finishes', async () => {
  let finish!: (value: unknown) => void;
  jest.mocked(api).mockImplementationOnce(
    () =>
      new Promise(resolve => {
        finish = resolve;
      }),
  );
  let pending!: Promise<void>;
  await act(async () => {
    pending = auth.updateProfile({ name: 'New name' });
  });
  await act(async () => {
    await auth.signOut();
  });
  await act(async () => {
    finish({ ...original, name: 'New name' });
    await pending;
  });
  expect(auth.session).toBeNull();
});
it('expires an unauthorized session after profile update rejection', async () => {
  jest.mocked(api).mockRejectedValueOnce(new ApiError('Expired', 401));
  await act(async () => {
    await expect(auth.updateProfile({ name: 'New name' })).rejects.toThrow(
      'Expired',
    );
  });
  expect(auth.session).toBeNull();
  expect(Keychain.resetGenericPassword).toHaveBeenCalled();
});

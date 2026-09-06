import {
  DEFAULT_SERVER_URL,
  normalizeServerUrl,
  restoredServerUrl,
} from '../src/api/server';

describe('deployed server configuration', () => {
  const originalDev = __DEV__;
  afterEach(() => {
    (globalThis as any).__DEV__ = originalDev;
  });

  it('uses the VPS for fresh installs and upgrades the old emulator address', () => {
    expect(restoredServerUrl(null, false)).toBe(DEFAULT_SERVER_URL);
    expect(restoredServerUrl('http://10.0.2.2:3000/', false)).toBe(
      DEFAULT_SERVER_URL,
    );
  });
  it('preserves a deliberately selected local server after the upgrade', () => {
    (globalThis as any).__DEV__ = true;
    expect(restoredServerUrl('http://10.0.2.2:3000', true)).toBe(
      'http://10.0.2.2:3000',
    );
  });
  it('preserves custom HTTPS servers', () => {
    expect(restoredServerUrl('https://school.example/', false)).toBe(
      'https://school.example',
    );
  });
  it('allows the deployed HTTP origin in release but rejects other HTTP origins', () => {
    (globalThis as any).__DEV__ = false;
    expect(normalizeServerUrl(DEFAULT_SERVER_URL)).toBe(DEFAULT_SERVER_URL);
    expect(() => normalizeServerUrl('http://school.example')).toThrow('HTTPS');
    expect(() => normalizeServerUrl('http://147.79.71.98:4000')).toThrow(
      'HTTPS',
    );
  });
  it.each([
    'http://user:secret@147.79.71.98:3000',
    'http://147.79.71.98:3000/auth/login',
    'http://147.79.71.98:3000?token=secret',
  ])('rejects credentials, paths and queries: %s', value => {
    expect(() => normalizeServerUrl(value)).toThrow();
  });
});

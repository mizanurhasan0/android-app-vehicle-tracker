export const DEFAULT_SERVER_URL = 'http://147.79.71.98:3000';

export function normalizeServerUrl(value: string): string {
  const url = new URL(value.trim());
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname !== '/' && url.pathname !== '')
  ) {
    throw new Error(
      'Enter the server origin, for example https://tracker.example.com',
    );
  }
  if (
    !__DEV__ &&
    url.protocol !== 'https:' &&
    url.origin !== DEFAULT_SERVER_URL
  )
    throw new Error('Use an HTTPS server for the release app');
  return url.origin;
}
// Upgrade the old emulator default once; retain deliberately selected custom servers.
export function restoredServerUrl(
  saved: string | null,
  migrated: boolean,
): string {
  if (!saved) return DEFAULT_SERVER_URL;
  const origin = new URL(saved.trim()).origin;
  if (
    !migrated &&
    [
      'http://10.0.2.2:3000',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
    ].includes(origin)
  ) {
    return DEFAULT_SERVER_URL;
  }
  return normalizeServerUrl(saved);
}

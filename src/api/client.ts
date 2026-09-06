export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
  }
}
export { normalizeServerUrl } from './server';
export async function api<T>(
  baseUrl: string,
  path: string,
  token?: string,
  body?: unknown,
  method = 'GET',
  signal?: AbortSignal,
): Promise<T> {
  const abort = new AbortController();
  const cancel = () => abort.abort();
  signal?.addEventListener('abort', cancel);
  if (signal?.aborted) abort.abort();
  const timer = setTimeout(() => abort.abort(), 15_000);
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      signal: abort.signal,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    if (response.status === 204) return undefined as T;
    const data = await response.json();
    if (!response.ok)
      throw new ApiError(
        Array.isArray(data.message)
          ? data.message.join('\n')
          : data.message || 'Something went wrong. Please try again.',
        response.status,
      );
    return data as T;
  } catch (error) {
    if (signal?.aborted) throw error;
    if (error instanceof ApiError) throw error;
    throw new Error(
      'Cannot reach the server. Check your connection and server address, then try again.',
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

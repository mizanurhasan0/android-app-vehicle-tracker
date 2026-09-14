export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly fieldErrors: Record<string, string> = {},
  ) {
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
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      const fieldErrors: Record<string, string> = {};
      if (response.status === 400 && Array.isArray(data?.message)) {
        for (const message of data.message) {
          if (typeof message !== 'string') continue;
          const field = message.match(/^([A-Za-z][\w.]*)\s/);
          if (field) fieldErrors[field[1]] = 'Check this value and try again.';
        }
      }
      const knownFields: Record<string, string[]> = {
        'IMEI is already assigned': ['imei'],
        'This phone number is already registered': ['phone'],
        'Phone number or password is incorrect': ['phone', 'password'],
        'Future bills cannot be generated': ['month'],
        'bKash number must have 11 digits': ['number'],
        'bKash sender number must have 11 digits': ['senderNumber'],
        'This transaction ID has already been submitted': ['transactionId'],
        'No fare is configured for this boarding and destination pair': [
          'dropoffStopId',
        ],
        'Select a destination to use the configured journey fare': [
          'dropoffStopId',
        ],
      };
      if (response.status < 500 && typeof data?.message === 'string') {
        for (const field of knownFields[data.message] || [])
          fieldErrors[field] = data.message;
      }
      throw new ApiError(
        response.status >= 500
          ? 'The server could not complete this request. Please try again shortly.'
          : Array.isArray(data?.message) && Object.keys(fieldErrors).length
          ? 'Please check the highlighted fields.'
          : typeof data?.message === 'string'
          ? data.message
          : 'Something went wrong. Please try again.',
        response.status,
        fieldErrors,
      );
    }
    if (data === null)
      throw new ApiError(
        'The server returned an unexpected response. Please try again.',
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

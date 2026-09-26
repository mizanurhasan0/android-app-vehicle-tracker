import { api, ApiError } from '../src/api/client';

const mockFetch = jest.fn();
const originalFetch = global.fetch;
beforeEach(() => {
  global.fetch = mockFetch;
  mockFetch.mockReset();
});
afterEach(() => {
  global.fetch = originalFetch;
});
function reply(status: number, body: unknown) {
  mockFetch.mockResolvedValue({
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  });
}
async function failure() {
  try {
    await api('https://school.example', '/admin/students', 'token', {}, 'POST');
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    return error as ApiError;
  }
  throw new Error('Expected an API failure');
}
it('maps validation arrays into named red fields and a readable toast summary', async () => {
  reply(400, {
    message: [
      'studentName must be longer than or equal to 2 characters',
      'dropoffStopId must be a UUID',
      42,
    ],
  });
  const error = await failure();
  expect(error.status).toBe(400);
  expect(error.message).toBe('Please check the highlighted fields.');
  expect(error.fieldErrors).toEqual({
    studentName: 'Check this value and try again.',
    dropoffStopId: 'Check this value and try again.',
  });
});
it.each([
  ['Phone number or password is incorrect', ['phone', 'password']],
  ['This transaction ID has already been submitted', ['transactionId']],
])('identifies the affected fields for %s', async (message, fields) => {
  reply(400, { message });
  const error = await failure();
  expect(error.message).toBe(message);
  expect(error.fieldErrors).toEqual(
    Object.fromEntries(fields.map(field => [field, message])),
  );
});
it('renames legacy server journey terms before showing them', async () => {
  reply(400, {
    message: 'No fare is configured for this boarding and destination pair',
  });
  const error = await failure();
  expect(error.message).toBe(
    'No fare is configured for this start and end point pair.',
  );
  expect(error.fieldErrors).toEqual({
    dropoffStopId: 'No fare is configured for this start and end point pair.',
  });
});
it('keeps ordinary server error context without inventing a field association', async () => {
  reply(409, {
    message: 'Generate previous month bills before changing this fare',
  });
  const error = await failure();
  expect(error.message).toBe(
    'Generate previous month bills before changing this fare',
  );
  expect(error.fieldErrors).toEqual({});
});
it.each([500, 502])(
  'presents a recoverable message for a %i failure without leaking server details',
  async status => {
    reply(status, { message: 'SQL connection password and stack trace' });
    const error = await failure();
    expect(error.message).toBe(
      'The server could not complete this request. Please try again shortly.',
    );
    expect(error.fieldErrors).toEqual({});
  },
);
it.each([
  [
    502,
    'The server could not complete this request. Please try again shortly.',
  ],
  [200, 'The server returned an unexpected response. Please try again.'],
])(
  'handles non-JSON HTTP %i responses as readable feedback',
  async (status, message) => {
    mockFetch.mockResolvedValue({
      status,
      ok: status === 200,
      json: async () => {
        throw new SyntaxError('Unexpected token <');
      },
    });
    expect((await failure()).message).toBe(message);
  },
);
it('keeps network errors readable for a retry', async () => {
  mockFetch.mockRejectedValue(new TypeError('Network request failed'));
  await expect(api('https://school.example', '/routes')).rejects.toThrow(
    'Cannot reach the server. Check your connection and server address, then try again.',
  );
});

export type FieldErrors = Record<string, string>;

export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

/** A recoverable form error that identifies the controls needing attention. */
export class ValidationError extends Error {
  constructor(
    public readonly fieldErrors: FieldErrors,
    message = Object.values(fieldErrors)[0] ||
      'Please check the highlighted fields.',
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function getFieldErrors(problem: unknown): FieldErrors {
  if (!problem || typeof problem !== 'object' || !('fieldErrors' in problem))
    return {};
  const fields = problem.fieldErrors;
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return {};
  return Object.fromEntries(
    Object.entries(fields).filter(
      (entry): entry is [string, string] =>
        typeof entry[1] === 'string' && !!entry[1],
    ),
  );
}

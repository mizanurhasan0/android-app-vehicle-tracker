/** Preserve references for equal JSON subtrees, including key deletion and array order. */
export function structuralShare<T>(previous: T, next: T): T {
  if (Object.is(previous, next)) return previous;
  if (
    !previous ||
    !next ||
    typeof previous !== 'object' ||
    typeof next !== 'object' ||
    Array.isArray(previous) !== Array.isArray(next)
  )
    return next;
  const old = previous as Record<string, unknown>;
  const incoming = next as Record<string, unknown>;
  const keys = Object.keys(incoming);
  let equal = Object.keys(old).length === keys.length;
  const result: Record<string, unknown> = Array.isArray(next)
    ? ([] as unknown as Record<string, unknown>)
    : {};
  for (const key of keys) {
    const value = structuralShare(old[key], incoming[key]);
    // defineProperty also handles a JSON key named __proto__ without changing prototypes.
    Object.defineProperty(result, key, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
    if (!Object.prototype.hasOwnProperty.call(old, key) || value !== old[key])
      equal = false;
  }
  return equal ? previous : (result as T);
}

/** Bangladesh local calendar date, independent of the device's timezone. */
export const DHAKA_OFFSET_MS = 6 * 60 * 60_000;

export function dhakaDate(instant = Date.now()): string {
  return new Date(instant + DHAKA_OFFSET_MS).toISOString().slice(0, 10);
}

export type HistoryPeriod = 'day' | 'week' | 'month';
const DAY = 86_400_000;
const OFFSET = 6 * 60 * 60_000;
export const dhakaDate = (instant = Date.now()) =>
  new Date(instant + OFFSET).toISOString().slice(0, 10);
export function parseDay(day: string): number {
  const value = Date.parse(`${day}T00:00:00.000Z`);
  if (
    !/^(20)\d{2}-\d{2}-\d{2}$/.test(day) ||
    !Number.isFinite(value) ||
    new Date(value).toISOString().slice(0, 10) !== day
  )
    throw new Error('Enter a valid date from 2000–2099 as YYYY-MM-DD.');
  return value;
}
export function historyRange(day: string, period: HistoryPeriod) {
  const date = new Date(parseDay(day));
  if (period === 'week')
    date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  if (period === 'month') date.setUTCDate(1);
  const start = date.getTime();
  if (period === 'month') date.setUTCMonth(date.getUTCMonth() + 1);
  else date.setUTCDate(date.getUTCDate() + (period === 'week' ? 7 : 1));
  return {
    from: new Date(start - OFFSET).toISOString(),
    to: new Date(date.getTime() - OFFSET).toISOString(),
    label: `${new Date(start).toISOString().slice(0, 10)} — ${new Date(
      date.getTime() - DAY,
    )
      .toISOString()
      .slice(0, 10)}`,
  };
}
export function shiftPeriod(
  day: string,
  period: HistoryPeriod,
  direction: number,
) {
  const d = new Date(parseDay(day));
  if (period === 'month') {
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + direction);
  } else d.setUTCDate(d.getUTCDate() + direction * (period === 'week' ? 7 : 1));
  return new Date(
    Math.max(
      Date.UTC(2000, 0, 1),
      Math.min(Date.UTC(2099, 11, 31), d.getTime()),
    ),
  )
    .toISOString()
    .slice(0, 10);
}
export const historyTime = (value: string) =>
  new Date(value).toLocaleString('en-GB', {
    timeZone: 'Asia/Dhaka',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

export const money = (poisha: number) =>
  `৳${(poisha / 100).toLocaleString('en-BD', { maximumFractionDigits: 2 })}`;
export const readable = (value: string) =>
  value
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/^./, letter => letter.toUpperCase());
export const currentMonth = () =>
  new Date(Date.now() + 6 * 60 * 60_000).toISOString().slice(0, 7);
export function toPoisha(value: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim()))
    throw new Error('Enter an amount with up to two decimal places.');
  const [whole, fraction = ''] = value.trim().split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(result) || result <= 0 || result > 100_000_000)
    throw new Error('Enter an amount between ৳0.01 and ৳1,000,000.');
  return result;
}
export function dateLabel(value: string) {
  return new Date(value).toLocaleString('en-BD', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

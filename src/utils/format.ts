import { i18n, locale } from '../i18n';

export const numberLabel = (value: number, decimals?: number) =>
  value.toLocaleString(locale(), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals ?? 2,
  });
export const normalizeDigits = (value: string) =>
  value.replace(/[০-৯]/g, digit => String(digit.charCodeAt(0) - 0x09e6));

export const money = (poisha: number) => `৳${numberLabel(poisha / 100)}`;
const statusLabels: Record<string, string> = {
  PENDING: 'Awaiting review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  UNPAID: 'Unpaid',
  PAID: 'Paid',
  ACTIVE: 'Active',
  STOPPED: 'Stopped',
  OPEN: 'Open',
  RESOLVED: 'Resolved',
  NEW: 'New',
  live: 'Live',
  lastKnown: 'Last known',
  waiting: 'Waiting',
  offline: 'Offline',
  BKASH: 'bKash',
  ROCKET: 'Rocket',
  LATE_PICKUP: 'Late pickup',
  DRIVER_BEHAVIOUR: 'Driver behaviour',
  VEHICLE_SAFETY: 'Vehicle safety',
  PAYMENT: 'Payment',
  OTHER: 'Other',
};
export const readable = (value: string) => {
  const label = statusLabels[value];
  return label
    ? i18n.t(label)
    : value
        .toLowerCase()
        .replace(/_/g, ' ')
        .replace(/^./, letter => letter.toUpperCase());
};
export const currentMonth = () =>
  new Date(Date.now() + 6 * 60 * 60_000).toISOString().slice(0, 7);
export function toPoisha(value: string): number {
  value = normalizeDigits(value);
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim()))
    throw new Error('Enter an amount with up to two decimal places.');
  const [whole, fraction = ''] = value.trim().split('.');
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(result) || result <= 0 || result > 100_000_000)
    throw new Error('Enter an amount between ৳0.01 and ৳1,000,000.');
  return result;
}
export function dateLabel(value: string) {
  return new Date(value).toLocaleString(locale(), {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

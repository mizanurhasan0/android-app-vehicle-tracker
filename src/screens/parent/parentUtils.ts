import { RouteSchedule, Student } from '../../api/management';
import { locale } from '../../i18n';

/** Only dial a phone number: never allow user content to create another URI. */
export function contactUrl(phone: string, kind: 'call' | 'sms' | 'whatsapp') {
  const digits = phone.replace(/[\s()-]/g, '');
  if (!/^\+?\d{7,15}$/.test(digits)) {
    throw new Error('Enter a valid phone number.');
  }
  if (kind === 'whatsapp') {
    const international = digits.startsWith('01')
      ? `88${digits}`
      : digits.replace(/^\+/, '');
    return `https://wa.me/${international}`;
  }
  return `${kind === 'call' ? 'tel' : 'sms'}:${digits}`;
}

export function studentSchedule(
  schedules: RouteSchedule[],
  student: Student,
  period: RouteSchedule['period'],
) {
  return schedules
    .filter(
      item =>
        item.routeId === student.routeId &&
        item.period === period &&
        (!item.studentId || item.studentId === student.id) &&
        (!item.stopId || item.stopId === student.stopId),
    )
    .sort((a, b) => a.position - b.position || a.time.localeCompare(b.time));
}

export function dhakaDate(now = Date.now()) {
  return new Date(now + 6 * 60 * 60_000).toISOString().slice(0, 10);
}

export function parentDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00+06:00`);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString(locale(), {
        timeZone: 'Asia/Dhaka',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : value;
}

export function billingMonthLabel(value: string) {
  const date = new Date(`${value}-01T00:00:00+06:00`);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString(locale(), {
        timeZone: 'Asia/Dhaka',
        year: 'numeric',
        month: 'long',
      })
    : value;
}

export function scheduleTimeLabel(value: string) {
  const date = new Date(`2000-01-01T${value}:00+06:00`);
  return Number.isFinite(date.getTime())
    ? date.toLocaleTimeString(locale(), {
        timeZone: 'Asia/Dhaka',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      })
    : value;
}

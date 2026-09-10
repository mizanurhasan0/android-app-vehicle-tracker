import { RouteSchedule, Student } from '../../api/management';

/** Only dial a phone number: never allow user content to create another URI. */
export function contactUrl(phone: string, kind: 'call' | 'sms' | 'whatsapp') {
  const digits = phone.replace(/[\s()-]/g, '');
  if (!/^\+?\d{7,15}$/.test(digits)) {
    throw new Error('সঠিক ফোন নম্বর দেওয়া হয়নি।');
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

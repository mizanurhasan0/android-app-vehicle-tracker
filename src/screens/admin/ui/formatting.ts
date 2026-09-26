import { i18n, locale } from '../../../i18n';
import { dhakaDate } from '../../../utils/dates';
import { readable } from '../../../utils/format';

export const today = dhakaDate;

export const niceDate = (date?: string | null) =>
  date
    ? new Date(
        date.length === 10 ? `${date}T00:00:00+06:00` : date,
      ).toLocaleDateString(locale(), {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Dhaka',
      })
    : '—';

const adminStatusLabels: Record<string, string> = {
  INACTIVE: 'Inactive',
  STOPPED: 'Inactive',
  UNPAID: 'Due',
  WAIVED: 'Waived',
  PRESENT: 'Present',
  ABSENT: 'Absent',
  LEAVE: 'Leave',
  PENDING: 'Pending',
  COMPLETED: 'Completed',
  RUNNING: 'Running',
  MAINTENANCE: 'Maintenance',
  PLANNED: 'Planned',
  IN_PROGRESS: 'In progress',
  ARCHIVED: 'Archived',
};

export const labelStatus = (value: string) => {
  if (Object.prototype.hasOwnProperty.call(adminStatusLabels, value))
    return i18n.t(adminStatusLabels[value]);
  return [
    'ACTIVE',
    'PAID',
    'APPROVED',
    'REJECTED',
    'OPEN',
    'RESOLVED',
    'NEW',
  ].includes(value)
    ? readable(value)
    : value;
};

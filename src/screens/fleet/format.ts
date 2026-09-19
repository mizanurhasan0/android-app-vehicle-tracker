import { locale } from '../../i18n';

export function fleetDate(value?: string | null) {
  if (!value) return value;
  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00+06:00` : value,
  );
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString(locale(), {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Dhaka',
      });
}

export function scheduleTime(value: string) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return value;
  return new Date(`2000-01-01T${value}:00+06:00`).toLocaleTimeString(locale(), {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Dhaka',
  });
}

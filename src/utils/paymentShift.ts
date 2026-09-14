import { TransportShift } from '../api/management';
import { i18n } from '../i18n';
import { DEFAULT_SHIFTS } from './transport';

export function paymentShiftLabel(
  record: { shiftId?: string },
  shifts: TransportShift[] = DEFAULT_SHIFTS,
): string {
  if (!record.shiftId) return '';
  const shift = shifts.find(item => item.id === record.shiftId);
  return i18n.t(shift?.name || record.shiftId);
}

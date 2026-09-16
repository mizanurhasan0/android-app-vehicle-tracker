import { BusinessSettings, TransportShift } from '../api/management';

export const ALL_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
export const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];
export const WEEKDAY_SHORT_NAMES = [
  'SUN',
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
  'SAT',
];
export const DEFAULT_SHIFTS: TransportShift[] = [
  { id: 'MORNING', name: 'Morning', startTime: '07:00', endTime: '11:00' },
  { id: 'DAY', name: 'Day', startTime: '11:00', endTime: '15:00' },
  { id: 'EVENING', name: 'Evening', startTime: '15:00', endTime: '19:00' },
];
export const transportShifts = (settings?: Partial<BusinessSettings>) =>
  settings?.transportShifts?.length ? settings.transportShifts : DEFAULT_SHIFTS;
export const defaultOperatingDays = (settings?: Partial<BusinessSettings>) =>
  settings?.operatingDays ?? [0, 1, 2, 3, 4, 6];
export const serviceDays = (service: { operatingDays?: number[] }) =>
  service.operatingDays ?? ALL_WEEKDAYS;
export const serviceShift = (service: { shiftId?: string }) =>
  service.shiftId || 'MORNING';
export const studentIdentity = (student: { id: string; studentId?: string }) =>
  student.studentId || student.id;
export function uniqueStudents<T extends { id: string; studentId?: string }>(
  students: T[],
): T[] {
  return [
    ...new Map(
      students.map(student => [studentIdentity(student), student]),
    ).values(),
  ];
}
export function isServiceScheduled(
  service: { operatingDays?: number[] },
  date: Date | string,
  institutionDays?: number[],
): boolean {
  const day =
    typeof date === 'string'
      ? new Date(`${date}T00:00:00Z`).getUTCDay()
      : date.getDay();
  return (
    serviceDays(service).includes(day) &&
    (!institutionDays || institutionDays.includes(day))
  );
}
type Enrollment = {
  id: string;
  studentId?: string;
  studentName: string;
  guardianPhone?: string;
  shiftId?: string;
  operatingDays?: number[];
  status: string;
};
export function enrollmentConflicts(
  enrollments: Enrollment[],
  selection: {
    studentId?: string;
    studentName: string;
    guardianPhone?: string;
    shiftId: string;
    operatingDays: number[];
    excludeId?: string;
  },
  shifts: TransportShift[],
) {
  const sameStudent = enrollments.filter(
    item =>
      item.id !== selection.excludeId &&
      ['PENDING', 'ACTIVE'].includes(item.status) &&
      (selection.studentId && item.studentId
        ? item.studentId === selection.studentId
        : item.studentName.trim().toLocaleLowerCase() ===
            selection.studentName.trim().toLocaleLowerCase() &&
          (!selection.guardianPhone ||
            item.guardianPhone === selection.guardianPhone)),
  );
  const duplicate = sameStudent.some(
    item => serviceShift(item) === selection.shiftId,
  );
  const chosen = shifts.find(shift => shift.id === selection.shiftId);
  const overlap =
    !!chosen &&
    sameStudent.some(item => {
      const other = shifts.find(shift => shift.id === serviceShift(item));
      return (
        other &&
        other.id !== chosen.id &&
        selection.operatingDays.some(day => serviceDays(item).includes(day)) &&
        chosen.startTime < other.endTime &&
        other.startTime < chosen.endTime
      );
    });
  return { duplicate, overlap };
}
export function scheduleValidation(
  shiftId: string,
  days: number[],
  shifts: TransportShift[],
  duplicate: boolean,
): Record<string, string> {
  return {
    ...(!shifts.some(shift => shift.id === shiftId)
      ? { shiftId: 'Select a transport shift.' }
      : {}),
    ...(duplicate
      ? {
          shiftId:
            'This student already has a pending request or active service in this shift.',
        }
      : {}),
    ...(!days.length
      ? { operatingDays: 'Select at least one travel day.' }
      : {}),
  };
}

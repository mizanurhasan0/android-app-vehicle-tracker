import {
  DEFAULT_SHIFTS,
  defaultOperatingDays,
  enrollmentConflicts,
  isServiceScheduled,
  scheduleValidation,
  uniqueStudents,
} from '../src/utils/transport';

const enrollment = {
  id: 'morning-service',
  studentId: 'child',
  studentName: 'A Student',
  guardianPhone: '01700000001',
  shiftId: 'MORNING',
  operatingDays: [0, 1],
  status: 'ACTIVE',
};
const selection = {
  studentId: 'child',
  studentName: 'A Student',
  shiftId: 'DAY',
  operatingDays: [1],
};
it('allows another shift but blocks active/pending duplicates regardless of route or weekdays', () => {
  expect(
    enrollmentConflicts([enrollment], selection, DEFAULT_SHIFTS).duplicate,
  ).toBe(false);
  expect(
    enrollmentConflicts(
      [{ ...enrollment, status: 'PENDING' }],
      { ...selection, shiftId: 'MORNING', operatingDays: [3] },
      DEFAULT_SHIFTS,
    ).duplicate,
  ).toBe(true);
  expect(
    enrollmentConflicts(
      [{ ...enrollment, status: 'STOPPED' }],
      { ...selection, shiftId: 'MORNING' },
      DEFAULT_SHIFTS,
    ).duplicate,
  ).toBe(false);
  expect(
    enrollmentConflicts(
      [enrollment],
      { ...selection, shiftId: 'MORNING', excludeId: enrollment.id },
      DEFAULT_SHIFTS,
    ).duplicate,
  ).toBe(false);
});
it('keeps different canonical students with the same name separate', () => {
  expect(
    enrollmentConflicts(
      [enrollment],
      { ...selection, studentId: 'other-child', shiftId: 'MORNING' },
      DEFAULT_SHIFTS,
    ).duplicate,
  ).toBe(false);
});
it('warns only when time windows and travel days overlap', () => {
  const shifts = DEFAULT_SHIFTS.map(shift =>
    shift.id === 'DAY' ? { ...shift, startTime: '10:00' } : shift,
  );
  expect(enrollmentConflicts([enrollment], selection, shifts).overlap).toBe(
    true,
  );
  expect(
    enrollmentConflicts(
      [enrollment],
      { ...selection, operatingDays: [3] },
      shifts,
    ).overlap,
  ).toBe(false);
  expect(
    enrollmentConflicts([enrollment], selection, DEFAULT_SHIFTS).overlap,
  ).toBe(false);
});
it('uses institute defaults for new service days and preserves legacy all-week schedules', () => {
  expect(defaultOperatingDays({ operatingDays: [1, 3] })).toEqual([1, 3]);
  expect(defaultOperatingDays()).not.toContain(5);
  expect(isServiceScheduled({}, '2026-09-18')).toBe(true);
  expect(isServiceScheduled({}, '2026-09-18', [0, 1, 2, 3, 4, 6])).toBe(false);
  expect(isServiceScheduled({ operatingDays: [1] }, '2026-09-14', [1])).toBe(
    true,
  );
  expect(isServiceScheduled({ operatingDays: [2] }, '2026-09-14', [1])).toBe(
    false,
  );
});
it('requires a configured shift and at least one selected day', () => {
  expect(
    scheduleValidation('REMOVED', [], DEFAULT_SHIFTS, false),
  ).toHaveProperty('shiftId');
  expect(
    scheduleValidation('MORNING', [], DEFAULT_SHIFTS, false),
  ).toHaveProperty('operatingDays');
});
it('groups enrollments by canonical student and preserves distinct legacy profiles', () => {
  expect(
    uniqueStudents([
      enrollment,
      { ...enrollment, id: 'day-service' },
      { ...enrollment, id: 'legacy', studentId: undefined },
    ]),
  ).toHaveLength(2);
});

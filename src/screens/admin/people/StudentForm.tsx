import { TransportSchedule } from '../../../components/TransportSchedule';
import {
  defaultOperatingDays,
  enrollmentConflicts,
  scheduleValidation,
  serviceDays,
  serviceShift,
  studentIdentity,
  transportShifts,
  uniqueStudents,
} from '../../../utils/transport';
import React, { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import {
  Student,
  StudentCreateResult,
  StudentInput,
} from '../../../api/management';
import { useManagement } from '../../../context/ManagementContext';
import { useCoreData } from '../../../context/DataContext';
import { useTranslation } from '../../../i18n';
import { money } from '../../../utils/format';
import { journeyFare, journeyDestinations } from '../../../utils/routeFares';
import { ValidationError } from '../../../utils/validation';
import { pickStudentPhoto } from '../../../utils/photo';
import {
  Choice,
  Detail,
  FormModal,
  Heading,
  Input,
  SmallButton,
  s,
  useAction,
} from '../AdminUi';
import { validatedAmount } from './validatedAmount';
import { StudentPhoto } from './StudentPhoto';

type StudentFormValue = {
  studentId?: string;
  vehicleId: string;
  shiftId: string;
  operatingDays: number[];
  studentName: string;
  studentCode: string;
  className: string;
  roll: string;
  guardianName: string;
  guardianPhone: string;
  pickupAddress: string;
  dropAddress: string;
  emergencyContact: string;
  routeId: string;
  stopId: string;
  dropoffStopId: string;
  amount: string;
  photoUrl: string;
  status: Student['status'];
};

const blankStudent = (): StudentFormValue => ({
  studentId: undefined,
  vehicleId: '',
  shiftId: 'MORNING',
  operatingDays: defaultOperatingDays(),
  studentName: '',
  studentCode: '',
  className: '',
  roll: '',
  guardianName: '',
  guardianPhone: '',
  pickupAddress: '',
  dropAddress: '',
  emergencyContact: '',
  routeId: '',
  stopId: '',
  dropoffStopId: '',
  amount: '',
  photoUrl: '',
  status: 'ACTIVE',
});

export function StudentForm({
  visible,
  student,
  existingStudent,
  onClose,
}: {
  visible: boolean;
  student?: Student;
  existingStudent?: Student;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { data: transport } = useCoreData();
  const { mutate, data: management } = useManagement();
  const shifts = transportShifts(management?.settings);
  const profiles = uniqueStudents(
    [...transport.requests, ...(management?.students || [])].filter(
      item => item.studentId,
    ),
  );
  const action = useAction();
  const [form, setForm] = useState(blankStudent);
  const addingService = !!existingStudent && !student;
  useEffect(() => {
    if (visible) {
      action.clearFeedback();
      const source = student || existingStudent;
      setForm(
        source
          ? {
              studentId: source.studentId,
              vehicleId: source.vehicleId,
              shiftId: student
                ? serviceShift(source)
                : shifts.find(
                    shift =>
                      !(management?.students || []).some(
                        item =>
                          studentIdentity(item) === studentIdentity(source) &&
                          item.status === 'ACTIVE' &&
                          serviceShift(item) === shift.id,
                      ),
                  )?.id || shifts[0].id,
              operatingDays: student
                ? serviceDays(source)
                : defaultOperatingDays(management?.settings),
              studentName: source.studentName,
              studentCode: source.studentCode,
              className: source.className,
              roll: source.roll,
              guardianName: source.guardianName,
              guardianPhone: source.guardianPhone,
              pickupAddress: source.pickupAddress,
              dropAddress: source.dropAddress,
              emergencyContact: source.emergencyContact,
              routeId: source.routeId,
              stopId: source.stopId,
              dropoffStopId: source.dropoffStopId || '',
              amount: String(source.monthlyAmount / 100),
              photoUrl: source.photoUrl,
              status: student ? source.status : 'ACTIVE',
            }
          : {
              ...blankStudent(),
              shiftId: shifts[0].id,
              operatingDays: defaultOperatingDays(management?.settings),
            },
      );
    }
  }, [visible, student?.id, existingStudent?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof StudentFormValue>(
    key: K,
    value: StudentFormValue[K],
  ) => {
    action.clearFieldError(key);
    if (key === 'amount') action.clearFieldError('monthlyAmount');
    setForm(current => ({ ...current, [key]: value }));
  };
  const conflicts = enrollmentConflicts(
    [...(management?.students || []), ...transport.requests],
    { ...form, excludeId: student?.id },
    shifts,
  );
  const vehicles = Array.from(
    new Map(
      [
        ...transport.vehicles.map(item => [item.id, item.name] as const),
        ...transport.routes.map(
          item => [item.vehicleId, item.vehicleName] as const,
        ),
      ].filter(([id]) => !!id),
    ),
  ).map(([id, name]) => ({ id, name }));
  const availableRoutes = form.vehicleId
    ? transport.routes.filter(item => item.vehicleId === form.vehicleId)
    : [];
  const selectedRoute = transport.routes.find(item => item.id === form.routeId);
  const sameJourney =
    !!student &&
    student.routeId === form.routeId &&
    student.stopId === form.stopId &&
    (student.dropoffStopId || '') === form.dropoffStopId;
  const configuredAmount = journeyFare(
    selectedRoute,
    form.stopId,
    form.dropoffStopId,
  );
  const assignedAmount = sameJourney ? student.monthlyAmount : configuredAmount;
  const destinations = journeyDestinations(selectedRoute, form.stopId);
  if (
    sameJourney &&
    student.dropoffStopId &&
    !destinations.some(stop => stop.id === student.dropoffStopId)
  ) {
    destinations.push({
      id: student.dropoffStopId,
      name: student.dropoffStopName || student.dropoffStopId,
    });
  }
  const save = () =>
    action.run(async () => {
      const { amount, dropoffStopId, guardianName, vehicleId, ...rest } = form;
      if (
        !form.studentName.trim() ||
        !form.guardianPhone.trim() ||
        !vehicleId ||
        !form.routeId ||
        !form.stopId
      )
        throw new ValidationError({
          ...(!form.studentName.trim()
            ? { studentName: 'Enter the student name.' }
            : {}),
          ...(!form.guardianPhone.trim()
            ? { guardianPhone: 'Enter the guardian mobile number.' }
            : {}),
          ...(!vehicleId ? { vehicleId: 'Select a vehicle.' } : {}),
          ...(!form.routeId ? { routeId: 'Select a route.' } : {}),
          ...(!form.stopId ? { stopId: 'Select a start point.' } : {}),
        });
      if (form.dropoffStopId && !sameJourney && configuredAmount === undefined)
        throw new ValidationError({
          dropoffStopId:
            'No fare is configured for this journey. Select another end point.',
        });
      const scheduleErrors = scheduleValidation(
        form.shiftId,
        form.operatingDays,
        shifts,
        conflicts.duplicate,
      );
      if (Object.keys(scheduleErrors).length)
        throw new ValidationError(scheduleErrors);
      const input: StudentInput = {
        ...rest,
        studentName: form.studentName.trim(),
        guardianPhone: form.guardianPhone.trim(),
        ...(!student && guardianName.trim()
          ? { guardianName: guardianName.trim() }
          : {}),
        dropoffStopId: dropoffStopId || null,
        ...(!dropoffStopId
          ? { monthlyAmount: validatedAmount(amount, 'monthlyAmount') }
          : {}),
      };
      if (student) {
        delete input.studentId;
        await mutate<Student>(`/admin/students/${student.id}`, input, 'PATCH');
      } else {
        const result = await mutate<StudentCreateResult>(
          '/admin/students',
          input,
          'POST',
        );
        if (result.guardianAccountCreated) {
          Alert.alert(
            t('Student added'),
            t(
              'A guardian account was created. Share these Parent App login details with the guardian:\nMobile number: {{phone}}\nPassword: {{password}}',
              { phone: result.guardianPhone, password: 'password' },
            ),
          );
        }
      }
      onClose();
    });
  return (
    <FormModal
      title={
        student
          ? t('Edit student details')
          : addingService
          ? t('Add service in another shift')
          : t('Add a new student')
      }
      visible={visible}
      onClose={onClose}
      busy={action.busy}
      error={action.error}
      onSave={save}
    >
      {!student && !existingStudent ? (
        <Choice
          label={t('Student profile')}
          value={form.studentId || ''}
          optional={false}
          options={[
            { value: '', label: t('New student') },
            ...profiles.map(item => ({
              value: studentIdentity(item),
              label: `${item.studentName} · ${item.guardianPhone}`,
            })),
          ]}
          onChange={value => {
            const selected = profiles.find(item => item.studentId === value);
            if (!selected)
              setForm({
                ...blankStudent(),
                shiftId: shifts[0].id,
                operatingDays: defaultOperatingDays(management?.settings),
              });
            else
              setForm(current => ({
                ...current,
                studentId: selected.studentId,
                studentName: selected.studentName,
                studentCode: selected.studentCode || '',
                className: selected.className || '',
                roll: selected.roll || '',
                photoUrl: selected.photoUrl || '',
                guardianName: selected.guardianName,
                guardianPhone: selected.guardianPhone,
                emergencyContact: selected.emergencyContact || '',
                pickupAddress: selected.pickupAddress || '',
                dropAddress: selected.dropAddress || '',
              }));
            action.clearFeedback();
          }}
        />
      ) : null}
      {!addingService ? (
        <>
          <Heading title={t('Student details')} />
          <Input
            label={t('Student name *')}
            value={form.studentName}
            error={action.fieldErrors.studentName}
            onChangeText={v => set('studentName', v)}
            maxLength={100}
          />
          <View style={s.row}>
            <View style={s.flex}>
              <Input
                label={t('Class')}
                value={form.className}
                error={action.fieldErrors.className}
                onChangeText={v => set('className', v)}
                maxLength={40}
              />
            </View>
            <View style={s.flex}>
              <Input
                label={t('Roll number')}
                value={form.roll}
                error={action.fieldErrors.roll}
                onChangeText={v => set('roll', v)}
                maxLength={20}
              />
            </View>
          </View>
          <Input
            label={t('Student ID')}
            value={form.studentCode}
            error={action.fieldErrors.studentCode}
            onChangeText={v => set('studentCode', v)}
            maxLength={40}
          />
          <View style={s.row}>
            <StudentPhoto student={form} />
            <SmallButton
              title={t('Add photo')}
              icon="plus"
              secondary
              busy={action.busy}
              onPress={() =>
                action.run(async () => {
                  const photo = await pickStudentPhoto();
                  if (photo) set('photoUrl', photo);
                })
              }
            />
            {form.photoUrl ? (
              <SmallButton
                title={t('Remove')}
                secondary
                onPress={() => set('photoUrl', '')}
              />
            ) : null}
          </View>
          <Heading title={t('Guardian details')} />
          {!student && (
            <Input
              label={t('Guardian name (optional)')}
              value={form.guardianName}
              error={action.fieldErrors.guardianName}
              onChangeText={v => set('guardianName', v)}
              maxLength={80}
            />
          )}
          <Input
            label={t('Guardian mobile number *')}
            editable={!student}
            value={form.guardianPhone}
            error={action.fieldErrors.guardianPhone}
            onChangeText={v => set('guardianPhone', v)}
            keyboardType="phone-pad"
            maxLength={16}
          />
          {!student && (
            <Text style={s.muted}>
              {t(
                'An existing guardian account will be linked using this number. Otherwise, a new account will be created with the default password "password".',
              )}
            </Text>
          )}
          <Input
            label={t('Emergency contact')}
            value={form.emergencyContact}
            error={action.fieldErrors.emergencyContact}
            onChangeText={v => set('emergencyContact', v)}
            keyboardType="phone-pad"
            maxLength={16}
          />
          <Input
            label={t('Pickup address')}
            value={form.pickupAddress}
            error={action.fieldErrors.pickupAddress}
            onChangeText={v => set('pickupAddress', v)}
            multiline
            maxLength={400}
          />
          <Input
            label={t('Drop-off address')}
            value={form.dropAddress}
            error={action.fieldErrors.dropAddress}
            onChangeText={v => set('dropAddress', v)}
            maxLength={400}
          />
        </>
      ) : null}
      <TransportSchedule
        shiftId={form.shiftId}
        operatingDays={form.operatingDays}
        shifts={shifts}
        onShiftChange={value => set('shiftId', value)}
        onDaysChange={value => set('operatingDays', value)}
        errors={action.fieldErrors}
        overlap={conflicts.overlap}
      />
      <Heading title={t('Route and fare')} />
      <Choice
        label={t('Vehicle *')}
        value={form.vehicleId}
        error={action.fieldErrors.vehicleId}
        options={vehicles.map(item => ({ value: item.id, label: item.name }))}
        onChange={vehicleId => {
          [
            'routeId',
            'stopId',
            'dropoffStopId',
            'amount',
            'monthlyAmount',
          ].forEach(action.clearFieldError);
          setForm(current => ({
            ...current,
            vehicleId,
            routeId: '',
            stopId: '',
            dropoffStopId: '',
            amount: '',
          }));
        }}
      />
      <Choice
        label={t('Route *')}
        value={form.routeId}
        error={action.fieldErrors.routeId}
        options={availableRoutes.map(item => ({
          value: item.id,
          label: `${item.name} · ${item.vehicleName}`,
        }))}
        onChange={v => {
          [
            'routeId',
            'stopId',
            'dropoffStopId',
            'amount',
            'monthlyAmount',
          ].forEach(action.clearFieldError);
          const chosen = transport.routes.find(item => item.id === v);
          setForm(current => ({
            ...current,
            vehicleId: chosen?.vehicleId || current.vehicleId,
            routeId: v,
            stopId: '',
            dropoffStopId: '',
            amount: chosen ? String(chosen.monthlyAmount / 100) : '',
          }));
        }}
      />
      <Choice
        label={t('Start point *')}
        value={form.stopId}
        error={action.fieldErrors.stopId}
        options={(selectedRoute?.stops || []).map(item => ({
          value: item.id,
          label: item.name,
        }))}
        onChange={v => {
          ['stopId', 'dropoffStopId', 'amount', 'monthlyAmount'].forEach(
            action.clearFieldError,
          );
          setForm(current => ({
            ...current,
            stopId: v,
            dropoffStopId: '',
            amount: selectedRoute
              ? String(selectedRoute.monthlyAmount / 100)
              : '',
          }));
        }}
      />
      <Choice
        label={t('End point')}
        value={form.dropoffStopId}
        error={action.fieldErrors.dropoffStopId}
        optional={false}
        options={[
          { value: '', label: t('Default / custom monthly fee') },
          ...destinations.map(stop => ({ value: stop.id, label: stop.name })),
        ]}
        onChange={v => {
          ['stopId', 'dropoffStopId', 'amount', 'monthlyAmount'].forEach(
            action.clearFieldError,
          );
          setForm(current => ({
            ...current,
            dropoffStopId: v,
            amount:
              !v && selectedRoute
                ? String(selectedRoute.monthlyAmount / 100)
                : current.amount,
          }));
        }}
      />
      {form.dropoffStopId ? (
        <>
          <Detail
            label={t('Journey monthly fee')}
            value={assignedAmount === undefined ? '—' : money(assignedAmount)}
          />
          <Text style={s.muted}>
            {t('The monthly fee is set by the selected start and end points.')}
          </Text>
          {sameJourney ? (
            <Text style={s.muted}>
              {t(
                'The existing assigned fee is kept unless the journey changes.',
              )}
            </Text>
          ) : null}
        </>
      ) : (
        <Input
          label={t('Monthly fee (৳) *')}
          value={form.amount}
          error={action.fieldErrors.amount || action.fieldErrors.monthlyAmount}
          onChangeText={v => set('amount', v)}
          keyboardType="decimal-pad"
        />
      )}
      {student ? (
        <Choice
          label={t('Status')}
          value={form.status}
          error={action.fieldErrors.status}
          optional={false}
          options={
            student.status === 'STOPPED'
              ? [{ value: 'STOPPED', label: t('Inactive') }]
              : [
                  { value: 'ACTIVE', label: t('Active') },
                  { value: 'STOPPED', label: t('Inactive') },
                ]
          }
          onChange={v => set('status', v as Student['status'])}
        />
      ) : null}
      {student?.status === 'STOPPED' ? (
        <Text style={s.note}>
          {t(
            'Add a new admission to restart service while preserving previous billing history.',
          )}
        </Text>
      ) : form.status === 'STOPPED' ? (
        <Text style={s.note}>
          {t(
            "Saving will stop this student's transport service and vehicle tracking. Previous billing history will remain.",
          )}
        </Text>
      ) : null}
    </FormModal>
  );
}

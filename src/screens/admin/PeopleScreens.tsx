import React, { useEffect, useState } from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import {
  Driver,
  DriverInput,
  Student,
  StudentCreateResult,
  StudentInput,
} from '../../api/management';
import { useManagement } from '../../context/ManagementContext';
import { useData } from '../../context/DataContext';
import { locale, useTranslation } from '../../i18n';
import { currentMonth, money, numberLabel, toPoisha } from '../../utils/format';
import { journeyFare, journeyDestinations } from '../../utils/routeFares';
import { pickStudentPhoto } from '../../utils/photo';
import {
  AdminPage,
  Avatar,
  Box,
  Choice,
  ContactActions,
  Detail,
  EmptyState,
  FormModal,
  Heading,
  Input,
  Pill,
  SearchBar,
  SmallButton,
  Tabs,
  niceDate,
  s,
  today,
  useAction,
} from './AdminUi';

type StudentFormValue = {
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
function StudentPhoto({
  student,
  compact = false,
}: {
  student: Pick<Student, 'studentName' | 'photoUrl'>;
  compact?: boolean;
}) {
  return student.photoUrl ? (
    <Image
      accessibilityLabel={student.studentName}
      source={{ uri: student.photoUrl }}
      style={[s.avatarImage, compact && s.compactAvatar]}
    />
  ) : (
    <Avatar name={student.studentName} compact={compact} />
  );
}
function StudentForm({
  visible,
  student,
  onClose,
}: {
  visible: boolean;
  student?: Student;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { data: transport } = useData();
  const { mutate } = useManagement();
  const action = useAction();
  const [form, setForm] = useState(blankStudent);
  useEffect(() => {
    if (visible) {
      action.setError('');
      setForm(
        student
          ? {
              studentName: student.studentName,
              studentCode: student.studentCode,
              className: student.className,
              roll: student.roll,
              guardianName: student.guardianName,
              guardianPhone: student.guardianPhone,
              pickupAddress: student.pickupAddress,
              dropAddress: student.dropAddress,
              emergencyContact: student.emergencyContact,
              routeId: student.routeId,
              stopId: student.stopId,
              dropoffStopId: student.dropoffStopId || '',
              amount: String(student.monthlyAmount / 100),
              photoUrl: student.photoUrl,
              status: student.status,
            }
          : blankStudent(),
      );
    }
  }, [visible, student?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = <K extends keyof StudentFormValue>(
    key: K,
    value: StudentFormValue[K],
  ) => setForm(current => ({ ...current, [key]: value }));
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
      if (
        !form.studentName.trim() ||
        !form.guardianPhone.trim() ||
        !form.routeId ||
        !form.stopId
      )
        throw new Error(
          'Enter the student name, guardian phone number, route and pickup stop.',
        );
      if (form.dropoffStopId && !sameJourney && configuredAmount === undefined)
        throw new Error(
          'No fare is configured for this journey. Select another destination.',
        );
      const { amount, dropoffStopId, guardianName, ...rest } = form;
      const input: StudentInput = {
        ...rest,
        studentName: form.studentName.trim(),
        guardianPhone: form.guardianPhone.trim(),
        ...(!student && guardianName.trim()
          ? { guardianName: guardianName.trim() }
          : {}),
        dropoffStopId: dropoffStopId || null,
        ...(!dropoffStopId ? { monthlyAmount: toPoisha(amount) } : {}),
      };
      if (student) {
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
      title={student ? t('Edit student details') : t('Add a new student')}
      visible={visible}
      onClose={onClose}
      busy={action.busy}
      error={action.error}
      onSave={save}
    >
      <Heading title={t('Student details')} />
      <Input
        label={t('Student name *')}
        value={form.studentName}
        onChangeText={v => set('studentName', v)}
        maxLength={100}
      />
      <View style={s.row}>
        <View style={s.flex}>
          <Input
            label={t('Class')}
            value={form.className}
            onChangeText={v => set('className', v)}
            maxLength={40}
          />
        </View>
        <View style={s.flex}>
          <Input
            label={t('Roll number')}
            value={form.roll}
            onChangeText={v => set('roll', v)}
            maxLength={20}
          />
        </View>
      </View>
      <Input
        label={t('Student ID')}
        value={form.studentCode}
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
          onChangeText={v => set('guardianName', v)}
          maxLength={80}
        />
      )}
      <Input
        label={t('Guardian mobile number *')}
        editable={!student}
        value={form.guardianPhone}
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
        onChangeText={v => set('emergencyContact', v)}
        keyboardType="phone-pad"
        maxLength={16}
      />
      <Input
        label={t('Pickup address')}
        value={form.pickupAddress}
        onChangeText={v => set('pickupAddress', v)}
        multiline
        maxLength={400}
      />
      <Input
        label={t('Drop-off address')}
        value={form.dropAddress}
        onChangeText={v => set('dropAddress', v)}
        maxLength={400}
      />
      <Heading title={t('Route and fare')} />
      <Choice
        label={t('Route *')}
        value={form.routeId}
        options={transport.routes.map(item => ({
          value: item.id,
          label: `${item.name} · ${item.vehicleName}`,
        }))}
        onChange={v => {
          const chosen = transport.routes.find(item => item.id === v);
          setForm(current => ({
            ...current,
            routeId: v,
            stopId: '',
            dropoffStopId: '',
            amount: chosen ? String(chosen.monthlyAmount / 100) : '',
          }));
        }}
      />
      <Choice
        label={t('Pickup stop *')}
        value={form.stopId}
        options={(selectedRoute?.stops || []).map(item => ({
          value: item.id,
          label: item.name,
        }))}
        onChange={v =>
          setForm(current => ({
            ...current,
            stopId: v,
            dropoffStopId: '',
            amount: selectedRoute
              ? String(selectedRoute.monthlyAmount / 100)
              : '',
          }))
        }
      />
      <Choice
        label={t('Destination stop')}
        value={form.dropoffStopId}
        optional={false}
        options={[
          { value: '', label: t('Default / custom monthly fee') },
          ...destinations.map(stop => ({ value: stop.id, label: stop.name })),
        ]}
        onChange={v =>
          setForm(current => ({
            ...current,
            dropoffStopId: v,
            amount:
              !v && selectedRoute
                ? String(selectedRoute.monthlyAmount / 100)
                : current.amount,
          }))
        }
      />
      {form.dropoffStopId ? (
        <>
          <Detail
            label={t('Journey monthly fee')}
            value={assignedAmount === undefined ? '—' : money(assignedAmount)}
          />
          <Text style={s.muted}>
            {t(
              'The monthly fee is set by the selected boarding and destination stops.',
            )}
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
          onChangeText={v => set('amount', v)}
          keyboardType="decimal-pad"
        />
      )}
      {student ? (
        <Choice
          label={t('Status')}
          value={form.status}
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
export function StudentsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { data, loading, error, refresh } = useManagement();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('ALL');
  const [adding, setAdding] = useState(false);
  const students = data?.students || [];
  const records = data?.attendance.filter(item => item.date === today()) || [];
  const absent = new Set(
    records
      .filter(item => item.studentId && item.status === 'ABSENT')
      .map(item => item.studentId),
  );
  const leave = new Set(
    records
      .filter(item => item.studentId && item.status === 'LEAVE')
      .map(item => item.studentId),
  );
  const matches = students.filter(
    item =>
      `${item.studentName} ${item.studentCode} ${item.guardianName} ${item.routeName}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()) &&
      (tab === 'ALL' ||
        (tab === 'ACTIVE' && item.status === 'ACTIVE') ||
        (tab === 'ABSENT' && absent.has(item.id)) ||
        (tab === 'LEAVE' && leave.has(item.id))),
  );
  return (
    <AdminPage loading={loading} error={error} refresh={refresh}>
      <SearchBar
        value={query}
        onChange={setQuery}
        onAdd={() => setAdding(true)}
        placeholder={t('Name, ID or guardian...')}
      />
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          {
            value: 'ALL',
            label: t('All ({{number}})', {
              number: numberLabel(students.length),
            }),
          },
          {
            value: 'ACTIVE',
            label: t('Active ({{number}})', {
              number: numberLabel(
                students.filter(item => item.status === 'ACTIVE').length,
              ),
            }),
          },
          {
            value: 'ABSENT',
            label: t('Absent ({{number}})', {
              number: numberLabel(absent.size),
            }),
          },
          {
            value: 'LEAVE',
            label: t('Leave ({{number}})', { number: numberLabel(leave.size) }),
          },
        ]}
      />
      <Box>
        <View style={s.tableHeader}>
          <Text style={[s.cell, s.studentColumn]}>{t('Name')}</Text>
          <Text style={s.cell}>{t('Route')}</Text>
          <Text style={s.cell}>{t('Vehicle')}</Text>
          <Text style={s.smallCell}>{t('Status')}</Text>
        </View>
        {matches.map(student => (
          <Pressable
            key={student.id}
            accessibilityRole="button"
            accessibilityLabel={t('{{name}} profile', {
              name: student.studentName,
            })}
            style={[s.tableRow, s.personListRow]}
            onPress={() =>
              navigation.navigate('StudentDetails', { id: student.id })
            }
          >
            <View style={[s.row, s.studentColumn]}>
              <StudentPhoto student={student} compact />
              <View style={s.flex}>
                <Text
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={[s.body, s.semibold]}
                >
                  {student.studentName}
                </Text>
                <Text style={s.muted}>
                  {student.studentCode || student.className || '—'}
                </Text>
              </View>
            </View>
            <Text style={s.cell}>{student.routeName}</Text>
            <Text style={s.cell}>{student.vehicleName}</Text>
            <Pill
              value={
                leave.has(student.id)
                  ? 'LEAVE'
                  : absent.has(student.id)
                  ? 'ABSENT'
                  : student.status
              }
            />
          </Pressable>
        ))}
        {!matches.length ? (
          <EmptyState
            text={loading ? t('Loading students…') : t('No students found')}
            detail={t('Add a new student or change your search.')}
          />
        ) : null}
        <Text style={s.muted}>
          {t('Total students: {{number}}', {
            number: numberLabel(matches.length),
          })}
        </Text>
      </Box>
      <StudentForm visible={adding} onClose={() => setAdding(false)} />
    </AdminPage>
  );
}
export function StudentProfileScreen() {
  const { t } = useTranslation();
  const { params } = useRoute();
  const { id } = (params || {}) as { id?: string };
  const { data, loading, error, refresh } = useManagement();
  const { data: transport } = useData();
  const [edit, setEdit] = useState(false);
  const [tab, setTab] = useState('PAYMENTS');
  const student = data?.students.find(item => item.id === id);
  if (!student)
    return (
      <AdminPage loading={loading} error={error} refresh={refresh}>
        <EmptyState
          text={loading ? t('Loading students…') : t('Student unavailable')}
        />
      </AdminPage>
    );
  const bills = transport.bills.filter(
    item =>
      (item as typeof item & { subscriptionId?: string }).subscriptionId ===
      student.id,
  );
  const paid = bills
    .filter(item => item.status === 'PAID')
    .reduce((sum, item) => sum + item.amount, 0);
  const due = bills
    .filter(item => item.status !== 'PAID')
    .reduce((sum, item) => sum + item.amount, 0);
  const attendance =
    data?.attendance
      .filter(item => item.studentId === student.id)
      .sort((a, b) => b.date.localeCompare(a.date)) || [];
  const notices =
    data?.notices.filter(
      item =>
        item.audience === 'ALL' ||
        (item.audience === 'STUDENT' && item.targetId === student.id) ||
        (item.audience === 'VEHICLE' && item.targetId === student.vehicleId) ||
        (item.audience === 'ROUTE' && item.targetId === student.routeId),
    ) || [];
  return (
    <AdminPage loading={loading} error={error} refresh={refresh}>
      <Box>
        <View style={s.row}>
          <StudentPhoto student={student} />
          <View style={s.flex}>
            <Text style={s.title}>{student.studentName}</Text>
            <Text style={s.body}>{student.studentCode || '—'}</Text>
            <Text style={s.muted}>
              {t('Class {{className}} | Roll: {{roll}}', {
                className:
                  student.className.replace(/^\s*class\s+/i, '') || '—',
                roll: student.roll || '—',
              })}
            </Text>
          </View>
          <Pill value={student.status} />
        </View>
        <View style={s.line} />
        <Heading title={t('Guardian')} />
        <Text style={s.body}>{student.guardianName}</Text>
        <Detail
          icon="phone"
          label={t('Mobile')}
          value={student.guardianPhone}
        />
        <Detail
          icon="location"
          label={t('Address')}
          value={student.pickupAddress || student.stopName}
        />
        <Detail icon="routes" label={t('Route')} value={student.routeName} />
        <Detail
          icon="location"
          label={t('Boarding stop')}
          value={student.stopName}
        />
        <Detail
          icon="vehicles"
          label={t('Vehicle')}
          value={student.vehicleName}
        />
        <Detail icon="drivers" label={t('Driver')} value={student.driverName} />
        <Detail
          icon="location"
          label={t('Drop-off stop')}
          value={student.dropoffStopName || student.dropAddress}
        />
        <Detail
          icon="phone"
          label={t('Emergency contact')}
          value={student.emergencyContact}
        />
        <View style={s.line} />
        <Detail
          icon="payments"
          label={t('Monthly fee')}
          value={money(student.monthlyAmount)}
        />
        <Heading title={t('Payment summary')} />
        <View style={s.row}>
          <View style={s.summary}>
            <Text style={s.muted}>{t('Paid')}</Text>
            <Text style={s.summaryValue}>{money(paid)}</Text>
          </View>
          <View style={[s.summary, s.dangerFill]}>
            <Text style={s.muted}>{t('Due')}</Text>
            <Text style={[s.summaryValue, s.red]}>{money(due)}</Text>
          </View>
        </View>
        <ContactActions
          phone={student.guardianPhone}
          onEdit={() => setEdit(true)}
        />
      </Box>
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'PAYMENTS', label: t('Payment history') },
          { value: 'ATTENDANCE', label: t('Attendance') },
          { value: 'NOTICES', label: t('Notices') },
        ]}
      />
      <Box>
        {tab === 'PAYMENTS' ? (
          bills.length ? (
            bills.map(item => (
              <View key={item.id} style={s.tableRow}>
                <Text style={s.cell}>
                  {new Date(
                    `${item.month}-01T00:00:00+06:00`,
                  ).toLocaleDateString(locale(), {
                    month: 'long',
                    year: 'numeric',
                    timeZone: 'Asia/Dhaka',
                  })}
                </Text>
                <Text style={s.body}>{money(item.amount)}</Text>
                <Pill value={item.status} />
              </View>
            ))
          ) : (
            <EmptyState text={t('No payment history yet')} />
          )
        ) : tab === 'ATTENDANCE' ? (
          attendance.length ? (
            attendance.map(item => (
              <View key={item.id} style={s.between}>
                <Text style={s.body}>{niceDate(item.date)}</Text>
                <Pill value={item.status} />
              </View>
            ))
          ) : (
            <EmptyState text={t('No attendance records')} />
          )
        ) : notices.length ? (
          notices.map(item => (
            <View key={item.id} style={s.stack}>
              <Text style={s.heading}>{item.title}</Text>
              <Text style={s.body}>{item.body}</Text>
              <Text style={s.muted}>{niceDate(item.createdAt)}</Text>
            </View>
          ))
        ) : (
          <EmptyState text={t('No notices')} />
        )}
      </Box>
      <StudentForm
        visible={edit}
        student={student}
        onClose={() => setEdit(false)}
      />
    </AdminPage>
  );
}
function DriverForm({
  driver,
  visible,
  onClose,
}: {
  driver?: Driver;
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { data: transport } = useData();
  const { mutate } = useManagement();
  const action = useAction();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    nid: '',
    address: '',
    joiningDate: today(),
    salary: '',
    vehicleId: '',
    status: 'ACTIVE' as Driver['status'],
  });
  useEffect(() => {
    if (visible) {
      action.setError('');
      setForm(
        driver
          ? {
              name: driver.name,
              phone: driver.phone,
              nid: driver.nid,
              address: driver.address,
              joiningDate: driver.joiningDate,
              salary: String(driver.monthlySalary / 100),
              vehicleId: driver.vehicleId || '',
              status: driver.status,
            }
          : {
              name: '',
              phone: '',
              nid: '',
              address: '',
              joiningDate: today(),
              salary: '',
              vehicleId: '',
              status: 'ACTIVE',
            },
      );
    }
  }, [visible, driver?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (key: string, value: string) =>
    setForm(current => ({ ...current, [key]: value }));
  return (
    <FormModal
      title={driver ? t('Edit driver details') : t('Add driver')}
      visible={visible}
      onClose={onClose}
      busy={action.busy}
      error={action.error}
      onSave={() =>
        action.run(async () => {
          if (!form.name.trim() || !form.phone.trim())
            throw new Error('Enter the driver name and mobile number.');
          const input: DriverInput = {
            name: form.name.trim(),
            phone: form.phone.trim(),
            nid: form.nid,
            address: form.address,
            ...(form.joiningDate ? { joiningDate: form.joiningDate } : {}),
            monthlySalary:
              form.salary.trim() && Number(form.salary) !== 0
                ? toPoisha(form.salary)
                : 0,
            vehicleId: form.vehicleId || null,
            status: form.status,
          };
          await mutate(
            driver ? `/admin/drivers/${driver.id}` : '/admin/drivers',
            input,
            driver ? 'PATCH' : 'POST',
          );
          onClose();
        })
      }
    >
      <Input
        label={t('Name *')}
        value={form.name}
        onChangeText={v => set('name', v)}
        maxLength={100}
      />
      <Input
        label={t('Mobile number *')}
        value={form.phone}
        onChangeText={v => set('phone', v)}
        keyboardType="phone-pad"
        maxLength={16}
      />
      <Input
        label={t('NID')}
        value={form.nid}
        onChangeText={v => set('nid', v)}
        keyboardType="number-pad"
        maxLength={20}
      />
      <Input
        label={t('Address')}
        value={form.address}
        onChangeText={v => set('address', v)}
        multiline
        maxLength={400}
      />
      <Input
        label={t('Joining date (YYYY-MM-DD)')}
        value={form.joiningDate}
        onChangeText={v => set('joiningDate', v)}
        maxLength={10}
      />
      <Choice
        label={t('Assigned vehicle')}
        value={form.vehicleId}
        onChange={v => set('vehicleId', v)}
        options={transport.vehicles.map(item => ({
          value: item.id,
          label: `${item.name} · ${item.plate}`,
        }))}
      />
      <Input
        label={t('Monthly salary (৳)')}
        value={form.salary}
        onChangeText={v => set('salary', v)}
        keyboardType="decimal-pad"
      />
      <Choice
        label={t('Status')}
        value={form.status}
        optional={false}
        onChange={v => set('status', v)}
        options={[
          { value: 'ACTIVE', label: t('Active') },
          { value: 'LEAVE', label: t('Leave') },
          { value: 'INACTIVE', label: t('Inactive') },
        ]}
      />
    </FormModal>
  );
}
export function DriversScreen() {
  const { t } = useTranslation();
  const { data, loading, error, refresh } = useManagement();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const drivers = (data?.drivers || []).filter(item =>
    `${item.name} ${item.phone} ${item.vehicleName || ''}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <AdminPage loading={loading} error={error} refresh={refresh}>
      <SearchBar
        value={query}
        onChange={setQuery}
        onAdd={() => setAdding(true)}
        placeholder={t('Search drivers...')}
      />
      <Box>
        <View style={s.tableHeader}>
          <Text style={[s.cell, s.driverColumn]}>{t('Name')}</Text>
          <Text style={s.cell}>{t('Route')}</Text>
          <Text style={s.smallCell}>{t('Status')}</Text>
        </View>
        {drivers.map(driver => (
          <Pressable
            key={driver.id}
            accessibilityRole="button"
            accessibilityLabel={t('{{name}} profile', { name: driver.name })}
            onPress={() =>
              navigation.navigate('DriverDetails', { id: driver.id })
            }
            style={[s.tableRow, s.personListRow]}
          >
            <Avatar name={driver.name} driver compact />
            <View style={s.driverColumn}>
              <Text numberOfLines={1} ellipsizeMode="tail" style={s.body}>
                {driver.name}
              </Text>
              <Text style={s.muted}>
                {driver.vehicleName || t('No vehicle assigned')}
              </Text>
            </View>
            <Text style={s.cell}>{driver.routeName || '—'}</Text>
            <Pill value={driver.status} />
          </Pressable>
        ))}
        {!drivers.length ? <EmptyState text={t('No drivers found')} /> : null}
        <Text style={s.muted}>
          {t('Total drivers: {{number}}', {
            number: numberLabel(drivers.length),
          })}
        </Text>
      </Box>
      <DriverForm visible={adding} onClose={() => setAdding(false)} />
    </AdminPage>
  );
}
export function DriverProfileScreen() {
  const { t } = useTranslation();
  const { params } = useRoute();
  const { id } = (params || {}) as { id?: string };
  const { data, loading, error, refresh } = useManagement();
  const [edit, setEdit] = useState(false);
  const [tab, setTab] = useState('ATTENDANCE');
  const driver = data?.drivers.find(item => item.id === id);
  if (!driver)
    return (
      <AdminPage loading={loading} error={error} refresh={refresh}>
        <EmptyState
          text={loading ? t('Loading driver...') : t('Driver not found')}
        />
      </AdminPage>
    );
  const attendance = (data?.attendance || [])
    .filter(item => item.driverId === id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const salaries = (data?.ledger || []).filter(
    item =>
      item.driverId === id &&
      item.type === 'EXPENSE' &&
      item.category === 'SALARY',
  );
  const salaryPaidThisMonth = salaries
    .filter(item => item.date.startsWith(currentMonth()))
    .reduce((sum, item) => sum + item.amount, 0);
  return (
    <AdminPage loading={loading} error={error} refresh={refresh}>
      <Box>
        <View style={s.row}>
          <Avatar name={driver.name} driver />
          <View style={s.flex}>
            <Text style={s.title}>{driver.name}</Text>
            <Text style={s.muted}>
              {t('ID: {{id}}', { id: driver.id.slice(0, 8).toUpperCase() })}
            </Text>
          </View>
          <Pill value={driver.status} />
        </View>
        <Detail icon="phone" label={t('Mobile')} value={driver.phone} />
        <Detail icon="students" label={t('NID')} value={driver.nid} />
        <Detail icon="location" label={t('Address')} value={driver.address} />
        <Detail
          icon="calendar"
          label={t('Joining date')}
          value={niceDate(driver.joiningDate)}
        />
        <View style={s.line} />
        <Heading title={t('Assigned vehicle')} />
        <Detail
          icon="vehicles"
          label={t('Vehicle')}
          value={driver.vehicleName}
        />
        <Detail icon="routes" label={t('Route')} value={driver.routeName} />
        <Detail
          icon="payments"
          label={t('Monthly salary')}
          value={money(driver.monthlySalary)}
        />
        <Detail
          label={t('Salary paid this month')}
          value={money(salaryPaidThisMonth)}
        />
        <Detail
          icon="calendar"
          label={t('Last salary payment')}
          value={niceDate(
            [...salaries].sort((a, b) => b.date.localeCompare(a.date))[0]?.date,
          )}
        />
        <ContactActions phone={driver.phone} onEdit={() => setEdit(true)} />
      </Box>
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'ATTENDANCE', label: t('Attendance') },
          { value: 'SALARY', label: t('Salary history') },
          { value: 'LEAVE', label: t('Leave') },
        ]}
      />
      <Box>
        {tab === 'SALARY' ? (
          salaries.length ? (
            salaries.map(item => (
              <View style={s.tableRow} key={item.id}>
                <Text style={s.cell}>{niceDate(item.date)}</Text>
                <Text style={s.body}>{money(item.amount)}</Text>
                <Pill value="PAID" />
              </View>
            ))
          ) : (
            <EmptyState
              text={t('No salary payment records')}
              detail={t(
                'Driver salary payments added in Income and expenses will appear here.',
              )}
            />
          )
        ) : attendance.filter(
            item => tab !== 'LEAVE' || item.status === 'LEAVE',
          ).length ? (
          attendance
            .filter(item => tab !== 'LEAVE' || item.status === 'LEAVE')
            .map(item => (
              <View key={item.id} style={s.between}>
                <Text style={s.body}>{niceDate(item.date)}</Text>
                <Pill value={item.status} />
              </View>
            ))
        ) : (
          <EmptyState text={t('No records')} />
        )}
      </Box>
      <DriverForm
        driver={driver}
        visible={edit}
        onClose={() => setEdit(false)}
      />
    </AdminPage>
  );
}

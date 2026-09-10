import React, { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
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
  StudentInput,
} from '../../api/management';
import { useManagement } from '../../context/ManagementContext';
import { useData } from '../../context/DataContext';
import { currentMonth, money, toPoisha } from '../../utils/format';
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
  guardianPhone: string;
  pickupAddress: string;
  dropAddress: string;
  emergencyContact: string;
  routeId: string;
  stopId: string;
  amount: string;
  photoUrl: string;
  status: Student['status'];
};
const blankStudent = (): StudentFormValue => ({
  studentName: '',
  studentCode: '',
  className: '',
  roll: '',
  guardianPhone: '',
  pickupAddress: '',
  dropAddress: '',
  emergencyContact: '',
  routeId: '',
  stopId: '',
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
              guardianPhone: student.guardianPhone,
              pickupAddress: student.pickupAddress,
              dropAddress: student.dropAddress,
              emergencyContact: student.emergencyContact,
              routeId: student.routeId,
              stopId: student.stopId,
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
  const save = () =>
    action.run(async () => {
      if (
        !form.studentName.trim() ||
        !form.guardianPhone.trim() ||
        !form.routeId ||
        !form.stopId
      )
        throw new Error(
          'শিক্ষার্থীর নাম, অভিভাবকের নম্বর, রুট ও পিকআপ স্থান দিন।',
        );
      const { amount, ...rest } = form;
      const input: StudentInput = {
        ...rest,
        studentName: form.studentName.trim(),
        guardianPhone: form.guardianPhone.trim(),
        monthlyAmount: toPoisha(amount),
      };
      await mutate(
        student ? `/admin/students/${student.id}` : '/admin/students',
        input,
        student ? 'PATCH' : 'POST',
      );
      onClose();
    });
  return (
    <FormModal
      title={student ? 'শিক্ষার্থীর তথ্য সম্পাদনা' : 'নতুন শিক্ষার্থী যোগ করুন'}
      visible={visible}
      onClose={onClose}
      busy={action.busy}
      error={action.error}
      onSave={save}
    >
      <Heading title="শিক্ষার্থীর তথ্য" />
      <Input
        label="শিক্ষার্থীর নাম *"
        value={form.studentName}
        onChangeText={v => set('studentName', v)}
        maxLength={100}
      />
      <View style={s.row}>
        <View style={s.flex}>
          <Input
            label="শ্রেণি"
            value={form.className}
            onChangeText={v => set('className', v)}
            maxLength={40}
          />
        </View>
        <View style={s.flex}>
          <Input
            label="রোল নম্বর"
            value={form.roll}
            onChangeText={v => set('roll', v)}
            maxLength={20}
          />
        </View>
      </View>
      <Input
        label="শিক্ষার্থী আইডি"
        value={form.studentCode}
        onChangeText={v => set('studentCode', v)}
        maxLength={40}
      />
      <View style={s.row}>
        <StudentPhoto student={form} />
        <SmallButton
          title="ছবি যোগ করুন"
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
            title="মুছুন"
            secondary
            onPress={() => set('photoUrl', '')}
          />
        ) : null}
      </View>
      <Heading title="অভিভাবকের তথ্য" />
      <Input
        label="অভিভাবকের মোবাইল নম্বর *"
        editable={!student}
        value={form.guardianPhone}
        onChangeText={v => set('guardianPhone', v)}
        keyboardType="phone-pad"
        maxLength={16}
      />
      <Text style={s.muted}>
        অভিভাবককে এই নম্বর দিয়ে Parent App-এ আগে নিবন্ধন করতে হবে। নাম ও
        যোগাযোগের তথ্য সেই অ্যাকাউন্টের সঙ্গে যুক্ত হবে।
      </Text>
      <Input
        label="জরুরি যোগাযোগ"
        value={form.emergencyContact}
        onChangeText={v => set('emergencyContact', v)}
        keyboardType="phone-pad"
        maxLength={16}
      />
      <Input
        label="পিকআপ ঠিকানা"
        value={form.pickupAddress}
        onChangeText={v => set('pickupAddress', v)}
        multiline
        maxLength={400}
      />
      <Input
        label="ড্রপ ঠিকানা"
        value={form.dropAddress}
        onChangeText={v => set('dropAddress', v)}
        maxLength={400}
      />
      <Heading title="রুট ও ভাড়া" />
      <Choice
        label="রুট *"
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
            amount: chosen ? String(chosen.monthlyAmount / 100) : '',
          }));
        }}
      />
      <Choice
        label="পিকআপ স্থান *"
        value={form.stopId}
        options={(selectedRoute?.stops || []).map(item => ({
          value: item.id,
          label: item.name,
        }))}
        onChange={v => set('stopId', v)}
      />
      <Input
        label="মাসিক ভাড়া (৳) *"
        value={form.amount}
        onChangeText={v => set('amount', v)}
        keyboardType="decimal-pad"
      />
      {student ? (
        <Choice
          label="অবস্থা"
          value={form.status}
          optional={false}
          options={
            student.status === 'STOPPED'
              ? [{ value: 'STOPPED', label: 'Inactive' }]
              : [
                  { value: 'ACTIVE', label: 'Active' },
                  { value: 'STOPPED', label: 'Inactive' },
                ]
          }
          onChange={v => set('status', v as Student['status'])}
        />
      ) : null}
      {student?.status === 'STOPPED' ? (
        <Text style={s.note}>
          আগের বিলের ইতিহাস অক্ষত রেখে সেবা চালু করতে নতুন ভর্তি যোগ করুন।
        </Text>
      ) : form.status === 'STOPPED' ? (
        <Text style={s.note}>
          সংরক্ষণ করলে এই শিক্ষার্থীর পরিবহন সেবা ও গাড়ি ট্র্যাকিং বন্ধ হবে।
          আগের বিলের ইতিহাস থাকবে।
        </Text>
      ) : null}
    </FormModal>
  );
}
export function StudentsScreen() {
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
        placeholder="নাম, আইডি বা অভিভাবক…"
      />
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'ALL', label: `সব (${students.length})` },
          {
            value: 'ACTIVE',
            label: `সক্রিয় (${
              students.filter(item => item.status === 'ACTIVE').length
            })`,
          },
          { value: 'ABSENT', label: `অনুপস্থিত (${absent.size})` },
          { value: 'LEAVE', label: `ছুটি (${leave.size})` },
        ]}
      />
      <Box>
        <View style={s.tableHeader}>
          <Text style={[s.cell, s.studentColumn]}>নাম</Text>
          <Text style={s.cell}>রুট</Text>
          <Text style={s.cell}>গাড়ি</Text>
          <Text style={s.smallCell}>অবস্থা</Text>
        </View>
        {matches.map(student => (
          <Pressable
            key={student.id}
            accessibilityRole="button"
            accessibilityLabel={`${student.studentName} প্রোফাইল`}
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
            text={
              loading ? 'শিক্ষার্থী লোড হচ্ছে…' : 'কোনো শিক্ষার্থী পাওয়া যায়নি'
            }
            detail="নতুন শিক্ষার্থী যোগ করুন অথবা অনুসন্ধান পরিবর্তন করুন।"
          />
        ) : null}
        <Text style={s.muted}>মোট শিক্ষার্থী: {matches.length}</Text>
      </Box>
      <StudentForm visible={adding} onClose={() => setAdding(false)} />
    </AdminPage>
  );
}
export function StudentProfileScreen() {
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
          text={
            loading ? 'শিক্ষার্থী লোড হচ্ছে…' : 'শিক্ষার্থীর তথ্য পাওয়া যায়নি'
          }
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
              Class {student.className.replace(/^\s*class\s+/i, '') || '—'} |
              Roll: {student.roll || '—'}
            </Text>
          </View>
          <Pill value={student.status} />
        </View>
        <View style={s.line} />
        <Heading title="অভিভাবক" />
        <Text style={s.body}>{student.guardianName}</Text>
        <Detail icon="phone" label="মোবাইল" value={student.guardianPhone} />
        <Detail
          icon="location"
          label="ঠিকানা"
          value={student.pickupAddress || student.stopName}
        />
        <Detail icon="routes" label="রুট" value={student.routeName} />
        <Detail icon="vehicles" label="গাড়ি" value={student.vehicleName} />
        <Detail icon="drivers" label="ড্রাইভার" value={student.driverName} />
        <Detail
          icon="location"
          label="ড্রপ স্থান"
          value={student.dropAddress}
        />
        <Detail
          icon="phone"
          label="জরুরি যোগাযোগ"
          value={student.emergencyContact}
        />
        <View style={s.line} />
        <Detail
          icon="payments"
          label="মাসিক ভাড়া"
          value={money(student.monthlyAmount)}
        />
        <Heading title="পেমেন্ট সারাংশ" />
        <View style={s.row}>
          <View style={s.summary}>
            <Text style={s.muted}>পরিশোধিত</Text>
            <Text style={s.summaryValue}>{money(paid)}</Text>
          </View>
          <View style={[s.summary, s.dangerFill]}>
            <Text style={s.muted}>বকেয়া</Text>
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
          { value: 'PAYMENTS', label: 'পেমেন্ট হিস্ট্রি' },
          { value: 'ATTENDANCE', label: 'উপস্থিতি' },
          { value: 'NOTICES', label: 'নোটিশ' },
        ]}
      />
      <Box>
        {tab === 'PAYMENTS' ? (
          bills.length ? (
            bills.map(item => (
              <View key={item.id} style={s.tableRow}>
                <Text style={s.cell}>{item.month}</Text>
                <Text style={s.body}>{money(item.amount)}</Text>
                <Pill value={item.status} />
              </View>
            ))
          ) : (
            <EmptyState text="পেমেন্ট ইতিহাস নেই" />
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
            <EmptyState text="উপস্থিতির রেকর্ড নেই" />
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
          <EmptyState text="কোনো নোটিশ নেই" />
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
      title={driver ? 'ড্রাইভারের তথ্য সম্পাদনা' : 'ড্রাইভার যোগ করুন'}
      visible={visible}
      onClose={onClose}
      busy={action.busy}
      error={action.error}
      onSave={() =>
        action.run(async () => {
          if (!form.name.trim() || !form.phone.trim())
            throw new Error('ড্রাইভারের নাম ও মোবাইল নম্বর দিন।');
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
        label="নাম *"
        value={form.name}
        onChangeText={v => set('name', v)}
        maxLength={100}
      />
      <Input
        label="মোবাইল নম্বর *"
        value={form.phone}
        onChangeText={v => set('phone', v)}
        keyboardType="phone-pad"
        maxLength={16}
      />
      <Input
        label="NID"
        value={form.nid}
        onChangeText={v => set('nid', v)}
        keyboardType="number-pad"
        maxLength={20}
      />
      <Input
        label="ঠিকানা"
        value={form.address}
        onChangeText={v => set('address', v)}
        multiline
        maxLength={400}
      />
      <Input
        label="যোগদানের তারিখ (YYYY-MM-DD)"
        value={form.joiningDate}
        onChangeText={v => set('joiningDate', v)}
        maxLength={10}
      />
      <Choice
        label="নির্ধারিত গাড়ি"
        value={form.vehicleId}
        onChange={v => set('vehicleId', v)}
        options={transport.vehicles.map(item => ({
          value: item.id,
          label: `${item.name} · ${item.plate}`,
        }))}
      />
      <Input
        label="মাসিক বেতন (৳)"
        value={form.salary}
        onChangeText={v => set('salary', v)}
        keyboardType="decimal-pad"
      />
      <Choice
        label="অবস্থা"
        value={form.status}
        optional={false}
        onChange={v => set('status', v)}
        options={[
          { value: 'ACTIVE', label: 'Active' },
          { value: 'LEAVE', label: 'ছুটি' },
          { value: 'INACTIVE', label: 'Inactive' },
        ]}
      />
    </FormModal>
  );
}
export function DriversScreen() {
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
        placeholder="ড্রাইভার খুঁজুন…"
      />
      <Box>
        <View style={s.tableHeader}>
          <Text style={[s.cell, s.driverColumn]}>নাম</Text>
          <Text style={s.cell}>রুট</Text>
          <Text style={s.smallCell}>অবস্থা</Text>
        </View>
        {drivers.map(driver => (
          <Pressable
            key={driver.id}
            accessibilityRole="button"
            accessibilityLabel={`${driver.name} প্রোফাইল`}
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
                {driver.vehicleName || 'গাড়ি নির্ধারিত নেই'}
              </Text>
            </View>
            <Text style={s.cell}>{driver.routeName || '—'}</Text>
            <Pill value={driver.status} />
          </Pressable>
        ))}
        {!drivers.length ? (
          <EmptyState text="কোনো ড্রাইভার পাওয়া যায়নি" />
        ) : null}
        <Text style={s.muted}>মোট ড্রাইভার: {drivers.length}</Text>
      </Box>
      <DriverForm visible={adding} onClose={() => setAdding(false)} />
    </AdminPage>
  );
}
export function DriverProfileScreen() {
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
          text={loading ? 'ড্রাইভার লোড হচ্ছে…' : 'ড্রাইভার পাওয়া যায়নি'}
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
              ID: {driver.id.slice(0, 8).toUpperCase()}
            </Text>
          </View>
          <Pill value={driver.status} />
        </View>
        <Detail icon="phone" label="মোবাইল" value={driver.phone} />
        <Detail icon="students" label="NID" value={driver.nid} />
        <Detail icon="location" label="ঠিকানা" value={driver.address} />
        <Detail
          icon="calendar"
          label="যোগদানের তারিখ"
          value={niceDate(driver.joiningDate)}
        />
        <View style={s.line} />
        <Heading title="নির্ধারিত গাড়ি" />
        <Detail icon="vehicles" label="গাড়ি" value={driver.vehicleName} />
        <Detail icon="routes" label="রুট" value={driver.routeName} />
        <Detail
          icon="payments"
          label="মাসিক বেতন"
          value={money(driver.monthlySalary)}
        />
        <Detail
          label="এই মাসে বেতন পরিশোধ"
          value={money(salaryPaidThisMonth)}
        />
        <Detail
          icon="calendar"
          label="সর্বশেষ বেতন পরিশোধ"
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
          { value: 'ATTENDANCE', label: 'উপস্থিতি' },
          { value: 'SALARY', label: 'বেতন ইতিহাস' },
          { value: 'LEAVE', label: 'ছুটি' },
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
              text="বেতন পরিশোধের রেকর্ড নেই"
              detail="আয়–ব্যয়ে ড্রাইভারের বেতন যোগ করলে এখানে দেখা যাবে।"
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
          <EmptyState text="কোনো রেকর্ড নেই" />
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

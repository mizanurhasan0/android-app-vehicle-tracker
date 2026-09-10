import React, { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import {
  Attendance,
  AttendanceInput,
  LedgerEntry,
  LedgerInput,
  Maintenance,
  MaintenanceInput,
} from '../../api/management';
import { NoorIcon } from '../../components/Noor';
import { useManagement } from '../../context/ManagementContext';
import { useData } from '../../context/DataContext';
import { currentMonth, money, toPoisha } from '../../utils/format';
import { monthInDhaka } from './reportUtils';
import {
  AdminPage,
  Avatar,
  Box,
  C,
  Choice,
  Detail,
  EmptyState,
  ErrorText,
  FormModal,
  Heading,
  Input,
  Pill,
  SmallButton,
  Tabs,
  niceDate,
  s,
  today,
  useAction,
} from './AdminUi';

export function AttendanceScreen() {
  const { data, loading, error, refresh, mutate } = useManagement();
  const { data: transport } = useData();
  const action = useAction();
  const [tab, setTab] = useState('STUDENT');
  const [date, setDate] = useState(today);
  const [vehicleId, setVehicleId] = useState('');
  const [draft, setDraft] = useState<Record<string, Attendance['status']>>({});
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setDraft({});
    setSaved(false);
    action.setError('');
  }, [tab, date, vehicleId]); // eslint-disable-line react-hooks/exhaustive-deps
  const people =
    tab === 'STUDENT'
      ? (data?.students || [])
          .filter(
            item =>
              item.status === 'ACTIVE' &&
              (!vehicleId || item.vehicleId === vehicleId),
          )
          .map(item => ({
            id: item.id,
            name: item.studentName,
            vehicle: item.vehicleName,
          }))
      : (data?.drivers || [])
          .filter(
            item =>
              item.status !== 'INACTIVE' &&
              (!vehicleId || item.vehicleId === vehicleId),
          )
          .map(item => ({
            id: item.id,
            name: item.name,
            vehicle: item.vehicleName || '',
          }));
  const statusFor = (id: string) =>
    draft[id] ||
    data?.attendance.find(
      item =>
        item.date === date &&
        (tab === 'STUDENT' ? item.studentId : item.driverId) === id,
    )?.status;
  const count = (status: Attendance['status']) =>
    people.filter(item => statusFor(item.id) === status).length;
  return (
    <AdminPage loading={loading} error={error} refresh={refresh}>
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          { value: 'STUDENT', label: 'শিক্ষার্থী' },
          { value: 'DRIVER', label: 'ড্রাইভার' },
        ]}
      />
      <View style={s.row}>
        <View style={s.flex}>
          <Input
            label="তারিখ (YYYY-MM-DD)"
            value={date}
            onChangeText={setDate}
            maxLength={10}
          />
        </View>
        <View style={s.flex}>
          <Choice
            label="গাড়ি"
            value={vehicleId}
            onChange={setVehicleId}
            options={transport.vehicles.map(item => ({
              value: item.id,
              label: item.name,
            }))}
          />
        </View>
      </View>
      <Box>
        <View style={s.row}>
          {[
            { label: 'Present', count: count('PRESENT'), color: C.green },
            { label: 'Absent', count: count('ABSENT'), color: C.red },
            { label: 'Leave', count: count('LEAVE'), color: C.amber },
          ].map(item => (
            <View key={item.label} style={s.summary}>
              <Text style={s.muted}>{item.label}</Text>
              <Text style={[s.summaryValue, { color: item.color }]}>
                {item.count}
              </Text>
            </View>
          ))}
        </View>
        <Heading
          title={`মোট ${people.length} জন`}
          action="সবাই উপস্থিত"
          onAction={() => {
            setDraft(
              Object.fromEntries(people.map(item => [item.id, 'PRESENT'])),
            );
            setSaved(false);
          }}
        />
        <Text style={s.muted}>নাম তালিকার পাশে উপস্থিতি নির্বাচন করুন।</Text>
        {people.map(person => (
          <View key={person.id} style={[s.tableRow, s.wrap]}>
            <Avatar name={person.name} driver={tab === 'DRIVER'} />
            <View style={s.flex}>
              <Text style={s.body}>{person.name}</Text>
              <Text style={s.muted}>{person.vehicle}</Text>
            </View>
            <View style={s.row}>
              {(['PRESENT', 'ABSENT', 'LEAVE'] as const).map(status => (
                <Pressable
                  key={status}
                  accessibilityRole="radio"
                  accessibilityLabel={`${person.name}: ${
                    status === 'PRESENT'
                      ? 'উপস্থিত'
                      : status === 'ABSENT'
                      ? 'অনুপস্থিত'
                      : 'ছুটি'
                  }`}
                  accessibilityState={{
                    checked: statusFor(person.id) === status,
                  }}
                  onPress={() => {
                    setDraft(current => ({ ...current, [person.id]: status }));
                    setSaved(false);
                  }}
                  style={[
                    s.attendanceChoice,
                    {
                      borderColor:
                        statusFor(person.id) === status
                          ? status === 'ABSENT'
                            ? C.red
                            : C.green
                          : C.line,
                      backgroundColor:
                        statusFor(person.id) === status
                          ? status === 'ABSENT'
                            ? '#FFE6EB'
                            : C.mint
                          : C.white,
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.bold,
                      {
                        color:
                          status === 'ABSENT'
                            ? C.red
                            : status === 'LEAVE'
                            ? C.amber
                            : C.green,
                      },
                    ]}
                  >
                    {status === 'PRESENT'
                      ? '✓'
                      : status === 'ABSENT'
                      ? '×'
                      : 'ছু'}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
        {!people.length ? (
          <EmptyState text="এই গাড়িতে কোনো রেকর্ড নেই" />
        ) : null}
        <Text style={s.muted}>
          নির্বাচন করা হয়নি: {people.filter(item => !statusFor(item.id)).length}
        </Text>
        <ErrorText message={action.error} />
        {saved ? <Text style={s.note}>উপস্থিতি সংরক্ষণ হয়েছে।</Text> : null}
        <SmallButton
          title="সেভ করুন"
          busy={action.busy}
          disabled={!Object.keys(draft).length}
          onPress={() =>
            action.run(async () => {
              if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
                throw new Error('তারিখ YYYY-MM-DD ফরম্যাটে দিন।');
              const entries: AttendanceInput[] = people
                .filter(item => draft[item.id])
                .map(item => ({
                  ...(tab === 'STUDENT'
                    ? { studentId: item.id }
                    : { driverId: item.id }),
                  date,
                  status: draft[item.id],
                }));
              if (!entries.length)
                throw new Error('আগে উপস্থিতি নির্বাচন করুন।');
              await mutate('/admin/attendance', { entries }, 'PUT');
              setDraft({});
              setSaved(true);
            })
          }
        />
      </Box>
    </AdminPage>
  );
}
const services = ['তেল পরিবর্তন', 'ব্যাটারি', 'টায়ার', 'মেরামত', 'যন্ত্রাংশ'];
function MaintenanceForm({
  item,
  visible,
  onClose,
  vehicleId,
}: {
  item?: Maintenance;
  visible: boolean;
  onClose: () => void;
  vehicleId?: string;
}) {
  const { data: transport } = useData();
  const { mutate } = useManagement();
  const action = useAction();
  const empty = () => ({
    vehicleId: vehicleId || '',
    title: '',
    description: '',
    serviceDate: today(),
    nextServiceDate: '',
    amount: '',
    status: 'PLANNED' as Maintenance['status'],
  });
  const [form, setForm] = useState(empty);
  const [checks, setChecks] = useState<string[]>([]);
  useEffect(() => {
    if (visible) {
      action.setError('');
      setChecks([]);
      setForm(
        item
          ? {
              vehicleId: item.vehicleId,
              title: item.title,
              description: item.description,
              serviceDate: item.serviceDate,
              nextServiceDate: item.nextServiceDate || '',
              amount: String(item.amount / 100),
              status: item.status,
            }
          : empty(),
      );
    }
  }, [visible, item?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (key: string, value: string) =>
    setForm(current => ({ ...current, [key]: value }));
  return (
    <FormModal
      title={item ? 'রক্ষণাবেক্ষণ সম্পাদনা' : 'রক্ষণাবেক্ষণ যোগ করুন'}
      visible={visible}
      onClose={onClose}
      busy={action.busy}
      error={action.error}
      onSave={() =>
        action.run(async () => {
          if (!form.vehicleId || !form.title.trim())
            throw new Error('গাড়ি ও কাজের শিরোনাম দিন।');
          const input: MaintenanceInput = {
            ...form,
            title: form.title.trim(),
            nextServiceDate: form.nextServiceDate || null,
            amount:
              form.amount.trim() && Number(form.amount) !== 0
                ? toPoisha(form.amount)
                : 0,
            description: [
              form.description.trim(),
              checks.length ? `কাজ: ${checks.join(', ')}` : '',
            ]
              .filter(Boolean)
              .join('\n'),
          };
          await mutate(
            item ? `/admin/maintenance/${item.id}` : '/admin/maintenance',
            input,
            item ? 'PATCH' : 'POST',
          );
          onClose();
        })
      }
    >
      <Choice
        label="গাড়ি *"
        value={form.vehicleId}
        onChange={v => set('vehicleId', v)}
        options={transport.vehicles.map(v => ({
          value: v.id,
          label: `${v.name} · ${v.plate}`,
        }))}
      />
      <Input
        label="কাজের শিরোনাম *"
        value={form.title}
        onChangeText={v => set('title', v)}
        maxLength={120}
      />
      <Heading title="সার্ভিসের কাজ" />
      {services.map(service => (
        <Pressable
          key={service}
          accessibilityRole="checkbox"
          accessibilityLabel={service}
          accessibilityState={{ checked: checks.includes(service) }}
          onPress={() =>
            setChecks(current =>
              current.includes(service)
                ? current.filter(v => v !== service)
                : [...current, service],
            )
          }
          style={[s.row, s.choiceRow]}
        >
          <View
            style={[
              s.checkbox,
              {
                backgroundColor: checks.includes(service) ? C.green : C.white,
              },
            ]}
          >
            <Text style={s.white}>{checks.includes(service) ? '✓' : ''}</Text>
          </View>
          <Text style={s.body}>{service}</Text>
        </Pressable>
      ))}
      <Input
        label="বিস্তারিত"
        value={form.description}
        onChangeText={v => set('description', v)}
        multiline
        maxLength={2000}
      />
      <Input
        label="সার্ভিসের তারিখ (YYYY-MM-DD)"
        value={form.serviceDate}
        onChangeText={v => set('serviceDate', v)}
        maxLength={10}
      />
      <Input
        label="পরবর্তী সার্ভিস (YYYY-MM-DD)"
        value={form.nextServiceDate}
        onChangeText={v => set('nextServiceDate', v)}
        maxLength={10}
      />
      <Input
        label="মোট খরচ (৳)"
        value={form.amount}
        onChangeText={v => set('amount', v)}
        keyboardType="decimal-pad"
      />
      <Choice
        label="অবস্থা"
        value={form.status}
        optional={false}
        onChange={v => set('status', v)}
        options={[
          { value: 'PLANNED', label: 'পরিকল্পিত' },
          { value: 'IN_PROGRESS', label: 'কাজ চলছে' },
          { value: 'COMPLETED', label: 'সম্পন্ন' },
        ]}
      />
      <Text style={s.note}>
        কাজ সম্পন্ন হলে খরচ স্বয়ংক্রিয়ভাবে আয়–ব্যয়ের হিসাবে যুক্ত হবে। পরিকল্পিত
        বা চলমান কাজের খরচ এখনো ব্যয় হিসেবে গণনা হবে না।
      </Text>
    </FormModal>
  );
}
export function MaintenanceScreen() {
  const { params } = useRoute();
  const initial = (params || {}) as { vehicleId?: string };
  const { data, loading, error, refresh } = useManagement();
  const { data: transport } = useData();
  const [vehicle, setVehicle] = useState(initial.vehicleId || '');
  const [editing, setEditing] = useState<Maintenance | null | undefined>();
  const records = (data?.maintenance || [])
    .filter(item => !vehicle || item.vehicleId === vehicle)
    .sort((a, b) => b.serviceDate.localeCompare(a.serviceDate));
  return (
    <AdminPage loading={loading} error={error} refresh={refresh}>
      <Heading
        title="গাড়ির সার্ভিস ও মেরামত"
        action="+ যোগ করুন"
        onAction={() => setEditing(null)}
      />
      <Choice
        label="গাড়ি অনুযায়ী দেখুন"
        value={vehicle}
        onChange={setVehicle}
        options={transport.vehicles.map(item => ({
          value: item.id,
          label: item.name,
        }))}
      />
      {records.map(item => (
        <Box key={item.id}>
          <View style={s.row}>
            <View style={[s.avatar, { backgroundColor: C.mint }]}>
              <NoorIcon name="vehicles" size={28} color={C.green} />
            </View>
            <View style={s.flex}>
              <Text style={s.heading}>{item.vehicleName}</Text>
              <Text style={s.body}>{item.title}</Text>
            </View>
            <Pill
              value={
                item.status === 'IN_PROGRESS'
                  ? 'MAINTENANCE'
                  : item.status === 'PLANNED'
                  ? 'PENDING'
                  : 'COMPLETED'
              }
            />
          </View>
          <Detail label="সার্ভিস" value={niceDate(item.serviceDate)} />
          <Detail
            label="পরবর্তী সার্ভিস"
            value={niceDate(item.nextServiceDate)}
          />
          {item.description ? (
            <Text style={s.body}>{item.description}</Text>
          ) : null}
          <Detail label="খরচ" value={money(item.amount)} />
          <SmallButton
            title="সার্ভিস বিবরণ / সম্পাদনা"
            secondary
            onPress={() => setEditing(item)}
          />
        </Box>
      ))}
      {!records.length ? (
        <EmptyState
          text="রক্ষণাবেক্ষণের তথ্য নেই"
          detail="প্রথম সার্ভিসের তথ্য যোগ করুন।"
        />
      ) : null}
      <MaintenanceForm
        visible={editing !== undefined}
        item={editing || undefined}
        vehicleId={vehicle}
        onClose={() => setEditing(undefined)}
      />
    </AdminPage>
  );
}
export const categoryLabels: Record<string, string> = {
  OTHER: 'অন্যান্য',
  SALARY: 'ড্রাইভারের বেতন',
  FUEL: 'জ্বালানি',
  MAINTENANCE: 'মেইনটেন্যান্স',
  REPAIR: 'মেরামত',
  PARTS: 'যন্ত্রাংশ',
  TAX: 'ট্যাক্স / ফিটনেস',
  OFFICE: 'অফিস খরচ',
  VEHICLE: 'গাড়িতে বিনিয়োগ',
  CAPITAL: 'ব্যবসার মূলধন',
};
function LedgerForm({
  visible,
  onClose,
  initialType,
}: {
  visible: boolean;
  onClose: () => void;
  initialType: LedgerEntry['type'];
}) {
  const { data, mutate } = useManagement();
  const { data: transport } = useData();
  const action = useAction();
  const [form, setForm] = useState({
    type: initialType,
    category: 'OTHER',
    title: '',
    amount: '',
    date: today(),
    note: '',
    vehicleId: '',
    driverId: '',
  });
  useEffect(() => {
    if (visible) {
      action.setError('');
      setForm({
        type: initialType,
        category: 'OTHER',
        title: '',
        amount: '',
        date: today(),
        note: '',
        vehicleId: '',
        driverId: '',
      });
    }
  }, [visible, initialType]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (key: string, value: string) =>
    setForm(current => ({ ...current, [key]: value }));
  const categories =
    form.type === 'EXPENSE'
      ? ['SALARY', 'FUEL', 'REPAIR', 'PARTS', 'TAX', 'OFFICE', 'OTHER']
      : form.type === 'INVESTMENT'
      ? ['VEHICLE', 'CAPITAL', 'OTHER']
      : ['OTHER'];
  return (
    <FormModal
      title={
        form.type === 'EXPENSE'
          ? 'খরচ যোগ করুন'
          : form.type === 'INVESTMENT'
          ? 'বিনিয়োগ যোগ করুন'
          : 'আয় যোগ করুন'
      }
      visible={visible}
      onClose={onClose}
      busy={action.busy}
      error={action.error}
      onSave={() =>
        action.run(async () => {
          if (!form.title.trim()) throw new Error('হিসাবের শিরোনাম লিখুন।');
          if (form.category === 'SALARY' && !form.driverId)
            throw new Error('বেতন পরিশোধের জন্য ড্রাইভার নির্বাচন করুন।');
          const input: LedgerInput = {
            type: form.type,
            category: form.category,
            title: form.title.trim(),
            amount: toPoisha(form.amount),
            date: form.date,
            note: form.note,
            ...(form.vehicleId ? { vehicleId: form.vehicleId } : {}),
            ...(form.driverId ? { driverId: form.driverId } : {}),
          };
          await mutate('/admin/ledger', input);
          onClose();
        })
      }
    >
      <Choice
        label="হিসাবের ধরন"
        value={form.type}
        optional={false}
        options={[
          { value: 'INCOME', label: 'আয়' },
          { value: 'EXPENSE', label: 'ব্যয়' },
          { value: 'INVESTMENT', label: 'বিনিয়োগ' },
        ]}
        onChange={v =>
          setForm(current => ({
            ...current,
            type: v as LedgerEntry['type'],
            category: 'OTHER',
            driverId: '',
          }))
        }
      />
      <Choice
        label="খাত"
        value={form.category}
        optional={false}
        options={categories.map(value => ({
          value,
          label: categoryLabels[value],
        }))}
        onChange={v => set('category', v)}
      />
      <Input
        label="শিরোনাম *"
        value={form.title}
        onChangeText={v => set('title', v)}
        maxLength={120}
      />
      <Input
        label="টাকার পরিমাণ (৳) *"
        value={form.amount}
        onChangeText={v => set('amount', v)}
        keyboardType="decimal-pad"
      />
      <Input
        label="তারিখ (YYYY-MM-DD)"
        value={form.date}
        onChangeText={v => set('date', v)}
        maxLength={10}
      />
      <Choice
        label="গাড়ি (প্রযোজ্য হলে)"
        value={form.vehicleId}
        options={transport.vehicles.map(item => ({
          value: item.id,
          label: item.name,
        }))}
        onChange={v => set('vehicleId', v)}
      />
      {form.type === 'EXPENSE' ? (
        <Choice
          label={
            form.category === 'SALARY'
              ? 'ড্রাইভার *'
              : 'ড্রাইভার (প্রযোজ্য হলে)'
          }
          value={form.driverId}
          onChange={v => set('driverId', v)}
          options={(data?.drivers || []).map(item => ({
            value: item.id,
            label: item.name,
          }))}
        />
      ) : null}
      <Input
        label={
          form.type === 'INVESTMENT' ? 'বিনিয়োগকারী / উদ্দেশ্য / নোট' : 'নোট'
        }
        value={form.note}
        onChangeText={v => set('note', v)}
        multiline
        maxLength={2000}
      />
      {form.type === 'INCOME' ? (
        <Text style={s.note}>
          শিক্ষার্থীর পরিশোধিত ভাড়া পেমেন্ট থেকে স্বয়ংক্রিয়ভাবে আসে। এখানে
          অতিরিক্ত আয় লিখুন।
        </Text>
      ) : null}
    </FormModal>
  );
}
export function AccountsScreen() {
  const { params } = useRoute();
  const { tab: initialTab } = (params || {}) as { tab?: LedgerEntry['type'] };
  const { data, loading, error, refresh } = useManagement();
  const { data: transport } = useData();
  const [tab, setTab] = useState<LedgerEntry['type']>(initialTab || 'INCOME');
  useEffect(() => {
    if (initialTab) setTab(initialTab);
  }, [initialTab]);
  const [month, setMonth] = useState(currentMonth);
  const [adding, setAdding] = useState(false);
  const ledger = (data?.ledger || []).filter(item =>
    item.date.startsWith(month),
  );
  const sum = (type: LedgerEntry['type']) =>
    ledger
      .filter(item => item.type === type)
      .reduce((total, item) => total + item.amount, 0);
  const fare = transport.bills
    .filter(
      item => item.status === 'PAID' && monthInDhaka(item.paidAt) === month,
    )
    .reduce((total, item) => total + item.amount, 0);
  const income = sum('INCOME') + fare;
  const expenses = sum('EXPENSE');
  const entries = ledger
    .filter(item => item.type === tab)
    .sort((a, b) => b.date.localeCompare(a.date));
  return (
    <AdminPage loading={loading} error={error} refresh={refresh}>
      <Input
        label="মাস (YYYY-MM)"
        value={month}
        onChangeText={setMonth}
        maxLength={7}
      />
      <Box>
        <View style={s.row}>
          <View style={s.summary}>
            <Text style={s.muted}>মোট আয়</Text>
            <Text style={s.summaryValue}>{money(income)}</Text>
          </View>
          <View style={[s.summary, s.dangerFill]}>
            <Text style={s.muted}>মোট ব্যয়</Text>
            <Text style={[s.summaryValue, s.red]}>{money(expenses)}</Text>
          </View>
        </View>
        <View style={s.profit}>
          <Text style={s.white}>
            {income - expenses >= 0 ? 'নিট লাভ' : 'নিট ক্ষতি'}
          </Text>
          <Text style={[s.summaryValue, s.white]}>
            {money(income - expenses)}
          </Text>
        </View>
        {tab === 'INVESTMENT' ? (
          <Detail label="মোট বিনিয়োগ" value={money(sum('INVESTMENT'))} />
        ) : null}
      </Box>
      <Tabs
        value={tab}
        onChange={v => setTab(v as LedgerEntry['type'])}
        options={[
          { value: 'INCOME', label: 'আয়' },
          { value: 'EXPENSE', label: 'ব্যয়' },
          { value: 'INVESTMENT', label: 'বিনিয়োগ' },
        ]}
      />
      <Box>
        <Heading
          title={
            tab === 'INCOME'
              ? 'আয়ের হিসাব'
              : tab === 'EXPENSE'
              ? 'ব্যয়ের হিসাব'
              : 'বিনিয়োগের হিসাব'
          }
          action="+ যোগ করুন"
          onAction={() => setAdding(true)}
        />
        {tab === 'INCOME' && fare > 0 ? (
          <View style={s.tableRow}>
            <NoorIcon name="payments" size={20} color={C.green} />
            <View style={s.flex}>
              <Text style={s.body}>শিক্ষার্থীর ভাড়া</Text>
              <Text style={s.muted}>পরিশোধিত পেমেন্ট</Text>
            </View>
            <Text style={[s.body, s.green]}>{money(fare)}</Text>
          </View>
        ) : null}
        {entries.map(item => (
          <View key={item.id} style={s.tableRow}>
            <NoorIcon
              name={item.type === 'EXPENSE' ? 'expense' : 'payments'}
              size={20}
              color={item.type === 'EXPENSE' ? C.red : C.green}
            />
            <View style={s.flex}>
              <Text style={s.body}>{item.title}</Text>
              <Text style={s.muted}>
                {categoryLabels[item.category] || item.category} ·{' '}
                {niceDate(item.date)}
              </Text>
              {item.note ? <Text style={s.muted}>{item.note}</Text> : null}
            </View>
            <Text style={[s.body, tab === 'EXPENSE' ? s.red : s.green]}>
              {money(item.amount)}
            </Text>
          </View>
        ))}
        {!entries.length && !(tab === 'INCOME' && fare > 0) ? (
          <EmptyState text="এই মাসে কোনো হিসাব নেই" />
        ) : null}
      </Box>
      <LedgerForm
        visible={adding}
        initialType={tab}
        onClose={() => setAdding(false)}
      />
    </AdminPage>
  );
}

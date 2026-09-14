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
import { useTranslation } from '../../i18n';
import { currentMonth, money, numberLabel, toPoisha } from '../../utils/format';
import { ValidationError, isValidDate } from '../../utils/validation';
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
  labelStatus,
  niceDate,
  s,
  today,
  useAction,
} from './AdminUi';

export function AttendanceScreen() {
  const { t } = useTranslation();
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
    action.clearFeedback();
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
          { value: 'STUDENT', label: t('Student') },
          { value: 'DRIVER', label: t('Driver') },
        ]}
      />
      <View style={s.row}>
        <View style={s.flex}>
          <Input
            label={t('Date (YYYY-MM-DD)')}
            value={date}
            error={action.fieldErrors.date}
            onChangeText={value => {
              action.clearFieldError('date');
              setDate(value);
            }}
            maxLength={10}
          />
        </View>
        <View style={s.flex}>
          <Choice
            label={t('Vehicle')}
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
              <Text style={s.muted}>{t(item.label)}</Text>
              <Text style={[s.summaryValue, { color: item.color }]}>
                {numberLabel(item.count)}
              </Text>
            </View>
          ))}
        </View>
        <Heading
          title={t('Total people: {{number}}', {
            number: numberLabel(people.length),
          })}
          action={t('Mark all present')}
          onAction={() => {
            setDraft(
              Object.fromEntries(people.map(item => [item.id, 'PRESENT'])),
            );
            setSaved(false);
          }}
        />
        <Text style={s.muted}>{t('Select attendance beside each name.')}</Text>
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
                  accessibilityLabel={`${person.name}: ${labelStatus(status)}`}
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
                      : t('L')}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ))}
        {!people.length ? (
          <EmptyState text={t('No records for this vehicle')} />
        ) : null}
        <Text style={s.muted}>
          {t('Not selected: {{number}}', {
            number: numberLabel(
              people.filter(item => !statusFor(item.id)).length,
            ),
          })}
        </Text>
        <ErrorText message={action.error} />
        {saved ? <Text style={s.note}>{t('Attendance saved.')}</Text> : null}
        <SmallButton
          title={t('Save')}
          busy={action.busy}
          disabled={!Object.keys(draft).length}
          onPress={() =>
            action.run(async () => {
              if (!isValidDate(date))
                throw new ValidationError({
                  date: 'Enter the date in YYYY-MM-DD format.',
                });
              const entries: AttendanceInput[] = people
                .filter(item => draft[item.id])
                .map(item => ({
                  ...(tab === 'STUDENT'
                    ? { studentId: item.id }
                    : { driverId: item.id }),
                  date,
                  status: draft[item.id],
                }));
              if (!entries.length) throw new Error('Select attendance first.');
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
// Keep the existing description values independent of the displayed language.
const services = [
  { value: 'তেল পরিবর্তন', label: 'Oil change' },
  { value: 'ব্যাটারি', label: 'Battery' },
  { value: 'টায়ার', label: 'Tyres' },
  { value: 'মেরামত', label: 'Repair' },
  { value: 'যন্ত্রাংশ', label: 'Parts' },
];
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
  const { t } = useTranslation();
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
      action.clearFeedback();
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
  const set = (key: string, value: string) => {
    action.clearFieldError(key);
    setForm(current => ({ ...current, [key]: value }));
  };
  return (
    <FormModal
      title={item ? t('Edit maintenance') : t('Add maintenance')}
      visible={visible}
      onClose={onClose}
      busy={action.busy}
      error={action.error}
      onSave={() =>
        action.run(async () => {
          const errors: Record<string, string> = {};
          if (!form.vehicleId) errors.vehicleId = 'Select a vehicle.';
          if (form.title.trim().length < 2)
            errors.title = 'Enter a title of at least 2 characters.';
          if (!isValidDate(form.serviceDate))
            errors.serviceDate = 'Enter the date in YYYY-MM-DD format.';
          if (form.nextServiceDate && !isValidDate(form.nextServiceDate))
            errors.nextServiceDate = 'Enter the date in YYYY-MM-DD format.';
          let amount = 0;
          if (
            form.amount.trim() &&
            !/^0+(\.0{1,2})?$/.test(form.amount.trim())
          ) {
            try {
              amount = toPoisha(form.amount);
            } catch (problem) {
              errors.amount = (problem as Error).message;
            }
          }
          if (Object.keys(errors).length) throw new ValidationError(errors);
          const input: MaintenanceInput = {
            ...form,
            title: form.title.trim(),
            nextServiceDate: form.nextServiceDate || null,
            amount,
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
        label={t('Vehicle *')}
        value={form.vehicleId}
        error={action.fieldErrors.vehicleId}
        onChange={v => set('vehicleId', v)}
        options={transport.vehicles.map(v => ({
          value: v.id,
          label: `${v.name} · ${v.plate}`,
        }))}
      />
      <Input
        label={t('Work title *')}
        value={form.title}
        error={action.fieldErrors.title}
        onChangeText={v => set('title', v)}
        maxLength={120}
      />
      <Heading title={t('Service tasks')} />
      {services.map(({ value: service, label }) => (
        <Pressable
          key={service}
          accessibilityRole="checkbox"
          accessibilityLabel={t(label)}
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
          <Text style={s.body}>{t(label)}</Text>
        </Pressable>
      ))}
      <Input
        label={t('Details')}
        value={form.description}
        error={action.fieldErrors.description}
        onChangeText={v => set('description', v)}
        multiline
        maxLength={2000}
      />
      <Input
        label={t('Service date (YYYY-MM-DD)')}
        value={form.serviceDate}
        error={action.fieldErrors.serviceDate}
        onChangeText={v => set('serviceDate', v)}
        maxLength={10}
      />
      <Input
        label={t('Next service (YYYY-MM-DD)')}
        value={form.nextServiceDate}
        error={action.fieldErrors.nextServiceDate}
        onChangeText={v => set('nextServiceDate', v)}
        maxLength={10}
      />
      <Input
        label={t('Total cost (৳)')}
        value={form.amount}
        error={action.fieldErrors.amount}
        onChangeText={v => set('amount', v)}
        keyboardType="decimal-pad"
      />
      <Choice
        label={t('Status')}
        value={form.status}
        error={action.fieldErrors.status}
        optional={false}
        onChange={v => set('status', v)}
        options={[
          { value: 'PLANNED', label: t('Planned') },
          { value: 'IN_PROGRESS', label: t('In progress') },
          { value: 'COMPLETED', label: t('Completed') },
        ]}
      />
      <Text style={s.note}>
        {t(
          'Completed work costs are automatically added to Income and expenses. Planned or ongoing work is not counted as an expense yet.',
        )}
      </Text>
    </FormModal>
  );
}
export function MaintenanceScreen() {
  const { t } = useTranslation();
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
        title={t('Vehicle service and repairs')}
        action={t('+ Add')}
        onAction={() => setEditing(null)}
      />
      <Choice
        label={t('Filter by vehicle')}
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
          <Detail label={t('Service')} value={niceDate(item.serviceDate)} />
          <Detail
            label={t('Next service')}
            value={niceDate(item.nextServiceDate)}
          />
          {item.description ? (
            <Text style={s.body}>{item.description}</Text>
          ) : null}
          <Detail label={t('Cost')} value={money(item.amount)} />
          <SmallButton
            title={t('Service details / Edit')}
            secondary
            onPress={() => setEditing(item)}
          />
        </Box>
      ))}
      {!records.length ? (
        <EmptyState
          text={t('No maintenance records')}
          detail={t('Add the first service record.')}
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
  OTHER: 'Other',
  SALARY: 'Driver salary',
  FUEL: 'Fuel',
  MAINTENANCE: 'Maintenance',
  REPAIR: 'Repair',
  PARTS: 'Parts',
  TAX: 'Tax / Fitness',
  OFFICE: 'Office expenses',
  VEHICLE: 'Vehicle investment',
  CAPITAL: 'Business capital',
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
  const { t } = useTranslation();
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
      action.clearFeedback();
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
  const set = (key: string, value: string) => {
    action.clearFieldError(key);
    setForm(current => ({ ...current, [key]: value }));
  };
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
          ? t('Add expense')
          : form.type === 'INVESTMENT'
          ? t('Add investment')
          : t('Add income')
      }
      visible={visible}
      onClose={onClose}
      busy={action.busy}
      error={action.error}
      onSave={() =>
        action.run(async () => {
          const errors: Record<string, string> = {};
          if (form.title.trim().length < 2)
            errors.title = 'Enter a title of at least 2 characters.';
          if (form.category === 'SALARY' && !form.driverId)
            errors.driverId = 'Select a driver for the salary payment.';
          if (!isValidDate(form.date))
            errors.date = 'Enter the date in YYYY-MM-DD format.';
          let amount = 0;
          try {
            amount = toPoisha(form.amount);
          } catch (problem) {
            errors.amount = (problem as Error).message;
          }
          if (Object.keys(errors).length) throw new ValidationError(errors);
          const input: LedgerInput = {
            type: form.type,
            category: form.category,
            title: form.title.trim(),
            amount,
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
        label={t('Entry type')}
        value={form.type}
        error={action.fieldErrors.type}
        optional={false}
        options={[
          { value: 'INCOME', label: t('Income') },
          { value: 'EXPENSE', label: t('Expense') },
          { value: 'INVESTMENT', label: t('Investment') },
        ]}
        onChange={v => {
          action.clearFeedback();
          setForm(current => ({
            ...current,
            type: v as LedgerEntry['type'],
            category: 'OTHER',
            driverId: '',
          }));
        }}
      />
      <Choice
        label={t('Category')}
        value={form.category}
        error={action.fieldErrors.category}
        optional={false}
        options={categories.map(value => ({
          value,
          label: t(categoryLabels[value]),
        }))}
        onChange={v => set('category', v)}
      />
      <Input
        label={t('Title *')}
        value={form.title}
        error={action.fieldErrors.title}
        onChangeText={v => set('title', v)}
        maxLength={120}
      />
      <Input
        label={t('Amount (৳) *')}
        value={form.amount}
        error={action.fieldErrors.amount}
        onChangeText={v => set('amount', v)}
        keyboardType="decimal-pad"
      />
      <Input
        label={t('Date (YYYY-MM-DD)')}
        value={form.date}
        error={action.fieldErrors.date}
        onChangeText={v => set('date', v)}
        maxLength={10}
      />
      <Choice
        label={t('Vehicle (if applicable)')}
        value={form.vehicleId}
        error={action.fieldErrors.vehicleId}
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
              ? t('Driver *')
              : t('Driver (if applicable)')
          }
          value={form.driverId}
          error={action.fieldErrors.driverId}
          onChange={v => set('driverId', v)}
          options={(data?.drivers || []).map(item => ({
            value: item.id,
            label: item.name,
          }))}
        />
      ) : null}
      <Input
        label={
          form.type === 'INVESTMENT'
            ? t('Investor / Purpose / Note')
            : t('Note')
        }
        value={form.note}
        error={action.fieldErrors.note}
        onChangeText={v => set('note', v)}
        multiline
        maxLength={2000}
      />
      {form.type === 'INCOME' ? (
        <Text style={s.note}>
          {t(
            'Paid student fares are added automatically from payments. Enter additional income here.',
          )}
        </Text>
      ) : null}
    </FormModal>
  );
}
export function AccountsScreen() {
  const { t } = useTranslation();
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
        label={t('Month (YYYY-MM)')}
        value={month}
        onChangeText={setMonth}
        maxLength={7}
      />
      <Box>
        <View style={s.row}>
          <View style={s.summary}>
            <Text style={s.muted}>{t('Total income')}</Text>
            <Text style={s.summaryValue}>{money(income)}</Text>
          </View>
          <View style={[s.summary, s.dangerFill]}>
            <Text style={s.muted}>{t('Total expenses')}</Text>
            <Text style={[s.summaryValue, s.red]}>{money(expenses)}</Text>
          </View>
        </View>
        <View style={s.profit}>
          <Text style={s.white}>
            {income - expenses >= 0 ? t('Net profit') : t('Net loss')}
          </Text>
          <Text style={[s.summaryValue, s.white]}>
            {money(income - expenses)}
          </Text>
        </View>
        {tab === 'INVESTMENT' ? (
          <Detail
            label={t('Total investment')}
            value={money(sum('INVESTMENT'))}
          />
        ) : null}
      </Box>
      <Tabs
        value={tab}
        onChange={v => setTab(v as LedgerEntry['type'])}
        options={[
          { value: 'INCOME', label: t('Income') },
          { value: 'EXPENSE', label: t('Expense') },
          { value: 'INVESTMENT', label: t('Investment') },
        ]}
      />
      <Box>
        <Heading
          title={
            tab === 'INCOME'
              ? t('Income records')
              : tab === 'EXPENSE'
              ? t('Expense records')
              : t('Investment records')
          }
          action={t('+ Add')}
          onAction={() => setAdding(true)}
        />
        {tab === 'INCOME' && fare > 0 ? (
          <View style={s.tableRow}>
            <NoorIcon name="payments" size={20} color={C.green} />
            <View style={s.flex}>
              <Text style={s.body}>{t('Student fares')}</Text>
              <Text style={s.muted}>{t('Paid payments')}</Text>
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
                {Object.prototype.hasOwnProperty.call(
                  categoryLabels,
                  item.category,
                )
                  ? t(categoryLabels[item.category])
                  : item.category}{' '}
                · {niceDate(item.date)}
              </Text>
              {item.note ? <Text style={s.muted}>{item.note}</Text> : null}
            </View>
            <Text style={[s.body, tab === 'EXPENSE' ? s.red : s.green]}>
              {money(item.amount)}
            </Text>
          </View>
        ))}
        {!entries.length && !(tab === 'INCOME' && fare > 0) ? (
          <EmptyState text={t('No account entries this month')} />
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

import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import {
  BusinessSettings,
  ManagementRequest,
  NoticeInput,
} from '../../api/management';
import { NoorIcon } from '../../components/Noor';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useManagement } from '../../context/ManagementContext';
import {
  AdminPage,
  Box,
  C,
  Choice,
  Detail,
  EmptyState,
  FormModal,
  Heading,
  Input,
  Pill,
  SmallButton,
  Tabs,
  contact,
  niceDate,
  s,
  today,
  useAction,
} from './AdminUi';

const noticeCategories = [
  { value: 'PAYMENT', label: 'মাসিক ভাড়া পরিশোধ' },
  { value: 'DELAY', label: 'গাড়ি দেরি' },
  { value: 'VEHICLE_CHANGE', label: 'গাড়ি পরিবর্তন' },
  { value: 'HOLIDAY', label: 'ছুটির নোটিশ' },
  { value: 'EMERGENCY', label: 'জরুরি নোটিশ' },
  { value: 'GENERAL', label: 'সাধারণ নোটিশ' },
];
export function NoticesScreen() {
  const { data, loading, error, refresh, mutate } = useManagement();
  const { data: transport } = useData();
  const action = useAction();
  const [adding, setAdding] = useState(false);
  const blank = () => ({
    title: '',
    body: '',
    category: 'GENERAL',
    audience: 'ALL' as NoticeInput['audience'],
    targetId: '',
  });
  const [form, setForm] = useState(blank);
  const targets =
    form.audience === 'STUDENT'
      ? (data?.students || []).map(item => ({
          value: item.id,
          label: `${item.studentName} · ${
            item.studentCode || item.guardianName
          }`,
        }))
      : form.audience === 'ROUTE'
      ? transport.routes.map(item => ({ value: item.id, label: item.name }))
      : transport.vehicles.map(item => ({ value: item.id, label: item.name }));
  const open = () => {
    setForm(blank());
    action.setError('');
    setAdding(true);
  };
  return (
    <AdminPage loading={loading} error={error} refresh={refresh}>
      <Heading title="অভিভাবকদের নোটিশ" action="+ তৈরি করুন" onAction={open} />
      {(data?.notices || []).map(item => (
        <Box key={item.id}>
          <View style={s.row}>
            <View
              style={[
                s.avatar,
                item.category === 'EMERGENCY' ? s.emergencyFill : s.warningFill,
              ]}
            >
              <NoorIcon
                name="bell"
                size={22}
                color={item.category === 'EMERGENCY' ? C.red : C.amber}
              />
            </View>
            <View style={s.flex}>
              <Text style={s.title}>{item.title}</Text>
              <Text style={s.muted}>{niceDate(item.createdAt)}</Text>
            </View>
          </View>
          <Text style={s.body}>{item.body}</Text>
          <Text style={s.muted}>
            {item.audience === 'ALL'
              ? 'সকল অভিভাবক'
              : item.audience === 'STUDENT'
              ? 'নির্দিষ্ট শিক্ষার্থীর অভিভাবক'
              : item.audience === 'ROUTE'
              ? 'নির্দিষ্ট রুটের অভিভাবক'
              : 'নির্দিষ্ট গাড়ির অভিভাবক'}
          </Text>
        </Box>
      ))}
      {!data?.notices.length ? (
        <EmptyState
          text="এখনো কোনো নোটিশ নেই"
          detail="নতুন নোটিশ তৈরি করে অভিভাবকদের জানান।"
        />
      ) : null}
      <FormModal
        title="নতুন নোটিশ"
        visible={adding}
        onClose={() => setAdding(false)}
        busy={action.busy}
        error={action.error}
        saveTitle="নোটিশ পাঠান"
        onSave={() =>
          action.run(async () => {
            if (!form.title.trim() || !form.body.trim())
              throw new Error('নোটিশের শিরোনাম ও বার্তা লিখুন।');
            if (form.audience !== 'ALL' && !form.targetId)
              throw new Error('যাকে পাঠাবেন তাকে নির্বাচন করুন।');
            await mutate('/admin/notices', {
              title: form.title.trim(),
              body: form.body.trim(),
              category: form.category,
              audience: form.audience,
              ...(form.audience !== 'ALL' ? { targetId: form.targetId } : {}),
            } satisfies NoticeInput);
            setAdding(false);
          })
        }
      >
        <Choice
          label="নোটিশের ধরন"
          value={form.category}
          optional={false}
          options={noticeCategories}
          onChange={category => setForm(current => ({ ...current, category }))}
        />
        <Input
          label="শিরোনাম *"
          value={form.title}
          onChangeText={title => setForm(current => ({ ...current, title }))}
          maxLength={160}
        />
        <Input
          label="বার্তা *"
          value={form.body}
          onChangeText={body => setForm(current => ({ ...current, body }))}
          multiline
          maxLength={2000}
        />
        <Choice
          label="যাকে পাঠাবেন"
          value={form.audience}
          optional={false}
          options={[
            { value: 'ALL', label: 'সকল অভিভাবক' },
            { value: 'ROUTE', label: 'নির্দিষ্ট রুট' },
            { value: 'VEHICLE', label: 'নির্দিষ্ট গাড়ি' },
            { value: 'STUDENT', label: 'নির্দিষ্ট শিক্ষার্থী' },
          ]}
          onChange={audience =>
            setForm(current => ({
              ...current,
              audience: audience as NoticeInput['audience'],
              targetId: '',
            }))
          }
        />
        {form.audience !== 'ALL' ? (
          <Choice
            label="প্রাপক নির্বাচন করুন"
            value={form.targetId}
            options={targets}
            onChange={targetId =>
              setForm(current => ({ ...current, targetId }))
            }
          />
        ) : null}
        <Text style={s.note}>
          নির্বাচিত অভিভাবকরা অ্যাপের নোটিফিকেশন ও নোটিশে এই বার্তা দেখতে পাবেন।
        </Text>
      </FormModal>
    </AdminPage>
  );
}
const requestCategories = [
  { value: 'ABSENCE', label: 'শিক্ষার্থীর অনুপস্থিতি' },
  { value: 'LEAVE', label: 'ড্রাইভারের ছুটি' },
  { value: 'MAINTENANCE', label: 'গাড়ির সার্ভিস' },
  { value: 'OTHER', label: 'অন্যান্য' },
];
export function RequestsScreen() {
  const { data, loading, error, refresh, mutate } = useManagement();
  const { data: transport } = useData();
  const action = useAction();
  const [tab, setTab] = useState('PENDING');
  const [selected, setSelected] = useState<ManagementRequest>();
  const [note, setNote] = useState('');
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [adding, setAdding] = useState(false);
  const blank = () => ({
    category: 'ABSENCE' as ManagementRequest['category'],
    title: '',
    description: '',
    studentId: '',
    driverId: '',
    vehicleId: '',
    date: today(),
  });
  const [form, setForm] = useState(blank);
  const records = (data?.requests || []).filter(item => item.status === tab);
  const review = (item: ManagementRequest, next: 'APPROVED' | 'REJECTED') => {
    setSelected(item);
    setDecision(next);
    setNote('');
    action.setError('');
  };
  return (
    <AdminPage loading={loading} error={error} refresh={refresh}>
      <Heading
        title="অভিভাবক ও ড্রাইভারের অনুরোধ"
        action="+ যোগ করুন"
        onAction={() => {
          setForm(blank());
          action.setError('');
          setAdding(true);
        }}
      />
      <Tabs
        value={tab}
        onChange={setTab}
        options={[
          {
            value: 'PENDING',
            label: `নতুন (${
              data?.requests.filter(item => item.status === 'PENDING').length ||
              0
            })`,
          },
          { value: 'APPROVED', label: 'অনুমোদিত' },
          { value: 'REJECTED', label: 'প্রত্যাখ্যাত' },
        ]}
      />
      {records.map(item => (
        <Box key={item.id}>
          <View style={s.row}>
            <NoorIcon name="requests" size={27} color={C.amber} />
            <View style={s.flex}>
              <Text style={s.heading}>{item.title}</Text>
              <Text style={s.muted}>
                {item.userName}
                {item.studentName ? ` · ${item.studentName}` : ''}
              </Text>
            </View>
            <Pill value={item.status} />
          </View>
          <Text style={s.body}>{item.description}</Text>
          <Text style={s.muted}>{niceDate(item.date || item.createdAt)}</Text>
          {item.note ? <Text style={s.note}>{item.note}</Text> : null}
          {item.status === 'PENDING' ? (
            <View style={s.row}>
              <View style={s.flex}>
                <SmallButton
                  title="অনুমোদন"
                  onPress={() => review(item, 'APPROVED')}
                />
              </View>
              <View style={s.flex}>
                <SmallButton
                  title="প্রত্যাখ্যান"
                  danger
                  onPress={() => review(item, 'REJECTED')}
                />
              </View>
            </View>
          ) : null}
        </Box>
      ))}
      {!records.length ? <EmptyState text="এই বিভাগে কোনো অনুরোধ নেই" /> : null}
      <FormModal
        title={
          decision === 'APPROVED' ? 'অনুরোধ অনুমোদন' : 'অনুরোধ প্রত্যাখ্যান'
        }
        visible={!!selected}
        onClose={() => setSelected(undefined)}
        busy={action.busy}
        error={action.error}
        saveTitle="সিদ্ধান্ত নিশ্চিত করুন"
        onSave={() =>
          action.run(async () => {
            if (!selected) return;
            if (decision === 'REJECTED' && !note.trim())
              throw new Error('প্রত্যাখ্যানের কারণ লিখুন।');
            await mutate(
              `/admin/management-requests/${selected.id}/decision`,
              { decision, note },
              'PATCH',
            );
            setSelected(undefined);
          })
        }
      >
        <Text style={s.title}>{selected?.title}</Text>
        <Text style={s.body}>{selected?.description}</Text>
        <Input
          label={
            decision === 'REJECTED'
              ? 'প্রত্যাখ্যানের কারণ *'
              : 'মন্তব্য (ঐচ্ছিক)'
          }
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={500}
        />
      </FormModal>
      <FormModal
        title="নতুন অনুরোধ"
        visible={adding}
        onClose={() => setAdding(false)}
        busy={action.busy}
        error={action.error}
        onSave={() =>
          action.run(async () => {
            if (
              form.title.trim().length < 2 ||
              form.description.trim().length < 5
            )
              throw new Error('শিরোনাম এবং অন্তত ৫ অক্ষরের বিস্তারিত লিখুন।');
            if (form.category === 'ABSENCE' && !form.studentId)
              throw new Error('শিক্ষার্থী নির্বাচন করুন।');
            if (form.category === 'LEAVE' && !form.driverId)
              throw new Error('ড্রাইভার নির্বাচন করুন।');
            await mutate('/management/requests', {
              category: form.category,
              title: form.title.trim(),
              description: form.description.trim(),
              ...(form.date ? { date: form.date } : {}),
              ...(form.studentId ? { studentId: form.studentId } : {}),
              ...(form.driverId ? { driverId: form.driverId } : {}),
              ...(form.vehicleId ? { vehicleId: form.vehicleId } : {}),
            });
            setAdding(false);
          })
        }
      >
        <Choice
          label="ধরন"
          value={form.category}
          optional={false}
          options={requestCategories}
          onChange={category =>
            setForm(current => ({
              ...current,
              category: category as ManagementRequest['category'],
              studentId: '',
              driverId: '',
              vehicleId: '',
            }))
          }
        />
        {form.category === 'ABSENCE' ? (
          <Choice
            label="শিক্ষার্থী"
            value={form.studentId}
            options={(data?.students || []).map(item => ({
              value: item.id,
              label: item.studentName,
            }))}
            onChange={studentId =>
              setForm(current => ({ ...current, studentId }))
            }
          />
        ) : form.category === 'LEAVE' ? (
          <Choice
            label="ড্রাইভার"
            value={form.driverId}
            options={(data?.drivers || []).map(item => ({
              value: item.id,
              label: item.name,
            }))}
            onChange={driverId =>
              setForm(current => ({ ...current, driverId }))
            }
          />
        ) : form.category === 'MAINTENANCE' ? (
          <Choice
            label="গাড়ি"
            value={form.vehicleId}
            options={transport.vehicles.map(item => ({
              value: item.id,
              label: item.name,
            }))}
            onChange={vehicleId =>
              setForm(current => ({ ...current, vehicleId }))
            }
          />
        ) : null}
        <Input
          label="শিরোনাম"
          value={form.title}
          onChangeText={title => setForm(current => ({ ...current, title }))}
          maxLength={160}
        />
        <Input
          label="বিস্তারিত"
          value={form.description}
          onChangeText={description =>
            setForm(current => ({ ...current, description }))
          }
          multiline
          maxLength={2000}
        />
        <Input
          label="তারিখ (YYYY-MM-DD)"
          value={form.date}
          onChangeText={date => setForm(current => ({ ...current, date }))}
          maxLength={10}
        />
      </FormModal>
    </AdminPage>
  );
}
const templateLabels: { key: keyof BusinessSettings; title: string }[] = [
  { key: 'paymentReminder', title: 'পেমেন্ট রিমাইন্ডার' },
  { key: 'absenceMessage', title: 'অনুপস্থিতির বার্তা' },
  { key: 'delayMessage', title: 'গাড়ি দেরি' },
  { key: 'holidayMessage', title: 'ছুটির বার্তা' },
  { key: 'emergencyMessage', title: 'জরুরি বার্তা' },
];
export function CommunicationScreen() {
  const { data, loading, error, refresh } = useManagement();
  const { data: transport } = useData();
  const action = useAction();
  const [composer, setComposer] = useState<'whatsapp' | 'sms' | 'call'>();
  const [group, setGroup] = useState('GUARDIAN');
  const [filter, setFilter] = useState('');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const open = (
    channel: 'whatsapp' | 'sms' | 'call',
    kind: string,
    text = '',
  ) => {
    action.setError('');
    setComposer(channel);
    setGroup(kind);
    setFilter('');
    setRecipient('');
    setMessage(text);
  };
  const guardians = (data?.students || [])
    .filter(
      item =>
        (group !== 'ROUTE' && group !== 'VEHICLE') ||
        (group === 'ROUTE' ? item.routeId : item.vehicleId) === filter,
    )
    .map(item => ({
      value: item.guardianPhone,
      label: `${item.guardianName} · ${item.studentName}`,
    }));
  const recipients = Array.from(
    new Map(
      (group === 'DRIVER'
        ? (data?.drivers || []).map(item => ({
            value: item.phone,
            label: item.name,
          }))
        : guardians
      )
        .filter(item => item.value)
        .map(item => [item.value, item]),
    ).values(),
  );
  const row = (
    title: string,
    icon: string,
    onPress: () => void,
    color = C.green,
  ) => (
    <Pressable
      key={title}
      accessibilityRole="button"
      onPress={onPress}
      style={[s.row, s.contactRow]}
    >
      <View style={[s.avatar, s.contactIcon, { backgroundColor: color }]}>
        <NoorIcon name={icon} size={18} color={C.white} />
      </View>
      <Text style={[s.body, s.flex]}>{title}</Text>
      <Text style={s.muted}>›</Text>
    </Pressable>
  );
  return (
    <AdminPage loading={loading} error={error} refresh={refresh}>
      <Box>
        <Heading title="WhatsApp" />
        {row('অভিভাবকের সঙ্গে যোগাযোগ', 'whatsapp', () =>
          open('whatsapp', 'GUARDIAN'),
        )}
        {row('ড্রাইভারের সঙ্গে যোগাযোগ', 'whatsapp', () =>
          open('whatsapp', 'DRIVER'),
        )}
        {row('গাড়ি ভিত্তিক যোগাযোগ', 'vehicles', () =>
          open('whatsapp', 'VEHICLE'),
        )}
        {row('রুট ভিত্তিক যোগাযোগ', 'routes', () => open('whatsapp', 'ROUTE'))}
      </Box>
      <Box>
        <Heading title="SMS পাঠান" />
        {templateLabels.map(template =>
          row(
            template.title,
            'sms',
            () => open('sms', 'GUARDIAN', data?.settings[template.key] || ''),
            C.blue,
          ),
        )}
        {row('কাস্টম SMS', 'sms', () => open('sms', 'GUARDIAN'), C.blue)}
      </Box>
      <Box>
        <Heading title="ফোন কল" />
        {row('অভিভাবককে কল করুন', 'phone', () => open('call', 'GUARDIAN'))}
        {row('ড্রাইভারকে কল করুন', 'phone', () => open('call', 'DRIVER'))}
      </Box>
      <FormModal
        title={
          composer === 'whatsapp'
            ? 'WhatsApp যোগাযোগ'
            : composer === 'sms'
            ? 'SMS বার্তা'
            : 'ফোন কল'
        }
        visible={!!composer}
        onClose={() => setComposer(undefined)}
        busy={action.busy}
        error={action.error}
        saveTitle={
          composer === 'call'
            ? 'কল করুন'
            : composer === 'sms'
            ? 'SMS অ্যাপে খুলুন'
            : 'WhatsApp-এ খুলুন'
        }
        onSave={() =>
          action.run(async () => {
            if (!composer) return;
            if (!recipient) throw new Error('প্রাপক নির্বাচন করুন।');
            if (composer !== 'call' && !message.trim())
              throw new Error('বার্তা লিখুন।');
            await contact(recipient, composer, message);
          })
        }
      >
        <Choice
          label="যোগাযোগের ধরন"
          value={group}
          optional={false}
          onChange={value => {
            setGroup(value);
            setRecipient('');
            setFilter('');
          }}
          options={[
            { value: 'GUARDIAN', label: 'অভিভাবক' },
            { value: 'DRIVER', label: 'ড্রাইভার' },
            { value: 'VEHICLE', label: 'গাড়ি ভিত্তিক' },
            { value: 'ROUTE', label: 'রুট ভিত্তিক' },
          ]}
        />
        {group === 'ROUTE' || group === 'VEHICLE' ? (
          <Choice
            label={group === 'ROUTE' ? 'রুট' : 'গাড়ি'}
            value={filter}
            onChange={value => {
              setFilter(value);
              setRecipient('');
            }}
            options={(group === 'ROUTE'
              ? transport.routes
              : transport.vehicles
            ).map(item => ({ value: item.id, label: item.name }))}
          />
        ) : null}
        <Choice
          label="প্রাপক"
          value={recipient}
          onChange={setRecipient}
          options={recipients}
        />
        {!recipients.length ? (
          <Text style={s.muted}>এই তালিকায় কোনো যোগাযোগ নম্বর নেই।</Text>
        ) : null}
        {composer !== 'call' ? (
          <>
            <Input
              label="বার্তা"
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={2000}
            />
            <Text style={s.note}>
              বার্তাটি নির্বাচিত অ্যাপে খুলবে। সেখান থেকে পাঠানো নিশ্চিত করুন।
            </Text>
          </>
        ) : null}
      </FormModal>
    </AdminPage>
  );
}
type SettingSection =
  | 'BUSINESS'
  | 'PROFILE'
  | 'SMS'
  | 'WHATSAPP'
  | 'EMERGENCY'
  | 'SECURITY';
export function SettingsScreen() {
  const { data, loading, error, refresh, mutate } = useManagement();
  const { session, updateProfile, signOut } = useAuth();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const action = useAction();
  const [section, setSection] = useState<SettingSection>();
  const [name, setName] = useState('');
  const [form, setForm] = useState<Partial<BusinessSettings>>({});
  const isAdmin = session?.user.role === 'ADMIN';
  const open = (next: SettingSection) => {
    if (!isAdmin && !['PROFILE', 'SECURITY'].includes(next)) return;
    action.setError('');
    setForm({ ...data?.settings });
    setName(session?.user.name || '');
    setSection(next);
  };
  const rows: { title: string; icon: string; onPress: () => void }[] = [
    {
      title: 'ব্যবসার তথ্য',
      icon: 'business',
      onPress: () => open('BUSINESS'),
    },
    {
      title: 'অ্যাডমিন প্রোফাইল',
      icon: 'user',
      onPress: () => open('PROFILE'),
    },
    {
      title: 'পেমেন্ট পদ্ধতি',
      icon: 'payments',
      onPress: () => navigation.navigate('PaymentAccounts'),
    },
    { title: 'SMS সেটিংস', icon: 'sms', onPress: () => open('SMS') },
    {
      title: 'WhatsApp সেটিংস',
      icon: 'whatsapp',
      onPress: () => open('WHATSAPP'),
    },
    {
      title: 'জরুরি যোগাযোগ',
      icon: 'emergency',
      onPress: () => open('EMERGENCY'),
    },
    {
      title: 'অ্যাকাউন্ট ও নিরাপত্তা',
      icon: 'lock',
      onPress: () => open('SECURITY'),
    },
  ];
  const input = (
    key: keyof BusinessSettings,
    label: string,
    multiline = false,
  ) => (
    <Input
      key={key}
      label={label}
      value={form[key] || ''}
      onChangeText={value => setForm(current => ({ ...current, [key]: value }))}
      multiline={multiline}
      maxLength={
        key === 'address'
          ? 500
          : multiline
          ? 1000
          : key === 'businessName'
          ? 120
          : 30
      }
      keyboardType={
        key.toLowerCase().includes('phone') || key === 'whatsappNumber'
          ? 'phone-pad'
          : 'default'
      }
    />
  );
  const title =
    rows.find(
      item =>
        ({
          BUSINESS: 'ব্যবসার তথ্য',
          PROFILE: 'অ্যাডমিন প্রোফাইল',
          SMS: 'SMS সেটিংস',
          WHATSAPP: 'WhatsApp সেটিংস',
          EMERGENCY: 'জরুরি যোগাযোগ',
          SECURITY: 'অ্যাকাউন্ট ও নিরাপত্তা',
        }[section || 'BUSINESS'] === item.title),
    )?.title || 'সেটিংস';
  return (
    <AdminPage loading={loading} error={error} refresh={refresh}>
      <Box>
        {rows
          .filter(
            item =>
              isAdmin ||
              item.title === 'অ্যাডমিন প্রোফাইল' ||
              item.title === 'অ্যাকাউন্ট ও নিরাপত্তা',
          )
          .map(item => (
            <Pressable
              key={item.title}
              accessibilityRole="button"
              onPress={item.onPress}
              style={s.tableRow}
            >
              <NoorIcon name={item.icon} size={20} color={C.green} />
              <Text style={[s.body, s.flex]}>
                {!isAdmin && item.title === 'অ্যাডমিন প্রোফাইল'
                  ? 'আমার প্রোফাইল'
                  : item.title}
              </Text>
              <Text style={s.muted}>›</Text>
            </Pressable>
          ))}
      </Box>
      <Box>
        <Heading title="ভাষা / Language" />
        <LanguageSwitcher />
      </Box>
      <Text style={[s.muted, s.centered]}>
        NOOR TRANSPORT · Safe Journey, Bright Future
      </Text>
      <FormModal
        title={title}
        visible={!!section}
        onClose={() => setSection(undefined)}
        busy={action.busy}
        error={action.error}
        saveTitle={section === 'SECURITY' ? 'লগ আউট' : 'সংরক্ষণ করুন'}
        onSave={() =>
          action.run(async () => {
            if (section === 'SECURITY') {
              await signOut();
              return;
            }
            if (section === 'PROFILE') await updateProfile({ name });
            else {
              if (!isAdmin) throw new Error('এই সেটিংস পরিবর্তনের অনুমতি নেই।');
              const keys: (keyof BusinessSettings)[] =
                section === 'BUSINESS'
                  ? ['businessName', 'phone', 'address']
                  : section === 'SMS'
                  ? templateLabels.map(item => item.key)
                  : section === 'WHATSAPP'
                  ? ['whatsappNumber']
                  : ['emergencyPhone'];
              if (section === 'BUSINESS' && !form.businessName?.trim())
                throw new Error('ব্যবসার নাম লিখুন।');
              await mutate(
                '/admin/settings',
                Object.fromEntries(
                  keys.map(key => [key, (form[key] || '').trim()]),
                ),
                'PATCH',
              );
            }
            setSection(undefined);
          })
        }
      >
        {section === 'BUSINESS' ? (
          <>
            {input('businessName', 'ব্যবসার নাম')}
            {input('phone', 'অফিসের ফোন নম্বর')}
            {input('address', 'ঠিকানা', true)}
          </>
        ) : section === 'PROFILE' ? (
          <>
            <Input
              label={isAdmin ? 'অ্যাডমিনের নাম' : 'আপনার নাম'}
              value={name}
              onChangeText={setName}
              maxLength={80}
            />
            <Detail label="মোবাইল" value={session?.user.phone} />
            <Detail label="ভূমিকা" value={isAdmin ? 'Admin' : 'Parent'} />
          </>
        ) : section === 'SMS' ? (
          <>
            {templateLabels.map(item => input(item.key, item.title, true))}
            <Text style={s.note}>
              যোগাযোগ কেন্দ্র থেকে এই টেমপ্লেটগুলো SMS অ্যাপে ব্যবহার করুন।
            </Text>
          </>
        ) : section === 'WHATSAPP' ? (
          <>
            {input('whatsappNumber', 'অফিসের WhatsApp নম্বর')}
            <Text style={s.note}>
              অভিভাবকরা এই নম্বরে অফিসের সঙ্গে যোগাযোগ করতে পারবেন।
            </Text>
          </>
        ) : section === 'EMERGENCY' ? (
          <>
            {input('emergencyPhone', 'জরুরি যোগাযোগ নম্বর')}
            <Text style={s.note}>
              অভিভাবকদের জরুরি যোগাযোগে এই নম্বর দেখাবে।
            </Text>
          </>
        ) : (
          <>
            <Detail label="অ্যাকাউন্ট" value={session?.user.name} />
            <Detail label="মোবাইল" value={session?.user.phone} />
            <Text style={s.body}>
              লগ আউট করলে এই ডিভাইসের সেশন বন্ধ হবে। আবার ব্যবহার করতে লগইন
              করুন।
            </Text>
          </>
        )}
      </FormModal>
    </AdminPage>
  );
}

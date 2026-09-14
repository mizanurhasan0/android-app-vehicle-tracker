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
import { useTranslation } from '../../i18n';
import { numberLabel } from '../../utils/format';
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
  { value: 'PAYMENT', label: 'Monthly fare payment' },
  { value: 'DELAY', label: 'Vehicle delay' },
  { value: 'VEHICLE_CHANGE', label: 'Vehicle change' },
  { value: 'HOLIDAY', label: 'Holiday notice' },
  { value: 'EMERGENCY', label: 'Emergency notice' },
  { value: 'GENERAL', label: 'General notice' },
];
export function NoticesScreen() {
  const { t } = useTranslation();
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
      <Heading
        title={t('Notices for guardians')}
        action={t('+ Create')}
        onAction={open}
      />
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
              ? t('All guardians')
              : item.audience === 'STUDENT'
              ? t("Selected student's guardian")
              : item.audience === 'ROUTE'
              ? t('Guardians on a selected route')
              : t('Guardians of a selected vehicle')}
          </Text>
        </Box>
      ))}
      {!data?.notices.length ? (
        <EmptyState
          text={t('No notices yet')}
          detail={t('Create a notice to inform guardians.')}
        />
      ) : null}
      <FormModal
        title={t('New notice')}
        visible={adding}
        onClose={() => setAdding(false)}
        busy={action.busy}
        error={action.error}
        saveTitle={t('Send notice')}
        onSave={() =>
          action.run(async () => {
            if (!form.title.trim() || !form.body.trim())
              throw new Error('Enter a notice title and message.');
            if (form.audience !== 'ALL' && !form.targetId)
              throw new Error('Select who should receive the notice.');
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
          label={t('Notice category')}
          value={form.category}
          optional={false}
          options={noticeCategories.map(item => ({
            ...item,
            label: t(item.label),
          }))}
          onChange={category => setForm(current => ({ ...current, category }))}
        />
        <Input
          label={t('Title *')}
          value={form.title}
          onChangeText={title => setForm(current => ({ ...current, title }))}
          maxLength={160}
        />
        <Input
          label={t('Message *')}
          value={form.body}
          onChangeText={body => setForm(current => ({ ...current, body }))}
          multiline
          maxLength={2000}
        />
        <Choice
          label={t('Send to')}
          value={form.audience}
          optional={false}
          options={[
            { value: 'ALL', label: t('All guardians') },
            { value: 'ROUTE', label: t('Selected route') },
            { value: 'VEHICLE', label: t('Selected vehicle') },
            { value: 'STUDENT', label: t('Selected student') },
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
            label={t('Select recipient')}
            value={form.targetId}
            options={targets}
            onChange={targetId =>
              setForm(current => ({ ...current, targetId }))
            }
          />
        ) : null}
        <Text style={s.note}>
          {t(
            'Selected guardians will see this message in app notifications and notices.',
          )}
        </Text>
      </FormModal>
    </AdminPage>
  );
}
const requestCategories = [
  { value: 'ABSENCE', label: 'Student absence' },
  { value: 'LEAVE', label: 'Driver leave' },
  { value: 'MAINTENANCE', label: 'Vehicle service' },
  { value: 'OTHER', label: 'Other' },
];
export function RequestsScreen() {
  const { t } = useTranslation();
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
        title={t('Guardian and driver requests')}
        action={t('+ Add')}
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
            label: t('New ({{number}})', {
              number: numberLabel(
                data?.requests.filter(item => item.status === 'PENDING')
                  .length || 0,
              ),
            }),
          },
          { value: 'APPROVED', label: t('Approved') },
          { value: 'REJECTED', label: t('Rejected') },
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
                  title={t('Approve')}
                  onPress={() => review(item, 'APPROVED')}
                />
              </View>
              <View style={s.flex}>
                <SmallButton
                  title={t('Reject')}
                  danger
                  onPress={() => review(item, 'REJECTED')}
                />
              </View>
            </View>
          ) : null}
        </Box>
      ))}
      {!records.length ? (
        <EmptyState text={t('No requests in this category')} />
      ) : null}
      <FormModal
        title={
          decision === 'APPROVED' ? t('Approve request') : t('Reject request')
        }
        visible={!!selected}
        onClose={() => setSelected(undefined)}
        busy={action.busy}
        error={action.error}
        saveTitle={t('Confirm decision')}
        onSave={() =>
          action.run(async () => {
            if (!selected) return;
            if (decision === 'REJECTED' && !note.trim())
              throw new Error('Enter a reason for rejection.');
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
              ? t('Reason for rejection *')
              : t('Comment (optional)')
          }
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={500}
        />
      </FormModal>
      <FormModal
        title={t('New request')}
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
              throw new Error(
                'Enter a title and a description of at least 5 characters.',
              );
            if (form.category === 'ABSENCE' && !form.studentId)
              throw new Error('Select a student.');
            if (form.category === 'LEAVE' && !form.driverId)
              throw new Error('Select a driver.');
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
          label={t('Type')}
          value={form.category}
          optional={false}
          options={requestCategories.map(item => ({
            ...item,
            label: t(item.label),
          }))}
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
            label={t('Student')}
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
            label={t('Driver')}
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
            label={t('Vehicle')}
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
          label={t('Title')}
          value={form.title}
          onChangeText={title => setForm(current => ({ ...current, title }))}
          maxLength={160}
        />
        <Input
          label={t('Description')}
          value={form.description}
          onChangeText={description =>
            setForm(current => ({ ...current, description }))
          }
          multiline
          maxLength={2000}
        />
        <Input
          label={t('Date (YYYY-MM-DD)')}
          value={form.date}
          onChangeText={date => setForm(current => ({ ...current, date }))}
          maxLength={10}
        />
      </FormModal>
    </AdminPage>
  );
}
const templateLabels: { key: keyof BusinessSettings; title: string }[] = [
  { key: 'paymentReminder', title: 'Payment reminder' },
  { key: 'absenceMessage', title: 'Absence message' },
  { key: 'delayMessage', title: 'Vehicle delay' },
  { key: 'holidayMessage', title: 'Holiday message' },
  { key: 'emergencyMessage', title: 'Emergency message' },
];
export function CommunicationScreen() {
  const { t } = useTranslation();
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
      <Text style={[s.body, s.flex]}>{t(title)}</Text>
      <Text style={s.muted}>›</Text>
    </Pressable>
  );
  return (
    <AdminPage loading={loading} error={error} refresh={refresh}>
      <Box>
        <Heading title="WhatsApp" />
        {row('Contact a guardian', 'whatsapp', () =>
          open('whatsapp', 'GUARDIAN'),
        )}
        {row('Contact a driver', 'whatsapp', () => open('whatsapp', 'DRIVER'))}
        {row('Contact by vehicle', 'vehicles', () =>
          open('whatsapp', 'VEHICLE'),
        )}
        {row('Contact by route', 'routes', () => open('whatsapp', 'ROUTE'))}
      </Box>
      <Box>
        <Heading title={t('Send SMS')} />
        {templateLabels.map(template =>
          row(
            template.title,
            'sms',
            () => open('sms', 'GUARDIAN', data?.settings[template.key] || ''),
            C.blue,
          ),
        )}
        {row('Custom SMS', 'sms', () => open('sms', 'GUARDIAN'), C.blue)}
      </Box>
      <Box>
        <Heading title={t('Phone call')} />
        {row('Call a guardian', 'phone', () => open('call', 'GUARDIAN'))}
        {row('Call a driver', 'phone', () => open('call', 'DRIVER'))}
      </Box>
      <FormModal
        title={
          composer === 'whatsapp'
            ? t('WhatsApp contact')
            : composer === 'sms'
            ? t('SMS message')
            : t('Phone call')
        }
        visible={!!composer}
        onClose={() => setComposer(undefined)}
        busy={action.busy}
        error={action.error}
        saveTitle={
          composer === 'call'
            ? t('Call')
            : composer === 'sms'
            ? t('Open in SMS app')
            : t('Open in WhatsApp')
        }
        onSave={() =>
          action.run(async () => {
            if (!composer) return;
            if (!recipient) throw new Error('Select a recipient.');
            if (composer !== 'call' && !message.trim())
              throw new Error('Enter a message.');
            await contact(recipient, composer, message);
          })
        }
      >
        <Choice
          label={t('Contact type')}
          value={group}
          optional={false}
          onChange={value => {
            setGroup(value);
            setRecipient('');
            setFilter('');
          }}
          options={[
            { value: 'GUARDIAN', label: t('Guardian') },
            { value: 'DRIVER', label: t('Driver') },
            { value: 'VEHICLE', label: t('By vehicle') },
            { value: 'ROUTE', label: t('By route') },
          ]}
        />
        {group === 'ROUTE' || group === 'VEHICLE' ? (
          <Choice
            label={group === 'ROUTE' ? t('Route') : t('Vehicle')}
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
          label={t('Recipient')}
          value={recipient}
          onChange={setRecipient}
          options={recipients}
        />
        {!recipients.length ? (
          <Text style={s.muted}>{t('No contact numbers in this list.')}</Text>
        ) : null}
        {composer !== 'call' ? (
          <>
            <Input
              label={t('Message')}
              value={message}
              onChangeText={setMessage}
              multiline
              maxLength={2000}
            />
            <Text style={s.note}>
              {t(
                'The message will open in the selected app. Confirm sending it there.',
              )}
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
  const { t } = useTranslation();
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
  const rows: {
    id: SettingSection | 'PAYMENTS';
    title: string;
    icon: string;
    onPress: () => void;
  }[] = [
    {
      id: 'BUSINESS',
      title: 'Business information',
      icon: 'business',
      onPress: () => open('BUSINESS'),
    },
    {
      id: 'PROFILE',
      title: 'Admin profile',
      icon: 'user',
      onPress: () => open('PROFILE'),
    },
    {
      id: 'PAYMENTS',
      title: 'Payment methods',
      icon: 'payments',
      onPress: () => navigation.navigate('PaymentAccounts'),
    },
    {
      id: 'SMS',
      title: 'SMS settings',
      icon: 'sms',
      onPress: () => open('SMS'),
    },
    {
      id: 'WHATSAPP',
      title: 'WhatsApp settings',
      icon: 'whatsapp',
      onPress: () => open('WHATSAPP'),
    },
    {
      id: 'EMERGENCY',
      title: 'Emergency contact',
      icon: 'emergency',
      onPress: () => open('EMERGENCY'),
    },
    {
      id: 'SECURITY',
      title: 'Account and security',
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
      label={t(label)}
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
    !isAdmin && section === 'PROFILE'
      ? 'My profile'
      : rows.find(item => item.id === section)?.title || 'Settings';
  return (
    <AdminPage loading={loading} error={error} refresh={refresh}>
      <Box>
        {rows
          .filter(
            item => isAdmin || item.id === 'PROFILE' || item.id === 'SECURITY',
          )
          .map(item => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={item.onPress}
              style={s.tableRow}
            >
              <NoorIcon name={item.icon} size={20} color={C.green} />
              <Text style={[s.body, s.flex]}>
                {!isAdmin && item.id === 'PROFILE'
                  ? t('My profile')
                  : t(item.title)}
              </Text>
              <Text style={s.muted}>›</Text>
            </Pressable>
          ))}
      </Box>
      <Box>
        <Heading title={t('Language')} />
        <LanguageSwitcher />
      </Box>
      <Text style={[s.muted, s.centered]}>
        NOOR TRANSPORT · {t('Safe Journey, Bright Future')}
      </Text>
      <FormModal
        title={t(title)}
        visible={!!section}
        onClose={() => setSection(undefined)}
        busy={action.busy}
        error={action.error}
        saveTitle={section === 'SECURITY' ? t('Sign out') : t('Save')}
        onSave={() =>
          action.run(async () => {
            if (section === 'SECURITY') {
              await signOut();
              return;
            }
            if (section === 'PROFILE') await updateProfile({ name });
            else {
              if (!isAdmin)
                throw new Error(
                  'You do not have permission to change these settings.',
                );
              const keys: (keyof BusinessSettings)[] =
                section === 'BUSINESS'
                  ? ['businessName', 'phone', 'address']
                  : section === 'SMS'
                  ? templateLabels.map(item => item.key)
                  : section === 'WHATSAPP'
                  ? ['whatsappNumber']
                  : ['emergencyPhone'];
              if (section === 'BUSINESS' && !form.businessName?.trim())
                throw new Error('Enter the business name.');
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
            {input('businessName', 'Business name')}
            {input('phone', 'Office phone number')}
            {input('address', 'Address', true)}
          </>
        ) : section === 'PROFILE' ? (
          <>
            <Input
              label={isAdmin ? t('Admin name') : t('Your name')}
              value={name}
              onChangeText={setName}
              maxLength={80}
            />
            <Detail label={t('Mobile')} value={session?.user.phone} />
            <Detail label={t('Role')} value={t(isAdmin ? 'Admin' : 'Parent')} />
          </>
        ) : section === 'SMS' ? (
          <>
            {templateLabels.map(item => input(item.key, item.title, true))}
            <Text style={s.note}>
              {t(
                'Use these templates in the SMS app from the communication center.',
              )}
            </Text>
          </>
        ) : section === 'WHATSAPP' ? (
          <>
            {input('whatsappNumber', 'Office WhatsApp number')}
            <Text style={s.note}>
              {t('Guardians can contact the office at this number.')}
            </Text>
          </>
        ) : section === 'EMERGENCY' ? (
          <>
            {input('emergencyPhone', 'Emergency contact number')}
            <Text style={s.note}>
              {t("This number will appear in guardians' emergency contacts.")}
            </Text>
          </>
        ) : (
          <>
            <Detail label={t('Account')} value={session?.user.name} />
            <Detail label={t('Mobile')} value={session?.user.phone} />
            <Text style={s.body}>
              {t(
                'Signing out ends the session on this device. Sign in to use it again.',
              )}
            </Text>
          </>
        )}
      </FormModal>
    </AdminPage>
  );
}

import React, { useState } from 'react';
import { Pressable, Text } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { BusinessSettings } from '../../../api/management';
import { NoorIcon } from '../../../components/Noor';
import { LanguageSwitcher } from '../../../components/LanguageSwitcher';
import { useAuth } from '../../../context/AuthContext';
import { useManagement } from '../../../context/ManagementContext';
import { useTranslation } from '../../../i18n';
import { ValidationError } from '../../../utils/validation';
import {
  transportShifts,
  defaultOperatingDays,
} from '../../../utils/transport';
import { WeekdaySelector } from '../../../components/TransportSchedule';
import {
  AdminPage,
  Box,
  C,
  Detail,
  FormModal,
  Heading,
  Input,
  SmallButton,
  s,
  useAction,
} from '../AdminUi';
import { TextSettingKey, templateLabels } from './messageTemplates';

type SettingSection =
  | 'BUSINESS'
  | 'TRANSPORT'
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
  const [existingShiftIds, setExistingShiftIds] = useState<string[]>([]);
  const [form, setForm] = useState<Partial<BusinessSettings>>({});
  const isAdmin = session?.user.role === 'ADMIN';
  const open = (next: SettingSection) => {
    if (!isAdmin && !['PROFILE', 'SECURITY'].includes(next)) return;
    action.clearFeedback();
    setForm({
      ...data?.settings,
      operatingDays: defaultOperatingDays(data?.settings),
      transportShifts: transportShifts(data?.settings).map(shift => ({
        ...shift,
      })),
    });
    setExistingShiftIds(transportShifts(data?.settings).map(shift => shift.id));
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
      id: 'TRANSPORT',
      title: 'Transport shifts and weekdays',
      icon: 'calendar',
      onPress: () => open('TRANSPORT'),
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
  const input = (key: TextSettingKey, label: string, multiline = false) => (
    <Input
      key={key}
      label={t(label)}
      value={form[key] || ''}
      error={action.fieldErrors[key]}
      onChangeText={value => {
        action.clearFieldError(key);
        setForm(current => ({ ...current, [key]: value }));
      }}
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
              <NoorIcon name="chevron" size={18} color={C.muted} />
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
            if (section === 'PROFILE') {
              if (name.trim().length < 2)
                throw new ValidationError({
                  name: 'Enter a name of at least 2 characters.',
                });
              await updateProfile({ name: name.trim() });
            } else if (section === 'TRANSPORT') {
              if (!isAdmin)
                throw new Error(
                  'You do not have permission to change these settings.',
                );
              const errors: Record<string, string> = {};
              if (!form.operatingDays?.length)
                errors.operatingDays = 'Select at least one operating day.';
              const shifts = form.transportShifts || [];
              if (
                !shifts.length ||
                shifts.some(
                  shift =>
                    !shift.id ||
                    !shift.name.trim() ||
                    !/^([01]\d|2[0-3]):[0-5]\d$/.test(shift.startTime) ||
                    !/^([01]\d|2[0-3]):[0-5]\d$/.test(shift.endTime) ||
                    shift.startTime >= shift.endTime,
                ) ||
                new Set(shifts.map(shift => shift.id)).size !== shifts.length
              )
                errors.transportShifts =
                  'Each shift needs a name and valid start and return times.';
              if (Object.keys(errors).length) throw new ValidationError(errors);
              await mutate(
                '/admin/settings',
                {
                  operatingDays: form.operatingDays,
                  transportShifts: shifts.map(shift => ({
                    ...shift,
                    name: shift.name.trim(),
                  })),
                },
                'PATCH',
              );
            } else {
              if (!isAdmin)
                throw new Error(
                  'You do not have permission to change these settings.',
                );
              const keys: TextSettingKey[] =
                section === 'BUSINESS'
                  ? ['businessName', 'phone', 'address']
                  : section === 'SMS'
                  ? templateLabels.map(item => item.key)
                  : section === 'WHATSAPP'
                  ? ['whatsappNumber']
                  : ['emergencyPhone'];
              const errors: Record<string, string> = {};
              if (
                section === 'BUSINESS' &&
                (form.businessName?.trim().length || 0) < 2
              )
                errors.businessName = 'Enter a name of at least 2 characters.';
              for (const key of keys) {
                if (
                  ['phone', 'whatsappNumber', 'emergencyPhone'].includes(key) &&
                  form[key]?.trim() &&
                  !(
                    key === 'emergencyPhone' ? /^\+?\d{3,15}$/ : /^\+?\d{7,15}$/
                  ).test(form[key]!.replace(/[ ()-]/g, ''))
                )
                  errors[key] = 'Enter a valid mobile number.';
              }
              if (Object.keys(errors).length) throw new ValidationError(errors);
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
        ) : section === 'TRANSPORT' ? (
          <>
            <WeekdaySelector
              value={form.operatingDays || defaultOperatingDays(data?.settings)}
              onChange={operatingDays => {
                action.clearFieldError('operatingDays');
                setForm(current => ({ ...current, operatingDays }));
              }}
              error={action.fieldErrors.operatingDays}
            />
            <Text style={s.note}>
              {t(
                'Institution closed days are excluded from every student service.',
              )}
            </Text>
            {(form.transportShifts || []).map((shift, index) => (
              <Box key={shift.id}>
                <Input
                  label={t('Shift name')}
                  value={shift.name}
                  maxLength={60}
                  onChangeText={shiftName =>
                    setForm(current => ({
                      ...current,
                      transportShifts: current.transportShifts?.map((item, i) =>
                        i === index ? { ...item, name: shiftName } : item,
                      ),
                    }))
                  }
                />
                <Input
                  label={t('Start time (HH:mm)')}
                  value={shift.startTime}
                  maxLength={5}
                  onChangeText={startTime =>
                    setForm(current => ({
                      ...current,
                      transportShifts: current.transportShifts?.map((item, i) =>
                        i === index ? { ...item, startTime } : item,
                      ),
                    }))
                  }
                />
                <Input
                  label={t('Return time (HH:mm)')}
                  value={shift.endTime}
                  maxLength={5}
                  onChangeText={endTime =>
                    setForm(current => ({
                      ...current,
                      transportShifts: current.transportShifts?.map((item, i) =>
                        i === index ? { ...item, endTime } : item,
                      ),
                    }))
                  }
                />
                {!existingShiftIds.includes(shift.id) ? (
                  <SmallButton
                    title={t('Remove shift')}
                    danger
                    onPress={() =>
                      setForm(current => ({
                        ...current,
                        transportShifts: current.transportShifts?.filter(
                          item => item.id !== shift.id,
                        ),
                      }))
                    }
                  />
                ) : null}
              </Box>
            ))}
            <SmallButton
              title={t('+ Add shift')}
              disabled={(form.transportShifts?.length || 0) >= 20}
              onPress={() =>
                setForm(current => ({
                  ...current,
                  transportShifts: [
                    ...(current.transportShifts || []),
                    {
                      id: `SHIFT_${Date.now()}_${
                        current.transportShifts?.length || 0
                      }`,
                      name: '',
                      startTime: '',
                      endTime: '',
                    },
                  ],
                }))
              }
            />
            {action.fieldErrors.transportShifts ? (
              <Text style={s.note}>
                {t(action.fieldErrors.transportShifts)}
              </Text>
            ) : null}
          </>
        ) : section === 'PROFILE' ? (
          <>
            <Input
              label={isAdmin ? t('Admin name') : t('Your name')}
              value={name}
              error={action.fieldErrors.name}
              onChangeText={value => {
                action.clearFieldError('name');
                setName(value);
              }}
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

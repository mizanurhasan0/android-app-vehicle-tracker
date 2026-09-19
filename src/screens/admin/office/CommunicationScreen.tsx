import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { NoorIcon } from '../../../components/Noor';
import { useData } from '../../../context/DataContext';
import { useManagement } from '../../../context/ManagementContext';
import { useTranslation } from '../../../i18n';
import { ValidationError } from '../../../utils/validation';
import {
  AdminPage,
  Box,
  C,
  Choice,
  FormModal,
  Heading,
  Input,
  contact,
  s,
  useAction,
} from '../AdminUi';

import { templateLabels } from './messageTemplates';

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
    action.clearFeedback();
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
      <NoorIcon name="chevron" size={18} color={C.muted} />
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
            const errors: Record<string, string> = {};
            if ((group === 'ROUTE' || group === 'VEHICLE') && !filter)
              errors.filter = 'Select an option';
            if (!recipient) errors.recipient = 'Select a recipient.';
            if (composer !== 'call' && !message.trim())
              errors.message = 'Enter a message.';
            if (Object.keys(errors).length) throw new ValidationError(errors);
            await contact(recipient, composer, message);
          })
        }
      >
        <Choice
          label={t('Contact type')}
          value={group}
          error={action.fieldErrors.group}
          optional={false}
          onChange={value => {
            action.clearFeedback();
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
            error={action.fieldErrors.filter}
            onChange={value => {
              action.clearFieldError('filter');
              action.clearFieldError('recipient');
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
          error={action.fieldErrors.recipient}
          onChange={value => {
            action.clearFieldError('recipient');
            setRecipient(value);
          }}
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
              error={action.fieldErrors.message}
              onChangeText={value => {
                action.clearFieldError('message');
                setMessage(value);
              }}
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

import React, { useState } from 'react';
import { Text } from 'react-native';
import { Button, Card, Field, Notice, Select } from '../../components/ui';
import { useCoreData } from '../../context/DataContext';
import { useManagement } from '../../context/ManagementContext';
import { useAction } from '../../hooks/useAction';
import { useTranslation } from '../../i18n';
import { serviceShift, transportShifts } from '../../utils/transport';
import { ValidationError } from '../../utils/validation';
import { readable } from '../../utils/format';
import { styles } from '../../theme';

export function ServiceSupportForm({
  action,
}: {
  action: ReturnType<typeof useAction>;
}) {
  const { t } = useTranslation();
  const { data, mutate } = useCoreData();
  const management = useManagement();
  const shifts = transportShifts(management.data?.settings);
  const [subscriptionId, setSubscriptionId] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');

  const active = data.subscriptions.filter(item => item.status === 'ACTIVE');
  return active.length ? (
    <Card>
      <Text style={styles.heading}>{t('Need help with your service?')}</Text>
      <Select
        label={t('Active service')}
        value={subscriptionId}
        error={action.fieldErrors.subscriptionId}
        onChange={value => {
          action.clearFieldError('subscriptionId');
          setSubscriptionId(value);
        }}
        options={active.map(item => ({
          value: item.id,
          label: `${item.studentName} · ${t(
            shifts.find(shift => shift.id === serviceShift(item))?.name ||
              serviceShift(item),
          )} · ${item.routeName}`,
        }))}
      />
      <Select
        label={t('Complaint category')}
        value={category}
        error={action.fieldErrors.category}
        onChange={value => {
          action.clearFieldError('category');
          setCategory(value);
        }}
        options={[
          'LATE_PICKUP',
          'DRIVER_BEHAVIOUR',
          'VEHICLE_SAFETY',
          'PAYMENT',
          'OTHER',
        ].map(value => ({
          value,
          label: readable(value),
        }))}
      />
      <Field
        label={t('Tell us what happened')}
        value={description}
        error={action.fieldErrors.description}
        onChangeText={value => {
          action.clearFieldError('description');
          setDescription(value);
        }}
        multiline
        maxLength={2000}
      />
      <Notice text={action.error} kind="error" />
      <Notice text={action.success} />
      <Button
        title={t('Submit complaint')}
        busy={action.busy}
        onPress={() => {
          action.run(async () => {
            if (!subscriptionId || !category || description.trim().length < 10)
              throw new ValidationError({
                ...(!subscriptionId
                  ? { subscriptionId: 'Select an active service.' }
                  : {}),
                ...(!category
                  ? { category: 'Select a complaint category.' }
                  : {}),
                ...(description.trim().length < 10
                  ? {
                      description: 'Add at least 10 characters of detail.',
                    }
                  : {}),
              });
            await mutate('/complaints', {
              subscriptionId,
              category,
              description,
            });
            setDescription('');
          }, 'Complaint submitted. The admin has been notified.');
        }}
      />
      <Field
        label={t('Reason for stopping service')}
        value={reason}
        error={action.fieldErrors.reason}
        onChangeText={value => {
          action.clearFieldError('reason');
          setReason(value);
        }}
        multiline
        maxLength={500}
      />
      <Text style={styles.muted}>
        {t(
          'Your service continues until the admin approves. Existing monthly bills remain payable; no automatic refund or proration.',
        )}
      </Text>
      <Notice text={action.error} kind="error" />
      <Notice text={action.success} />
      <Button
        secondary
        title={t('Request to stop service')}
        busy={action.busy}
        onPress={() => {
          action.run(async () => {
            if (!subscriptionId || reason.trim().length < 5)
              throw new ValidationError({
                ...(!subscriptionId
                  ? { subscriptionId: 'Select an active service.' }
                  : {}),
                ...(reason.trim().length < 5
                  ? {
                      reason: 'Add a reason with at least 5 characters.',
                    }
                  : {}),
              });
            await mutate('/stop-requests', {
              subscriptionId,
              reason,
            });
            setReason('');
          }, 'Stop request submitted. Your service remains active until approved.');
        }}
      />
    </Card>
  ) : (
    <Text style={styles.muted}>
      {t(
        'Complaint and stop-service forms become available after your transport service is approved.',
      )}
    </Text>
  );
}

import React, { useState } from 'react';
import { Alert, View } from 'react-native';
import { Button, Field, Notice } from '../../components/ui';
import { useDataActions } from '../../context/DataContext';
import { useAction } from '../../hooks/useAction';
import { useTranslation } from '../../i18n';
import { styles } from '../../theme';
import { dhakaDate } from '../../utils/dates';
import { serviceSettlementInput } from '../../utils/serviceSettlement';
import { ValidationError } from '../../utils/validation';

export function StopRequestReviewActions({
  requestId,
  monthlyAmount,
  startedAt,
}: {
  requestId: string;
  monthlyAmount?: number;
  startedAt?: string;
}) {
  const { t } = useTranslation();
  const { mutate } = useDataActions();
  const action = useAction();
  const [stopDate, setStopDate] = useState(dhakaDate());
  const [finalMonthlyFee, setFinalMonthlyFee] = useState(
    monthlyAmount === undefined ? '' : String(monthlyAmount / 100),
  );
  const [note, setNote] = useState('');

  const approve = () => {
    action.clearFeedback();
    try {
      const settlement = serviceSettlementInput({
        stopDate,
        finalMonthlyFee,
        startedAt,
      });
      Alert.alert(
        t('Confirm stop service'),
        t(
          'Approve this request and stop the service on {{date}}? The final monthly fee will be ৳{{amount}}.',
          { date: stopDate, amount: finalMonthlyFee.trim() },
        ),
        [
          { text: t('Cancel'), style: 'cancel' },
          {
            text: t('Confirm'),
            onPress: () =>
              action.run(async () => {
                await mutate(
                  `/admin/stop-requests/${requestId}/decision`,
                  {
                    decision: 'APPROVED',
                    ...settlement,
                    ...(note.trim() ? { note: note.trim() } : {}),
                  },
                  'PATCH',
                );
              }, 'Approved, service stopped, and guardian notified.'),
          },
        ],
      );
    } catch (problem) {
      action.reportError(problem);
    }
  };

  const reject = () =>
    action.run(async () => {
      if (!note.trim())
        throw new ValidationError({ note: 'Add a rejection reason first.' });
      await mutate(
        `/admin/stop-requests/${requestId}/decision`,
        { decision: 'REJECTED', note: note.trim() },
        'PATCH',
      );
    }, 'Rejected and guardian notified.');

  return (
    <View style={styles.section}>
      <Field
        label={t('Stop date (YYYY-MM-DD) *')}
        value={stopDate}
        error={action.fieldErrors.stopDate}
        onChangeText={value => {
          action.clearFieldError('stopDate');
          setStopDate(value);
        }}
        maxLength={10}
        autoCapitalize="none"
      />
      <Field
        label={t('Final monthly fee (৳) *')}
        value={finalMonthlyFee}
        error={action.fieldErrors.finalMonthlyFee}
        onChangeText={value => {
          action.clearFieldError('finalMonthlyFee');
          setFinalMonthlyFee(value);
        }}
        keyboardType="decimal-pad"
        maxLength={12}
      />
      <Notice
        text={t(
          "Use a date in the current billing month. Enter 0 for no final fee. If this month's bill is paid, use its exact amount; review any pending payment first.",
        )}
      />
      <Field
        label={t('Admin note / rejection reason')}
        value={note}
        error={action.fieldErrors.note}
        onChangeText={value => {
          action.clearFieldError('note');
          setNote(value);
        }}
        multiline
        maxLength={500}
      />
      <Notice text={action.error} kind="error" />
      <Notice text={action.success} />
      <Button
        title={t('Approve and stop service')}
        busy={action.busy}
        onPress={approve}
      />
      <Button
        secondary
        title={t('Reject with reason')}
        disabled={action.busy}
        onPress={reject}
      />
    </View>
  );
}

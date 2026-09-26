import React, { useEffect, useState } from 'react';
import { Alert, Text } from 'react-native';
import { Student } from '../../../api/management';
import { useManagement } from '../../../context/ManagementContext';
import { useTranslation } from '../../../i18n';
import {
  serviceSettlementInput,
  ServiceSettlementInput,
} from '../../../utils/serviceSettlement';
import { FormModal, Input, s, today, useAction } from '../AdminUi';

export function StopServiceForm({
  visible,
  student,
  onClose,
}: {
  visible: boolean;
  student: Student;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { mutate } = useManagement();
  const action = useAction();
  const [stopDate, setStopDate] = useState(today());
  const [finalMonthlyFee, setFinalMonthlyFee] = useState(
    String(student.monthlyAmount / 100),
  );
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!visible) return;
    setStopDate(today());
    setFinalMonthlyFee(String(student.monthlyAmount / 100));
    setReason('');
    action.clearFeedback();
  }, [visible, student.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (payload: ServiceSettlementInput) =>
    action.run(async () => {
      await mutate(`/admin/students/${student.id}/stop`, payload, 'PATCH');
      onClose();
    }, 'Transport service stopped.');

  const confirm = () => {
    action.clearFeedback();
    try {
      const payload = serviceSettlementInput({
        stopDate,
        finalMonthlyFee,
        reason,
        startedAt: student.startedAt,
      });
      Alert.alert(
        t('Confirm stop service'),
        t(
          'Stop this transport service on {{date}} with a final monthly fee of ৳{{amount}}? Previous payment and attendance history will remain.',
          { date: stopDate, amount: finalMonthlyFee.trim() },
        ),
        [
          { text: t('Cancel'), style: 'cancel' },
          {
            text: t('Stop service'),
            style: 'destructive',
            onPress: () => submit(payload),
          },
        ],
      );
    } catch (problem) {
      action.reportError(problem);
    }
  };

  return (
    <FormModal
      title={t('Stop transport service')}
      visible={visible}
      onClose={onClose}
      onSave={confirm}
      saveTitle={t('Review and stop')}
      busy={action.busy}
      error={action.error}
    >
      <Text style={s.body}>
        {t(
          'Stop only this selected shift. Other transport services and all previous history will remain.',
        )}
      </Text>
      <Input
        label={t('Stop date (YYYY-MM-DD) *')}
        value={stopDate}
        onChangeText={value => {
          action.clearFieldError('stopDate');
          setStopDate(value);
        }}
        error={action.fieldErrors.stopDate}
        placeholder="YYYY-MM-DD"
        autoCapitalize="none"
        maxLength={10}
      />
      <Input
        label={t('Final monthly fee (৳) *')}
        value={finalMonthlyFee}
        onChangeText={value => {
          action.clearFieldError('finalMonthlyFee');
          setFinalMonthlyFee(value);
        }}
        error={action.fieldErrors.finalMonthlyFee}
        keyboardType="decimal-pad"
        maxLength={12}
      />
      <Text style={s.muted}>
        {t(
          'Use a date from the current month. Enter 0 if no payment is due for the final month.',
        )}
      </Text>
      <Text style={s.note}>
        {t(
          "If this month's bill is already paid, enter the exact paid amount. Review any pending payment before stopping the service.",
        )}
      </Text>
      <Input
        label={t('Reason (optional)')}
        value={reason}
        onChangeText={setReason}
        multiline
        maxLength={500}
      />
    </FormModal>
  );
}

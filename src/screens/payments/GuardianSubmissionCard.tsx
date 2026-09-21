import React from 'react';
import { useTranslation } from '../../i18n';
import { Text, View } from 'react-native';
import { PaymentEvidence } from './PaymentEvidence';
import { Payment } from '../../api/types';
import { TransportShift } from '../../api/management';
import { Badge, Card } from '../../components/ui';
import { colors, styles } from '../../theme';
import { paymentShiftLabel } from '../../utils/paymentShift';
import { dateLabel, money, readable } from '../../utils/format';

export function GuardianSubmissionCard({
  payment,
  shifts,
}: {
  payment: Payment;
  shifts: TransportShift[];
}) {
  const { t } = useTranslation();
  return (
    <Card>
      <View style={styles.between}>
        <Text style={styles.heading}>
          {money(payment.amount)} · {payment.month}
        </Text>
        <Badge status={payment.status} />
      </View>
      <Text style={styles.body}>{payment.studentName}</Text>
      {payment.shiftId ? (
        <Text style={styles.muted}>{paymentShiftLabel(payment, shifts)}</Text>
      ) : null}
      <Text selectable style={styles.body}>
        {payment.methodName || readable(payment.method)} ·{' '}
        {payment.transactionId}
      </Text>
      <Text selectable style={styles.muted}>
        {t('From {{sender}}\nTo {{recipient}}', {
          sender: payment.senderNumber,
          recipient: payment.recipientNumber,
        })}
      </Text>
      <Text style={styles.muted}>{dateLabel(payment.createdAt)}</Text>
      <PaymentEvidence payment={payment} />
      {payment.note ? (
        <Text
          style={[
            styles.body,
            payment.status === 'REJECTED' && { color: colors.danger },
          ]}
        >
          {t('Admin note: {{note}}', { note: payment.note })}
        </Text>
      ) : null}
    </Card>
  );
}

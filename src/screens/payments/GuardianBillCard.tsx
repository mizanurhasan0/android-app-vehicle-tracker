import React from 'react';
import { useTranslation } from '../../i18n';
import { StyleSheet, Text, View } from 'react-native';
import { Bill } from '../../api/types';
import { TransportShift } from '../../api/management';
import { Badge, Button, Card } from '../../components/ui';
import { NoorIcon } from '../../components/Noor';
import { colors, styles } from '../../theme';
import { paymentShiftLabel } from '../../utils/paymentShift';
import { dateLabel, money } from '../../utils/format';

export function GuardianBillCard({
  bill,
  shifts,
  canSubmit,
  onPay,
}: {
  bill: Bill;
  shifts: TransportShift[];
  canSubmit: boolean;
  onPay: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Card>
      <View style={styles.between}>
        <View style={local.billHeading}>
          <NoorIcon name="receipt" size={21} color={colors.primary} />
          <Text style={styles.heading}>{bill.month}</Text>
        </View>
        <Text style={local.billAmount}>{money(bill.amount)}</Text>
        <Badge status={bill.pendingSubmissionId ? 'PENDING' : bill.status} />
      </View>
      <Text style={styles.body}>{bill.studentName}</Text>
      {bill.shiftId ? (
        <Text style={styles.muted}>{paymentShiftLabel(bill, shifts)}</Text>
      ) : null}
      {bill.paidAt ? (
        <Text style={styles.muted}>
          {t('Paid on {{date}}', { date: dateLabel(bill.paidAt) })}
        </Text>
      ) : null}
      {bill.status === 'UNPAID' && !bill.pendingSubmissionId ? (
        <Button
          title={t('I’ve paid · submit details')}
          disabled={!canSubmit}
          onPress={onPay}
        />
      ) : null}
      {bill.pendingSubmissionId ? (
        <Text style={styles.muted}>
          {t(
            'Your details are with the admin. Please don’t send the payment again.',
          )}
        </Text>
      ) : null}
    </Card>
  );
}

const local = StyleSheet.create({
  billHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  billAmount: { color: colors.primary, fontSize: 16, fontWeight: '700' },
});

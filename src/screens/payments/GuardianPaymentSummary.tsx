import React from 'react';
import { useTranslation } from '../../i18n';
import { StyleSheet, Text, View } from 'react-native';
import { Bill } from '../../api/types';
import { Badge, Button, Card } from '../../components/ui';
import { colors, styles } from '../../theme';
import { money } from '../../utils/format';

export function GuardianPaymentSummary({
  bills,
  canPay,
  onPay,
}: {
  bills: Bill[];
  canPay: boolean;
  onPay: () => void;
}) {
  const { t } = useTranslation();
  const summaryMonth = [...bills]
    .map(bill => bill.month)
    .sort()
    .pop();
  const monthBills = bills.filter(bill => bill.month === summaryMonth);
  const monthTotal = monthBills.reduce((sum, bill) => sum + bill.amount, 0);
  const monthPaid = monthBills
    .filter(bill => bill.status === 'PAID')
    .reduce((sum, bill) => sum + bill.amount, 0);
  return (
    <Card>
      <Text style={styles.heading}>
        {t('Monthly fee')}
        {summaryMonth ? ` (${summaryMonth})` : ''}
      </Text>
      <View style={local.summary}>
        <View style={local.summaryCell}>
          <Text style={local.summaryLabel}>{t('Total fare')}</Text>
          <Text style={local.summaryAmount}>{money(monthTotal)}</Text>
        </View>
        <View style={[local.summaryCell, local.summaryMiddle]}>
          <Text style={local.summaryLabel}>{t('Paid')}</Text>
          <Text style={local.summaryAmount}>{money(monthPaid)}</Text>
        </View>
        <View style={local.summaryCell}>
          <Text style={[local.summaryLabel, local.dueText]}>{t('Due')}</Text>
          <Text style={[local.summaryAmount, local.dueText]}>
            {money(monthTotal - monthPaid)}
          </Text>
        </View>
      </View>
      {monthBills.length > 0 ? (
        <View style={local.summaryStatus}>
          <Badge
            status={
              monthBills.every(bill => bill.status === 'PAID')
                ? 'PAID'
                : 'UNPAID'
            }
          />
        </View>
      ) : null}
      <Button title={t('Pay now')} disabled={!canPay} onPress={onPay} />
    </Card>
  );
}

const local = StyleSheet.create({
  summary: { flexDirection: 'row', paddingVertical: 7 },
  summaryCell: { flex: 1, alignItems: 'center', gap: 7, paddingHorizontal: 3 },
  summaryMiddle: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.line,
  },
  summaryLabel: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  summaryAmount: { color: colors.primary, fontSize: 19, fontWeight: '800' },
  summaryStatus: { alignItems: 'center' },
  dueText: { color: colors.danger },
});

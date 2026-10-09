import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { Bill, Payment } from '../../api/types';
import { TransportShift } from '../../api/management';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme';
import { paymentShiftLabel } from '../../utils/paymentShift';
import { dateLabel, money } from '../../utils/format';

function studentInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(word => Array.from(word)[0] || '')
    .join('')
    .toLocaleUpperCase();
}

export function AdminBillTable({
  bills,
  pending,
  shifts,
  onOpenPayment,
}: {
  bills: Bill[];
  pending: Payment[];
  shifts: TransportShift[];
  onOpenPayment: (bill: Bill) => void;
}) {
  const { t } = useTranslation();
  const pendingBillIds = new Set(pending.map(payment => payment.billId));

  return (
    <View style={billStyles.list}>
      {bills.map(bill => {
        const hasPending =
          !!bill.pendingSubmissionId || pendingBillIds.has(bill.id);
        const status = hasPending
          ? t('Pending')
          : bill.status === 'PAID'
          ? t('Paid')
          : bill.status === 'WAIVED'
          ? t('Waived')
          : t('Due');
        const settled = bill.status === 'PAID' || bill.status === 'WAIVED';
        const cardContent = (
          <View style={billStyles.main}>
            <View style={billStyles.avatar}>
              <Text style={billStyles.avatarText}>
                {studentInitials(bill.studentName)}
              </Text>
            </View>
            <View style={billStyles.details}>
              <Text style={billStyles.studentName} numberOfLines={1}>
                {bill.studentName}
              </Text>
              <Text style={billStyles.secondary} numberOfLines={1}>
                {bill.guardianName}
              </Text>
              {bill.shiftId ? (
                <Text style={billStyles.secondary} numberOfLines={1}>
                  {paymentShiftLabel(bill, shifts)}
                </Text>
              ) : null}
            </View>
            <View style={billStyles.figures}>
              <Text style={billStyles.month}>{bill.month}</Text>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={billStyles.amount}
              >
                {money(bill.amount)}
              </Text>
              <View
                style={[
                  billStyles.statusPill,
                  hasPending
                    ? billStyles.pendingPill
                    : settled
                    ? billStyles.paidPill
                    : billStyles.duePill,
                ]}
              >
                <Text
                  style={[
                    billStyles.statusText,
                    hasPending
                      ? billStyles.pendingText
                      : settled
                      ? billStyles.paidText
                      : billStyles.dueText,
                  ]}
                >
                  {status}
                </Text>
              </View>
            </View>
            {hasPending ? (
              <ChevronRight size={18} color={colors.muted} />
            ) : null}
          </View>
        );

        return (
          <View key={bill.id} style={billStyles.card}>
            {hasPending ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t('Review payment')} · ${
                  bill.studentName
                }`}
                onPress={() => onOpenPayment(bill)}
                style={({ pressed }) => pressed && billStyles.pressed}
              >
                {cardContent}
              </Pressable>
            ) : (
              cardContent
            )}
            {bill.paidAt ? (
              <Text style={billStyles.paidDate}>
                {t('Paid on ')}
                {dateLabel(bill.paidAt)}
              </Text>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const billStyles = StyleSheet.create({
  list: { gap: 9 },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  main: {
    minHeight: 86,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  details: { flex: 1, minWidth: 0, gap: 3 },
  studentName: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  secondary: { color: colors.muted, fontSize: 11 },
  figures: { width: 77, alignItems: 'flex-start', gap: 3 },
  month: { color: colors.muted, fontSize: 10 },
  amount: { color: colors.primary, fontSize: 15, fontWeight: '800' },
  statusPill: {
    minWidth: 57,
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignItems: 'center',
  },
  paidPill: { backgroundColor: '#DEF5E8' },
  duePill: { backgroundColor: '#FCE6E8' },
  pendingPill: { backgroundColor: '#FFF2D8' },
  statusText: { fontSize: 10, fontWeight: '700' },
  paidText: { color: colors.primary },
  dueText: { color: colors.danger },
  pendingText: { color: colors.amber },
  paidDate: {
    color: colors.muted,
    fontSize: 10,
    paddingHorizontal: 62,
    paddingBottom: 9,
  },
  pressed: { opacity: 0.72 },
});

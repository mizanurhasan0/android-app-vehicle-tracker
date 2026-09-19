import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Bill, Payment } from '../../api/types';
import { TransportShift } from '../../api/management';
import { Button } from '../../components/ui';
import { useTranslation } from '../../i18n';
import { colors } from '../../theme';
import { paymentShiftLabel } from '../../utils/paymentShift';
import { dateLabel, money, readable } from '../../utils/format';
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
  return (
    <View style={desk.table}>
      <View style={[desk.billRow, desk.tableHead]}>
        <Text style={[desk.columnName, desk.columnLabel]}>{t('Name')}</Text>
        <Text style={[desk.columnMonth, desk.columnLabel]}>{t('Month')}</Text>
        <Text style={[desk.columnAmount, desk.columnLabel]}>{t('Amount')}</Text>
        <Text style={[desk.columnStatus, desk.columnLabel]}>{t('Status')}</Text>
      </View>
      {bills.map(bill => (
        <View key={bill.id} style={desk.tableItem}>
          {(() => {
            const pendingSubmissionId =
              bill.pendingSubmissionId ||
              pending.find(payment => payment.billId === bill.id)?.id;
            const row = (
              <View style={desk.billRow}>
                <View style={desk.columnName}>
                  <Text style={desk.studentName}>{bill.studentName}</Text>
                  {bill.shiftId ? (
                    <Text style={desk.guardianName}>
                      {paymentShiftLabel(bill, shifts)}
                    </Text>
                  ) : null}
                  <Text style={desk.guardianName}>{bill.guardianName}</Text>
                </View>
                <Text style={[desk.columnMonth, desk.tableText]}>
                  {bill.month}
                </Text>
                <Text style={[desk.columnAmount, desk.tableAmount]}>
                  {money(bill.amount)}
                </Text>
                <View style={desk.columnStatus}>
                  <Text
                    accessibilityLabel={readable(
                      pendingSubmissionId ? 'PENDING' : bill.status,
                    )}
                    style={[
                      desk.billStatus,
                      bill.status !== 'PAID' && desk.billStatusDue,
                    ]}
                  >
                    {bill.status === 'PAID'
                      ? '✓'
                      : pendingSubmissionId
                      ? '◷'
                      : '!'}
                  </Text>
                </View>
              </View>
            );
            return pendingSubmissionId ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${t('Review payment')} · ${
                  bill.studentName
                }`}
                onPress={() => onOpenPayment(bill)}
                style={({ pressed }) => [
                  desk.pendingRow,
                  pressed && desk.pressed,
                ]}
              >
                {row}
              </Pressable>
            ) : (
              row
            );
          })()}
          {bill.paidAt ? (
            <Text style={desk.paidDate}>
              {t('Paid on ')}
              {dateLabel(bill.paidAt)}
            </Text>
          ) : null}
          {bill.pendingSubmissionId ? (
            <Button
              secondary
              title={t('Review payment')}
              onPress={() => onOpenPayment(bill)}
            />
          ) : null}
        </View>
      ))}
    </View>
  );
}

const desk = StyleSheet.create({
  table: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  tableHead: { backgroundColor: '#EEF8F3' },
  tableItem: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingBottom: 2,
  },
  pendingRow: { alignSelf: 'stretch' },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  columnName: { flex: 1.6 },
  columnMonth: { flex: 0.95 },
  columnAmount: { flex: 1.1 },
  columnStatus: { flex: 0.6, alignItems: 'center', textAlign: 'center' },
  columnLabel: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  studentName: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 18,
  },
  guardianName: { color: colors.muted, fontSize: 10, lineHeight: 16 },
  tableText: { color: colors.muted, fontSize: 11 },
  tableAmount: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  billStatus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: '#DDF3E6',
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  billStatusDue: { backgroundColor: '#FFF1D8', color: '#B7801D' },
  paidDate: {
    color: colors.muted,
    fontSize: 10,
    paddingHorizontal: 10,
    paddingBottom: 7,
  },
  pressed: { opacity: 0.7 },
});

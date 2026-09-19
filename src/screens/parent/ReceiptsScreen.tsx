import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BusinessSettings } from '../../api/management';
import { Bill, Payment } from '../../api/types';
import { NoorBadge, NoorCard, NoorIcon, NoorLogo } from '../../components/Noor';
import { Button, Empty, Notice, Page } from '../../components/ui';
import { useData } from '../../context/DataContext';
import { useManagement } from '../../context/ManagementContext';
import { useAction } from '../../hooks/useAction';
import { i18n, locale, useTranslation } from '../../i18n';
import { colors, styles } from '../../theme';
import { money, numberLabel, readable } from '../../utils/format';
import { saveReportFile } from '../../utils/photo';
import { InfoRow } from './ParentUI';
import { billingMonthLabel } from './parentUtils';
import { transportShifts } from '../../utils/transport';
import { paymentShiftLabel } from '../../utils/paymentShift';

type ReceiptBusiness = Pick<
  BusinessSettings,
  'businessName' | 'phone' | 'address'
> &
  Pick<BusinessSettings, 'transportShifts'>;
const fallbackBusiness: ReceiptBusiness = {
  businessName: 'NOOR TRANSPORT',
  phone: '',
  address: '',
};
const oneLine = (value: string) =>
  value.replace(/[\r\n\u2028\u2029]+/g, ' ').trim();

function paidDate(timestamp: string | null) {
  const time = timestamp ? Date.parse(timestamp) : NaN;
  return Number.isFinite(time)
    ? new Date(time).toLocaleString(locale(), {
        timeZone: 'Asia/Dhaka',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : i18n.t('Date not recorded');
}

/** A submission supplements the paid bill only when the approved amount matches. */
export function approvedReceiptPayment(bill: Bill, payments: Payment[]) {
  if (bill.status !== 'PAID') return undefined;
  return payments.find(
    payment =>
      payment.billId === bill.id &&
      payment.status === 'APPROVED' &&
      payment.amount === bill.amount,
  );
}

export function receiptDocument(
  bill: Bill,
  payment: Payment | undefined,
  business: ReceiptBusiness,
) {
  const t = i18n.t.bind(i18n);
  if (bill.status !== 'PAID')
    throw new Error('Only paid bills can be saved as receipts.');
  const approved = approvedReceiptPayment(bill, payment ? [payment] : []);
  return [
    oneLine(business.businessName || fallbackBusiness.businessName),
    t('Safe Journey, Bright Future'),
    ...(business.address ? [oneLine(business.address)] : []),
    ...(business.phone
      ? [t('Contact: {{phone}}', { phone: oneLine(business.phone) })]
      : []),
    '',
    t('Payment receipt'),
    t('Status: {{status}}', { status: readable(bill.status) }),
    '',
    t('Bill reference: {{id}}', { id: oneLine(bill.id) }),
    t('Student: {{name}}', { name: oneLine(bill.studentName) }),
    ...(bill.shiftId
      ? [
          `${t('Transport shift')}: ${oneLine(
            paymentShiftLabel(bill, transportShifts(business)),
          )}`,
        ]
      : []),
    t('Guardian: {{name}}', { name: oneLine(bill.guardianName) }),
    t('Billing month: {{month}}', {
      month: oneLine(billingMonthLabel(bill.month)),
    }),
    t('Amount paid: {{amount}}', { amount: money(bill.amount) }),
    t('Paid on: {{date}}', { date: paidDate(bill.paidAt) }),
    ...(approved
      ? [
          '',
          t('Method: {{method}}', {
            method: oneLine(readable(approved.method)),
          }),
          t('Transaction ID: {{id}}', { id: oneLine(approved.transactionId) }),
          t('Sender number: {{number}}', {
            number: oneLine(approved.senderNumber),
          }),
          t('Recipient number: {{number}}', {
            number: oneLine(approved.recipientNumber),
          }),
        ]
      : []),
    '',
    t('Generated from the paid bill information saved in the app.'),
  ].join('\n');
}

export function ReceiptsScreen() {
  const { t } = useTranslation();
  const { data, loading, error, refresh } = useData();
  const management = useManagement();
  const action = useAction();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saved, setSaved] = useState('');
  const bills = data.bills
    .filter(bill => bill.status === 'PAID')
    .sort(
      (a, b) =>
        b.month.localeCompare(a.month) ||
        (b.paidAt || '').localeCompare(a.paidAt || '') ||
        a.id.localeCompare(b.id),
    );
  const bill = bills.find(item => item.id === selectedId);
  const payment = bill
    ? approvedReceiptPayment(bill, data.payments)
    : undefined;
  const business = management.data?.settings || fallbackBusiness;
  const refreshReceipts = async () => {
    await Promise.all([refresh(), management.refresh()]);
  };
  return (
    <Page
      loading={loading || management.loading}
      error={error || management.error}
      refresh={refreshReceipts}
    >
      <Notice text={action.error} kind="error" />
      <Notice text={saved} />
      {bill ? (
        <>
          <NoorCard style={r.receipt}>
            <View style={r.brand}>
              <NoorLogo size={54} />
              <View style={r.brandWords}>
                <Text style={r.business}>
                  {business.businessName || fallbackBusiness.businessName}
                </Text>
                <Text style={r.tagline}>
                  {t('Safe Journey, Bright Future')}
                </Text>
                {business.phone ? (
                  <Text style={r.phone}>{business.phone}</Text>
                ) : null}
              </View>
            </View>
            <View style={r.rule} />
            <View style={r.titleRow}>
              <Text style={r.title}>{t('Payment receipt')}</Text>
              <NoorBadge label={readable(bill.status)} />
            </View>
            <View style={r.amountPanel}>
              <Text style={r.amountLabel}>{t('Amount paid')}</Text>
              <Text style={r.amount}>{money(bill.amount)}</Text>
            </View>
            <InfoRow
              icon="student"
              label={t('Student')}
              value={bill.studentName}
            />
            {bill.shiftId ? (
              <InfoRow
                icon="clock"
                label={t('Transport shift')}
                value={paymentShiftLabel(bill, transportShifts(business))}
              />
            ) : null}
            <InfoRow
              icon="user"
              label={t('Guardian')}
              value={bill.guardianName}
            />
            <InfoRow
              icon="calendar"
              label={t('Billing month')}
              value={billingMonthLabel(bill.month)}
            />
            <InfoRow
              icon="clock"
              label={t('Paid on')}
              value={paidDate(bill.paidAt)}
            />
            {payment ? (
              <>
                <View style={r.rule} />
                <InfoRow
                  icon="payment"
                  label={t('Method')}
                  value={readable(payment.method)}
                />
                <InfoRow
                  icon="receipt"
                  label={t('Transaction')}
                  value={payment.transactionId}
                />
                <InfoRow
                  icon="phone"
                  label={t('Sender')}
                  value={payment.senderNumber}
                />
                <InfoRow
                  icon="phone"
                  label={t('Recipient')}
                  value={payment.recipientNumber}
                />
              </>
            ) : null}
            <View style={r.rule} />
            <Text style={r.referenceLabel}>{t('Bill reference')}</Text>
            <Text selectable style={r.reference}>
              {bill.id}
            </Text>
            <Text style={r.caption}>
              {t('Generated from the paid bill information saved in the app.')}
            </Text>
          </NoorCard>
          <Button
            title={t('Save PDF receipt')}
            busy={action.busy}
            onPress={() =>
              action.run(async () => {
                setSaved('');
                const filename = `noor-receipt-${bill.month}-${bill.id.replace(
                  /[^A-Za-z0-9_-]/g,
                  '_',
                )}.pdf`;
                const completed = await saveReportFile(
                  filename,
                  receiptDocument(bill, payment, business),
                  'application/pdf',
                );
                setSaved(completed ? 'Receipt saved.' : 'Save cancelled.');
              }, '')
            }
          />
          <Button
            secondary
            title={t('All receipts')}
            disabled={action.busy}
            onPress={() => {
              setSelectedId(null);
              setSaved('');
            }}
          />
        </>
      ) : !bills.length ? (
        <Empty
          title={t('No receipts yet')}
          detail={t(
            'Receipts will appear here after payment is verified and the bill is paid.',
          )}
        />
      ) : (
        <>
          <View style={r.titleRow}>
            <Text style={styles.heading}>{t('Paid bill receipts')}</Text>
            <NoorBadge label={numberLabel(bills.length)} />
          </View>
          {bills.map(item => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={t('View receipt - {{student}} - {{month}}', {
                student: item.studentName,
                month: billingMonthLabel(item.month),
              })}
              onPress={() => {
                setSelectedId(item.id);
                setSaved('');
              }}
              style={({ pressed }) => [r.listRow, pressed && r.pressed]}
            >
              <View style={r.receiptIcon}>
                <NoorIcon name="receipt" size={23} />
              </View>
              <View style={r.listCopy}>
                <Text style={r.studentName}>{item.studentName}</Text>
                {item.shiftId ? (
                  <Text style={r.month}>
                    {paymentShiftLabel(item, transportShifts(business))}
                  </Text>
                ) : null}
                <Text style={r.month}>
                  {billingMonthLabel(item.month)} · {paidDate(item.paidAt)}
                </Text>
              </View>
              <View style={r.listEnd}>
                <Text style={r.listAmount}>{money(item.amount)}</Text>
                <NoorBadge label={readable(item.status)} />
              </View>
              <NoorIcon name="chevron" size={20} color={colors.primary} />
            </Pressable>
          ))}
        </>
      )}
    </Page>
  );
}

const r = StyleSheet.create({
  receipt: { padding: 17, gap: 8 },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 6,
  },
  brandWords: { flex: 1, gap: 4 },
  business: { color: colors.primary, fontSize: 19, fontWeight: '800' },
  tagline: { color: colors.primary, fontSize: 10, letterSpacing: 0.3 },
  phone: { color: colors.muted, fontSize: 11 },
  rule: { height: 1, backgroundColor: colors.line, marginVertical: 7 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: { color: colors.ink, fontSize: 17, fontWeight: '700' },
  amountPanel: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 6,
    backgroundColor: '#EDFAF2',
    borderRadius: 8,
    marginVertical: 6,
  },
  amountLabel: { color: colors.muted, fontSize: 12 },
  amount: { color: colors.primary, fontSize: 32, fontWeight: '800' },
  referenceLabel: { color: colors.muted, fontSize: 11 },
  reference: { color: colors.ink, fontSize: 11, lineHeight: 17 },
  caption: { color: colors.muted, fontSize: 10, lineHeight: 17, paddingTop: 7 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: 12,
    minHeight: 86,
  },
  receiptIcon: {
    width: 39,
    height: 43,
    backgroundColor: '#E7F5ED',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 7,
  },
  listCopy: { flex: 1, gap: 6 },
  studentName: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  month: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  listEnd: { alignItems: 'flex-end', gap: 7 },
  listAmount: { color: colors.primary, fontSize: 15, fontWeight: '700' },
  arrow: { color: colors.muted, fontSize: 23 },
  pressed: { opacity: 0.7 },
});

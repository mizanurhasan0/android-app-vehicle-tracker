import { translateMessage, useTranslation } from '../i18n';
import React, { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import { Bill, PaymentAccount } from '../api/types';
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Notice,
  Page,
  Select,
} from '../components/ui';
import { AdminPaymentDesk } from './AdminPaymentDesk';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useAction } from '../hooks/useAction';
import { colors, styles } from '../theme';
import { dateLabel, money, readable } from '../utils/format';
import { NoorIcon } from '../components/Noor';
function PaymentForm({
  bill,
  cancel,
  onBusyChange,
}: {
  bill: Bill;
  cancel: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const { t } = useTranslation();
  const { data, mutate } = useData();
  const [method, setMethod] = useState('');
  const [senderNumber, setSender] = useState('');
  const [account, setAccount] = useState<PaymentAccount>();
  const [recipientNumber, setRecipient] = useState('');
  const [transactionId, setTransaction] = useState('');
  const action = useAction();
  useEffect(() => {
    onBusyChange(action.busy);
    return () => onBusyChange(false);
  }, [action.busy, onBusyChange]);
  return (
    <Card tinted>
      <Text style={styles.heading}>{t('Submit payment details')}</Text>
      <Text style={styles.body}>
        {bill.studentName} · {bill.month} · {money(bill.amount)}
      </Text>
      <Select
        label={t('Payment method')}
        value={method}
        onChange={value => {
          setMethod(value);
          const selected = data.accounts.find(item => item.method === value);
          setAccount(selected);
          setRecipient(selected?.number || '');
        }}
        options={data.accounts.map(item => ({
          value: item.method,
          label: readable(item.method),
        }))}
      />
      {account ? (
        <Card>
          <Text style={styles.label}>
            {t('SEND {{amount}} TO', { amount: money(bill.amount) })}
          </Text>
          <Text selectable style={styles.title}>
            {account.number}
          </Text>
          <Text style={styles.body}>
            {translateMessage(account.instructions)}
          </Text>
          <Text style={styles.muted}>
            {t(
              'Pay using your {{method}} app or USSD first. This form only submits your payment details for verification.',
              { method: readable(method) },
            )}
          </Text>
        </Card>
      ) : null}
      <Field
        label={t('Number you sent money to')}
        value={recipientNumber}
        onChangeText={setRecipient}
        keyboardType="phone-pad"
        maxLength={12}
        hint={t(
          'Use the exact admin number you paid, even if it was recently changed.',
        )}
      />
      <Field
        label={t('Number you sent money from')}
        value={senderNumber}
        onChangeText={setSender}
        keyboardType="phone-pad"
        maxLength={12}
        placeholder="01XXXXXXXXX"
      />
      <Field
        label={t('Transaction ID')}
        value={transactionId}
        onChangeText={setTransaction}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={40}
        hint={t('Copy the transaction ID from your payment confirmation.')}
      />
      <Notice text={action.error} kind="error" />
      <Button
        title={t('Submit for verification')}
        busy={action.busy}
        disabled={!account}
        onPress={() => {
          action.run(async () => {
            if (!/^01[3-9]\d{8,9}$/.test(senderNumber))
              throw new Error('Enter the sender’s valid mobile wallet number.');
            if (!/^[A-Z0-9]{6,40}$/.test(transactionId.trim().toUpperCase()))
              throw new Error(
                'Enter a valid transaction ID (6–40 letters or digits).',
              );
            await mutate('/payments/submissions', {
              billId: bill.id,
              method,
              senderNumber,
              recipientNumber,
              transactionId,
              amount: bill.amount,
            });
            cancel();
          }, 'Submitted. Your bill will be marked paid after admin verification.');
        }}
      />
      <Button
        secondary
        title={t('Cancel')}
        disabled={action.busy}
        onPress={cancel}
      />
    </Card>
  );
}
export function PaymentsScreen({
  dueOnly = false,
  initialTab = 'review',
}: { dueOnly?: boolean; initialTab?: 'review' | 'bills' } = {}) {
  const { session } = useAuth();
  return session?.user.role === 'ADMIN' ? (
    <AdminPaymentDesk initialTab={initialTab} dueOnly={dueOnly} />
  ) : (
    <GuardianPaymentsScreen dueOnly={dueOnly} />
  );
}

function GuardianPaymentsScreen({ dueOnly }: { dueOnly: boolean }) {
  const { t } = useTranslation();
  const { data, loading, error, refresh } = useData();
  const [selectedBill, setSelectedBill] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [tab, setTab] = useState<PaymentTab>('Your bills');
  const [submitting, setSubmitting] = useState(false);

  const visibleBills = data.bills.filter(
    bill => !dueOnly || bill.status === 'UNPAID',
  );
  const payableBills = data.bills.filter(
    bill => bill.status === 'UNPAID' && !bill.pendingSubmissionId,
  );

  const selected = data.bills.find(
    bill =>
      bill.id === selectedBill &&
      bill.status === 'UNPAID' &&
      !bill.pendingSubmissionId,
  );
  const payments = data.payments.filter(
    payment => !filter || payment.status === filter,
  );
  const summaryMonth = [...data.bills]
    .map(bill => bill.month)
    .sort()
    .pop();
  const monthBills = data.bills.filter(bill => bill.month === summaryMonth);
  const monthTotal = monthBills.reduce((sum, bill) => sum + bill.amount, 0);
  const monthPaid = monthBills
    .filter(bill => bill.status === 'PAID')
    .reduce((sum, bill) => sum + bill.amount, 0);
  return (
    <Page loading={loading} refresh={refresh} error={error}>
      <Card>
        <Text style={styles.heading}>
          মাসিক ভাড়া{summaryMonth ? ` (${summaryMonth})` : ''}
        </Text>
        <View style={local.summary}>
          <View style={local.summaryCell}>
            <Text style={local.summaryLabel}>মোট ভাড়া</Text>
            <Text style={local.summaryAmount}>{money(monthTotal)}</Text>
          </View>
          <View style={[local.summaryCell, local.summaryMiddle]}>
            <Text style={local.summaryLabel}>পরিশোধিত</Text>
            <Text style={local.summaryAmount}>{money(monthPaid)}</Text>
          </View>
          <View style={local.summaryCell}>
            <Text style={[local.summaryLabel, local.dueText]}>বকেয়া</Text>
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
        <Button
          title="পেমেন্ট করুন"
          disabled={!payableBills.length || !data.accounts.length || submitting}
          onPress={() => {
            setSelectedBill(payableBills[0]?.id || null);
            setTab('Payment form');
          }}
        />
      </Card>
      <View
        accessibilityRole="tablist"
        accessibilityLabel={t('Monthly bills')}
        style={local.tabs}
      >
        {paymentTabs.map(label => (
          <Pressable
            key={label}
            accessibilityRole="tab"
            accessibilityLabel={t(label)}
            accessibilityState={{ selected: tab === label }}
            onPress={() => {
              Keyboard.dismiss();
              setTab(label);
            }}
            style={({ pressed }) => [
              local.tab,
              tab === label && local.selectedTab,
              pressed && local.pressed,
            ]}
          >
            <Text
              style={[local.tabText, tab === label && local.selectedTabText]}
            >
              {t(label)}
            </Text>
          </Pressable>
        ))}
      </View>
      <PaymentPanel label="Your bills" active={tab === 'Your bills'}>
        {!visibleBills.length ? (
          <Empty
            title={t(dueOnly ? 'No outstanding dues' : 'No bills yet')}
            detail={t(
              dueOnly
                ? 'All your bills are up to date.'
                : 'Your admin will create the monthly bill after your service is approved.',
            )}
          />
        ) : (
          visibleBills.map(bill => (
            <Card key={bill.id}>
              <View style={styles.between}>
                <View style={local.billHeading}>
                  <NoorIcon name="receipt" size={21} color={colors.primary} />
                  <Text style={styles.heading}>{bill.month}</Text>
                </View>
                <Text style={local.billAmount}>{money(bill.amount)}</Text>
                <Badge
                  status={bill.pendingSubmissionId ? 'PENDING' : bill.status}
                />
              </View>
              <Text style={styles.body}>{bill.studentName}</Text>
              {bill.paidAt ? (
                <Text style={styles.muted}>
                  {t('Paid on {{date}}', { date: dateLabel(bill.paidAt) })}
                </Text>
              ) : null}
              {bill.status === 'UNPAID' && !bill.pendingSubmissionId ? (
                <Button
                  title={t('I’ve paid · submit details')}
                  disabled={!data.accounts.length || submitting}
                  onPress={() => {
                    setSelectedBill(bill.id);
                    setTab('Payment form');
                  }}
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
          ))
        )}
      </PaymentPanel>
      <PaymentPanel label="Payment history" active={tab === 'Payment history'}>
        <Select
          label={t('Filter submissions')}
          value={filter}
          onChange={setFilter}
          options={[
            {
              value: 'PENDING',
              label: t('Awaiting review'),
            },
            {
              value: 'APPROVED',
              label: t('Approved'),
            },
            {
              value: 'REJECTED',
              label: t('Rejected'),
            },
          ]}
        />
        {!payments.length ? (
          <Empty
            title={t('No submissions to show')}
            detail={t('Payment details and admin decisions will appear here.')}
          />
        ) : (
          payments.map(payment => (
            <Card key={payment.id}>
              <View style={styles.between}>
                <Text style={styles.heading}>
                  {money(payment.amount)} · {payment.month}
                </Text>
                <Badge status={payment.status} />
              </View>
              <Text style={styles.body}>{payment.studentName}</Text>
              <Text selectable style={styles.body}>
                {readable(payment.method)} · {payment.transactionId}
              </Text>
              <Text selectable style={styles.muted}>
                {t('From {{sender}}\nTo {{recipient}}', {
                  sender: payment.senderNumber,
                  recipient: payment.recipientNumber,
                })}
              </Text>
              <Text style={styles.muted}>{dateLabel(payment.createdAt)}</Text>
              {payment.note ? (
                <Notice
                  text={t('Admin note: {{note}}', { note: payment.note })}
                  kind={payment.status === 'REJECTED' ? 'error' : 'success'}
                />
              ) : null}
            </Card>
          ))
        )}
      </PaymentPanel>
      <PaymentPanel label="Payment form" active={tab === 'Payment form'}>
        {!data.accounts.length ? (
          <Empty
            title={t('Payment numbers are not set yet')}
            detail={t(
              'Please contact your admin before sending money. Payment submission will become available after setup.',
            )}
          />
        ) : !payableBills.length ? (
          <Empty
            title={t('No bills available for payment')}
            detail={t(
              'Only unpaid bills without a pending submission can be selected. Check Your bills for the current status.',
            )}
          />
        ) : (
          <>
            <Card tinted>
              <Text style={styles.heading}>
                {t('Your payment, step by step')}
              </Text>
              <Text style={styles.body}>
                {t('1. Send the bill amount to the admin’s number.')}
                {'\n'}
                {t('2. Submit your transaction ID below.')}
                {'\n'}
                {t('3. Receive confirmation after admin review.')}
              </Text>
              <Text style={styles.muted}>
                {t('Never share your wallet PIN or OTP.')}
              </Text>
            </Card>
            {selected ? (
              <PaymentForm
                key={selected.id}
                bill={selected}
                onBusyChange={setSubmitting}
                cancel={() => {
                  setSelectedBill(null);
                  setTab('Your bills');
                }}
              />
            ) : (
              <Card>
                <Select
                  label={t('Select a bill')}
                  value=""
                  onChange={value => setSelectedBill(value || null)}
                  options={payableBills.map(bill => ({
                    value: bill.id,
                    label: `${bill.studentName} · ${bill.month} · ${money(
                      bill.amount,
                    )}`,
                  }))}
                />
              </Card>
            )}
          </>
        )}
      </PaymentPanel>
    </Page>
  );
}

const paymentTabs = ['Your bills', 'Payment history', 'Payment form'] as const;
type PaymentTab = (typeof paymentTabs)[number];

function PaymentPanel({
  label,
  active,
  children,
}: React.PropsWithChildren<{ label: PaymentTab; active: boolean }>) {
  return (
    <View
      testID={`payment-panel-${label}`}
      style={[local.panel, !active && local.hidden]}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
    >
      {children}
    </View>
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
  billHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  billAmount: { color: colors.primary, fontSize: 16, fontWeight: '700' },
  tabs: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 3,
    backgroundColor: '#EEF5F2',
    borderRadius: 7,
    padding: 3,
  },
  tab: {
    flexGrow: 1,
    flexBasis: 90,
    minHeight: 44,
    paddingHorizontal: 7,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  selectedTab: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabText: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    textAlign: 'center',
  },
  selectedTabText: { color: colors.surface },
  panel: { gap: 12 },
  hidden: { display: 'none' },
  pressed: { opacity: 0.7 },
});

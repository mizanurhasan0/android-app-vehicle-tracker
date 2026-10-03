import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from '../../i18n';
import { TransportShift } from '../../api/management';
import { Button, Card, Empty, Page, Select } from '../../components/ui';
import { styles } from '../../theme';
import { dateLabel, money } from '../../utils/format';
import { useCoreData } from '../../context/DataContext';
import { GuardianBillCard } from './GuardianBillCard';
import { GuardianSubmissionCard } from './GuardianSubmissionCard';
import { GuardianPaymentSummary } from './GuardianPaymentSummary';
import { GuardianPaymentTabs } from './GuardianPaymentTabs';
import { GuardianPaymentFormPanel } from './GuardianPaymentFormPanel';
import { PaymentPanel } from './PaymentPanel';
import { PaymentTab } from './types';

export function GuardianPaymentsScreen({
  shifts,
  dueOnly,
  billId,
  paymentId,
}: {
  shifts: TransportShift[];
  dueOnly: boolean;
  billId?: string;
  paymentId?: string;
}) {
  const { t } = useTranslation();
  const { data, loading, error, refresh } = useCoreData();
  const [selectedBill, setSelectedBill] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [tab, setTab] = useState<PaymentTab>(
    paymentId ? 'Payment history' : 'Your bills',
  );
  const [focused, setFocused] = useState(!!(billId || paymentId));
  const targetBillId =
    billId || data.payments.find(item => item.id === paymentId)?.billId;
  const [submitting, setSubmitting] = useState(false);

  const visibleBills = data.bills.filter(
    bill =>
      (!focused || bill.id === targetBillId) &&
      (!dueOnly || bill.status === 'UNPAID'),
  );
  const payableBills = data.bills.filter(
    bill =>
      (!focused || bill.id === targetBillId) &&
      bill.status === 'UNPAID' &&
      !bill.pendingSubmissionId,
  );

  const selected = data.bills.find(
    bill =>
      bill.id === selectedBill &&
      bill.status === 'UNPAID' &&
      !bill.pendingSubmissionId,
  );
  const payments = data.payments.filter(
    payment =>
      (!focused ||
        (paymentId
          ? payment.id === paymentId
          : payment.billId === targetBillId)) &&
      (!filter || payment.status === filter),
  );
  return (
    <Page loading={loading} refresh={refresh} error={error}>
      {focused ? (
        <Button
          secondary
          title={t('Show all records')}
          onPress={() => setFocused(false)}
        />
      ) : null}
      <GuardianPaymentSummary
        bills={data.bills}
        creditBalance={data.credit?.balance ?? 0}
        canPay={
          payableBills.some(
            bill =>
              !!data.accounts.length ||
              (data.credit?.balance ?? 0) >= bill.amount,
          ) && !submitting
        }
        onPay={() => {
          setSelectedBill(
            payableBills.find(
              bill =>
                !!data.accounts.length ||
                (data.credit?.balance ?? 0) >= bill.amount,
            )?.id || null,
          );
          setTab('Payment form');
        }}
      />
      <GuardianPaymentTabs tab={tab} onChange={setTab} />
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
            <GuardianBillCard
              key={bill.id}
              bill={bill}
              shifts={shifts}
              canSubmit={
                (!!data.accounts.length ||
                  (data.credit?.balance ?? 0) >= bill.amount) &&
                !submitting
              }
              onPay={() => {
                setSelectedBill(bill.id);
                setTab('Payment form');
              }}
            />
          ))
        )}
      </PaymentPanel>
      <PaymentPanel label="Payment history" active={tab === 'Payment history'}>
        {data.credit?.entries.length ? (
          <Card>
            <Text style={styles.heading}>{t('Advance activity')}</Text>
            {data.credit.entries.map(entry => (
              <View key={entry.id} style={styles.section}>
                <Text style={styles.body}>
                  {entry.kind === 'OVERPAYMENT'
                    ? t('Extra payment credited')
                    : entry.kind === 'RETURNED'
                    ? t('Returned after rejection')
                    : entry.kind === 'CREDIT_PAYMENT'
                    ? t('Bill paid from advance')
                    : t('Reserved for pending payment')}
                  {' · '}
                  {money(Math.abs(entry.amount))}
                </Text>
                <Text style={styles.muted}>
                  {entry.studentName} · {entry.month} ·{' '}
                  {dateLabel(entry.createdAt)}
                </Text>
              </View>
            ))}
          </Card>
        ) : null}
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
            <GuardianSubmissionCard
              key={payment.id}
              payment={payment}
              shifts={shifts}
            />
          ))
        )}
      </PaymentPanel>
      <GuardianPaymentFormPanel
        active={tab === 'Payment form'}
        hasAccounts={!!data.accounts.length}
        creditBalance={data.credit?.balance ?? 0}
        payableBills={payableBills}
        selected={selected}
        shifts={shifts}
        onSelect={setSelectedBill}
        onBusyChange={setSubmitting}
        cancel={() => {
          setSelectedBill(null);
          setTab('Your bills');
        }}
      />
    </Page>
  );
}

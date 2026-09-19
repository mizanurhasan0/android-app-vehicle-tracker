import React, { useState } from 'react';
import { useTranslation } from '../../i18n';
import { TransportShift } from '../../api/management';
import { Button, Empty, Page, Select } from '../../components/ui';
import { useData } from '../../context/DataContext';
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
  const { data, loading, error, refresh } = useData();
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
        canPay={!!payableBills.length && !!data.accounts.length && !submitting}
        onPay={() => {
          setSelectedBill(payableBills[0]?.id || null);
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
              canSubmit={!!data.accounts.length && !submitting}
              onPay={() => {
                setSelectedBill(bill.id);
                setTab('Payment form');
              }}
            />
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

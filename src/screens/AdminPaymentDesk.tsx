import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Bill } from '../api/types';
import { TransportShift } from '../api/management';
import { DEFAULT_SHIFTS } from '../utils/transport';
import { Button, Empty, Page } from '../components/ui';
import { useData } from '../context/DataContext';
import { useTranslation } from '../i18n';
import { colors, styles } from '../theme';
import { money, numberLabel } from '../utils/format';
import { AdminBillTable } from './payments/AdminBillTable';
import { AdminPaymentFilters } from './payments/AdminPaymentFilters';
import { AdminPaymentTabs } from './payments/AdminPaymentTabs';
import { BillGenerator } from './payments/BillGenerator';
import { SubmissionCard } from './payments/SubmissionCard';
import { DeskTab } from './payments/types';

export function AdminPaymentDesk({
  shifts = DEFAULT_SHIFTS,
  initialTab = 'review',
  dueOnly = false,
  billId,
  paymentId,
}: {
  shifts?: TransportShift[];
  initialTab?: DeskTab;
  dueOnly?: boolean;
  billId?: string;
  paymentId?: string;
} = {}) {
  const { t } = useTranslation();
  const { data, loading, error, refresh } = useData();
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(
    null,
  );
  const targetPaymentId = selectedPaymentId || paymentId;
  const targetPayment = data.payments.find(item => item.id === targetPaymentId);
  const targetBillId = billId || targetPayment?.billId;
  const [focused, setFocused] = useState(!!(billId || paymentId));
  const [tab, setTab] = useState<DeskTab>(
    paymentId
      ? targetPayment?.status === 'PENDING'
        ? 'review'
        : 'history'
      : initialTab,
  );
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [month, setMonth] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(
    paymentId || null,
  );
  const [showGenerator, setShowGenerator] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const pending = data.payments.filter(payment => payment.status === 'PENDING');
  const search = query.trim().toLocaleLowerCase();
  const matches = (...values: string[]) =>
    values.join(' ').toLocaleLowerCase().includes(search);
  const months = [
    ...new Set([...data.bills, ...data.payments].map(item => item.month)),
  ]
    .sort()
    .reverse();
  const payments = data.payments
    .filter(
      payment =>
        (!focused ||
          (targetPaymentId
            ? payment.id === targetPaymentId
            : payment.billId === targetBillId)) &&
        (tab === 'review'
          ? payment.status === 'PENDING'
          : payment.status !== 'PENDING') &&
        (!status || payment.status === status) &&
        (!month || payment.month === month) &&
        matches(
          payment.studentName,
          payment.guardianName,
          payment.guardianPhone,
          payment.transactionId,
          payment.senderNumber,
          payment.recipientNumber,
        ),
    )
    .sort((a, b) =>
      tab === 'review'
        ? Date.parse(a.createdAt) - Date.parse(b.createdAt)
        : Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );
  const bills = data.bills
    .filter(
      bill =>
        (!focused || bill.id === targetBillId) &&
        (!dueOnly || bill.status === 'UNPAID') &&
        (!month || bill.month === month) &&
        (!status ||
          (status === 'PENDING'
            ? !!bill.pendingSubmissionId
            : bill.status === status && !bill.pendingSubmissionId)) &&
        matches(bill.studentName, bill.guardianName),
    )
    .sort(
      (a, b) =>
        b.month.localeCompare(a.month) ||
        a.studentName.localeCompare(b.studentName),
    );
  const filtered = !!(search || status || month);
  const summaryBills = data.bills.filter(
    bill => !month || bill.month === month,
  );
  const totalBilled = summaryBills.reduce((sum, bill) => sum + bill.amount, 0);
  const totalPaid = summaryBills
    .filter(bill => bill.status === 'PAID')
    .reduce((sum, bill) => sum + bill.amount, 0);
  const resultCount = tab === 'bills' ? bills.length : payments.length;
  const changeTab = (value: DeskTab) => {
    setTab(value);
    setStatus('');
    setExpandedId(null);
    if (selectedPaymentId) {
      setSelectedPaymentId(null);
      setFocused(false);
    }
  };
  const openPendingPayment = (bill: Bill) => {
    const submissionId =
      bill.pendingSubmissionId ||
      pending.find(payment => payment.billId === bill.id)?.id;
    if (!submissionId) return;
    changeTab('review');
    setSelectedPaymentId(submissionId);
    setFocused(true);
    setQuery('');
    setMonth('');
    setExpandedId(submissionId);
  };

  return (
    <Page loading={loading} refresh={refresh} error={error}>
      <View style={desk.overview}>
        <View style={desk.stat}>
          <Text style={desk.overviewLabel}>{t('Total billed')}</Text>
          <Text style={desk.statValue}>{money(totalBilled)}</Text>
        </View>
        <View style={desk.stat}>
          <Text style={desk.overviewLabel}>{t('Paid')}</Text>
          <Text style={desk.statValue}>{money(totalPaid)}</Text>
        </View>
        <View style={desk.stat}>
          <Text style={[desk.overviewLabel, desk.due]}>{t('Due')}</Text>
          <Text style={[desk.statValue, desk.due]}>
            {money(totalBilled - totalPaid)}
          </Text>
        </View>
      </View>
      <AdminPaymentTabs
        tab={tab}
        pendingCount={pending.length}
        onChange={changeTab}
      />
      {tab === 'bills' ? (
        <>
          <Button
            secondary
            title={t(
              showGenerator ? 'Close bill creation' : 'Create monthly bills',
            )}
            onPress={() => setShowGenerator(!showGenerator)}
          />
          {showGenerator ? <BillGenerator /> : null}
        </>
      ) : null}
      <AdminPaymentFilters
        tab={tab}
        searchMode={searchMode}
        setSearchMode={setSearchMode}
        query={query}
        setQuery={setQuery}
        month={month}
        setMonth={setMonth}
        months={months}
        status={status}
        setStatus={setStatus}
        filtered={filtered}
      />
      <View style={styles.between}>
        <Text accessibilityRole="header" style={styles.heading}>
          {t(
            tab === 'review'
              ? 'Review submissions'
              : tab === 'bills'
              ? 'Monthly bills'
              : 'Payment history',
          )}{' '}
          · {numberLabel(resultCount)}
        </Text>
        <Text style={styles.muted}>
          {t(tab === 'review' ? 'Oldest first' : 'Newest first')}
        </Text>
      </View>
      {!resultCount ? (
        <Empty
          title={t(
            loading
              ? 'Loading payment records…'
              : filtered
              ? 'No matching records'
              : dueOnly && tab === 'bills'
              ? 'No outstanding dues'
              : tab === 'review'
              ? 'You’re all caught up'
              : tab === 'bills'
              ? 'No bills yet'
              : 'No payment history yet',
          )}
          detail={t(
            filtered
              ? 'Try another search or clear your filters.'
              : dueOnly && tab === 'bills'
              ? 'All your bills are up to date.'
              : tab === 'review'
              ? 'New payment submissions will appear here for review.'
              : tab === 'bills'
              ? 'Create monthly bills to get started.'
              : 'Approved and rejected payments will appear here.',
          )}
        />
      ) : tab === 'bills' ? (
        <AdminBillTable
          bills={bills}
          pending={pending}
          shifts={shifts}
          onOpenPayment={openPendingPayment}
        />
      ) : (
        payments.map(payment => (
          <SubmissionCard
            key={payment.id}
            payment={payment}
            shifts={shifts}
            expanded={expandedId === payment.id}
            onToggle={() =>
              setExpandedId(expandedId === payment.id ? null : payment.id)
            }
          />
        ))
      )}
    </Page>
  );
}

const desk = StyleSheet.create({
  overview: {
    backgroundColor: '#F0FAF5',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 4,
    gap: 3,
  },
  overviewLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
    flexShrink: 1,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    color: colors.primary,
    fontSize: 19,
    fontWeight: '700',
    flexShrink: 1,
  },
  due: { color: colors.danger },
});

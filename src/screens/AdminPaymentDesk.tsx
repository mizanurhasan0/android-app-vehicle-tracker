import React, { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  FileText,
  Plus,
} from 'lucide-react-native';
import { Bill } from '../api/types';
import { TransportShift } from '../api/management';
import { DEFAULT_SHIFTS } from '../utils/transport';
import { Empty, Page } from '../components/ui';
import { useCoreData } from '../context/DataContext';
import { locale, useTranslation } from '../i18n';
import { colors, styles } from '../theme';
import { currentMonth, money, numberLabel } from '../utils/format';
import { AdminBillTable } from './payments/AdminBillTable';
import { AdminPaymentFilters } from './payments/AdminPaymentFilters';
import { AdminPaymentTabs } from './payments/AdminPaymentTabs';
import { BillGenerator } from './payments/BillGenerator';
import { HistoryPaymentList } from './payments/HistoryPaymentList';
import { SubmissionCard } from './payments/SubmissionCard';
import { DeskTab } from './payments/types';

function moveMonth(value: string, offset: number) {
  const [year, month] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    '0',
  )}`;
}

function monthLabel(value: string, long = false) {
  const [year, month] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(locale(), {
    month: long ? 'long' : 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function monthName(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(locale(), {
    month: 'short',
    timeZone: 'UTC',
  });
}

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
  const { width } = useWindowDimensions();
  const monthOffsets =
    width < 360 ? ([-1, 0, 1] as const) : ([-2, -1, 0, 1, 2] as const);
  const { data, loading, error, refresh } = useCoreData();
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
  const [month, setMonth] = useState(
    initialTab === 'bills' && !dueOnly && !billId && !paymentId
      ? currentMonth()
      : '',
  );
  const [monthFocus, setMonthFocus] = useState(currentMonth);
  const [expandedId, setExpandedId] = useState<string | null>(
    paymentId || null,
  );
  const [showGenerator, setShowGenerator] = useState(false);
  const [visibleBillCount, setVisibleBillCount] = useState(20);
  const pending = data.payments.filter(payment => payment.status === 'PENDING');
  const search = query.trim().toLocaleLowerCase();
  const matches = (...values: string[]) =>
    values.join(' ').toLocaleLowerCase().includes(search);
  const months = [
    ...new Set([
      ...[...data.bills, ...data.payments].map(item => item.month),
      monthFocus,
      ...(month ? [month] : []),
    ]),
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
    setVisibleBillCount(20);
    setMonth(value === 'bills' ? month || currentMonth() : '');
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
  const selectMonth = (value: string) => {
    setMonthFocus(value);
    setMonth(value);
    setVisibleBillCount(20);
  };
  const setBillingMonth = (value: string) => {
    setMonth(value);
    if (value) setMonthFocus(value);
    setVisibleBillCount(20);
  };

  return (
    <Page loading={loading} refresh={refresh} error={error}>
      {tab === 'bills' ? (
        <View style={desk.monthCard}>
          <View style={desk.monthStrip}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Previous month')}
              onPress={() => selectMonth(moveMonth(monthFocus, -1))}
              style={desk.monthArrow}
            >
              <ChevronLeft size={20} color={colors.primary} />
            </Pressable>
            {monthOffsets.map(offset => {
              const value = moveMonth(monthFocus, offset);
              const selected = month === value;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityLabel={monthLabel(value, true)}
                  accessibilityState={{ selected }}
                  onPress={() => selectMonth(value)}
                  style={({ pressed }) => [
                    desk.monthChoice,
                    selected && desk.monthChoiceActive,
                    pressed && desk.pressed,
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={[desk.monthName, selected && desk.monthActiveText]}
                  >
                    {monthName(value)}
                  </Text>
                  <Text
                    style={[desk.monthYear, selected && desk.monthActiveText]}
                  >
                    {Number(value.slice(0, 4)).toLocaleString(locale(), {
                      useGrouping: false,
                    })}
                  </Text>
                </Pressable>
              );
            })}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Next month')}
              onPress={() => selectMonth(moveMonth(monthFocus, 1))}
              style={desk.monthArrow}
            >
              <ChevronRight size={20} color={colors.primary} />
            </Pressable>
          </View>
          <Text style={desk.monthCaption}>
            {month ? monthLabel(month, true) : t('All months')}
          </Text>
        </View>
      ) : null}
      <View style={desk.overview}>
        <View style={desk.stat}>
          <FileText size={18} color={colors.primary} />
          <Text style={desk.overviewLabel}>{t('Total billed')}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={desk.statValue}>
            {money(totalBilled)}
          </Text>
        </View>
        <View style={desk.statDivider} />
        <View style={desk.stat}>
          <Check size={18} color={colors.primary} />
          <Text style={desk.overviewLabel}>{t('Paid')}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={desk.statValue}>
            {money(totalPaid)}
          </Text>
        </View>
        <View style={desk.statDivider} />
        <View style={desk.stat}>
          <CircleAlert size={18} color={colors.danger} />
          <Text style={[desk.overviewLabel, desk.due]}>{t('Due')}</Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            style={[desk.statValue, desk.due]}
          >
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
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showGenerator }}
            onPress={() => setShowGenerator(!showGenerator)}
            style={({ pressed }) => [
              desk.createButton,
              pressed && desk.pressed,
            ]}
          >
            <View style={desk.createIcon}>
              <Plus size={24} color={colors.primary} />
            </View>
            <View style={desk.createCopy}>
              <Text style={desk.createTitle}>
                {t(
                  showGenerator
                    ? 'Close bill creation'
                    : 'Create monthly bills',
                )}
              </Text>
              <Text style={desk.createSubtitle}>
                {t('Generate transport bills for a selected month')}
              </Text>
            </View>
            <ChevronRight size={22} color={colors.surface} />
          </Pressable>
          {showGenerator ? (
            <BillGenerator initialMonth={month || currentMonth()} />
          ) : null}
        </>
      ) : null}
      <AdminPaymentFilters
        tab={tab}
        query={query}
        setQuery={value => {
          setQuery(value);
          setVisibleBillCount(20);
        }}
        month={month}
        setMonth={setBillingMonth}
        months={months}
        status={status}
        setStatus={value => {
          setStatus(value);
          setVisibleBillCount(20);
        }}
        showClear={!!(search || status || (month && month !== currentMonth()))}
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
        <>
          <AdminBillTable
            bills={bills.slice(0, visibleBillCount)}
            pending={pending}
            shifts={shifts}
            onOpenPayment={openPendingPayment}
          />
          {bills.length > visibleBillCount ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => setVisibleBillCount(count => count + 20)}
              style={desk.moreButton}
            >
              <Text style={desk.moreText}>{t('Load more')}</Text>
            </Pressable>
          ) : null}
        </>
      ) : tab === 'history' ? (
        <HistoryPaymentList
          payments={payments}
          shifts={shifts}
          expandedId={expandedId}
          onToggle={id => setExpandedId(expandedId === id ? null : id)}
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
  monthCard: {
    padding: 10,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 5,
  },
  monthStrip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  monthArrow: {
    width: 29,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthChoice: {
    flex: 1,
    minWidth: 0,
    minHeight: 54,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  monthChoiceActive: {
    backgroundColor: colors.primary,
  },
  monthName: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  monthYear: { color: colors.muted, fontSize: 10 },
  monthActiveText: { color: colors.surface },
  monthCaption: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  overview: {
    backgroundColor: colors.surface,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  overviewLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
    textAlign: 'center',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    minWidth: 0,
  },
  statDivider: { width: 1, backgroundColor: colors.line, marginVertical: 4 },
  statValue: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '800',
    flexShrink: 1,
  },
  due: { color: colors.danger },
  createButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    minHeight: 76,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  createIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createCopy: { flex: 1, minWidth: 0, gap: 3 },
  createTitle: { color: colors.surface, fontSize: 15, fontWeight: '700' },
  createSubtitle: { color: '#D6F1E5', fontSize: 11, lineHeight: 16 },
  moreButton: {
    minHeight: 44,
    borderRadius: 12,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.75 },
});

import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Payment } from '../api/types';
import { ReviewActions } from '../components/ReviewActions';
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
import { useData } from '../context/DataContext';
import { useAction } from '../hooks/useAction';
import { useTranslation } from '../i18n';
import { colors, styles } from '../theme';
import {
  currentMonth,
  dateLabel,
  money,
  numberLabel,
  readable,
} from '../utils/format';

type DeskTab = 'review' | 'bills' | 'history';

function Choice({
  label,
  selected,
  onPress,
  tab = false,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  tab?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={tab ? 'tab' : 'button'}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        desk.choice,
        selected && desk.choiceSelected,
        pressed && desk.pressed,
      ]}
    >
      <Text style={[desk.choiceText, selected && desk.choiceTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={desk.detail}>
      <Text style={styles.muted}>{label}</Text>
      <Text selectable style={styles.body}>
        {value}
      </Text>
    </View>
  );
}

function SubmissionCard({
  payment,
  expanded,
  onToggle,
}: {
  payment: Payment;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const pending = payment.status === 'PENDING';
  return (
    <Card>
      <View style={styles.between}>
        <Text style={desk.amount}>{money(payment.amount)}</Text>
        <Badge status={payment.status} />
      </View>
      <View>
        <Text style={styles.heading}>{payment.studentName}</Text>
        <Text style={styles.muted}>
          {payment.guardianName} · {payment.month}
        </Text>
      </View>
      <View style={desk.receipt}>
        <Detail label={t('Payment method')} value={readable(payment.method)} />
        <Detail label={t('Transaction ID')} value={payment.transactionId} />
      </View>
      <Text style={styles.muted}>
        {t('Submitted on')} {dateLabel(payment.createdAt)}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t(
          expanded
            ? 'Hide details'
            : pending
            ? 'Review payment'
            : 'View details',
        )} · ${payment.studentName} · ${payment.transactionId}`}
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={({ pressed }) => [desk.disclosure, pressed && desk.pressed]}
      >
        <Text style={desk.link}>
          {t(
            expanded
              ? 'Hide details'
              : pending
              ? 'Review payment'
              : 'View details',
          )}
        </Text>
        <Text style={desk.link}>{expanded ? '−' : '+'}</Text>
      </Pressable>
      {expanded ? (
        <View style={styles.section}>
          <View style={desk.receipt}>
            <Detail
              label={t('Number you sent money from')}
              value={payment.senderNumber}
            />
            <Detail
              label={t('Number you sent money to')}
              value={payment.recipientNumber}
            />
          </View>
          {payment.note ? (
            <Detail label={t('Admin note')} value={payment.note} />
          ) : null}
          {pending ? (
            <>
              <Text style={styles.muted}>
                {t(
                  'Match the amount, transaction ID and recipient with your wallet before approving.',
                )}
              </Text>
              <ReviewActions
                path={`/admin/payments/${payment.id}/decision`}
                confirmation={t(
                  'Confirm receipt of {{amount}} in {{method}} account {{number}}. Transaction: {{transaction}}. This will mark the bill as paid.',
                  {
                    amount: money(payment.amount),
                    method: readable(payment.method),
                    number: payment.recipientNumber,
                    transaction: payment.transactionId,
                  },
                )}
              />
            </>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

function BillGenerator() {
  const { t } = useTranslation();
  const { mutate } = useData();
  const [month, setMonth] = useState(currentMonth());
  const action = useAction();
  return (
    <Card tinted>
      <Text style={styles.heading}>{t('Create monthly bills')}</Text>
      <Field
        label={t('Billing month (YYYY-MM)')}
        keyboardType="numbers-and-punctuation"
        value={month}
        onChangeText={setMonth}
        placeholder="2026-09"
        maxLength={7}
        autoCorrect={false}
        editable={!action.busy}
        hint={t(
          'Full monthly fee; no automatic proration. Existing bills are never duplicated.',
        )}
      />
      <Notice text={action.error ? t(action.error) : ''} kind="error" />
      <Notice text={action.success ? t(action.success) : ''} />
      <Button
        title={t('Generate bills')}
        busy={action.busy}
        onPress={() => {
          action.run(async () => {
            if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
              throw new Error('Use a valid month such as 2026-09.');
            }
            await mutate('/admin/bills/generate', { month });
          }, 'Monthly bills are ready. Guardians have been notified.');
        }}
      />
    </Card>
  );
}

export function AdminPaymentDesk({
  initialTab = 'review',
  dueOnly = false,
}: { initialTab?: DeskTab; dueOnly?: boolean } = {}) {
  const { t } = useTranslation();
  const { data, loading, error, refresh } = useData();
  const [tab, setTab] = useState<DeskTab>(initialTab);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [month, setMonth] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
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
  };

  return (
    <Page loading={loading} refresh={refresh} error={error}>
      <View style={desk.overview}>
        <View style={desk.stat}>
          <Text style={desk.overviewLabel}>মোট বিল</Text>
          <Text style={desk.statValue}>{money(totalBilled)}</Text>
        </View>
        <View style={desk.stat}>
          <Text style={desk.overviewLabel}>পরিশোধিত</Text>
          <Text style={desk.statValue}>{money(totalPaid)}</Text>
        </View>
        <View style={desk.stat}>
          <Text style={[desk.overviewLabel, desk.due]}>বকেয়া</Text>
          <Text style={[desk.statValue, desk.due]}>
            {money(totalBilled - totalPaid)}
          </Text>
        </View>
      </View>
      <View accessibilityRole="tablist" style={desk.choices}>
        <Choice
          tab
          label={`${t('To review')} · ${numberLabel(pending.length)}`}
          selected={tab === 'review'}
          onPress={() => changeTab('review')}
        />
        <Choice
          tab
          label={t('Monthly bills')}
          selected={tab === 'bills'}
          onPress={() => changeTab('bills')}
        />
        <Choice
          tab
          label={t('History')}
          selected={tab === 'history'}
          onPress={() => changeTab('history')}
        />
      </View>
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
      <Card>
        <Field
          label={t('Search records')}
          value={query}
          onChangeText={setQuery}
          placeholder={t(
            tab === 'bills'
              ? 'Student or guardian name'
              : 'Name, transaction ID or phone number',
          )}
          autoCorrect={false}
          autoCapitalize="none"
          maxLength={100}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showFilters }}
          onPress={() => setShowFilters(value => !value)}
          style={desk.filterToggle}
        >
          <Text style={desk.link}>
            {showFilters ? 'ফিল্টার বন্ধ করুন' : 'মাস ও অবস্থা অনুযায়ী ফিল্টার'}
          </Text>
          <Text style={desk.link}>{showFilters ? '−' : '+'}</Text>
        </Pressable>
        <View
          style={[desk.filterFields, !showFilters && desk.hidden]}
          accessibilityElementsHidden={!showFilters}
          importantForAccessibility={
            showFilters ? 'auto' : 'no-hide-descendants'
          }
        >
          <Select
            label={t('Billing month')}
            value={month || 'ALL'}
            onChange={value => setMonth(value === 'ALL' ? '' : value)}
            options={[
              { value: 'ALL', label: t('All months') },
              ...months.map(value => ({ value, label: value })),
            ]}
          />
          {tab !== 'review' ? (
            <View style={desk.choices}>
              {(tab === 'bills'
                ? ['', 'UNPAID', 'PENDING', 'PAID']
                : ['', 'APPROVED', 'REJECTED']
              ).map(value => (
                <Choice
                  key={value}
                  label={t(
                    value === ''
                      ? 'All'
                      : value === 'PENDING'
                      ? 'Awaiting review'
                      : readable(value),
                  )}
                  selected={status === value}
                  onPress={() => setStatus(value)}
                />
              ))}
            </View>
          ) : null}
        </View>
        {filtered ? (
          <Button
            secondary
            title={t('Clear filters')}
            onPress={() => {
              setQuery('');
              setMonth('');
              setStatus('');
            }}
          />
        ) : null}
      </Card>
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
        <View style={desk.table}>
          <View style={[desk.billRow, desk.tableHead]}>
            <Text style={[desk.columnName, desk.columnLabel]}>নাম</Text>
            <Text style={[desk.columnMonth, desk.columnLabel]}>মাস</Text>
            <Text style={[desk.columnAmount, desk.columnLabel]}>পরিমাণ</Text>
            <Text style={[desk.columnStatus, desk.columnLabel]}>অবস্থা</Text>
          </View>
          {bills.map(bill => (
            <View key={bill.id} style={desk.tableItem}>
              <View style={desk.billRow}>
                <View style={desk.columnName}>
                  <Text style={desk.studentName}>{bill.studentName}</Text>
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
                      bill.pendingSubmissionId ? 'PENDING' : bill.status,
                    )}
                    style={[
                      desk.billStatus,
                      bill.status !== 'PAID' && desk.billStatusDue,
                    ]}
                  >
                    {bill.status === 'PAID'
                      ? '✓'
                      : bill.pendingSubmissionId
                      ? '◷'
                      : '!'}
                  </Text>
                </View>
              </View>
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
                  onPress={() => {
                    changeTab('review');
                    const submission = pending.find(
                      payment => payment.id === bill.pendingSubmissionId,
                    );
                    setQuery(submission?.transactionId || bill.studentName);
                    setMonth('');
                    setExpandedId(bill.pendingSubmissionId);
                  }}
                />
              ) : null}
            </View>
          ))}
        </View>
      ) : (
        payments.map(payment => (
          <SubmissionCard
            key={payment.id}
            payment={payment}
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
  filterToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 36,
  },
  filterFields: { gap: 10 },
  hidden: { display: 'none' },
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
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  choice: {
    minHeight: 44,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  choiceSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  choiceText: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  choiceTextSelected: { color: colors.surface },
  amount: {
    color: colors.ink,
    fontSize: 21,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  receipt: {
    backgroundColor: colors.background,
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },
  detail: { gap: 3 },
  disclosure: {
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 12,
  },
  link: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  pressed: { opacity: 0.7 },
});

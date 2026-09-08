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

export function AdminPaymentDesk() {
  const { t } = useTranslation();
  const { data, loading, error, refresh } = useData();
  const [tab, setTab] = useState<DeskTab>('review');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [month, setMonth] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const pending = data.payments.filter(payment => payment.status === 'PENDING');
  const unpaid = data.bills.filter(bill => bill.status === 'UNPAID');
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
          <Text style={desk.overviewLabel}>
            {t('Awaiting review')} · {numberLabel(pending.length)}
          </Text>
          <Text style={desk.statValue}>
            {money(pending.reduce((sum, payment) => sum + payment.amount, 0))}
          </Text>
        </View>
        <View style={desk.stat}>
          <Text style={desk.overviewLabel}>{t('Outstanding bills')}</Text>
          <Text style={desk.statValue}>
            {money(unpaid.reduce((sum, bill) => sum + bill.amount, 0))}
          </Text>
        </View>
        <View style={desk.stat}>
          <Text style={desk.overviewLabel}>{t('Paid bills')}</Text>
          <Text style={desk.statValue}>
            {numberLabel(
              data.bills.filter(bill => bill.status === 'PAID').length,
            )}
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
              : tab === 'review'
              ? 'You’re all caught up'
              : tab === 'bills'
              ? 'No bills yet'
              : 'No payment history yet',
          )}
          detail={t(
            filtered
              ? 'Try another search or clear your filters.'
              : tab === 'review'
              ? 'New payment submissions will appear here for review.'
              : tab === 'bills'
              ? 'Create monthly bills to get started.'
              : 'Approved and rejected payments will appear here.',
          )}
        />
      ) : tab === 'bills' ? (
        bills.map(bill => (
          <Card key={bill.id}>
            <View style={styles.between}>
              <Text style={desk.amount}>{money(bill.amount)}</Text>
              <Badge
                status={bill.pendingSubmissionId ? 'PENDING' : bill.status}
              />
            </View>
            <View>
              <Text style={styles.heading}>{bill.studentName}</Text>
              <Text style={styles.muted}>
                {bill.guardianName} · {bill.month}
              </Text>
            </View>
            {bill.paidAt ? (
              <Text style={styles.muted}>
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
          </Card>
        ))
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
  overview: {
    backgroundColor: colors.ink,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  overviewLabel: {
    color: '#D7EEE3',
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  stat: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    columnGap: 12,
    rowGap: 4,
  },
  statValue: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
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
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  receipt: {
    backgroundColor: colors.background,
    borderRadius: 14,
    padding: 14,
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

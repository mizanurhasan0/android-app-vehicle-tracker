import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  X,
} from 'lucide-react-native';
import { Payment } from '../../api/types';
import { TransportShift } from '../../api/management';
import { PaymentImage } from '../../components/PaymentImage';
import { locale, useTranslation } from '../../i18n';
import { colors } from '../../theme';
import { dateLabel, money, readable } from '../../utils/format';
import { paymentShiftLabel } from '../../utils/paymentShift';

function monthLabel(value: string) {
  const [year, month] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString(locale(), {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return `${parts[0]?.[0] || ''}${
    parts.length > 1 ? parts[parts.length - 1][0] : ''
  }`.toLocaleUpperCase();
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={ui.detailRow}>
      <Text style={ui.detailLabel}>{label}</Text>
      <Text selectable style={ui.detailValue}>
        {value}
      </Text>
    </View>
  );
}

function HistoryPaymentRow({
  payment,
  shifts,
  expanded,
  onToggle,
  last,
}: {
  payment: Payment;
  shifts: TransportShift[];
  expanded: boolean;
  onToggle: () => void;
  last: boolean;
}) {
  const { t } = useTranslation();
  const [showMore, setShowMore] = useState(false);
  useEffect(() => {
    if (!expanded) setShowMore(false);
  }, [expanded]);
  const approved = payment.status === 'APPROVED';
  const method = payment.methodName || readable(payment.method);
  const extraCredit =
    payment.billAmount &&
    payment.amount + (payment.creditApplied || 0) > payment.billAmount
      ? payment.amount + (payment.creditApplied || 0) - payment.billAmount
      : 0;

  return (
    <View style={[ui.row, !last && ui.rowDivider]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${payment.studentName} · ${money(
          payment.amount,
        )} · ${t(readable(payment.status))}`}
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={({ pressed }) => [ui.summary, pressed && ui.pressed]}
      >
        <View style={ui.avatar}>
          <Text style={ui.avatarText}>{initials(payment.studentName)}</Text>
        </View>
        <View style={ui.identity}>
          <Text numberOfLines={1} style={ui.name}>
            {payment.studentName}
          </Text>
          <Text numberOfLines={1} style={ui.meta}>
            {method} · {monthLabel(payment.month)}
          </Text>
        </View>
        <View style={ui.amountStatus}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={ui.amount}>
            {money(payment.amount)}
          </Text>
          <View style={[ui.status, !approved && ui.statusRejected]}>
            <View style={[ui.statusIcon, !approved && ui.statusIconRejected]}>
              {approved ? (
                <Check size={9} strokeWidth={3} color={colors.surface} />
              ) : (
                <X size={9} strokeWidth={3} color={colors.surface} />
              )}
            </View>
            <Text
              numberOfLines={1}
              style={[ui.statusText, !approved && ui.statusTextRejected]}
            >
              {t(readable(payment.status))}
            </Text>
          </View>
        </View>
        {expanded ? (
          <ChevronDown size={18} color={colors.muted} />
        ) : (
          <ChevronRight size={18} color={colors.muted} />
        )}
      </Pressable>
      {expanded ? (
        <View style={ui.details}>
          <DetailRow
            label={t('Transaction ID')}
            value={payment.transactionId}
          />
          <DetailRow
            label={t('Submitted on')}
            value={dateLabel(payment.createdAt)}
          />
          <DetailRow
            label={t('Billing month')}
            value={monthLabel(payment.month)}
          />
          <DetailRow label={t('Payment method')} value={method} />
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showMore }}
            onPress={() => setShowMore(value => !value)}
            style={({ pressed }) => [ui.moreButton, pressed && ui.pressed]}
          >
            <FileText size={17} color={colors.primary} />
            <Text style={ui.moreLabel}>
              {t(showMore ? 'Hide details' : 'View details')}
            </Text>
            {showMore ? (
              <ChevronDown size={18} color={colors.primary} />
            ) : (
              <ChevronRight size={18} color={colors.primary} />
            )}
          </Pressable>
          {showMore ? (
            <View style={ui.moreDetails}>
              <DetailRow label={t('Guardian')} value={payment.guardianName} />
              <DetailRow
                label={t('Phone number')}
                value={payment.guardianPhone}
              />
              {payment.shiftId ? (
                <DetailRow
                  label={t('Shift')}
                  value={paymentShiftLabel(payment, shifts)}
                />
              ) : null}
              <DetailRow
                label={t('Number you sent money from')}
                value={payment.senderNumber}
              />
              <DetailRow
                label={t('Number you sent money to')}
                value={payment.recipientNumber}
              />
              {payment.creditApplied ? (
                <DetailRow
                  label={t('Advance applied')}
                  value={money(payment.creditApplied)}
                />
              ) : null}
              {extraCredit ? (
                <DetailRow
                  label={t('Added to advance balance')}
                  value={money(extraCredit)}
                />
              ) : null}
              {payment.transactionInfo ? (
                <DetailRow
                  label={t('Transaction information')}
                  value={payment.transactionInfo}
                />
              ) : null}
              {payment.note ? (
                <DetailRow label={t('Admin note')} value={payment.note} />
              ) : null}
              {payment.evidenceImageUrl ? (
                <PaymentImage
                  label={t('Payment evidence')}
                  value={payment.evidenceImageUrl}
                />
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

export function HistoryPaymentList({
  payments,
  shifts,
  expandedId,
  onToggle,
}: {
  payments: Payment[];
  shifts: TransportShift[];
  expandedId: string | null;
  onToggle: (id: string) => void;
}) {
  return (
    <View style={ui.list}>
      {payments.map((payment, index) => (
        <HistoryPaymentRow
          key={payment.id}
          payment={payment}
          shifts={shifts}
          expanded={expandedId === payment.id}
          onToggle={() => onToggle(payment.id)}
          last={index === payments.length - 1}
        />
      ))}
    </View>
  );
}

const ui = StyleSheet.create({
  list: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 17,
    overflow: 'hidden',
  },
  row: { paddingHorizontal: 12 },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.line },
  summary: {
    minHeight: 82,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingVertical: 11,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  identity: { flex: 1, minWidth: 0, gap: 3 },
  name: { color: colors.ink, fontSize: 13, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 11 },
  amountStatus: { alignItems: 'flex-end', gap: 4, maxWidth: 92 },
  amount: { color: colors.ink, fontSize: 17, fontWeight: '800' },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.mint,
    borderRadius: 20,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  statusRejected: { backgroundColor: '#FBEAEC' },
  statusIcon: {
    width: 13,
    height: 13,
    backgroundColor: colors.primary,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIconRejected: { backgroundColor: colors.danger },
  statusText: { color: colors.primary, fontSize: 10, fontWeight: '700' },
  statusTextRejected: { color: colors.danger },
  details: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingTop: 12,
    marginBottom: 12,
    gap: 8,
  },
  detailRow: { flexDirection: 'row', gap: 10, justifyContent: 'space-between' },
  detailLabel: { color: colors.muted, fontSize: 11, flex: 1 },
  detailValue: {
    color: colors.ink,
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  moreButton: {
    minHeight: 42,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  moreLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  moreDetails: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 10,
    paddingBottom: 12,
    gap: 9,
  },
  pressed: { opacity: 0.68 },
});

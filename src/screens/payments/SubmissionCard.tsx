import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PaymentImage } from '../../components/PaymentImage';
import { Payment } from '../../api/types';
import { TransportShift } from '../../api/management';
import { paymentShiftLabel } from '../../utils/paymentShift';
import { ReviewActions } from '../../components/ReviewActions';
import { NoorIcon } from '../../components/Noor';
import { Badge, Card } from '../../components/ui';
import { useTranslation } from '../../i18n';
import { colors, styles } from '../../theme';
import { dateLabel, money, readable } from '../../utils/format';
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

export function SubmissionCard({
  payment,
  shifts,
  expanded,
  onToggle,
}: {
  payment: Payment;
  shifts: TransportShift[];
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
        {payment.shiftId ? (
          <Text style={styles.muted}>{paymentShiftLabel(payment, shifts)}</Text>
        ) : null}
        <Text style={styles.muted}>
          {payment.guardianName} · {payment.month}
        </Text>
      </View>
      <View style={desk.receipt}>
        <Detail
          label={t('Payment method')}
          value={payment.methodName || readable(payment.method)}
        />
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
        <NoorIcon
          name={expanded ? 'minus' : 'plus'}
          size={20}
          color={colors.primary}
        />
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
          {payment.transactionInfo ? (
            <Detail
              label={t('Transaction information')}
              value={payment.transactionInfo}
            />
          ) : null}
          {payment.evidenceImageUrl ? (
            <PaymentImage
              label={t('Payment evidence')}
              value={payment.evidenceImageUrl}
            />
          ) : null}
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
                    method: payment.methodName || readable(payment.method),
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

const desk = StyleSheet.create({
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

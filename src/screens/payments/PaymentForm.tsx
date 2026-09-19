import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Bill, PaymentAccount } from '../../api/types';
import { TransportShift } from '../../api/management';
import { ValidationError } from '../../utils/validation';
import { translateMessage, useTranslation } from '../../i18n';
import { paymentShiftLabel } from '../../utils/paymentShift';
import { Button, Card, Field, Notice, Select } from '../../components/ui';
import { useData } from '../../context/DataContext';
import { useAction } from '../../hooks/useAction';
import { styles } from '../../theme';
import { money, readable } from '../../utils/format';
import { PaymentPanel } from './PaymentPanel';
import { PaymentInstructions } from './PaymentInstructions';

export function PaymentForm({
  bill,
  active,
  shifts,
  cancel,
  onBusyChange,
}: {
  bill: Bill;
  active: boolean;
  shifts: TransportShift[];
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
    <>
      <PaymentPanel label="Payment form" active={active}>
        <PaymentInstructions />
        <Card tinted>
          <Text style={styles.heading}>{t('Submit payment details')}</Text>
          <Text style={styles.body}>
            {bill.studentName} · {bill.month} · {money(bill.amount)}
          </Text>
          {bill.shiftId ? (
            <Text style={styles.muted}>{paymentShiftLabel(bill, shifts)}</Text>
          ) : null}
          <Select
            label={t('Payment method')}
            value={method}
            error={action.fieldErrors.method}
            onChange={value => {
              action.clearFieldError('method');
              action.clearFieldError('recipientNumber');
              setMethod(value);
              const selected = data.accounts.find(
                item => item.method === value,
              );
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
            error={action.fieldErrors.recipientNumber}
            onChangeText={value => {
              action.clearFieldError('recipientNumber');
              setRecipient(value);
            }}
            keyboardType="phone-pad"
            maxLength={12}
            hint={t(
              'Use the exact admin number you paid, even if it was recently changed.',
            )}
          />
          <Field
            label={t('Number you sent money from')}
            value={senderNumber}
            error={action.fieldErrors.senderNumber}
            onChangeText={value => {
              action.clearFieldError('senderNumber');
              setSender(value);
            }}
            keyboardType="phone-pad"
            maxLength={12}
            placeholder="01XXXXXXXXX"
          />
          <Field
            label={t('Transaction ID')}
            value={transactionId}
            error={action.fieldErrors.transactionId}
            onChangeText={value => {
              action.clearFieldError('transactionId');
              setTransaction(value);
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={40}
            hint={t('Copy the transaction ID from your payment confirmation.')}
          />
          <Button
            title={t('Submit for verification')}
            busy={action.busy}
            disabled={!account}
            onPress={() => {
              action.run(async () => {
                const errors: Record<string, string> = {};
                const walletNumber =
                  method === 'BKASH' ? /^01[3-9]\d{8}$/ : /^01[3-9]\d{8,9}$/;
                if (!walletNumber.test(senderNumber))
                  errors.senderNumber =
                    'Enter the sender’s valid mobile wallet number.';
                if (!walletNumber.test(recipientNumber))
                  errors.recipientNumber =
                    'Enter the receiving account’s valid mobile wallet number.';
                if (
                  !/^[A-Z0-9]{6,40}$/.test(transactionId.trim().toUpperCase())
                )
                  errors.transactionId =
                    'Enter a valid transaction ID (6–40 letters or digits).';
                if (Object.keys(errors).length)
                  throw new ValidationError(errors);
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
      </PaymentPanel>
      {/* Keep feedback mounted so changing tabs does not replay dismissed errors. */}
      <Notice text={action.error} kind="error" />
    </>
  );
}

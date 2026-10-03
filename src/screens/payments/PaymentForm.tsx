import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Bill, PaymentAccount } from '../../api/types';
import { TransportShift } from '../../api/management';
import { ValidationError } from '../../utils/validation';
import { translateMessage, useTranslation } from '../../i18n';
import { paymentShiftLabel } from '../../utils/paymentShift';
import { Button, Card, Field, Notice, Select } from '../../components/ui';
import { useCoreData } from '../../context/DataContext';
import { useAction } from '../../hooks/useAction';
import { styles } from '../../theme';
import { money, readable, toPoisha } from '../../utils/format';
import { PaymentPanel } from './PaymentPanel';
import { PaymentImage } from '../../components/PaymentImage';
import { PaymentInstructions } from './PaymentInstructions';

export function PaymentForm({
  bill,
  creditBalance,
  active,
  shifts,
  cancel,
  onBusyChange,
}: {
  bill: Bill;
  creditBalance: number;
  active: boolean;
  shifts: TransportShift[];
  cancel: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const { t } = useTranslation();
  const { data, mutate } = useCoreData();
  const [method, setMethod] = useState('');
  const [senderNumber, setSender] = useState('');
  const [account, setAccount] = useState<PaymentAccount>();
  const [recipientNumber, setRecipient] = useState('');
  const [transactionId, setTransaction] = useState('');
  const [evidenceImageUrl, setEvidence] = useState('');
  const [transactionInfo, setInfo] = useState('');
  const [useCredit, setUseCredit] = useState(true);
  const availableCredit = Math.min(creditBalance, bill.amount);
  const creditApplied = useCredit ? availableCredit : 0;
  const dueNow = bill.amount - creditApplied;
  const [sentAmount, setSentAmount] = useState(
    (Math.max(0, bill.amount - availableCredit) / 100).toFixed(2),
  );
  const action = useAction();
  useEffect(() => {
    onBusyChange(action.busy);
    return () => onBusyChange(false);
  }, [action.busy, onBusyChange]);
  return (
    <>
      <PaymentPanel label="Payment form" active={active}>
        {dueNow > 0 ? <PaymentInstructions /> : null}
        <Card tinted>
          <Text style={styles.heading}>{t('Submit payment details')}</Text>
          <Text style={styles.body}>
            {bill.studentName} · {bill.month} · {money(bill.amount)}
          </Text>
          {bill.shiftId ? (
            <Text style={styles.muted}>{paymentShiftLabel(bill, shifts)}</Text>
          ) : null}
          {creditBalance > 0 ? (
            <>
              <Text style={styles.body}>
                {t('Available advance balance')}: {money(creditBalance)}
              </Text>
              {data.accounts.length ? (
                <Button
                  secondary
                  title={t(
                    useCredit
                      ? 'Use advance balance: on'
                      : 'Use advance balance: off',
                  )}
                  disabled={action.busy}
                  onPress={() => {
                    const nextCredit = useCredit ? 0 : availableCredit;
                    setUseCredit(!useCredit);
                    setSentAmount(
                      ((bill.amount - nextCredit) / 100).toFixed(2),
                    );
                    action.clearFieldError('amount');
                  }}
                />
              ) : null}
              <Text style={styles.body}>
                {t('Advance applied')}: {money(creditApplied)} ·{' '}
                {t('Remaining bill')}: {money(dueNow)}
              </Text>
            </>
          ) : null}
          {dueNow === 0 ? (
            <>
              <Text style={styles.body}>
                {t(
                  'Your advance balance covers this bill. No new transfer is needed.',
                )}
              </Text>
              <Button
                title={t('Pay with advance balance')}
                busy={action.busy}
                onPress={() =>
                  action.run(async () => {
                    await mutate(
                      `/payments/bills/${bill.id}/pay-with-credit`,
                      {},
                    );
                    cancel();
                  }, 'Bill paid with advance balance.')
                }
              />
            </>
          ) : (
            <>
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
                  label: item.name || readable(item.method),
                }))}
              />
              {account ? (
                <Card>
                  <Text style={styles.label}>
                    {t('SEND {{amount}} TO', { amount: money(dueNow) })}
                  </Text>
                  <Text selectable style={styles.title}>
                    {account.number}
                  </Text>
                  <Text style={styles.body}>
                    {translateMessage(account.instructions)}
                  </Text>
                  {account.imageUrl ? (
                    <PaymentImage
                      label={t('Scan this QR code to pay')}
                      value={account.imageUrl}
                    />
                  ) : null}
                  <Text style={styles.muted}>
                    {t(
                      'Pay using {{method}} first, by account number or QR code. Then submit your payment details for verification.',
                      { method: account.name || readable(method) },
                    )}
                  </Text>
                </Card>
              ) : null}
              <Field
                label={t('Amount sent (৳)')}
                value={sentAmount}
                onChangeText={value => {
                  setSentAmount(value);
                  action.clearFieldError('amount');
                }}
                keyboardType="decimal-pad"
                error={action.fieldErrors.amount}
                hint={t(
                  'Any amount above the remaining bill becomes advance balance after approval.',
                )}
              />
              <Field
                label={t('Number you sent money to')}
                value={recipientNumber}
                error={action.fieldErrors.recipientNumber}
                onChangeText={value => {
                  action.clearFieldError('recipientNumber');
                  setRecipient(value);
                }}
                maxLength={100}
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
                maxLength={100}
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
                maxLength={100}
                hint={t('Enter a transaction ID or upload payment evidence.')}
                editable={!action.busy}
              />
              <PaymentImage
                label={t('Payment evidence')}
                value={evidenceImageUrl}
                disabled={action.busy}
                onChange={value => {
                  setEvidence(value);
                  action.clearFieldError('transactionId');
                }}
              />
              <Field
                label={t('Transaction information (optional)')}
                value={transactionInfo}
                onChangeText={setInfo}
                multiline
                maxLength={1000}
                editable={!action.busy}
              />
              <Button
                title={t('Submit for verification')}
                busy={action.busy}
                disabled={!account}
                onPress={() => {
                  action.run(async () => {
                    const errors: Record<string, string> = {};
                    if (!senderNumber.trim())
                      errors.senderNumber = 'Enter an account number.';
                    let amount = 0;
                    try {
                      amount = toPoisha(sentAmount);
                    } catch {
                      errors.amount = 'Enter a valid payment amount.';
                    }
                    if (amount && amount < dueNow)
                      errors.amount =
                        'Payment and advance must cover the full bill.';
                    if (!recipientNumber.trim())
                      errors.recipientNumber = 'Enter an account number.';
                    if (!transactionId.trim() && !evidenceImageUrl)
                      errors.transactionId =
                        'Enter a transaction ID or upload payment evidence.';
                    else if (
                      transactionId.trim() &&
                      !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/.test(
                        transactionId.trim(),
                      )
                    )
                      errors.transactionId =
                        'Enter a valid transaction reference.';
                    if (Object.keys(errors).length)
                      throw new ValidationError(errors);
                    await mutate('/payments/submissions', {
                      billId: bill.id,
                      method,
                      senderNumber,
                      recipientNumber,
                      transactionId,
                      ...(evidenceImageUrl ? { evidenceImageUrl } : {}),
                      ...(transactionInfo.trim()
                        ? { transactionInfo: transactionInfo.trim() }
                        : {}),
                      amount,
                      ...(creditApplied ? { creditApplied } : {}),
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
            </>
          )}
        </Card>
      </PaymentPanel>
      {/* Keep feedback mounted so changing tabs does not replay dismissed errors. */}
      <Notice text={action.error} kind="error" />
    </>
  );
}

import { useTranslation } from '../i18n';
import React, { useState } from 'react';
import { Modal, Text, View } from 'react-native';
import { Bill, PaymentAccount } from '../api/types';
import {
  Badge,
  Button,
  Card,
  Empty,
  FadeIn,
  Field,
  Notice,
  Page,
  SectionTitle,
  Select,
} from '../components/ui';
import { AdminPaymentDesk } from './AdminPaymentDesk';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useAction } from '../hooks/useAction';
import { styles } from '../theme';
import { dateLabel, money, readable } from '../utils/format';
function PaymentForm({ bill, cancel }: { bill: Bill; cancel: () => void }) {
  const { t } = useTranslation();
  const { data, mutate } = useData();
  const [method, setMethod] = useState('');
  const [senderNumber, setSender] = useState('');
  const [account, setAccount] = useState<PaymentAccount>();
  const [recipientNumber, setRecipient] = useState('');
  const [transactionId, setTransaction] = useState('');
  const action = useAction();
  return (
    <Card tinted>
      <Text style={styles.heading}>{t('Submit payment details')}</Text>
      <Text style={styles.body}>
        {bill.studentName} · {bill.month} · {money(bill.amount)}
      </Text>
      <Select
        label={t('Payment method')}
        value={method}
        onChange={value => {
          setMethod(value);
          const selected = data.accounts.find(item => item.method === value);
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
          <Text style={styles.body}>{account.instructions}</Text>
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
        onChangeText={setRecipient}
        keyboardType="phone-pad"
        maxLength={12}
        hint={t(
          'Use the exact admin number you paid, even if it was recently changed.',
        )}
      />
      <Field
        label={t('Number you sent money from')}
        value={senderNumber}
        onChangeText={setSender}
        keyboardType="phone-pad"
        maxLength={12}
        placeholder="01XXXXXXXXX"
      />
      <Field
        label={t('Transaction ID')}
        value={transactionId}
        onChangeText={setTransaction}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={40}
        hint={t('Copy the transaction ID from your payment confirmation.')}
      />
      <Notice text={action.error} kind="error" />
      <Button
        title={t('Submit for verification')}
        busy={action.busy}
        disabled={!account}
        onPress={() => {
          action.run(async () => {
            if (!/^01[3-9]\d{8,9}$/.test(senderNumber))
              throw new Error('Enter the sender’s valid mobile wallet number.');
            if (!/^[A-Z0-9]{6,40}$/.test(transactionId.trim().toUpperCase()))
              throw new Error(
                'Enter a valid transaction ID (6–40 letters or digits).',
              );
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
  );
}
export function PaymentsScreen() {
  const { session } = useAuth();
  return session?.user.role === 'ADMIN' ? (
    <AdminPaymentDesk />
  ) : (
    <GuardianPaymentsScreen />
  );
}

function GuardianPaymentsScreen() {
  const { t } = useTranslation();
  const { data, loading, error, refresh } = useData();
  const [selectedBill, setSelectedBill] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  const selected = data.bills.find(
    bill =>
      bill.id === selectedBill &&
      bill.status === 'UNPAID' &&
      !bill.pendingSubmissionId,
  );
  const payments = data.payments.filter(
    payment => !filter || payment.status === filter,
  );
  return (
    <Page
      title={t('Monthly bills')}
      subtitle={t('Pay manually. Submit the details. We’ll keep you updated.')}
      loading={loading}
      refresh={refresh}
      error={error}
    >
      <FadeIn>
        <Card tinted>
          <Text style={styles.heading}>{t('Your payment, step by step')}</Text>
          <Text style={styles.body}>
            {t('1. Send the bill amount to the admin’s number.')}
            {'\n'}
            {t('2. Submit your transaction ID below.')}
            {'\n'}
            {t('3. Receive confirmation after admin review.')}
          </Text>
          <Text style={styles.muted}>
            {t('Never share your wallet PIN or OTP.')}
          </Text>
        </Card>
      </FadeIn>
      {!data.accounts.length ? (
        <Empty
          title={t('Payment numbers are not set yet')}
          detail={t(
            'Please contact your admin before sending money. Payment submission will become available after setup.',
          )}
        />
      ) : null}
      {selected ? (
        <Modal visible onRequestClose={() => setSelectedBill(null)}>
          <Page
            title={t('Payment details')}
            subtitle={t('Submit the transaction you have already completed.')}
          >
            <PaymentForm
              key={selected.id}
              bill={selected}
              cancel={() => setSelectedBill(null)}
            />
          </Page>
        </Modal>
      ) : null}
      <SectionTitle>{t('Your bills')}</SectionTitle>
      {!data.bills.length ? (
        <Empty
          title={t('No bills yet')}
          detail={t(
            'Your admin will create the monthly bill after your service is approved.',
          )}
        />
      ) : (
        data.bills.map(bill => (
          <Card key={bill.id}>
            <View style={styles.between}>
              <Text style={styles.heading}>
                {bill.month} · {money(bill.amount)}
              </Text>
              <Badge
                status={bill.pendingSubmissionId ? 'PENDING' : bill.status}
              />
            </View>
            <Text style={styles.body}>{bill.studentName}</Text>
            {bill.paidAt ? (
              <Text style={styles.muted}>
                {t('Paid on {{date}}', { date: dateLabel(bill.paidAt) })}
              </Text>
            ) : null}
            {bill.status === 'UNPAID' && !bill.pendingSubmissionId ? (
              <Button
                title={t('I’ve paid · submit details')}
                disabled={!data.accounts.length || selectedBill === bill.id}
                onPress={() => setSelectedBill(bill.id)}
              />
            ) : null}
            {bill.pendingSubmissionId ? (
              <Text style={styles.muted}>
                {t(
                  'Your details are with the admin. Please don’t send the payment again.',
                )}
              </Text>
            ) : null}
          </Card>
        ))
      )}
      <SectionTitle>{t('Payment history')}</SectionTitle>
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
          <Card key={payment.id}>
            <View style={styles.between}>
              <Text style={styles.heading}>
                {money(payment.amount)} · {payment.month}
              </Text>
              <Badge status={payment.status} />
            </View>
            <Text style={styles.body}>{payment.studentName}</Text>
            <Text selectable style={styles.body}>
              {readable(payment.method)} · {payment.transactionId}
            </Text>
            <Text selectable style={styles.muted}>
              {t('From {{sender}}\nTo {{recipient}}', {
                sender: payment.senderNumber,
                recipient: payment.recipientNumber,
              })}
            </Text>
            <Text style={styles.muted}>{dateLabel(payment.createdAt)}</Text>
            {payment.note ? (
              <Notice
                text={t('Admin note: {{note}}', { note: payment.note })}
                kind={payment.status === 'REJECTED' ? 'error' : 'success'}
              />
            ) : null}
          </Card>
        ))
      )}
    </Page>
  );
}

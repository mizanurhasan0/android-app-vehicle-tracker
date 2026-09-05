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
import { ReviewActions } from '../components/ReviewActions';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useAction } from '../hooks/useAction';
import { styles } from '../theme';
import { currentMonth, dateLabel, money, readable } from '../utils/format';
function PaymentForm({ bill, cancel }: { bill: Bill; cancel: () => void }) {
  const { data, mutate } = useData();
  const [method, setMethod] = useState('');
  const [senderNumber, setSender] = useState('');
  const [account, setAccount] = useState<PaymentAccount>();
  const [recipientNumber, setRecipient] = useState('');
  const [transactionId, setTransaction] = useState('');
  const action = useAction();
  return (
    <Card tinted>
      <Text style={styles.heading}>Submit payment details</Text>
      <Text style={styles.body}>
        {bill.studentName} · {bill.month} · {money(bill.amount)}
      </Text>
      <Select
        label="Payment method"
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
          <Text style={styles.label}>SEND {money(bill.amount)} TO</Text>
          <Text selectable style={styles.title}>
            {account.number}
          </Text>
          <Text style={styles.body}>{account.instructions}</Text>
          <Text style={styles.muted}>
            Pay using your {readable(method)} app or USSD first. This form only
            submits your payment details for verification.
          </Text>
        </Card>
      ) : null}
      <Field
        label="Number you sent money to"
        value={recipientNumber}
        onChangeText={setRecipient}
        keyboardType="phone-pad"
        maxLength={12}
        hint="Use the exact admin number you paid, even if it was recently changed."
      />
      <Field
        label="Number you sent money from"
        value={senderNumber}
        onChangeText={setSender}
        keyboardType="phone-pad"
        maxLength={12}
        placeholder="01XXXXXXXXX"
      />
      <Field
        label="Transaction ID"
        value={transactionId}
        onChangeText={setTransaction}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={40}
        hint="Copy the transaction ID from your payment confirmation."
      />
      <Notice text={action.error} kind="error" />
      <Button
        title="Submit for verification"
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
        title="Cancel"
        disabled={action.busy}
        onPress={cancel}
      />
    </Card>
  );
}
export function PaymentsScreen() {
  const { session } = useAuth();
  const { data, loading, error, refresh, mutate } = useData();
  const [selectedBill, setSelectedBill] = useState<string | null>(null);
  const [month, setMonth] = useState(currentMonth());
  const [filter, setFilter] = useState('');
  const action = useAction();
  const admin = session!.user.role === 'ADMIN';
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
      title={admin ? 'Payment desk' : 'Monthly bills'}
      subtitle={
        admin
          ? 'Verify the money received, then approve the submission.'
          : 'Pay manually. Submit the details. We’ll keep you updated.'
      }
      loading={loading}
      refresh={refresh}
      error={error}
    >
      <Notice text={action.error} kind="error" />
      <Notice text={action.success} />
      {admin ? (
        <Card>
          <Text style={styles.heading}>Create monthly bills</Text>
          <Field
            label="Billing month (YYYY-MM)"
            value={month}
            onChangeText={setMonth}
            maxLength={7}
            hint="Full monthly fee; no automatic proration. Existing bills are never duplicated."
          />
          <Button
            title="Generate bills"
            busy={action.busy}
            onPress={() => {
              action.run(async () => {
                if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))
                  throw new Error('Use a valid month such as 2026-09.');
                await mutate('/admin/bills/generate', { month });
              }, 'Monthly bills are ready. Guardians have been notified.');
            }}
          />
        </Card>
      ) : (
        <FadeIn>
          <Card tinted>
            <Text style={styles.heading}>Your payment, step by step</Text>
            <Text style={styles.body}>
              1. Send the bill amount to the admin’s number.{'\n'}2. Submit your
              transaction ID below.{'\n'}3. Receive confirmation after admin
              review.
            </Text>
            <Text style={styles.muted}>
              Never share your wallet PIN or OTP.
            </Text>
          </Card>
        </FadeIn>
      )}
      {!admin && !data.accounts.length ? (
        <Empty
          title="Payment numbers are not set yet"
          detail="Please contact your admin before sending money. Payment submission will become available after setup."
        />
      ) : null}
      {selected ? (
        <Modal visible onRequestClose={() => setSelectedBill(null)}>
          <Page
            title="Payment details"
            subtitle="Submit the transaction you have already completed."
          >
            <PaymentForm
              key={selected.id}
              bill={selected}
              cancel={() => setSelectedBill(null)}
            />
          </Page>
        </Modal>
      ) : null}
      <SectionTitle>{admin ? 'Monthly bills' : 'Your bills'}</SectionTitle>
      {!data.bills.length ? (
        <Empty
          title="No bills yet"
          detail="Your admin will create the monthly bill after your service is approved."
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
            <Text style={styles.body}>
              {bill.studentName}
              {admin ? ` · ${bill.guardianName}` : ''}
            </Text>
            {bill.paidAt ? (
              <Text style={styles.muted}>Paid on {dateLabel(bill.paidAt)}</Text>
            ) : null}
            {!admin && bill.status === 'UNPAID' && !bill.pendingSubmissionId ? (
              <Button
                title="I’ve paid · submit details"
                disabled={!data.accounts.length || selectedBill === bill.id}
                onPress={() => setSelectedBill(bill.id)}
              />
            ) : null}
            {bill.pendingSubmissionId ? (
              <Text style={styles.muted}>
                Your details are with the admin. Please don’t send the payment
                again.
              </Text>
            ) : null}
          </Card>
        ))
      )}
      <SectionTitle>
        {admin ? 'Review submissions' : 'Payment history'}
      </SectionTitle>
      <Select
        label="Filter submissions"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'PENDING', label: 'Awaiting review' },
          { value: 'APPROVED', label: 'Approved' },
          { value: 'REJECTED', label: 'Rejected' },
        ]}
      />
      {!payments.length ? (
        <Empty
          title="No submissions to show"
          detail="Payment details and admin decisions will appear here."
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
            <Text style={styles.body}>
              {payment.studentName}
              {admin ? ` · ${payment.guardianName}` : ''}
            </Text>
            <Text selectable style={styles.body}>
              {readable(payment.method)} · {payment.transactionId}
            </Text>
            <Text selectable style={styles.muted}>
              From {payment.senderNumber}
              {'\n'}To {payment.recipientNumber}
            </Text>
            <Text style={styles.muted}>{dateLabel(payment.createdAt)}</Text>
            {payment.note ? (
              <Notice
                text={`Admin note: ${payment.note}`}
                kind={payment.status === 'REJECTED' ? 'error' : 'success'}
              />
            ) : null}
            {admin && payment.status === 'PENDING' ? (
              <ReviewActions
                path={`/admin/payments/${payment.id}/decision`}
                confirmation={`Have you verified ${money(
                  payment.amount,
                )} in your ${payment.method} account ${
                  payment.recipientNumber
                }? Transaction: ${
                  payment.transactionId
                }. This will mark the bill as paid.`}
              />
            ) : null}
          </Card>
        ))
      )}
    </Page>
  );
}

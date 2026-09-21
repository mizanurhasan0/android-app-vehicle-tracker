import React, { useState } from 'react';
import { Payment } from '../../api/types';
import { PaymentImage } from '../../components/PaymentImage';
import { Button, Field, Notice } from '../../components/ui';
import { useCoreData } from '../../context/DataContext';
import { useAction } from '../../hooks/useAction';
import { useTranslation } from '../../i18n';
import { ValidationError } from '../../utils/validation';
import { Text } from 'react-native';
import { styles } from '../../theme';

export function PaymentEvidence({ payment }: { payment: Payment }) {
  const { t } = useTranslation();
  const { mutate } = useCoreData();
  const action = useAction();
  const [editing, setEditing] = useState(false);
  const [transactionId, setTransaction] = useState(payment.transactionId);
  const [evidenceImageUrl, setImage] = useState(payment.evidenceImageUrl || '');
  const [transactionInfo, setInfo] = useState(payment.transactionInfo || '');
  if (!editing || payment.status !== 'PENDING')
    return (
      <>
        {payment.transactionInfo ? (
          <Text style={styles.body}>{payment.transactionInfo}</Text>
        ) : null}
        {payment.evidenceImageUrl ? (
          <PaymentImage
            label={t('Payment evidence')}
            value={payment.evidenceImageUrl}
          />
        ) : null}
        {payment.status === 'PENDING' ? (
          <Button
            secondary
            title={t('Update payment evidence')}
            onPress={() => {
              setTransaction(payment.transactionId);
              setImage(payment.evidenceImageUrl || '');
              setInfo(payment.transactionInfo || '');
              action.clearFeedback();
              setEditing(true);
            }}
          />
        ) : null}
      </>
    );
  return (
    <>
      <Field
        label={t('Transaction ID')}
        value={transactionId}
        maxLength={100}
        error={action.fieldErrors.transactionId}
        editable={!action.busy}
        onChangeText={value => {
          setTransaction(value);
          action.clearFieldError('transactionId');
        }}
        hint={t('Enter a transaction ID or upload payment evidence.')}
      />
      <PaymentImage
        label={t('Payment evidence')}
        value={evidenceImageUrl}
        disabled={action.busy}
        onChange={value => {
          setImage(value);
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
      <Notice text={action.error} kind="error" />
      <Button
        title={t('Save payment evidence')}
        busy={action.busy}
        onPress={() =>
          action.run(async () => {
            if (!transactionId.trim() && !evidenceImageUrl)
              throw new ValidationError({
                transactionId:
                  'Enter a transaction ID or upload payment evidence.',
              });
            if (
              transactionId.trim() &&
              !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/.test(transactionId.trim())
            )
              throw new ValidationError({
                transactionId: 'Enter a valid transaction reference.',
              });
            await mutate(
              `/payments/submissions/${payment.id}/evidence`,
              {
                transactionId: transactionId.trim(),
                evidenceImageUrl,
                transactionInfo: transactionInfo.trim(),
              },
              'PATCH',
            );
            setEditing(false);
          }, 'Payment evidence updated.')
        }
      />
      <Button
        secondary
        title={t('Cancel')}
        disabled={action.busy}
        onPress={() => setEditing(false)}
      />
    </>
  );
}

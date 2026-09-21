import React from 'react';
import { useTranslation } from '../../i18n';
import { Text } from 'react-native';
import { Card } from '../../components/ui';
import { styles } from '../../theme';

export function PaymentInstructions() {
  const { t } = useTranslation();
  return (
    <Card tinted>
      <Text style={styles.heading}>{t('Your payment, step by step')}</Text>
      <Text style={styles.body}>
        {t('1. Pay the full bill using an admin account number or QR code.')}
        {'\n'}
        {t('2. Submit your transaction ID or payment evidence below.')}
        {'\n'}
        {t('3. Receive confirmation after admin review.')}
      </Text>
      <Text style={styles.muted}>
        {t('Never share your wallet PIN or OTP.')}
      </Text>
    </Card>
  );
}

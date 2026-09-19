import React from 'react';
import { Text, View } from 'react-native';
import { Card, Empty, Page } from '../components/ui';
import { AppIcon } from '../components/AppIcon';
import { AccountForm, VehicleForm } from '../components/setup/SetupForms';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTranslation } from '../i18n';
import { styles } from '../theme';

export function CreateVehicleScreen() {
  const { session } = useAuth();
  return session?.user.role === 'ADMIN' ? (
    <Page>
      <VehicleForm />
    </Page>
  ) : null;
}

export function PaymentAccountsScreen() {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { data, loading, error, refresh } = useData();
  return (
    <Page loading={loading} refresh={refresh} error={error}>
      {session?.user.role === 'ADMIN' ? (
        <AccountForm />
      ) : (
        <>
          {!data.accounts.length ? (
            <Empty
              title={t('No payment accounts yet')}
              detail={t('Your school will add payment instructions here.')}
            />
          ) : (
            data.accounts.map(item => (
              <Card key={item.method}>
                <View style={styles.between}>
                  <AppIcon kind="payments" />
                  <Text style={styles.heading}>
                    {item.method === 'BKASH' ? 'bKash' : 'Rocket'}
                  </Text>
                </View>
                <Text selectable style={styles.title}>
                  {item.number}
                </Text>
                <Text style={styles.body}>{item.instructions}</Text>
              </Card>
            ))
          )}
        </>
      )}
    </Page>
  );
}

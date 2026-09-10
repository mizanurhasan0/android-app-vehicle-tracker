import React, { useMemo } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Linking, Text, View, StyleSheet } from 'react-native';
import { HomeStackParams } from '../navigation/types';
import { Empty, Notice, Page, SectionTitle } from '../components/ui';
import { VehicleCard } from '../components/VehicleCard';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useAction } from '../hooks/useAction';
import { useTranslation } from '../i18n';
import { colors, styles } from '../theme';
import { numberLabel } from '../utils/format';
export function VehiclesScreen({
  navigation,
}: NativeStackScreenProps<HomeStackParams, 'Vehicles'>) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { data, loading, error, refresh } = useData();
  const action = useAction();
  const admin = session!.user.role === 'ADMIN';
  const locationsByImei = useMemo(
    () => new Map(data.locations.map(item => [item.imei, item])),
    [data.locations],
  );
  const awaitingVehicle =
    data.subscriptions.some(item => item.status === 'ACTIVE') ||
    data.requests.some(item => item.status === 'PENDING');
  const openURL = (url: string) => {
    action.run(() => Linking.openURL(url), '');
  };
  return (
    <Page loading={loading} refresh={refresh} error={error}>
      <Notice text={action.error} kind="error" />
      <View style={styles.section}>
        <View style={styles.between}>
          <SectionTitle>
            {admin ? t('Your fleet') : t('Your vehicle')}
          </SectionTitle>
          {data.vehicles.length ? (
            <Text style={local.count}>{numberLabel(data.vehicles.length)}</Text>
          ) : null}
        </View>
        {!data.vehicles.length ? (
          <Empty
            title={
              loading
                ? t('Loading vehicles…')
                : admin
                ? t('No vehicles yet')
                : t('No vehicle assigned')
            }
            detail={
              loading
                ? t('Checking for updates.')
                : admin
                ? t('Use Create vehicle on the home screen.')
                : awaitingVehicle
                ? t('Your assigned vehicle will appear here.')
                : t('Request a route in Requests to get started.')
            }
          />
        ) : (
          data.vehicles.map(vehicle => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              location={locationsByImei.get(vehicle.imei)}
              busy={action.busy}
              onOpenURL={openURL}
              onHistory={
                admin
                  ? () =>
                      navigation.navigate('VehicleHistory', {
                        imei: vehicle.imei,
                        name: vehicle.name,
                      })
                  : undefined
              }
            />
          ))
        )}
      </View>
    </Page>
  );
}
const local = StyleSheet.create({
  count: {
    color: colors.primary,
    backgroundColor: colors.mint,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
});

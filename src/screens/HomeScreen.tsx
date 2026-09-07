import { useTranslation } from '../i18n';
import React, { useMemo } from 'react';
import { CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { HomeStackParams, RootTabParams } from '../navigation/types';
import { Button, Empty, Notice, Page, SectionTitle } from '../components/ui';
import { VehicleCard } from '../components/VehicleCard';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useAction } from '../hooks/useAction';
import { colors, styles } from '../theme';
import { money, numberLabel } from '../utils/format';
type HomeScreenProps = CompositeScreenProps<
  NativeStackScreenProps<HomeStackParams, 'Fleet'>,
  BottomTabScreenProps<RootTabParams, 'Home'>
>;
export function HomeScreen({ navigation }: HomeScreenProps) {
  const { t } = useTranslation();
  const { session, signOut } = useAuth();
  const { data, loading, error, refresh } = useData();
  const action = useAction();
  const admin = session!.user.role === 'ADMIN';
  const due = data.bills.reduce(
    (sum, bill) => sum + (bill.status === 'UNPAID' ? bill.amount : 0),
    0,
  );
  const pending = data.payments.filter(
    payment => payment.status === 'PENDING',
  ).length;
  const locationsByImei = useMemo(
    () => new Map(data.locations.map(location => [location.imei, location])),
    [data.locations],
  );
  const unread = data.notifications.filter(item => !item.readAt).length;
  const initialLoading =
    loading &&
    !data.vehicles.length &&
    !data.bills.length &&
    !data.payments.length;
  const awaitingVehicle =
    data.subscriptions.some(subscription => subscription.status === 'ACTIVE') ||
    data.requests.some(request => request.status === 'PENDING');
  const openURL = (url: string) => {
    action.run(() => Linking.openURL(url), '');
  };
  return (
    <Page loading={loading} refresh={refresh} error={error}>
      <View style={local.summary}>
        <View style={local.balance}>
          <Text style={local.summaryLabel}>{t('Amount due')}</Text>
          <Text style={local.balanceValue}>
            {initialLoading ? '—' : money(due)}
          </Text>
        </View>
        <View style={local.review}>
          <Text style={local.summaryLabel}>
            {admin ? t('To review') : t('In review')}
          </Text>
          <Text style={local.reviewValue}>
            {initialLoading ? '—' : numberLabel(pending)}
          </Text>
          <Text style={local.summaryLabel}>
            {pending === 1 ? t('payment') : t('payments')}
          </Text>
        </View>
      </View>
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
                ? t('Add a vehicle in Setup.')
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          unread
            ? t('Latest updates, {{number}} unread', {
                number: numberLabel(unread),
              })
            : t('Latest updates')
        }
        onPress={() => navigation.navigate('Inbox')}
        style={({ pressed }) => [
          local.updatesButton,
          pressed && local.updatesPressed,
        ]}
      >
        <Text style={local.updatesTitle}>{t('Latest updates')}</Text>
        {unread ? (
          <Text style={local.count}>
            {t('{{number}} new', {
              number: unread > 99 ? `${numberLabel(99)}+` : numberLabel(unread),
            })}
          </Text>
        ) : null}
        <View accessible={false} style={local.updatesChevron} />
      </Pressable>
      <View style={local.footer}>
        <Button
          secondary
          title={t('Sign out')}
          busy={action.busy}
          onPress={() => {
            action.run(signOut, '');
          }}
        />
      </View>
    </Page>
  );
}
const local = StyleSheet.create({
  summary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 24,
    padding: 24,
    borderRadius: 24,
    backgroundColor: colors.primary,
  },
  balance: {
    flexGrow: 2,
    flexBasis: 140,
    gap: 8,
  },
  summaryLabel: {
    color: colors.mint,
    fontSize: 13,
    lineHeight: 19,
  },
  balanceValue: {
    color: colors.surface,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  review: {
    flexGrow: 1,
    flexBasis: 80,
    gap: 4,
  },
  reviewValue: {
    color: colors.surface,
    fontSize: 24,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  count: {
    overflow: 'hidden',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: colors.mint,
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  updatesButton: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    padding: 18,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  updatesPressed: {
    backgroundColor: colors.mint,
  },
  updatesTitle: {
    flexGrow: 1,
    color: colors.ink,
    fontSize: 16,
    fontWeight: '600',
  },
  updatesChevron: {
    width: 8,
    height: 8,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: colors.primary,
    transform: [
      {
        rotate: '45deg',
      },
    ],
  },
  footer: {
    alignSelf: 'center',
    marginTop: 4,
  },
});

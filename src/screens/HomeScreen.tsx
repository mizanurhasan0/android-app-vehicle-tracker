import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParams } from '../navigation/types';
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Badge,
  Button,
  Card,
  Empty,
  FadeIn,
  Notice,
  Page,
  SectionTitle,
} from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useAction } from '../hooks/useAction';
import { colors, styles } from '../theme';
import { dateLabel, money } from '../utils/format';
export function HomeScreen({
  navigation,
}: NativeStackScreenProps<HomeStackParams, 'Fleet'>) {
  const { session, signOut } = useAuth();
  const { data, loading, error, refresh } = useData();
  const action = useAction();
  const { width } = useWindowDimensions();
  const admin = session!.user.role === 'ADMIN';
  const due = data.bills
    .filter(bill => bill.status === 'UNPAID')
    .reduce((sum, bill) => sum + bill.amount, 0);
  const pending = data.payments.filter(
    payment => payment.status === 'PENDING',
  ).length;
  return (
    <Page
      title={`Hello, ${session!.user.name.split(' ')[0]}.`}
      subtitle={
        admin
          ? 'Manage your vehicles and payments.'
          : 'A little peace of mind for every journey.'
      }
      loading={loading}
      refresh={refresh}
      error={error}
    >
      {!admin ? (
        <FadeIn>
          <Card tinted>
            <Text style={styles.label}>GUARDIAN WORKSPACE</Text>
            <Text style={styles.heading}>
              {data.subscriptions.some(s => s.status === 'ACTIVE')
                ? 'You’re connected to your transport.'
                : 'Let’s get your journey started.'}
            </Text>
            <Text style={styles.body}>
              {data.subscriptions.some(s => s.status === 'ACTIVE')
                ? 'Your assigned vehicle and recent service updates are below.'
                : 'Choose a route in Requests. Once the admin approves, your vehicle appears here.'}
            </Text>
          </Card>
        </FadeIn>
      ) : null}
      <View style={local.grid}>
        <View
          style={[local.tile, width > 600 ? local.wideTile : local.smallTile]}
        >
          <Text style={styles.muted}>
            {admin ? 'Unpaid bills' : 'Outstanding bills'}
          </Text>
          <Text style={local.amount}>{money(due)}</Text>
        </View>
        <View
          style={[local.tile, width > 600 ? local.wideTile : local.smallTile]}
        >
          <Text style={styles.muted}>
            {admin ? 'Payments to review' : 'Payments in review'}
          </Text>
          <Text style={local.amount}>{pending}</Text>
        </View>
      </View>
      <Notice text={action.error} kind="error" />
      <View style={styles.between}>
        <SectionTitle>{admin ? 'Vehicles' : 'Your vehicle'}</SectionTitle>
        {admin ? (
          <Text style={styles.muted}>{data.vehicles.length} total</Text>
        ) : null}
      </View>
      {!data.vehicles.length ? (
        <Empty
          title={
            loading
              ? 'Loading your vehicles…'
              : admin
              ? 'No vehicles yet'
              : 'No vehicle assigned yet'
          }
          detail={
            admin
              ? 'Add a vehicle and route in Setup to begin.'
              : 'Your approved transport vehicle will appear here.'
          }
        />
      ) : (
        data.vehicles.map(vehicle => {
          const location = data.locations.find(
            item => item.imei === vehicle.imei,
          );
          const stale =
            location && Date.now() - Date.parse(location.lastSeen) >= 180_000;
          return (
            <Card key={vehicle.id}>
              <View style={local.vehicleHeader}>
                <View style={local.vehicleIdentity}>
                  <Text style={styles.heading}>{vehicle.name}</Text>
                  <Text style={styles.muted}>{vehicle.plate}</Text>
                </View>
                <Badge
                  status={stale ? 'offline' : location?.status || 'waiting'}
                />
              </View>
              {vehicle.driverName ? (
                <Text style={styles.muted}>Driver: {vehicle.driverName}</Text>
              ) : null}
              {location?.latitude != null && location.longitude != null ? (
                <>
                  <Text style={styles.body}>
                    Speed: {location.speed ?? 0} km/h
                  </Text>
                  <Text style={styles.muted}>
                    Updated:{' '}
                    {location.positionAt
                      ? dateLabel(location.positionAt)
                      : 'Unknown'}
                  </Text>
                </>
              ) : (
                <Text style={styles.muted}>Location not available yet.</Text>
              )}
              <View style={local.vehicleActions}>
                {location?.latitude != null && location.longitude != null ? (
                  <HomeAction
                    title="View on map"
                    label={`View ${vehicle.name} on map`}
                    onPress={() => {
                      action.run(
                        () =>
                          Linking.openURL(
                            `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`,
                          ),
                        '',
                      );
                    }}
                  />
                ) : null}
                {admin ? (
                  <HomeAction
                    title="Travel history"
                    label={`View travel history for ${vehicle.name}`}
                    onPress={() =>
                      navigation.navigate('VehicleHistory', {
                        imei: vehicle.imei,
                        name: vehicle.name,
                      })
                    }
                  />
                ) : null}
                {vehicle.driverPhone ? (
                  <HomeAction
                    title="Call driver"
                    label={`Call driver for ${vehicle.name}`}
                    onPress={() => {
                      action.run(
                        () =>
                          Linking.openURL(
                            `tel:${vehicle.driverPhone!.replace(
                              /[^+\d]/g,
                              '',
                            )}`,
                          ),
                        '',
                      );
                    }}
                  />
                ) : null}
              </View>
            </Card>
          );
        })
      )}
      {!admin || data.notifications[0] ? (
        <SectionTitle>Latest update</SectionTitle>
      ) : null}
      {data.notifications[0] ? (
        <Card>
          <Text style={styles.heading}>{data.notifications[0].title}</Text>
          <Text style={styles.body}>{data.notifications[0].body}</Text>
          <Text style={styles.muted}>
            {dateLabel(data.notifications[0].createdAt)}
          </Text>
        </Card>
      ) : !admin ? (
        <Text style={styles.muted}>
          Your service and payment updates will appear here.
        </Text>
      ) : null}
      <View style={local.footer}>
        <Button
          secondary
          title="Sign out"
          busy={action.busy}
          onPress={() => {
            action.run(signOut, '');
          }}
        />
      </View>
    </Page>
  );
}
function HomeAction({
  title,
  label,
  onPress,
}: {
  title: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [local.action, pressed && local.actionPressed]}
    >
      <Text style={local.actionText}>{title}</Text>
    </Pressable>
  );
}
const local = StyleSheet.create({
  wideTile: { minWidth: 220 },
  smallTile: { minWidth: 130 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    gap: 8,
  },
  amount: { color: colors.ink, fontSize: 24, fontWeight: '700' },
  vehicleHeader: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    gap: 12,
  },
  vehicleIdentity: { flex: 1, minWidth: 140, gap: 4 },
  vehicleActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 12,
  },
  action: {
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.background,
    justifyContent: 'center',
    flexGrow: 1,
  },
  actionPressed: { backgroundColor: colors.mint },
  actionText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 18,
    marginTop: 6,
  },
});

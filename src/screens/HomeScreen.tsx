import React from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParams } from '../navigation/types';
import {
  Linking,
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
          ? 'Your transport service, at a glance.'
          : 'A little peace of mind for every journey.'
      }
      loading={loading}
      refresh={refresh}
      error={error}
    >
      <FadeIn>
        <Card tinted>
          <Text style={styles.label}>
            {admin ? 'ADMIN WORKSPACE' : 'GUARDIAN WORKSPACE'}
          </Text>
          <Text style={styles.heading}>
            {admin
              ? 'Keep every journey running smoothly.'
              : data.subscriptions.some(s => s.status === 'ACTIVE')
              ? 'You’re connected to your transport.'
              : 'Let’s get your journey started.'}
          </Text>
          <Text style={styles.body}>
            {admin
              ? 'Review incoming requests and verify payments from the tabs below.'
              : data.subscriptions.some(s => s.status === 'ACTIVE')
              ? 'Your assigned vehicle and recent service updates are below.'
              : 'Choose a route in Requests. Once the admin approves, your vehicle appears here.'}
          </Text>
        </Card>
      </FadeIn>
      <View style={local.grid}>
        <View
          style={[local.tile, width > 600 ? local.wideTile : local.smallTile]}
        >
          <Text style={styles.muted}>Outstanding bills</Text>
          <Text style={local.amount}>{money(due)}</Text>
        </View>
        <View
          style={[local.tile, width > 600 ? local.wideTile : local.smallTile]}
        >
          <Text style={styles.muted}>Payments in review</Text>
          <Text style={local.amount}>
            {pending.toString().padStart(2, '0')}
          </Text>
        </View>
      </View>
      <Notice text={action.error} kind="error" />
      <SectionTitle>{admin ? 'Fleet overview' : 'Your vehicle'}</SectionTitle>
      {!data.vehicles.length ? (
        <Empty
          title={loading ? 'Loading your vehicles…' : 'No vehicle assigned yet'}
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
              <View style={styles.between}>
                <Text style={styles.heading}>{vehicle.name}</Text>
                <Badge
                  status={stale ? 'offline' : location?.status || 'waiting'}
                />
              </View>
              <Text style={styles.muted}>
                {vehicle.plate}{' '}
                {vehicle.driverName ? `· ${vehicle.driverName}` : ''}
              </Text>
              {location?.latitude != null && location.longitude != null ? (
                <>
                  <Text style={styles.body}>
                    {location.speed ?? 0} km/h · {location.latitude.toFixed(5)},{' '}
                    {location.longitude.toFixed(5)}
                  </Text>
                  <Text style={styles.muted}>
                    Last position:{' '}
                    {location.positionAt
                      ? dateLabel(location.positionAt)
                      : 'Unknown'}
                  </Text>
                  <Button
                    secondary
                    title="Open location in Maps ↗"
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
                </>
              ) : (
                <Text style={styles.muted}>
                  Waiting for the tracker’s first position.
                </Text>
              )}
              {admin ? (
                <Button
                  secondary
                  title="View travel history"
                  onPress={() =>
                    navigation.navigate('VehicleHistory', {
                      imei: vehicle.imei,
                      name: vehicle.name,
                    })
                  }
                />
              ) : null}
              {vehicle.driverPhone ? (
                <Button
                  secondary
                  title="Call driver"
                  onPress={() => {
                    action.run(
                      () =>
                        Linking.openURL(
                          `tel:${vehicle.driverPhone!.replace(/[^+\d]/g, '')}`,
                        ),
                      '',
                    );
                  }}
                />
              ) : null}
            </Card>
          );
        })
      )}
      <SectionTitle>Latest update</SectionTitle>
      {data.notifications[0] ? (
        <Card>
          <Text style={styles.heading}>{data.notifications[0].title}</Text>
          <Text style={styles.body}>{data.notifications[0].body}</Text>
          <Text style={styles.muted}>
            {dateLabel(data.notifications[0].createdAt)}
          </Text>
        </Card>
      ) : (
        <Text style={styles.muted}>
          Your service and payment updates will appear here.
        </Text>
      )}
      <Button
        secondary
        title="Sign out"
        busy={action.busy}
        onPress={() => {
          action.run(signOut, '');
        }}
      />
    </Page>
  );
}
const local = StyleSheet.create({
  wideTile: { minWidth: 220 },
  smallTile: { minWidth: 130 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    flex: 1,
    borderRadius: 20,
    padding: 18,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    gap: 9,
  },
  amount: { color: colors.ink, fontSize: 29, fontWeight: '800' },
});

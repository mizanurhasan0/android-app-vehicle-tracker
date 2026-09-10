import React, { useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Badge, Card, Empty, Field, Page } from '../components/ui';
import { AppIcon } from '../components/AppIcon';
import {
  AccountForm,
  RouteForm,
  VehicleForm,
} from '../components/setup/SetupForms';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTranslation } from '../i18n';
import { HomeStackParams } from '../navigation/types';
import { colors, styles } from '../theme';
import { money, numberLabel } from '../utils/format';

export function CreateVehicleScreen() {
  const { session } = useAuth();
  return session?.user.role === 'ADMIN' ? (
    <Page>
      <VehicleForm />
    </Page>
  ) : null;
}
export function StudentsScreen({
  navigation,
}: NativeStackScreenProps<HomeStackParams, 'Students'>) {
  const { t } = useTranslation();
  const { data, loading, error, refresh } = useData();
  const [query, setQuery] = useState('');
  const students = data.subscriptions.filter(item =>
    `${item.studentName} ${item.routeName} ${item.stopName}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <Page loading={loading} refresh={refresh} error={error}>
      <Field
        label={t('Search students')}
        value={query}
        onChangeText={setQuery}
        placeholder={t('Student name or route')}
        autoCorrect={false}
      />
      <Text style={styles.muted}>
        {t('Student list')} · {numberLabel(students.length)}
      </Text>
      {!students.length ? (
        <Empty
          title={t(loading ? 'Loading students…' : 'No students found')}
          detail={t('Approved transport subscriptions appear here.')}
        />
      ) : (
        students.map(item => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={t('View student: {{name}}', {
              name: item.studentName,
            })}
            onPress={() =>
              navigation.navigate('StudentDetails', { id: item.id })
            }
            style={({ pressed }) => [local.row, pressed && local.pressed]}
          >
            <View style={local.icon}>
              <AppIcon kind="students" />
            </View>
            <View style={local.body}>
              <Text style={styles.heading}>{item.studentName}</Text>
              <Text style={styles.muted}>
                {item.routeName} · {item.stopName}
              </Text>
              <Badge status={item.status} />
            </View>
            <View style={local.chevron}>
              <AppIcon kind="back" size={18} />
            </View>
          </Pressable>
        ))
      )}
    </Page>
  );
}
export function StudentDetailsScreen({
  route,
}: NativeStackScreenProps<HomeStackParams, 'StudentDetails'>) {
  const { t } = useTranslation();
  const { data, loading, error, refresh } = useData();
  const student = data.subscriptions.find(item => item.id === route.params.id);
  return (
    <Page loading={loading} refresh={refresh} error={error}>
      {student ? (
        <Card>
          <View style={local.icon}>
            <AppIcon kind="students" size={32} />
          </View>
          <Text style={styles.title}>{student.studentName}</Text>
          <Badge status={student.status} />
          <Detail label={t('Route')} value={student.routeName} />
          <Detail label={t('Pickup stop')} value={student.stopName} />
          <Detail label={t('Vehicle')} value={student.vehicleName} />
        </Card>
      ) : (
        <Empty
          title={t(loading ? 'Loading students…' : 'Student unavailable')}
          detail={t('Pull to refresh the latest records.')}
        />
      )}
    </Page>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={local.detail}>
      <Text style={styles.muted}>{label}</Text>
      <Text style={styles.body}>{value || '—'}</Text>
    </View>
  );
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
export function RoutesScreen({
  navigation,
}: NativeStackScreenProps<HomeStackParams, 'Routes'>) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { data, loading, error, refresh } = useData();
  return (
    <Page loading={loading} refresh={refresh} error={error}>
      {session?.user.role === 'ADMIN' ? (
        <RouteForm onAddVehicle={() => navigation.navigate('CreateVehicle')} />
      ) : null}
      {!data.routes.length ? (
        <Empty
          title={t('No routes yet')}
          detail={t('Your school transport routes appear here.')}
        />
      ) : (
        data.routes.map(item => (
          <Card key={item.id}>
            <View style={styles.between}>
              <AppIcon kind="routes" />
              <Text style={styles.heading}>{item.name}</Text>
            </View>
            <Detail label={t('Vehicle')} value={item.vehicleName} />
            <Detail
              label={t('Monthly fee')}
              value={money(item.monthlyAmount)}
            />
            <Text style={styles.muted}>{t('Pickup stops')}</Text>
            {item.stops.map((stop, index) => (
              <View key={stop.id} style={local.stop}>
                <View style={local.stopNumber}>
                  <Text style={local.stopText}>{numberLabel(index + 1)}</Text>
                </View>
                <Text style={styles.body}>{stop.name}</Text>
              </View>
            ))}
          </Card>
        ))
      )}
    </Page>
  );
}
const local = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  icon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, gap: 6 },
  chevron: { transform: [{ rotate: '180deg' }] },
  detail: {
    gap: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  stop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stopNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopText: { color: colors.primary, fontSize: 12 },
  pressed: { opacity: 0.6 },
});

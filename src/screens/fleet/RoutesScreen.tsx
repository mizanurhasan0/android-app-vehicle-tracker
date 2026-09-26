import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  ListRenderItemInfo,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParams } from '../../navigation/types';
import { useCoreData, useDataActions } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useManagement } from '../../context/ManagementContext';
import { NoorIcon, NoorCard } from '../../components/Noor';
import { Button, Field, Empty } from '../../components/ui';
import { VirtualizedPage } from '../../components/VirtualizedPage';
import { Route } from '../../api/types';
import { RouteForm } from '../../components/setup/SetupForms';
import { money, numberLabel } from '../../utils/format';
import { colors, styles } from '../../theme';
import { useTranslation } from '../../i18n';
import { f } from './styles';

const routeKey = (route: Route) => route.id;
const RouteRow = memo(function RouteListRow({
  route: r,
  people,
  onOpen,
}: {
  route: Route;
  people?: number;
  onOpen: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onOpen(r.id)}
      style={listStyles.row}
    >
      <NoorCard style={f.vehicleRow}>
        <View style={f.routeMark}>
          <NoorIcon name="route" color="#FFFFFF" size={23} />
        </View>
        <View style={f.flex}>
          <Text style={f.title}>{r.name}</Text>
          <Text style={f.sub}>
            {r.stops
              .slice(0, 2)
              .map(s => s.name)
              .join(' → ')}
          </Text>
          <Text style={f.sub}>
            {r.fares?.length ? `${t('Stop-to-stop monthly fares')} · ` : ''}
            {r.vehicleName} ·{' '}
            {people === undefined
              ? money(r.monthlyAmount)
              : t('{{number}} people', { number: numberLabel(people) })}
          </Text>
        </View>
        <NoorIcon name="chevron" size={20} color={colors.muted} />
      </NoorCard>
    </Pressable>
  );
});

export function NoorRoutesScreen({
  navigation,
}: NativeStackScreenProps<HomeStackParams, 'Routes'>) {
  const { t } = useTranslation();
  const { data, loading, error } = useCoreData();
  const { refresh } = useDataActions();
  const { data: extra } = useManagement();
  const { session } = useAuth();
  const [query, setQuery] = useState(''),
    [adding, setAdding] = useState(false);
  const routes = useMemo(
    () =>
      data.routes.filter(r =>
        r.name.toLowerCase().includes(query.trim().toLowerCase()),
      ),
    [data.routes, query],
  );
  const enrollments = extra?.students;
  const peopleByRoute = useMemo(() => {
    if (!enrollments) return undefined;
    const counts = new Map<string, number>();
    enrollments.forEach(student => {
      if (student.status === 'ACTIVE')
        counts.set(student.routeId, (counts.get(student.routeId) || 0) + 1);
    });
    return counts;
  }, [enrollments]);
  const openRoute = useCallback(
    (id: string) => navigation.navigate('RouteDetails', { id }),
    [navigation],
  );
  const renderRoute = useCallback(
    ({ item }: ListRenderItemInfo<Route>) => (
      <RouteRow
        route={item}
        people={peopleByRoute ? peopleByRoute.get(item.id) || 0 : undefined}
        onOpen={openRoute}
      />
    ),
    [openRoute, peopleByRoute],
  );
  return (
    <VirtualizedPage
      refresh={refresh}
      loading={loading}
      error={error}
      data={routes}
      keyExtractor={routeKey}
      renderItem={renderRoute}
      header={
        <>
          <View style={f.toolbar}>
            <Text style={styles.heading}>{t('Routes')}</Text>
            {session?.user.role === 'ADMIN' ? (
              <Button
                title={adding ? t('Close') : t('+ Add')}
                onPress={() => setAdding(!adding)}
              />
            ) : null}
          </View>
          <Field
            label={t('Search routes')}
            value={query}
            onChangeText={setQuery}
            placeholder={t('Route name')}
          />
          {adding ? (
            <RouteForm
              onAddVehicle={() => navigation.navigate('CreateVehicle')}
            />
          ) : null}
        </>
      }
      ListEmptyComponent={
        <Empty
          title={t('No routes yet')}
          detail={t('Add routes, vehicles and start points.')}
        />
      }
    />
  );
}

const listStyles = StyleSheet.create({ row: { marginBottom: 10 } });

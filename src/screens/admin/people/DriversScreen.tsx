import React, { memo, useCallback, useMemo, useState } from 'react';
import { ListRenderItemInfo, Pressable, Text, View } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { useManagement } from '../../../context/ManagementContext';
import { useTranslation } from '../../../i18n';
import { numberLabel } from '../../../utils/format';
import { Avatar, EmptyState, Pill, SearchBar, s } from '../AdminUi';
import { DriverForm } from './DriverForm';
import { Driver } from '../../../api/management';
import {
  VirtualizedPage,
  VirtualizedCardSection,
} from '../../../components/VirtualizedPage';

const driverKey = (driver: Driver) => driver.id;
const DriverRow = memo(function DriverListRow({
  driver,
  onOpen,
}: {
  driver: Driver;
  onOpen: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <VirtualizedCardSection style={s.box}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('{{name}} profile', { name: driver.name })}
        onPress={() => onOpen(driver.id)}
        style={[s.tableRow, s.personListRow]}
      >
        <Avatar name={driver.name} driver compact />
        <View style={s.driverColumn}>
          <Text numberOfLines={1} ellipsizeMode="tail" style={s.body}>
            {driver.name}
          </Text>
          <Text style={s.muted}>
            {driver.vehicleName || t('No vehicle assigned')}
          </Text>
        </View>
        <Text style={s.cell}>{driver.routeName || '—'}</Text>
        <Pill value={driver.status} />
      </Pressable>
    </VirtualizedCardSection>
  );
});

export function DriversScreen() {
  const { t } = useTranslation();
  const { data, loading, error, refresh } = useManagement();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const drivers = useMemo(
    () =>
      (data?.drivers || []).filter(item =>
        `${item.name} ${item.phone} ${item.vehicleName || ''}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      ),
    [data?.drivers, query],
  );
  const openDriver = useCallback(
    (id: string) => navigation.navigate('DriverDetails', { id }),
    [navigation],
  );
  const renderDriver = useCallback(
    ({ item }: ListRenderItemInfo<Driver>) => (
      <DriverRow driver={item} onOpen={openDriver} />
    ),
    [openDriver],
  );
  return (
    <VirtualizedPage
      admin
      loading={loading}
      error={error}
      refresh={refresh}
      data={drivers}
      keyExtractor={driverKey}
      renderItem={renderDriver}
      header={
        <>
          <SearchBar
            value={query}
            onChange={setQuery}
            onAdd={() => setAdding(true)}
            placeholder={t('Search drivers...')}
          />
          <VirtualizedCardSection style={s.box} first>
            <View style={s.tableHeader}>
              <Text style={[s.cell, s.driverColumn]}>{t('Name')}</Text>
              <Text style={s.cell}>{t('Route')}</Text>
              <Text style={s.smallCell}>{t('Status')}</Text>
            </View>
          </VirtualizedCardSection>
        </>
      }
      ListEmptyComponent={
        <VirtualizedCardSection style={s.box}>
          <EmptyState text={t('No drivers found')} />
        </VirtualizedCardSection>
      }
      footer={
        <VirtualizedCardSection style={s.box} last>
          <Text style={s.muted}>
            {t('Total drivers: {{number}}', {
              number: numberLabel(drivers.length),
            })}
          </Text>
        </VirtualizedCardSection>
      }
    >
      <DriverForm visible={adding} onClose={() => setAdding(false)} />
    </VirtualizedPage>
  );
}

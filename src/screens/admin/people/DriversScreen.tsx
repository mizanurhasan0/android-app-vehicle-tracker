import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import {
  NavigationProp,
  ParamListBase,
  useNavigation,
} from '@react-navigation/native';
import { useManagement } from '../../../context/ManagementContext';
import { useTranslation } from '../../../i18n';
import { numberLabel } from '../../../utils/format';
import {
  AdminPage,
  Avatar,
  Box,
  EmptyState,
  Pill,
  SearchBar,
  s,
} from '../AdminUi';
import { DriverForm } from './DriverForm';

export function DriversScreen() {
  const { t } = useTranslation();
  const { data, loading, error, refresh } = useManagement();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const drivers = (data?.drivers || []).filter(item =>
    `${item.name} ${item.phone} ${item.vehicleName || ''}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <AdminPage loading={loading} error={error} refresh={refresh}>
      <SearchBar
        value={query}
        onChange={setQuery}
        onAdd={() => setAdding(true)}
        placeholder={t('Search drivers...')}
      />
      <Box>
        <View style={s.tableHeader}>
          <Text style={[s.cell, s.driverColumn]}>{t('Name')}</Text>
          <Text style={s.cell}>{t('Route')}</Text>
          <Text style={s.smallCell}>{t('Status')}</Text>
        </View>
        {drivers.map(driver => (
          <Pressable
            key={driver.id}
            accessibilityRole="button"
            accessibilityLabel={t('{{name}} profile', { name: driver.name })}
            onPress={() =>
              navigation.navigate('DriverDetails', { id: driver.id })
            }
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
        ))}
        {!drivers.length ? <EmptyState text={t('No drivers found')} /> : null}
        <Text style={s.muted}>
          {t('Total drivers: {{number}}', {
            number: numberLabel(drivers.length),
          })}
        </Text>
      </Box>
      <DriverForm visible={adding} onClose={() => setAdding(false)} />
    </AdminPage>
  );
}

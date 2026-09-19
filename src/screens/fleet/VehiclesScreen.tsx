import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  ListRenderItemInfo,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParams } from '../../navigation/types';
import { useCoreData, useDataActions } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { NoorIcon } from '../../components/Noor';
import { Button, Empty } from '../../components/ui';
import {
  VirtualizedPage,
  VirtualizedCardSection,
} from '../../components/VirtualizedPage';
import { Vehicle } from '../../api/types';
import { colors, styles } from '../../theme';
import { useTranslation } from '../../i18n';
import { f } from './styles';
import { VehicleMark, VehicleStatus } from './FleetUI';

const vehicleKey = (vehicle: Vehicle) => vehicle.id;
const VehicleRow = memo(function VehicleListRow({
  vehicle,
  onOpen,
}: {
  vehicle: Vehicle;
  onOpen: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onOpen(vehicle.id)}
      style={f.vehicleRow}
    >
      <VehicleMark />
      <View style={f.flex}>
        <Text style={f.title}>{vehicle.name}</Text>
        <Text style={f.sub}>{vehicle.plate}</Text>
        <Text style={f.sub}>
          {t('Driver: {{name}}', {
            name: vehicle.driverName || t('Not assigned'),
          })}
        </Text>
      </View>
      <VehicleStatus vehicle={vehicle} />
    </Pressable>
  );
});

export function NoorVehiclesScreen({
  navigation,
}: NativeStackScreenProps<HomeStackParams, 'Vehicles'>) {
  const { t } = useTranslation();
  const { data, loading, error } = useCoreData();
  const { refresh } = useDataActions();
  const { session } = useAuth();
  const [query, setQuery] = useState('');
  const vehicles = useMemo(
    () =>
      data.vehicles.filter(v =>
        `${v.name} ${v.plate} ${v.driverName}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      ),
    [data.vehicles, query],
  );
  const openVehicle = useCallback(
    (id: string) => navigation.navigate('VehicleDetails', { id }),
    [navigation],
  );
  const renderVehicle = useCallback(
    ({ item, index }: ListRenderItemInfo<Vehicle>) => (
      <VirtualizedCardSection
        style={listStyles.card}
        first={index === 0}
        last={index === vehicles.length - 1}
      >
        <View style={index > 0 && listStyles.gap}>
          <VehicleRow vehicle={item} onOpen={openVehicle} />
        </View>
      </VirtualizedCardSection>
    ),
    [openVehicle, vehicles.length],
  );
  return (
    <VirtualizedPage
      loading={loading}
      error={error}
      refresh={refresh}
      data={vehicles}
      keyExtractor={vehicleKey}
      renderItem={renderVehicle}
      header={
        <>
          <View style={f.toolbar}>
            <Text style={styles.heading}>{t('Vehicle list')}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('Live location map')}
              onPress={() => navigation.navigate('FleetMap')}
              style={({ pressed }) => [f.mapButton, pressed && f.pressed]}
            >
              <NoorIcon name="pin" size={19} color={colors.primary} />
            </Pressable>
          </View>
          <View style={f.searchToolbar}>
            <View style={f.searchBox}>
              <NoorIcon name="search" size={18} color={colors.muted} />
              <TextInput
                accessibilityLabel={t('Search vehicles')}
                value={query}
                onChangeText={setQuery}
                placeholder={t('Search name, plate or driver')}
                placeholderTextColor={colors.muted}
                autoCorrect={false}
                returnKeyType="search"
                style={f.searchInput}
              />
            </View>
            {session?.user.role === 'ADMIN' ? (
              <Button
                title={t('+ Add')}
                onPress={() => navigation.navigate('CreateVehicle')}
              />
            ) : null}
          </View>
        </>
      }
      ListEmptyComponent={
        <Empty
          title={t('No matching vehicles')}
          detail={
            loading
              ? t('Loading data…')
              : t('Add a vehicle or search for another name.')
          }
        />
      }
    />
  );
}

const listStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    overflow: 'hidden',
  },
  gap: { paddingTop: 9 },
});

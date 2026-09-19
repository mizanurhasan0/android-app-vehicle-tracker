import React, { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParams } from '../../navigation/types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { NoorIcon, NoorCard } from '../../components/Noor';
import { Page, Button, Empty } from '../../components/ui';
import { colors, styles } from '../../theme';
import { useTranslation } from '../../i18n';
import { f } from './styles';
import { VehicleMark, VehicleStatus } from './FleetUI';

export function NoorVehiclesScreen({
  navigation,
}: NativeStackScreenProps<HomeStackParams, 'Vehicles'>) {
  const { t } = useTranslation();
  const { data, loading, error, refresh } = useData();
  const { session } = useAuth();
  const [query, setQuery] = useState('');
  const vehicles = data.vehicles.filter(v =>
    `${v.name} ${v.plate} ${v.driverName}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );
  return (
    <Page loading={loading} error={error} refresh={refresh}>
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
      <NoorCard style={f.list}>
        {vehicles.map(vehicle => (
          <Pressable
            key={vehicle.id}
            accessibilityRole="button"
            onPress={() =>
              navigation.navigate('VehicleDetails', { id: vehicle.id })
            }
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
        ))}
      </NoorCard>
      {!vehicles.length ? (
        <Empty
          title={t('No matching vehicles')}
          detail={
            loading
              ? t('Loading data…')
              : t('Add a vehicle or search for another name.')
          }
        />
      ) : null}
    </Page>
  );
}

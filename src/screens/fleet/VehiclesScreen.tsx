import React, { memo, useCallback, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  ListRenderItemInfo,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParams } from '../../navigation/types';
import { useCoreData, useDataActions } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { NoorIcon } from '../../components/Noor';
import { Button, Empty, Notice } from '../../components/ui';
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
  const listRef = useRef<FlatList<Vehicle>>(null);
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
    ({ item }: ListRenderItemInfo<Vehicle>) => (
      <VehicleRow vehicle={item} onOpen={openVehicle} />
    ),
    [openVehicle],
  );
  return (
    <SafeAreaView style={listStyles.screen} edges={['bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={listStyles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={listStyles.content}>
          <View style={listStyles.controls}>
            <Notice text={error} kind="error" />
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
                  onChangeText={value => {
                    listRef.current?.scrollToOffset({
                      offset: 0,
                      animated: false,
                    });
                    setQuery(value);
                  }}
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
          </View>
          <View style={listStyles.card}>
            <FlatList
              ref={listRef}
              style={listStyles.list}
              data={vehicles}
              keyExtractor={vehicleKey}
              renderItem={renderVehicle}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={5}
              refreshControl={
                <RefreshControl
                  refreshing={loading}
                  onRefresh={refresh}
                  tintColor={colors.primary}
                  colors={[colors.primary]}
                />
              }
              contentContainerStyle={
                vehicles.length === 0 ? listStyles.emptyList : undefined
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
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const listStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 744,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 16,
  },
  controls: { gap: 10, paddingBottom: 10 },
  card: {
    flex: 1,
    minHeight: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    overflow: 'hidden',
  },
  list: { flex: 1 },
  emptyList: { flexGrow: 1, justifyContent: 'center' },
});

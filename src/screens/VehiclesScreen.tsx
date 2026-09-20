import React, { useMemo, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HomeStackParams } from '../navigation/types';
import { Empty, Notice, Button } from '../components/ui';
import { FleetMap, hasMapPosition } from '../components/FleetMap';
import { VehicleListRow } from '../components/VehicleListRow';
import { VehicleEditSheet } from '../components/VehicleEditSheet';
import { Vehicle } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useAction } from '../hooks/useAction';
import { useTranslation } from '../i18n';
import { colors } from '../theme';
import { dateLabel, numberLabel } from '../utils/format';

export function VehiclesScreen({
  navigation,
}: NativeStackScreenProps<HomeStackParams, 'Vehicles'>) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { data, loading, error, refresh } = useData();
  const action = useAction();
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const [selectedId, setSelectedId] = useState<string>();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const admin = session?.user.role === 'ADMIN';
  const locationsByImei = useMemo(
    () => new Map(data.locations.map(item => [item.imei, item])),
    [data.locations],
  );
  const selected = data.vehicles.find(vehicle => vehicle.id === selectedId);
  const location = selected && locationsByImei.get(selected.imei);
  const awaitingVehicle =
    data.subscriptions.some(item => item.status === 'ACTIVE') ||
    data.requests.some(item => item.status === 'PENDING');
  const phone = selected?.driverPhone?.replace(/[^+\d]/g, '');
  return (
    <SafeAreaView style={local.screen} edges={['left', 'right', 'bottom']}>
      <View style={[local.mapArea, { flex: expanded ? 1 : 2 }]}>
        <FleetMap
          vehicles={data.vehicles}
          locations={data.locations}
          selectedId={selected?.id}
          onSelect={setSelectedId}
        />
      </View>
      <View style={[local.sheet, { flex: expanded ? 2 : 1 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(
            expanded ? 'Show more map' : 'Expand vehicle list',
          )}
          accessibilityState={{ expanded }}
          onPress={() => setExpanded(value => !value)}
          style={local.handleTouch}
        >
          <View style={local.handle} />
        </Pressable>
        <FlatList
          data={data.vehicles}
          keyExtractor={vehicle => vehicle.id}
          contentContainerStyle={local.listContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={refresh}
              tintColor={colors.primary}
            />
          }
          ListHeaderComponent={
            <View style={local.listHeader}>
              <Notice text={error || action.error} kind="error" />
              {selected ? (
                <View style={local.selection}>
                  <View style={local.selectionText}>
                    <Text style={local.selectedName}>{selected.name}</Text>
                    <Text style={local.caption}>
                      {hasMapPosition(location) && location.positionAt
                        ? t('Updated {{time}}', {
                            time: dateLabel(location.positionAt),
                          })
                        : t('Waiting for location')}
                    </Text>
                  </View>
                  {phone ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('Call driver for {{name}}', {
                        name: selected.name,
                      })}
                      disabled={action.busy}
                      onPress={() =>
                        action.run(() => Linking.openURL(`tel:${phone}`), '')
                      }
                      style={local.call}
                    >
                      <Text
                        style={[local.callText, compact && local.callSymbol]}
                      >
                        {compact ? '☎︎' : t('Call driver')}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
              {selected ? (
                <View style={local.legend}>
                  <Button
                    title={t('Vehicle details')}
                    secondary
                    onPress={() =>
                      navigation.navigate('VehicleDetails', {
                        id: selected.id,
                      })
                    }
                  />
                  <Button
                    title={t('Show all on map')}
                    secondary
                    onPress={() => setSelectedId(undefined)}
                  />
                </View>
              ) : null}
              <View style={local.listTitleRow}>
                <Text accessibilityRole="header" style={local.listTitle}>
                  {t('Vehicles')}
                </Text>
                <Text style={local.count}>
                  {numberLabel(data.vehicles.length)}
                </Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <VehicleListRow
              vehicle={item}
              location={locationsByImei.get(item.imei)}
              selected={selected?.id === item.id}
              onSelect={() => setSelectedId(item.id)}
              onEdit={admin ? () => setEditing(item) : undefined}
            />
          )}
          ListEmptyComponent={
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
                  ? t('Add a vehicle to start tracking your fleet.')
                  : awaitingVehicle
                  ? t('Your assigned vehicle will appear here.')
                  : t('Request a route in Requests to get started.')
              }
            />
          }
        />
      </View>
      {admin && editing ? (
        <VehicleEditSheet
          vehicle={editing}
          onClose={() => setEditing(null)}
          onSaved={() => setEditing(null)}
        />
      ) : null}
    </SafeAreaView>
  );
}
const local = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  callSymbol: { fontSize: 22 },
  mapArea: {
    minHeight: 180,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  sheet: {
    flex: 1,
    marginTop: -8,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  handleTouch: { alignItems: 'center', justifyContent: 'center', height: 28 },
  handle: { width: 34, height: 4, borderRadius: 2, backgroundColor: '#BACFCC' },
  listContent: { paddingHorizontal: 20, paddingBottom: 24, gap: 8 },
  listHeader: { gap: 16, paddingBottom: 4 },
  selection: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectionText: { flex: 1, gap: 4 },
  selectedName: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  caption: { color: colors.muted, fontSize: 11, lineHeight: 17 },
  call: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    backgroundColor: colors.mint,
    borderRadius: 8,
  },
  callText: { color: colors.primary, fontSize: 12, fontWeight: '600' },
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  listTitle: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  count: {
    backgroundColor: colors.mint,
    color: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    fontSize: 12,
    fontWeight: '600',
  },
});

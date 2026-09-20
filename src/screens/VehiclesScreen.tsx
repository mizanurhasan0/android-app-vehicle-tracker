import React, { useMemo, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HomeStackParams } from '../navigation/types';
import { Empty, Notice, Select, Button } from '../components/ui';
import { FleetMap, hasMapPosition } from '../components/FleetMap';
import { VehicleListRow } from '../components/VehicleListRow';
import { VehicleEditSheet } from '../components/VehicleEditSheet';
import { RecordedJourney } from '../components/RecordedJourney';
import { Vehicle } from '../api/types';
import { Icon } from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useAction } from '../hooks/useAction';
import { useTranslation } from '../i18n';
import { colors, styles } from '../theme';
import { f } from './fleet/styles';
import { dateLabel, numberLabel } from '../utils/format';

export function VehiclesScreen({
  navigation,
}: NativeStackScreenProps<HomeStackParams, 'Vehicles'>) {
  const { t } = useTranslation();
  const { session } = useAuth();
  const { data, loading, error, refresh } = useData();
  const action = useAction();
  const { height, width } = useWindowDimensions();
  const compact = width < 380;
  const [selectedId, setSelectedId] = useState<string>();
  const [query, setQuery] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('');
  const activeFilter = data.vehicles.some(v => v.id === vehicleFilter)
    ? vehicleFilter
    : '';
  const changeFilters = (value: string, search = '') => {
    setVehicleFilter(value);
    setQuery(search);
    setSelectedId(undefined);
  };
  const [expanded, setExpanded] = useState(false);
  const [recorded, setRecorded] = useState(false);
  const mapHeight =
    expanded || height < 650 ? 180 : Math.max(180, Math.min(320, height * 0.3));
  const [editing, setEditing] = useState<Vehicle | null>(null);
  const admin = session?.user.role === 'ADMIN';
  const locationsByImei = useMemo(
    () => new Map(data.locations.map(item => [item.imei, item])),
    [data.locations],
  );
  const filtered = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return data.vehicles.filter(
      vehicle =>
        (!activeFilter || vehicle.id === activeFilter) &&
        [vehicle.name, vehicle.plate, vehicle.driverName ?? ''].some(value =>
          value.toLocaleLowerCase().includes(search),
        ),
    );
  }, [data.vehicles, query, activeFilter]);
  const selected = filtered.find(vehicle => vehicle.id === selectedId);
  const location = selected && locationsByImei.get(selected.imei);
  const positionedCount = filtered.filter(vehicle =>
    hasMapPosition(locationsByImei.get(vehicle.imei)),
  ).length;
  const awaitingVehicle =
    data.subscriptions.some(item => item.status === 'ACTIVE') ||
    data.requests.some(item => item.status === 'PENDING');
  const phone = selected?.driverPhone?.replace(/[^+\d]/g, '');
  return (
    <SafeAreaView style={local.screen} edges={['left', 'right', 'bottom']}>
      <View style={local.toolbar}>
        <View style={local.toolbarCopy}>
          <Text style={styles.heading}>{t('Fleet map')}</Text>
          <Text style={local.caption}>
            {t('Current or last known locations')}
          </Text>
        </View>
        {admin ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('Create vehicle')}
            onPress={() => navigation.navigate('CreateVehicle')}
            style={local.add}
          >
            <Text style={[local.addText, compact && local.addSymbol]}>
              {compact ? '+' : t('+ Add vehicle')}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {admin && selected ? (
        <View style={local.tabs}>
          {[false, true].map(value => (
            <Pressable
              key={String(value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: recorded === value }}
              onPress={() => setRecorded(value)}
              style={[local.tab, recorded === value && local.activeTab]}
            >
              <Text
                style={[
                  local.tabText,
                  recorded === value && local.activeTabText,
                ]}
              >
                {value ? t('Recorded journeys') : t('Vehicle locations')}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {recorded && admin && selected ? (
        <RecordedJourney
          key={selected.imei}
          vehicle={selected}
          onBack={() => setRecorded(false)}
          onFullHistory={() =>
            navigation.navigate('VehicleHistory', {
              imei: selected.imei,
              name: selected.name,
            })
          }
        />
      ) : (
        <>
          <View style={local.filters}>
            <Select
              compact
              label={t('Filter by vehicle')}
              value={activeFilter}
              options={[
                { value: '', label: t('All vehicles') },
                ...data.vehicles.map(vehicle => ({
                  value: vehicle.id,
                  label: `${vehicle.name} · ${vehicle.plate}`,
                })),
              ]}
              onChange={value => changeFilters(value)}
            />
            <View style={f.searchBox}>
              <Icon name="search" size={18} color={colors.muted} />
              <TextInput
                accessibilityLabel={t('Search vehicles')}
                placeholder={t('Search name, plate or driver')}
                placeholderTextColor={colors.muted}
                value={query}
                onChangeText={value => changeFilters(activeFilter, value)}
                autoCorrect={false}
                style={f.searchInput}
              />
              {query ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('Clear search')}
                  onPress={() => changeFilters(activeFilter)}
                  style={local.clear}
                >
                  <Icon name="close" size={20} color={colors.muted} />
                </Pressable>
              ) : null}
            </View>
            <View style={local.legend}>
              <Text style={local.caption}>
                {t('{{shown}} of {{total}} vehicles on map', {
                  shown: numberLabel(positionedCount),
                  total: numberLabel(filtered.length),
                })}
              </Text>
              <Text style={[local.caption, { color: colors.primary }]}>
                {t('● Live')}
              </Text>
              <Text style={[local.caption, { color: colors.amber }]}>
                {t('● Last known')}
              </Text>
            </View>
            <Text style={local.caption}>
              {t('Offline trackers show their last recorded location.')}
            </Text>
          </View>
          <View style={[local.mapArea, { height: mapHeight }]}>
            <FleetMap
              vehicles={filtered}
              locations={data.locations}
              selectedId={selected?.id}
              onSelect={setSelectedId}
            />
          </View>
          <View style={local.sheet}>
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
              data={filtered}
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
                        <Text style={local.eyebrow}>
                          {t('SELECTED VEHICLE')}
                        </Text>
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
                            action.run(
                              () => Linking.openURL(`tel:${phone}`),
                              '',
                            )
                          }
                          style={local.call}
                        >
                          <Text
                            style={[
                              local.callText,
                              compact && local.callSymbol,
                            ]}
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
                        onPress={() => changeFilters('')}
                      />
                    </View>
                  ) : null}
                  <View style={local.listTitleRow}>
                    <Text accessibilityRole="header" style={local.listTitle}>
                      {t('Vehicles')}
                    </Text>
                    <Text style={local.count}>
                      {numberLabel(filtered.length)}
                    </Text>
                    <Text style={local.hint}>{t('Select to view on map')}</Text>
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
                    query
                      ? t('No matching vehicles')
                      : loading
                      ? t('Loading vehicles…')
                      : admin
                      ? t('No vehicles yet')
                      : t('No vehicle assigned')
                  }
                  detail={
                    query
                      ? t('Try a different name, plate or driver.')
                      : loading
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
        </>
      )}
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
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  toolbarCopy: { flex: 1, gap: 4 },
  eyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  addSymbol: { fontSize: 24 },
  callSymbol: { fontSize: 22 },
  add: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: colors.mint,
    flexShrink: 1,
  },
  addText: { color: colors.primary, fontSize: 13, fontWeight: '700' },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 14,
    padding: 4,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  tab: {
    flex: 1,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 10,
  },
  activeTab: { backgroundColor: colors.primary },
  tabText: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '600',
    textAlign: 'center',
  },
  activeTabText: { color: colors.surface },
  mapArea: {
    minHeight: 180,
    marginHorizontal: 16,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: colors.background,
  },
  filters: { paddingHorizontal: 16, paddingBottom: 10, gap: 8 },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 10,
  },
  sheet: {
    flex: 1,
    marginTop: 10,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
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
  clear: {
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  hint: { marginLeft: 'auto', color: colors.muted, fontSize: 11 },
});

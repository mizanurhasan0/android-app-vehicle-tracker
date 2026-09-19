import React, { useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FleetMap } from '../../components/FleetMap';
import { VehicleCard } from '../../components/VehicleCard';
import { TrackingIcon, TrackingIconName } from '../../components/TrackingIcon';
import { NoorIcon } from '../../components/Noor';
import { Empty, Notice, Select } from '../../components/ui';
import { useData } from '../../context/DataContext';
import { useAction } from '../../hooks/useAction';
import { useTranslation } from '../../i18n';
import { colors, styles } from '../../theme';
import { parent } from './ParentUI';
import { Props } from './types';

export function ParentTrackingScreen({ route }: Props<'LiveTracking'>) {
  const { t } = useTranslation();
  const { data, loading, error, refresh } = useData();
  const action = useAction();
  const { width } = useWindowDimensions();
  const [selectedId, setSelectedId] = useState(route.params?.vehicleId || '');
  const vehicle =
    data.vehicles.find(item => item.id === selectedId) ||
    (!selectedId ? data.vehicles[0] : undefined);
  const location = data.locations.find(item => item.imei === vehicle?.imei);
  const mapHeight = Math.max(520, Math.min(935, width * 1.53));
  const currentSpeed =
    location?.speed == null ? undefined : Math.round(location.speed);
  return (
    <SafeAreaView
      style={parent.trackingScreen}
      edges={['left', 'right', 'bottom']}
    >
      {loading ? (
        <View style={parent.trackingLoading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.muted}>{t('Loading')}</Text>
        </View>
      ) : null}
      {!loading && !vehicle ? (
        <View style={parent.trackingEmpty}>
          <Notice text={error || action.error} kind="error" />
          <Empty
            title={t('No vehicle to track')}
            detail={t(
              "The assigned vehicle's location will appear after transport service is approved.",
            )}
          />
        </View>
      ) : null}
      {!loading && vehicle ? (
        <ScrollView
          contentContainerStyle={parent.trackingScroll}
          refreshControl={undefined}
        >
          <Notice text={error || action.error} kind="error" />
          <View style={[parent.trackingMap, { height: mapHeight }]}>
            <FleetMap
              vehicles={[vehicle]}
              locations={location ? [location] : []}
              selectedId={vehicle.id}
              onSelect={setSelectedId}
              style={parent.trackingMapWeb}
            />
            <View style={parent.trackingControls}>
              {[
                ['target', 'Center map', '#36A0AA'],
                ['layers', 'Map layers', '#45A956'],
                ['traffic', 'Traffic', '#EF5A5D'],
                ['play', 'Replay', '#F49A14'],
                ['compass', 'Direction', '#9638B3'],
                ['share', 'Share', '#2C68D0'],
                ['lock', 'Secure', '#EC5360'],
              ].map(([icon, label, color]) => (
                <Pressable
                  key={label}
                  accessibilityRole="button"
                  accessibilityLabel={t(label)}
                  style={parent.trackingControl}
                >
                  <TrackingIcon
                    name={icon as TrackingIconName}
                    size={23}
                    color={color}
                  />
                </Pressable>
              ))}
            </View>
          </View>
          <View style={parent.liveHeader}>
            <View style={parent.addressLink}>
              <NoorIcon name="pin" size={14} color="#4E6B70" />
              <Text style={parent.addressText}>{t('See Address')}</Text>
            </View>
            <Text style={parent.speedHeader}>
              {currentSpeed == null ? '— KM/H' : `${currentSpeed} KM/H`}
            </Text>
            <View style={parent.vehicleMark}>
              <NoorIcon name="vehicle" size={38} color="#78BC2C" />
            </View>
          </View>
          <View style={parent.statisticsSection}>
            <Text style={parent.statisticsTitle}>
              {t("Today's Statistics")}
            </Text>
            <View style={parent.statisticsRow}>
              <LiveStat
                icon="odometer"
                label={t('Odometer')}
                value="—"
                unit={t('km')}
                color="#3B9BBF"
              />
              <LiveStat
                icon="route"
                label={t('Route length')}
                value="—"
                unit={t('km')}
                color="#208BC0"
              />
              <LiveStat
                icon="duration"
                label={t('Move duration')}
                value="—"
                unit=""
                color="#1596C6"
              />
            </View>
          </View>
          <VehicleCard
            vehicle={vehicle}
            location={location}
            busy={action.busy}
            onOpenURL={url => action.run(() => Linking.openURL(url), '')}
          />
          {data.vehicles.length > 1 ? (
            <View style={parent.vehiclePicker}>
              <Select
                label={t('Select vehicle')}
                value={vehicle.id}
                onChange={setSelectedId}
                options={data.vehicles.map(item => ({
                  value: item.id,
                  label: item.name,
                }))}
              />
            </View>
          ) : null}
          <Pressable
            accessibilityRole="button"
            onPress={refresh}
            style={parent.refreshTracking}
          >
            <Text style={parent.refreshTrackingText}>
              {t('Refresh location')}
            </Text>
          </Pressable>
        </ScrollView>
      ) : null}
    </SafeAreaView>
  );
}

function LiveStat({
  icon,
  label,
  value,
  unit,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <View style={parent.statCard}>
      <View style={[parent.statIcon, { backgroundColor: `${color}18` }]}>
        <NoorIcon name={icon} size={17} color={color} />
      </View>
      <View style={parent.statCopy}>
        <Text numberOfLines={1} style={parent.statLabel}>
          {label}
        </Text>
        <Text numberOfLines={1} style={parent.statValue}>
          {value}
          {unit ? ` ${unit}` : ''}
        </Text>
      </View>
    </View>
  );
}

import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { Location, Vehicle } from '../api/types';
import { useTranslation } from '../i18n';
import { colors } from '../theme';
import { numberLabel, readable } from '../utils/format';
import { AppIcon } from './AppIcon';

interface VehicleListRowProps {
  vehicle: Vehicle;
  location?: Location;
  selected: boolean;
  onSelect: () => void;
  onEdit?: () => void;
}

export function VehicleListRow({
  vehicle,
  location,
  selected,
  onSelect,
  onEdit,
}: VehicleListRowProps) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const compact = width < 380;
  const stale =
    location != null && Date.now() - Date.parse(location.lastSeen) >= 180_000;
  const status = stale ? 'offline' : location?.status || 'waiting';
  const statusColor =
    status === 'live'
      ? colors.primary
      : status === 'lastKnown'
      ? colors.amber
      : colors.muted;
  const speed = location?.speed;
  const description = [
    readable(status),
    speed != null && Number.isFinite(speed)
      ? `${status === 'live' ? '' : `${t('Last speed')} `}${numberLabel(
          speed,
        )} ${t('km/h')}`
      : null,
    vehicle.driverName || null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={[local.row, selected && local.selectedRow]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${vehicle.name}, ${vehicle.plate}, ${description}`}
        accessibilityHint={t('View {{name}} on map', { name: vehicle.name })}
        accessibilityState={{ selected }}
        onPress={onSelect}
        style={({ pressed }) => [local.select, pressed && local.pressed]}
      >
        <View style={[local.avatar, selected && local.selectedAvatar]}>
          <AppIcon
            kind="vehicles"
            size={24}
            color={selected ? colors.surface : colors.primary}
          />
        </View>
        <View style={local.identity}>
          <Text numberOfLines={2} style={local.name}>
            {vehicle.name}
          </Text>
          <Text numberOfLines={1} style={local.plate}>
            {vehicle.plate}
          </Text>
          <View style={local.statusLine}>
            <View
              accessible={false}
              style={[local.statusDot, { backgroundColor: statusColor }]}
            />
            <Text numberOfLines={compact ? 2 : 1} style={local.description}>
              {description}
            </Text>
          </View>
        </View>
      </Pressable>
      {onEdit ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('Edit {{name}}', { name: vehicle.name })}
          onPress={onEdit}
          style={({ pressed }) => [local.edit, pressed && local.pressed]}
        >
          <Text style={[local.editLabel, compact && local.editSymbol]}>
            {compact ? '✎' : t('Edit')}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const local = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
    backgroundColor: colors.surface,
    paddingRight: 10,
  },
  selectedRow: {
    borderColor: colors.primary,
    backgroundColor: colors.mint,
  },
  select: {
    flex: 1,
    minWidth: 0,
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  selectedAvatar: { backgroundColor: colors.primary },
  identity: { flex: 1, minWidth: 0, gap: 3 },
  name: { fontSize: 15, fontWeight: '700', color: colors.ink },
  plate: { fontSize: 12, color: colors.muted, letterSpacing: 0.3 },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  description: { flex: 1, fontSize: 11, lineHeight: 17, color: colors.muted },
  edit: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  editSymbol: { fontSize: 22 },
  editLabel: { fontSize: 12, fontWeight: '600', color: colors.primary },
  pressed: { opacity: 0.65 },
});

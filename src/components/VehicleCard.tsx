import { useTranslation } from '../i18n';
import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Location, Vehicle } from '../api/types';
import { colors, styles } from '../theme';
import { dateLabel, numberLabel, readable } from '../utils/format';
import { Badge, Card } from './ui';
interface VehicleCardProps {
  vehicle: Vehicle;
  location?: Location;
  busy: boolean;
  onOpenURL: (url: string) => void;
  onHistory?: () => void;
}
const TRANSITION_DURATION = 300;
export function VehicleCard({
  vehicle,
  location,
  busy,
  onOpenURL,
  onHistory,
}: VehicleCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [detailsHeight, setDetailsHeight] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(true);
  const expansion = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    let active = true;
    let preferenceChanged = false;
    const listener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      enabled => {
        preferenceChanged = true;
        setReduceMotion(enabled);
      },
    );
    AccessibilityInfo.isReduceMotionEnabled()
      .then(enabled => {
        if (active && !preferenceChanged) setReduceMotion(enabled);
      })
      .catch(() => {
        if (active && !preferenceChanged) setReduceMotion(false);
      });
    return () => {
      active = false;
      listener.remove();
    };
  }, []);
  useEffect(() => {
    if (reduceMotion) {
      expansion.setValue(expanded ? 1 : 0);
    } else {
      Animated.timing(expansion, {
        toValue: expanded ? 1 : 0,
        duration: TRANSITION_DURATION,
        easing: Easing.inOut(Easing.cubic),
        // Height is a layout property and must use the JS animation driver.
        useNativeDriver: false,
      }).start();
    }
    return () => expansion.stopAnimation();
  }, [expanded, expansion, reduceMotion]);
  const toggleExpanded = () => {
    setExpanded(current => !current);
  };
  const hasPosition = location?.latitude != null && location.longitude != null;
  const stale =
    location && Date.now() - Date.parse(location.lastSeen) >= 180_000;
  const status = stale ? 'offline' : location?.status || 'waiting';
  const driverPhone = vehicle.driverPhone?.replace(/[^+\d]/g, '');
  return (
    <Card>
      <View>
        <View style={local.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${vehicle.name}, ${readable(status)}`}
            accessibilityHint={t('Show or hide vehicle details')}
            accessibilityState={{
              expanded,
            }}
            onPress={toggleExpanded}
            style={({ pressed }) => [local.toggle, pressed && local.dimmed]}
          >
            <View style={local.identity}>
              <Text style={styles.heading}>{vehicle.name}</Text>
              <Badge status={status} />
            </View>
            <Animated.View
              accessible={false}
              style={[
                local.chevron,
                {
                  transform: [
                    {
                      rotate: expansion.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['45deg', '225deg'],
                      }),
                    },
                  ],
                },
              ]}
            />
          </Pressable>
          {onHistory || driverPhone ? (
            <View style={local.quickActions}>
              {onHistory ? (
                <VehicleAction
                  icon="history"
                  label={t('View travel history for {{name}}', {
                    name: vehicle.name,
                  })}
                  onPress={onHistory}
                />
              ) : null}
              {driverPhone ? (
                <VehicleAction
                  icon="call"
                  label={t('Call driver for {{name}}', { name: vehicle.name })}
                  disabled={busy}
                  onPress={() => onOpenURL(`tel:${driverPhone}`)}
                />
              ) : null}
            </View>
          ) : null}
        </View>
        <Animated.View
          pointerEvents={expanded ? 'auto' : 'none'}
          accessibilityElementsHidden={!expanded}
          importantForAccessibility={expanded ? 'auto' : 'no-hide-descendants'}
          style={[
            local.detailsClip,
            {
              height: expansion.interpolate({
                inputRange: [0, 1],
                outputRange: [0, detailsHeight],
              }),
              opacity: expansion,
            },
          ]}
        >
          <View
            collapsable={false}
            onLayout={event =>
              setDetailsHeight(event.nativeEvent.layout.height)
            }
            style={local.detailsMeasure}
          >
            <View style={local.details}>
              <Text style={local.plate}>{vehicle.plate}</Text>
              {hasPosition ? (
                <View style={local.telemetry}>
                  <View style={local.speed}>
                    <Text style={local.caption}>
                      {status === 'live' ? t('Speed') : t('Last speed')}
                    </Text>
                    <Text style={local.speedValue}>
                      {location?.speed == null
                        ? '—'
                        : numberLabel(location.speed)}{' '}
                      <Text style={local.unit}>{t('km/h')}</Text>
                    </Text>
                  </View>
                  <View style={local.updated}>
                    <Text style={local.caption}>{t('Last position')}</Text>
                    <Text style={local.timestamp}>
                      {location?.positionAt
                        ? dateLabel(location.positionAt)
                        : t('Unknown')}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.muted}>{t('Waiting for location')}</Text>
              )}
              {vehicle.driverName ? (
                <View style={local.driver}>
                  <Text style={styles.muted}>{t('Driver')}</Text>
                  <Text style={local.driverName}>{vehicle.driverName}</Text>
                </View>
              ) : null}
              {hasPosition ? (
                <VehicleAction
                  primary
                  title={t('View map')}
                  label={t('View {{name}} on map', { name: vehicle.name })}
                  disabled={busy}
                  onPress={() =>
                    onOpenURL(
                      `https://www.google.com/maps/search/?api=1&query=${location?.latitude},${location?.longitude}`,
                    )
                  }
                />
              ) : null}
            </View>
          </View>
        </Animated.View>
      </View>
    </Card>
  );
}
function HistoryIcon() {
  return (
    <View accessible={false} style={local.historyIcon}>
      <View style={local.clockFace}>
        <View style={local.clockHour} />
        <View style={local.clockMinute} />
      </View>
      <View style={local.historyArrow} />
    </View>
  );
}
function VehicleAction({
  title,
  icon,
  label,
  onPress,
  primary = false,
  disabled = false,
}: {
  title?: string;
  icon?: 'history' | 'call';
  label: string;
  onPress: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{
        disabled,
      }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        local.action,
        icon && local.iconAction,
        primary && local.primaryAction,
        (pressed || disabled) && local.dimmed,
      ]}
    >
      {icon === 'history' ? (
        <HistoryIcon />
      ) : (
        <Text
          accessible={false}
          allowFontScaling={!icon}
          style={[
            local.actionText,
            icon && local.icon,
            primary && local.primaryActionText,
          ]}
        >
          {icon === 'call' ? '☎' : title}
        </Text>
      )}
    </Pressable>
  );
}
const local = StyleSheet.create({
  header: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 130,
    minHeight: 48,
    gap: 12,
  },
  identity: {
    flex: 1,
    gap: 8,
  },
  chevron: {
    width: 8,
    height: 8,
    marginRight: 4,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.muted,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 8,
  },
  detailsClip: {
    overflow: 'hidden',
  },
  // Measure natural content height even while the visible container is closed.
  detailsMeasure: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
  },
  details: {
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 16,
  },
  plate: {
    color: colors.muted,
    fontSize: 13,
    letterSpacing: 0.6,
  },
  telemetry: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: colors.background,
  },
  speed: {
    flexGrow: 1,
    gap: 4,
  },
  caption: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  speedValue: {
    color: colors.ink,
    fontSize: 28,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  unit: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '400',
  },
  updated: {
    flexGrow: 1,
    flexShrink: 1,
    gap: 4,
  },
  timestamp: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 20,
  },
  driver: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  driverName: {
    color: colors.ink,
    fontSize: 14,
    lineHeight: 21,
    flexShrink: 1,
  },
  action: {
    minHeight: 48,
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.background,
    justifyContent: 'center',
  },
  iconAction: {
    width: 48,
    flexGrow: 0,
    paddingHorizontal: 0,
    alignItems: 'center',
  },
  icon: {
    fontSize: 25,
    lineHeight: 30,
    fontWeight: '400',
  },
  historyIcon: {
    width: 24,
    height: 24,
  },
  clockFace: {
    position: 'absolute',
    top: 2,
    right: 1,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.primary,
    borderLeftColor: 'transparent',
  },
  clockHour: {
    position: 'absolute',
    left: 7,
    top: 3,
    width: 2,
    height: 6,
    borderRadius: 1,
    backgroundColor: colors.primary,
  },
  clockMinute: {
    position: 'absolute',
    left: 7,
    top: 8,
    width: 5,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.primary,
    transform: [
      {
        rotate: '30deg',
      },
    ],
  },
  historyArrow: {
    position: 'absolute',
    left: 1,
    top: 3,
    width: 7,
    height: 7,
    borderLeftWidth: 2,
    borderBottomWidth: 2,
    borderColor: colors.primary,
  },
  primaryAction: {
    backgroundColor: colors.primary,
  },
  dimmed: {
    opacity: 0.65,
  },
  actionText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryActionText: {
    color: colors.surface,
  },
});

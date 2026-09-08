import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  AccountForm,
  RouteForm,
  VehicleForm,
} from '../components/setup/SetupForms';
import { SetupIcon, SetupSection } from '../components/setup/SetupIcon';
import { Card, Page } from '../components/ui';
import { useData } from '../context/DataContext';
import { useTranslation } from '../i18n';
import { colors, styles } from '../theme';
import { money, numberLabel } from '../utils/format';

const sections: { id: SetupSection; label: string }[] = [
  { id: 'payments', label: 'Payment accounts' },
  { id: 'vehicles', label: 'Vehicles' },
  { id: 'routes', label: 'Routes' },
];

function SetupPanel({
  section,
  active,
  children,
}: React.PropsWithChildren<{
  section: SetupSection;
  active: boolean;
}>) {
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let cancelled = false;
    const showImmediately = () => {
      progress.stopAnimation();
      progress.setValue(1);
    };
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      reduced => {
        if (reduced) showImmediately();
      },
    );
    if (active) {
      AccessibilityInfo.isReduceMotionEnabled()
        .then(reduced => {
          if (cancelled) return;
          if (reduced) {
            showImmediately();
            return;
          }
          progress.setValue(0);
          Animated.timing(progress, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }).start();
        })
        .catch(() => {
          if (!cancelled) showImmediately();
        });
    }
    return () => {
      cancelled = true;
      subscription.remove();
      progress.stopAnimation();
    };
  }, [active, progress]);

  // Keep drafts mounted while hiding inactive fields from touch and screen readers.
  return (
    <View
      testID={`setup-panel-${section}`}
      style={!active && local.hidden}
      accessibilityElementsHidden={!active}
      importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
    >
      <Animated.View
        style={{
          opacity: progress,
          transform: [
            {
              translateY: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [6, 0],
              }),
            },
          ],
        }}
      >
        <View style={styles.section}>{children}</View>
      </Animated.View>
    </View>
  );
}

export function SetupScreen() {
  const { t } = useTranslation();
  const { data, loading, error, refresh } = useData();
  const [active, setActive] = useState<SetupSection>('payments');
  const counts = {
    payments: data.accounts.length,
    vehicles: data.vehicles.length,
    routes: data.routes.length,
  };
  const selectSection = (section: SetupSection) => {
    Keyboard.dismiss();
    setActive(section);
  };

  return (
    <Page loading={loading} refresh={refresh} error={error}>
      <View
        accessibilityRole="tablist"
        accessibilityLabel={t('Service setup sections')}
        style={local.tabs}
      >
        {sections.map(section => {
          const selected = active === section.id;
          return (
            <Pressable
              key={section.id}
              accessibilityRole="tab"
              accessibilityLabel={t(section.label)}
              accessibilityState={{ selected }}
              onPress={() => selectSection(section.id)}
              style={({ pressed }) => [
                local.tab,
                selected && local.selectedTab,
                pressed && local.pressed,
              ]}
            >
              <View style={local.tabTop}>
                <View style={[local.icon, selected && local.selectedIcon]}>
                  <SetupIcon kind={section.id} selected={selected} />
                </View>
                <Text style={[local.count, selected && local.selectedText]}>
                  {numberLabel(counts[section.id])}
                </Text>
              </View>
              <Text style={[local.tabLabel, selected && local.selectedText]}>
                {t(section.label)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <SetupPanel section="payments" active={active === 'payments'}>
        <AccountForm />
      </SetupPanel>
      <SetupPanel section="vehicles" active={active === 'vehicles'}>
        <VehicleForm />
        {data.vehicles.length ? (
          <Card>
            <Text accessibilityRole="header" style={styles.heading}>
              {t('Your vehicles')} · {numberLabel(data.vehicles.length)}
            </Text>
            {data.vehicles.map(vehicle => (
              <View key={vehicle.id} style={local.record}>
                <View style={local.recordIcon}>
                  <SetupIcon kind="vehicles" />
                </View>
                <View style={local.recordBody}>
                  <Text style={local.recordTitle}>{vehicle.name}</Text>
                  <Text style={styles.muted}>{vehicle.plate}</Text>
                  {vehicle.driverName ? (
                    <Text style={styles.muted}>{vehicle.driverName}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </Card>
        ) : null}
      </SetupPanel>
      <SetupPanel section="routes" active={active === 'routes'}>
        <RouteForm onAddVehicle={() => selectSection('vehicles')} />
        {data.routes.length ? (
          <Card>
            <Text accessibilityRole="header" style={styles.heading}>
              {t('Your routes')} · {numberLabel(data.routes.length)}
            </Text>
            {data.routes.map(route => (
              <View key={route.id} style={local.record}>
                <View style={local.recordIcon}>
                  <SetupIcon kind="routes" />
                </View>
                <View style={local.recordBody}>
                  <Text style={local.recordTitle}>{route.name}</Text>
                  <Text style={styles.muted}>
                    {route.vehicleName} ·{' '}
                    {t('{{number}} pickup stops', {
                      number: numberLabel(route.stops.length),
                    })}
                  </Text>
                  <Text style={local.routeFee}>
                    {t('{{amount}} / month', {
                      amount: money(route.monthlyAmount),
                    })}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        ) : null}
      </SetupPanel>
    </Page>
  );
}

const local = StyleSheet.create({
  hidden: { display: 'none' },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tab: {
    flex: 1,
    minWidth: 90,
    padding: 12,
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 18,
  },
  selectedTab: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 4,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.mint,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIcon: { backgroundColor: colors.primary },
  count: {
    fontSize: 13,
    color: colors.muted,
    fontWeight: '700',
    flexShrink: 1,
  },
  tabLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    color: colors.ink,
  },
  selectedText: { color: colors.surface },
  pressed: { opacity: 0.78 },
  record: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 14,
  },
  recordIcon: {
    backgroundColor: colors.mint,
    height: 42,
    width: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordBody: { flex: 1, gap: 3 },
  recordTitle: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
  },
  routeFee: {
    color: colors.primary,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
});

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Bus, Plus } from 'lucide-react-native';
import { colors } from '../theme';
import { Icon } from './Icon';

export type AppIconKind =
  | 'vehicles' | 'createVehicle' | 'routes' | 'payments' | 'applications'
  | 'complaints' | 'stop' | 'students' | 'bills' | 'due' | 'bell' | 'user'
  | 'lock' | 'eye' | 'back';

const iconMap: Record<Exclude<AppIconKind, 'createVehicle'>, string> = {
  vehicles: 'vehicles', routes: 'routes', payments: 'payments', applications: 'requests',
  complaints: 'complaints', stop: 'stop', students: 'students', bills: 'bills', due: 'due',
  bell: 'bell', user: 'user', lock: 'lock', eye: 'eye', back: 'back',
};

export function AppIcon({
  kind,
  size = 26,
  color = colors.primary,
}: {
  kind: AppIconKind;
  size?: number;
  color?: string;
}) {
  if (kind !== 'createVehicle') return <Icon name={iconMap[kind]} size={size} color={color} />;

  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.container, { width: size, height: size }]}
    >
      <Bus size={size} color={color} strokeWidth={1.8} />
      <View style={[styles.badge, { backgroundColor: colors.surface }]}>
        <Plus size={size * 0.42} color={color} strokeWidth={2.4} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  badge: {
    position: 'absolute', right: -3, bottom: -2, width: 12, height: 12,
    borderRadius: 6, alignItems: 'center', justifyContent: 'center',
  },
});

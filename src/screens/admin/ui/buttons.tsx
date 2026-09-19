import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { NoorIcon } from '../../../components/Noor';
import { useTranslation } from '../../../i18n';
import { s } from './styles';
import { C } from './tokens';

export function SmallButton({
  title,
  onPress,
  icon,
  secondary,
  danger,
  busy,
  disabled,
}: {
  title: string;
  onPress: () => void;
  icon?: string;
  secondary?: boolean;
  danger?: boolean;
  busy?: boolean;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || !!busy, busy: !!busy }}
      disabled={busy || disabled}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        danger && s.dangerButton,
        (busy || disabled || pressed) && s.dim,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={secondary ? C.green : C.white} />
      ) : icon ? (
        <NoorIcon name={icon} size={17} color={secondary ? C.green : C.white} />
      ) : null}
      <Text style={[s.buttonText, secondary && s.green]}>{t(title)}</Text>
    </Pressable>
  );
}

export function IconButton({
  title,
  icon,
  onPress,
  disabled,
  busy,
}: {
  title: string;
  icon: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(title)}
      accessibilityState={{ disabled: !!disabled || !!busy, busy: !!busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        s.iconButton,
        (disabled || busy || pressed) && s.dim,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={C.green} />
      ) : (
        <NoorIcon name={icon} size={18} color={C.green} />
      )}
    </Pressable>
  );
}

export function Tabs({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={s.tabs}>
      {options.map(option => (
        <Pressable
          key={option.value}
          accessibilityRole="tab"
          accessibilityState={{ selected: value === option.value }}
          onPress={() => onChange(option.value)}
          style={[s.tab, value === option.value && s.tabActive]}
        >
          <Text style={[s.tabLabel, value === option.value && s.white]}>
            {t(option.label)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

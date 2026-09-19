import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../../theme';
import { controlStyles } from './controlStyles';

export function Button({
  title,
  onPress,
  busy,
  disabled,
  secondary = false,
  danger = false,
}: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  secondary?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={({ pressed }) => [
        ui.button,
        secondary && ui.secondary,
        danger && ui.danger,
        (disabled || busy) && ui.disabled,
        pressed && ui.pressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={secondary ? colors.primary : '#FFFFFF'} />
      ) : null}
      <Text style={[ui.buttonText, secondary && ui.secondaryText]}>
        {title}
      </Text>
    </Pressable>
  );
}

const ui = StyleSheet.create({
  ...controlStyles,
  button: {
    minHeight: 44,
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondary: {
    backgroundColor: colors.mint,
    borderColor: colors.line,
    borderWidth: 1,
  },
  danger: { backgroundColor: colors.danger },
  buttonText: {
    flexShrink: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  secondaryText: { color: colors.primary },
});

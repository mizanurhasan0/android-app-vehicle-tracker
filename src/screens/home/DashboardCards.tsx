import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { NoorIcon } from '../../components/Noor';
import { colors } from '../../theme';
import { h } from './styles';

export function Stat({
  color,
  icon,
  title,
  value,
  subtitle,
  onPress,
  small = false,
}: {
  color: string;
  icon: string;
  title: string;
  value: string;
  subtitle?: string;
  onPress: () => void;
  small?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${value}`}
      onPress={onPress}
      style={({ pressed }) => [
        h.stat,
        { backgroundColor: color },
        pressed && h.pressed,
      ]}
    >
      <View style={h.statTop}>
        <NoorIcon name={icon} color="#FFFFFF" size={28} />
        <Text style={h.statTitle}>{title}</Text>
      </View>
      <Text
        adjustsFontSizeToFit
        numberOfLines={1}
        style={[h.statValue, small && h.statValueSmall]}
      >
        {value}
      </Text>
      {subtitle ? <Text style={h.statSub}>{subtitle}</Text> : null}
    </Pressable>
  );
}
export function AlertRow({
  text,
  color,
  onPress,
}: {
  text: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={h.alertRow}>
      <View style={[h.dot, { backgroundColor: color }]} />
      <Text style={h.alertText}>{text}</Text>
      <NoorIcon name="chevron" size={20} color={colors.muted} />
    </Pressable>
  );
}

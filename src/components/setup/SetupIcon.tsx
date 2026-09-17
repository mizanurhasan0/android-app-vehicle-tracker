import React from 'react';
import { Wallet, Bus, Route } from 'lucide-react-native';
import { colors } from '../../theme';

export type SetupSection = 'payments' | 'vehicles' | 'routes';

export function SetupIcon({
  kind,
  selected = false,
  color = selected ? colors.surface : colors.primary,
}: {
  kind: SetupSection;
  selected?: boolean;
  color?: string;
}) {
  const Glyph = kind === 'payments' ? Wallet : kind === 'vehicles' ? Bus : Route;
  return <Glyph size={24} color={color} strokeWidth={1.8} />;
}

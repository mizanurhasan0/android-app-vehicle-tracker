import React from 'react';
import { CircleStop, FilePlus, FileText, MessageCircle } from 'lucide-react-native';
import { colors } from '../theme';

export type RequestIconKind = 'form' | 'applications' | 'complaints' | 'stop';

export function RequestTabIcon({
  kind,
  selected,
  color = selected ? colors.surface : colors.primary,
}: {
  kind: RequestIconKind;
  selected: boolean;
  color?: string;
}) {
  const Glyph = kind === 'form' ? FilePlus : kind === 'applications' ? FileText : kind === 'complaints' ? MessageCircle : CircleStop;
  return <Glyph size={20} color={color} strokeWidth={1.8} />;
}

import React from 'react';
import { Globe, LogOut, Pencil, X } from 'lucide-react-native';
import { colors } from '../theme';

export function ProfileMenuIcon({
  kind,
  color = colors.primary,
}: {
  kind: 'edit' | 'language' | 'logout' | 'close';
  color?: string;
}) {
  const Glyph = kind === 'edit' ? Pencil : kind === 'language' ? Globe : kind === 'logout' ? LogOut : X;
  return <Glyph size={24} color={color} strokeWidth={1.8} />;
}

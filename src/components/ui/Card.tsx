import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme';

export function Card({
  children,
  tinted = false,
}: React.PropsWithChildren<{ tinted?: boolean }>) {
  return <View style={[ui.card, tinted && ui.tinted]}>{children}</View>;
}

const ui = StyleSheet.create({
  card: {
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.line,
    gap: 10,
  },
  tinted: { backgroundColor: colors.mint, borderColor: colors.line },
});

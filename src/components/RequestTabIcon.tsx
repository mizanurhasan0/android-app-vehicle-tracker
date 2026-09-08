import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

export type RequestIconKind = 'form' | 'applications' | 'complaints' | 'stop';

// Use the same native line-icon treatment as the setup tabs.
export function RequestTabIcon({
  kind,
  selected,
}: {
  kind: RequestIconKind;
  selected: boolean;
}) {
  const color = selected ? colors.surface : colors.primary;
  const stroke = { borderColor: color };
  const fill = { backgroundColor: color };
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={icon.canvas}
    >
      {kind === 'form' ? (
        <>
          <View style={[icon.square, stroke]} />
          <View style={[icon.plusHorizontal, fill]} />
          <View style={[icon.plusVertical, fill]} />
        </>
      ) : kind === 'applications' ? (
        <>
          <View style={[icon.document, stroke]} />
          <View style={[icon.line, icon.lineTop, fill]} />
          <View style={[icon.line, icon.lineMiddle, fill]} />
          <View style={[icon.line, icon.lineBottom, fill]} />
        </>
      ) : kind === 'complaints' ? (
        <>
          <View style={[icon.bubble, stroke]} />
          <View style={[icon.tail, stroke]} />
          <View style={[icon.messageLine, fill]} />
          <View style={[icon.messageDot, fill]} />
        </>
      ) : (
        <>
          <View style={[icon.circle, stroke]} />
          <View style={[icon.stop, stroke]} />
        </>
      )}
    </View>
  );
}

const icon = StyleSheet.create({
  canvas: { width: 20, height: 20, flexShrink: 0 },
  square: {
    position: 'absolute',
    left: 2,
    top: 2,
    width: 16,
    height: 16,
    borderWidth: 1.6,
    borderRadius: 4,
  },
  plusHorizontal: {
    position: 'absolute',
    left: 6,
    top: 9,
    width: 8,
    height: 2,
    borderRadius: 1,
  },
  plusVertical: {
    position: 'absolute',
    left: 9,
    top: 6,
    width: 2,
    height: 8,
    borderRadius: 1,
  },
  document: {
    position: 'absolute',
    left: 3,
    top: 1,
    width: 14,
    height: 18,
    borderWidth: 1.6,
    borderRadius: 3,
  },
  line: {
    position: 'absolute',
    left: 6,
    width: 8,
    height: 1.6,
    borderRadius: 1,
  },
  lineTop: { top: 6 },
  lineMiddle: { top: 10 },
  lineBottom: { top: 14, width: 5 },
  bubble: {
    position: 'absolute',
    left: 1,
    top: 2,
    width: 18,
    height: 13,
    borderWidth: 1.6,
    borderRadius: 4,
  },
  tail: {
    position: 'absolute',
    left: 4,
    top: 14,
    width: 5,
    height: 4,
    borderLeftWidth: 1.6,
    borderBottomWidth: 1.6,
    transform: [{ skewY: '-35deg' }],
  },
  messageLine: {
    position: 'absolute',
    left: 9,
    top: 5,
    width: 2,
    height: 4,
    borderRadius: 1,
  },
  messageDot: {
    position: 'absolute',
    left: 9,
    top: 10,
    width: 2,
    height: 2,
    borderRadius: 1,
  },
  circle: {
    position: 'absolute',
    left: 1,
    top: 1,
    width: 18,
    height: 18,
    borderWidth: 1.6,
    borderRadius: 9,
  },
  stop: {
    position: 'absolute',
    left: 7,
    top: 7,
    width: 6,
    height: 6,
    borderWidth: 1.6,
    borderRadius: 1,
  },
});

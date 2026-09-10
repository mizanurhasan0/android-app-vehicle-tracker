import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

export function ProfileMenuIcon({
  kind,
  color = colors.primary,
}: {
  kind: 'edit' | 'language' | 'logout' | 'close';
  color?: string;
}) {
  const stroke = { borderColor: color };
  const fill = { backgroundColor: color };
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={icon.canvas}
    >
      {kind === 'edit' ? (
        <>
          <View style={[icon.pencil, stroke]} />
          <View style={[icon.baseline, fill]} />
        </>
      ) : kind === 'language' ? (
        <>
          <View style={[icon.globe, stroke]} />
          <View style={[icon.meridian, stroke]} />
          <View style={[icon.equator, fill]} />
        </>
      ) : kind === 'logout' ? (
        <>
          <View style={[icon.door, stroke]} />
          <View style={[icon.arrow, fill]} />
          <View style={[icon.arrowhead, stroke]} />
        </>
      ) : (
        <>
          <View style={[icon.cross, fill, icon.crossLeft]} />
          <View style={[icon.cross, fill, icon.crossRight]} />
        </>
      )}
    </View>
  );
}
const icon = StyleSheet.create({
  canvas: { width: 24, height: 24, flexShrink: 0 },
  pencil: {
    position: 'absolute',
    width: 6,
    height: 17,
    borderWidth: 1.6,
    borderRadius: 1.5,
    left: 10,
    top: 1,
    transform: [{ rotate: '40deg' }],
  },
  baseline: {
    position: 'absolute',
    left: 3,
    bottom: 2,
    height: 1.6,
    width: 18,
    borderRadius: 1,
  },
  globe: {
    position: 'absolute',
    left: 2,
    top: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.6,
  },
  meridian: {
    position: 'absolute',
    left: 7,
    top: 2,
    width: 10,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.4,
  },
  equator: { position: 'absolute', left: 3, top: 11.3, width: 18, height: 1.4 },
  door: {
    position: 'absolute',
    left: 3,
    top: 3,
    height: 18,
    width: 9,
    borderLeftWidth: 1.6,
    borderTopWidth: 1.6,
    borderBottomWidth: 1.6,
    borderRadius: 2,
  },
  arrow: { position: 'absolute', left: 9, top: 11.2, width: 12, height: 1.6 },
  arrowhead: {
    position: 'absolute',
    right: 3,
    top: 8,
    width: 8,
    height: 8,
    borderTopWidth: 1.6,
    borderRightWidth: 1.6,
    transform: [{ rotate: '45deg' }],
  },
  cross: {
    position: 'absolute',
    left: 3,
    top: 11.2,
    width: 18,
    height: 1.6,
    borderRadius: 1,
  },
  crossLeft: { transform: [{ rotate: '45deg' }] },
  crossRight: { transform: [{ rotate: '-45deg' }] },
});

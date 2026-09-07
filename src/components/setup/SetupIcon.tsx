import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme';

export type SetupSection = 'payments' | 'vehicles' | 'routes';

// Small native line icons keep the setup screen independent of an icon font.
export function SetupIcon({
  kind,
  selected = false,
}: {
  kind: SetupSection;
  selected?: boolean;
}) {
  const color = selected ? colors.surface : colors.primary;
  const stroke = { borderColor: color };
  const fill = { backgroundColor: color };
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={icon.canvas}
    >
      {kind === 'payments' ? (
        <>
          <View style={[icon.wallet, stroke]} />
          <View
            style={[
              icon.walletFlap,
              stroke,
              { backgroundColor: selected ? colors.primary : colors.mint },
            ]}
          />
          <View style={[icon.walletDot, fill]} />
        </>
      ) : kind === 'vehicles' ? (
        <>
          <View style={[icon.bus, stroke]} />
          <View style={[icon.window, stroke]} />
          <View style={[icon.leftLight, fill]} />
          <View style={[icon.rightLight, fill]} />
          <View style={[icon.leftWheel, fill]} />
          <View style={[icon.rightWheel, fill]} />
        </>
      ) : (
        <>
          <View style={[icon.route, stroke]} />
          <View
            style={[
              icon.start,
              stroke,
              { backgroundColor: selected ? colors.primary : colors.mint },
            ]}
          />
          <View
            style={[
              icon.end,
              stroke,
              { backgroundColor: selected ? colors.primary : colors.mint },
            ]}
          />
        </>
      )}
    </View>
  );
}

const icon = StyleSheet.create({
  canvas: { width: 24, height: 24 },
  wallet: {
    position: 'absolute',
    left: 2,
    top: 5,
    width: 20,
    height: 16,
    borderWidth: 1.8,
    borderRadius: 4,
  },
  walletFlap: {
    position: 'absolute',
    right: 0,
    top: 10,
    width: 10,
    height: 7,
    borderWidth: 1.8,
    borderRadius: 2,
  },
  walletDot: {
    position: 'absolute',
    right: 4,
    top: 13,
    width: 2,
    height: 2,
    borderRadius: 1,
  },
  bus: {
    position: 'absolute',
    left: 4,
    top: 2,
    width: 16,
    height: 18,
    borderWidth: 1.8,
    borderRadius: 4,
  },
  window: {
    position: 'absolute',
    left: 7,
    top: 5,
    width: 10,
    height: 7,
    borderWidth: 1.5,
    borderRadius: 1,
  },
  leftLight: {
    position: 'absolute',
    left: 7,
    top: 15,
    width: 3,
    height: 2,
    borderRadius: 1,
  },
  rightLight: {
    position: 'absolute',
    right: 7,
    top: 15,
    width: 3,
    height: 2,
    borderRadius: 1,
  },
  leftWheel: {
    position: 'absolute',
    left: 6,
    top: 20,
    width: 3,
    height: 3,
    borderRadius: 1,
  },
  rightWheel: {
    position: 'absolute',
    right: 6,
    top: 20,
    width: 3,
    height: 3,
    borderRadius: 1,
  },
  route: {
    position: 'absolute',
    left: 6,
    top: 5,
    width: 13,
    height: 14,
    borderWidth: 1.8,
    borderLeftWidth: 0,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
  },
  start: {
    position: 'absolute',
    left: 2,
    top: 2,
    width: 7,
    height: 7,
    borderWidth: 1.8,
    borderRadius: 4,
  },
  end: {
    position: 'absolute',
    left: 2,
    top: 16,
    width: 7,
    height: 7,
    borderWidth: 1.8,
    borderRadius: 4,
  },
});

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SetupIcon } from './setup/SetupIcon';
import { RequestTabIcon } from './RequestTabIcon';
import { colors } from '../theme';

export type AppIconKind =
  | 'vehicles'
  | 'createVehicle'
  | 'routes'
  | 'payments'
  | 'applications'
  | 'complaints'
  | 'stop'
  | 'students'
  | 'bills'
  | 'due'
  | 'bell'
  | 'user'
  | 'lock'
  | 'eye'
  | 'back';
export function AppIcon({
  kind,
  size = 26,
  color = colors.primary,
}: {
  kind: AppIconKind;
  size?: number;
  color?: string;
}) {
  const stroke = { borderColor: color };
  const fill = { backgroundColor: color };
  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[icon.container, { width: size, height: size }]}
    >
      <View style={[icon.canvas, { transform: [{ scale: size / 24 }] }]}>
        {kind === 'vehicles' || kind === 'routes' || kind === 'payments' ? (
          <SetupIcon kind={kind} color={color} />
        ) : kind === 'createVehicle' ? (
          <>
            <SetupIcon kind="vehicles" color={color} />
            <View style={icon.plusBadge}>
              <View style={[icon.plusH, fill]} />
              <View style={[icon.plusV, fill]} />
            </View>
          </>
        ) : kind === 'applications' ||
          kind === 'complaints' ||
          kind === 'stop' ? (
          <RequestTabIcon kind={kind} selected={false} color={color} />
        ) : kind === 'user' || kind === 'students' ? (
          <>
            <View style={[icon.head, stroke]} />
            <View style={[icon.shoulders, stroke]} />
            {kind === 'students' ? <View style={[icon.cap, stroke]} /> : null}
          </>
        ) : kind === 'bell' ? (
          <>
            <View style={[icon.bell, stroke]} />
            <View style={[icon.bellBase, fill]} />
            <View style={[icon.bellDot, fill]} />
            <View style={[icon.bellTop, fill]} />
          </>
        ) : kind === 'lock' ? (
          <>
            <View style={[icon.shackle, stroke]} />
            <View style={[icon.lock, stroke]} />
            <View style={[icon.keyhole, fill]} />
          </>
        ) : kind === 'eye' ? (
          <>
            <View style={[icon.eye, stroke]} />
            <View style={[icon.pupil, stroke]} />
          </>
        ) : kind === 'back' ? (
          <View style={[icon.back, stroke]} />
        ) : (
          <>
            <View style={[icon.receipt, stroke]} />
            <View style={[icon.rule, icon.ruleTop, fill]} />
            <View style={[icon.rule, icon.ruleMiddle, fill]} />
            <View style={[icon.rule, icon.ruleBottom, fill]} />
            {kind === 'due' ? (
              <View style={[icon.clock, stroke]}>
                <View style={[icon.hand, stroke]} />
              </View>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}
const icon = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  ruleTop: { top: 7 },
  ruleMiddle: { top: 11 },
  ruleBottom: { top: 15, width: 5 },
  // Request icons use a 20px canvas; center them inside the shared 24px frame.
  canvas: {
    width: 24,
    height: 24,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  head: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderWidth: 1.5,
    borderRadius: 5,
    top: 2,
    left: 7.5,
  },
  shoulders: {
    position: 'absolute',
    width: 19,
    height: 10,
    borderWidth: 1.5,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    bottom: 1,
    left: 2.5,
  },
  cap: {
    position: 'absolute',
    width: 13,
    height: 5,
    top: 0,
    left: 5.5,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  bell: {
    position: 'absolute',
    left: 5,
    top: 4,
    width: 14,
    height: 14,
    borderWidth: 1.6,
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    borderBottomWidth: 0,
  },
  bellBase: { position: 'absolute', width: 20, height: 1.6, left: 2, top: 18 },
  bellDot: {
    position: 'absolute',
    width: 5,
    height: 2.5,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
    left: 9.5,
    top: 21,
  },
  bellTop: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 2,
    left: 10.5,
    top: 1,
  },
  shackle: {
    position: 'absolute',
    width: 10,
    height: 11,
    borderWidth: 1.5,
    borderRadius: 6,
    left: 7,
    top: 1,
  },
  lock: {
    position: 'absolute',
    width: 18,
    height: 13,
    borderWidth: 1.5,
    borderRadius: 3,
    left: 3,
    top: 10,
    backgroundColor: colors.surface,
  },
  keyhole: {
    position: 'absolute',
    width: 2,
    height: 5,
    borderRadius: 1,
    left: 11,
    top: 14,
  },
  eye: {
    position: 'absolute',
    width: 20,
    height: 13,
    borderWidth: 1.5,
    borderRadius: 10,
    left: 2,
    top: 5.5,
  },
  pupil: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderWidth: 1.5,
    borderRadius: 4,
    left: 9,
    top: 9,
  },
  back: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderLeftWidth: 1.7,
    borderBottomWidth: 1.7,
    left: 8,
    top: 7,
    transform: [{ rotate: '45deg' }],
  },
  receipt: {
    position: 'absolute',
    width: 16,
    height: 21,
    borderWidth: 1.5,
    borderRadius: 2,
    left: 4,
    top: 1,
  },
  rule: { position: 'absolute', left: 8, width: 8, height: 1.5 },
  clock: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderWidth: 1.5,
    borderRadius: 7,
    right: -2,
    bottom: -1,
    backgroundColor: colors.surface,
  },
  hand: {
    position: 'absolute',
    height: 4,
    width: 3,
    top: 2,
    left: 4,
    borderLeftWidth: 1,
    borderBottomWidth: 1,
  },
  plusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -3,
    backgroundColor: colors.surface,
    width: 11,
    height: 11,
    borderRadius: 6,
  },
  plusH: { position: 'absolute', top: 5, left: 1, width: 9, height: 1.5 },
  plusV: { position: 'absolute', top: 1, left: 5, width: 1.5, height: 9 },
});

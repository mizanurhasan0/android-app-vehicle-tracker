import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';
import { VehicleCard } from '../src/components/VehicleCard';

jest.mock('../src/components/ui', () => {
  const ReactModule = require('react');
  const Native = require('react-native');
  return {
    Card: ({ children }: React.PropsWithChildren) =>
      ReactModule.createElement(Native.View, null, children),
    Badge: ({ status }: { status: string }) =>
      ReactModule.createElement(Native.Text, null, status),
  };
});

let screen: TestRenderer.ReactTestRenderer;

beforeEach(() => {
  jest.useFakeTimers();
  jest
    .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
    .mockResolvedValue(false);
});

afterEach(async () => {
  await act(async () => screen?.unmount());
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function renderCard() {
  await act(async () => {
    screen = TestRenderer.create(
      <VehicleCard
        vehicle={{ id: '1', imei: '123', name: 'School bus', plate: 'BUS 01' }}
        busy={false}
        onOpenURL={jest.fn()}
      />,
    );
  });
  const measurement = screen.root
    .findAllByType(View)
    .find(view => view.props.onLayout)!;
  await act(async () =>
    measurement.props.onLayout({ nativeEvent: { layout: { height: 240 } } }),
  );
}

function panel() {
  return screen.root
    .findAllByType(Animated.View)
    .find(view => view.props.importantForAccessibility)!;
}

function height() {
  const value = StyleSheet.flatten(panel().props.style).height as {
    __getValue: () => number;
  };
  return value.__getValue();
}

async function toggle() {
  const button = screen.root.findAll(
    item =>
      item.props.onPress &&
      item.props.accessibilityHint === 'Show or hide vehicle details',
  )[0];
  await act(async () => button.props.onPress());
}

async function advance(milliseconds: number) {
  await act(async () => jest.advanceTimersByTime(milliseconds));
}

it('animates through intermediate heights when opening and closing', async () => {
  await renderCard();
  expect(height()).toBe(0);
  expect(panel().props.importantForAccessibility).toBe('no-hide-descendants');
  await toggle();
  expect(height()).toBe(0);
  await advance(150);
  expect(height()).toBeGreaterThan(0);
  expect(height()).toBeLessThan(240);
  await advance(200);
  expect(height()).toBe(240);
  await toggle();
  expect(panel().props.pointerEvents).toBe('none');
  await advance(150);
  expect(height()).toBeGreaterThan(0);
  expect(height()).toBeLessThan(240);
  await advance(200);
  expect(height()).toBe(0);
});

it('reverses an in-progress expansion without jumping to full height', async () => {
  await renderCard();
  await toggle();
  await advance(120);
  const partialHeight = height();
  await toggle();
  expect(height()).toBe(partialHeight);
  await advance(100);
  expect(height()).toBeLessThan(partialHeight);
  await advance(250);
  expect(height()).toBe(0);
});

it('opens and closes immediately when reduced motion is enabled', async () => {
  jest.mocked(AccessibilityInfo.isReduceMotionEnabled).mockResolvedValue(true);
  await renderCard();
  await toggle();
  expect(height()).toBe(240);
  await toggle();
  expect(height()).toBe(0);
});

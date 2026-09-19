import React from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { StyleSheet, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { AppIcon } from '../src/components/AppIcon';
import { Icon } from '../src/components/Icon';
import { ProfileMenuIcon } from '../src/components/ProfileMenuIcon';
import { RequestTabIcon } from '../src/components/RequestTabIcon';
import { TrackingIcon } from '../src/components/TrackingIcon';
import * as icons from '../src/components/icons';
import { colors } from '../src/theme';

// A runtime import of either Lucide barrel must fail, including indirect imports.
jest.mock('lucide-react-native', () => {
  throw new Error('Use public per-icon exports instead of the Lucide barrel');
});
jest.mock('lucide-react-native/icons', () => {
  throw new Error('The icons entry point is also a full Lucide barrel');
});

let screen: TestRenderer.ReactTestRenderer;

async function render(element: React.ReactElement) {
  await act(async () => {
    screen = TestRenderer.create(element);
  });
}

afterEach(async () => {
  await act(async () => screen?.unmount());
});

it('uses the same glyph modules as the installed barrel, including renamed aliases', () => {
  // Read source without executing the barrel or pulling it into application code.
  const barrel = readFileSync(
    join(__dirname, '../node_modules/lucide-react-native/dist/esm/lucide-react-native.mjs'),
    'utf8',
  );
  const registry = readFileSync(join(__dirname, '../src/components/icons.ts'), 'utf8');
  const exports = [...registry.matchAll(
    /export \{ default as (\w+) \} from 'lucide-react-native\/icons\/([^']+)'/g,
  )];
  expect(exports).toHaveLength(Object.keys(icons).length);
  for (const [, name, module] of exports) {
    const declaration = barrel.split('\n').find(line =>
      new RegExp(`default as ${name}(?:,| )`).test(line),
    );
    expect(declaration).toContain(`from './icons/${module}.mjs'`);
  }
});

it.each([
  ['student', 'GraduationCap'], ['students', 'GraduationCap'],
  ['driver', 'UserRound'], ['drivers', 'UserRound'],
  ['vehicle', 'Bus'], ['vehicles', 'Bus'], ['bus', 'Bus'],
  ['trip', 'Route'], ['route', 'Route'], ['routes', 'Route'],
  ['payment', 'Wallet'], ['payments', 'Wallet'], ['wallet', 'Wallet'],
  ['income', 'Wallet'], ['expense', 'Wallet'], ['investment', 'Wallet'],
  ['money', 'Wallet'], ['school', 'GraduationCap'], ['notice', 'Bell'],
  ['bell', 'Bell'], ['notification', 'Bell'], ['notifications', 'Bell'],
  ['request', 'FilePlus'], ['requests', 'FilePlus'], ['admission', 'FilePlus'],
  ['report', 'ReceiptText'], ['reports', 'ReceiptText'], ['receipt', 'ReceiptText'],
  ['document', 'FileText'], ['bills', 'ReceiptText'], ['due', 'Clock3'],
  ['user', 'UserRound'], ['profile', 'UserRound'], ['lock', 'LockKeyhole'],
  ['eye', 'Eye'], ['back', 'ArrowLeft'], ['attendance', 'CalendarDays'],
  ['calendar', 'CalendarDays'], ['history', 'Clock3'], ['clock', 'Clock3'],
  ['maintenance', 'Wrench'], ['fuel', 'Wallet'], ['odometer', 'Gauge'],
  ['duration', 'Clock3'], ['mobile', 'Smartphone'], ['address', 'House'],
  ['emergency', 'CircleAlert'], ['dropoff', 'Flag'], ['location', 'MapPin'],
  ['pin', 'MapPin'], ['phone', 'Phone'], ['call', 'Phone'], ['contact', 'Phone'],
  ['communication', 'Phone'], ['whatsapp', 'Phone'], ['sms', 'Mail'],
  ['mail', 'Mail'], ['settings', 'Settings'], ['more', 'Menu'], ['menu', 'Menu'],
  ['plus', 'Plus'], ['add', 'Plus'], ['minus', 'Minus'], ['close', 'X'],
  ['check', 'Check'], ['info', 'Info'], ['search', 'Search'], ['edit', 'Pencil'],
  ['chevron', 'ChevronRight'], ['chevronLeft', 'ChevronLeft'],
  ['download', 'Download'], ['logout', 'LogOut'], ['shield', 'ShieldCheck'],
  ['home', 'House'], ['fit', 'Maximize2'], ['locate', 'LocateFixed'],
  ['unknown', 'CircleHelp'], ['business', 'CircleHelp'],
  ['complaints', 'CircleHelp'], ['stop', 'CircleHelp'],
] as const)('preserves the %s glyph and default props', async (name, glyph) => {
  await render(<Icon name={name} />);
  expect(screen.root.findByType(icons[glyph]).props).toEqual({
    size: 24, color: colors.primary, strokeWidth: 1.8,
  });
});

it('preserves custom dimensions, stroke and decorative accessibility', async () => {
  await render(<Icon name="vehicles" size={31} color="#123456" strokeWidth={2.7} />);
  expect(screen.root.findByType(icons.Bus).props).toEqual({
    size: 31, color: '#123456', strokeWidth: 2.7,
  });
  const wrapper = screen.root.findByType(View);
  expect(wrapper.props.accessible).toBe(false);
  expect(wrapper.props.importantForAccessibility).toBe('no-hide-descendants');
  expect(StyleSheet.flatten(wrapper.props.style)).toMatchObject({ width: 31, height: 31 });
});

it('preserves the create-vehicle composite glyph and badge dimensions', async () => {
  await render(<AppIcon kind="createVehicle" size={30} color="#123456" />);
  expect(screen.root.findByType(icons.Bus).props).toEqual({
    size: 30, color: '#123456', strokeWidth: 1.8,
  });
  expect(screen.root.findByType(icons.Plus).props).toEqual({
    size: 30 * 0.42, color: '#123456', strokeWidth: 2.4,
  });
  const [wrapper, badge] = screen.root.findAllByType(View);
  expect(wrapper.props.accessible).toBe(false);
  expect(wrapper.props.importantForAccessibility).toBe('no-hide-descendants');
  expect(StyleSheet.flatten(badge.props.style)).toMatchObject({
    width: 12, height: 12, right: -3, bottom: -2, backgroundColor: colors.surface,
  });
});

it.each(['complaints', 'stop'] as const)('preserves the AppIcon %s fallback', async kind => {
  await render(<AppIcon kind={kind} />);
  expect(screen.root.findByType(icons.CircleHelp).props).toEqual({
    size: 26, color: colors.primary, strokeWidth: 1.8,
  });
});

it.each([
  ['edit', 'Pencil'], ['language', 'Globe'], ['logout', 'LogOut'], ['close', 'X'],
] as const)('preserves the profile %s glyph', async (kind, glyph) => {
  await render(<ProfileMenuIcon kind={kind} color="#123456" />);
  expect(screen.root.findByType(icons[glyph]).props).toEqual({
    size: 24, color: '#123456', strokeWidth: 1.8,
  });
});

it.each([
  ['form', 'FilePlus'], ['applications', 'FileText'],
  ['complaints', 'MessageCircle'], ['stop', 'CircleStop'],
] as const)('preserves the request %s glyph and selection colors', async (kind, glyph) => {
  await render(<RequestTabIcon kind={kind} selected={false} />);
  expect(screen.root.findByType(icons[glyph]).props).toEqual({
    size: 20, color: colors.primary, strokeWidth: 1.8,
  });
  await act(async () => screen.update(<RequestTabIcon kind={kind} selected />));
  expect(screen.root.findByType(icons[glyph]).props.color).toBe(colors.surface);
  await act(async () => screen.update(<RequestTabIcon kind={kind} selected color="#123456" />));
  expect(screen.root.findByType(icons[glyph]).props.color).toBe('#123456');
});

it.each([
  ['target', 'Target'], ['layers', 'Layers'], ['traffic', 'Bus'], ['play', 'Play'],
  ['compass', 'Compass'], ['share', 'Share2'], ['lock', 'LockKeyhole'],
  ['route', 'Route'], ['engine', 'Wrench'], ['speed', 'Gauge'],
] as const)('preserves the tracking %s glyph and sizes', async (name, glyph) => {
  await render(<TrackingIcon name={name} />);
  expect(screen.root.findByType(icons[glyph]).props).toEqual({
    size: 24, color: '#006B47', strokeWidth: 1.8,
  });
  await act(async () => screen.update(<TrackingIcon name={name} size={32} color="#123456" />));
  expect(screen.root.findByType(icons[glyph]).props).toEqual({
    size: 32, color: '#123456', strokeWidth: 1.8,
  });
});

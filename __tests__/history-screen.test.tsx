import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { VehicleHistoryScreen } from '../src/screens/VehicleHistoryScreen';
import { Button, Select } from '../src/components/ui';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParams } from '../src/navigation/types';
jest.mock('@react-navigation/native', () => ({ useFocusEffect: jest.fn() }));
let mockRole = 'ADMIN';
const mockRetry = jest.fn();
const mockHistory = {
  loading: false,
  error: '',
  retry: mockRetry,
  summary: {
    days: [
      { date: '2026-09-04', distanceMeters: 1500, pointCount: 2, gapCount: 1 },
    ],
  },
  route: {
    segments: [],
    pointCount: 0,
    freshness: { complete: false, pendingPoints: 3 },
  },
};
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ session: { user: { role: mockRole } } }),
}));
jest.mock('../src/hooks/useVehicleHistory', () => ({
  useVehicleHistory: () => mockHistory,
}));
jest.mock('../src/components/HistoryMap', () => ({ HistoryMap: 'HistoryMap' }));
jest.mock('@react-native-picker/picker', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  const Picker = (props: object) => ReactModule.createElement(View, props);
  Picker.Item = (props: object) => ReactModule.createElement(View, props);
  return { Picker };
});
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));
const props = {
  route: { params: { imei: '123', name: 'School bus' } },
  navigation: { goBack: jest.fn() },
} as unknown as NativeStackScreenProps<HomeStackParams, 'VehicleHistory'>;
it('shows delayed empty history and drills from month into a selected day', async () => {
  mockRole = 'ADMIN';
  let screen!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    screen = TestRenderer.create(<VehicleHistoryScreen {...props} />);
  });
  expect(JSON.stringify(screen.toJSON())).toContain('3 positions are waiting');
  expect(JSON.stringify(screen.toJSON())).toContain('No recorded positions');
  await act(async () => screen.root.findByType(Select).props.onChange('month'));
  await act(async () =>
    screen.root
      .findAllByType(Button)
      .find(button => button.props.title === 'View 2026-09-04 route')!
      .props.onPress(),
  );
  expect(screen.root.findByType(Select).props.value).toBe('day');
  expect(JSON.stringify(screen.toJSON())).toContain('2026-09-04 — 2026-09-04');
  await act(async () => screen.unmount());
});
it('guards the history screen from a guardian session', async () => {
  mockRole = 'GUARDIAN';
  let screen!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    screen = TestRenderer.create(<VehicleHistoryScreen {...props} />);
  });
  expect(screen.root.findAllByType(Select)).toHaveLength(0);
  expect(JSON.stringify(screen.toJSON())).toContain('administrators only');
  await act(async () => screen.unmount());
});

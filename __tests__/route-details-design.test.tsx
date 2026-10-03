import React from 'react';
import { Text, View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { RouteDetailsScreen } from '../src/screens/fleet/RouteDetailsScreen';
import { Select, Field } from '../src/components/ui';
import { ToastHost } from '../src/components/Toast';
import { i18n } from '../src/i18n';
import { RouteScheduleOverview } from '../src/screens/fleet/RouteScheduleTop';

jest.mock('react-native-webview', () => ({ WebView: 'WebView' }));
jest.mock('../src/hooks/useDhakaDate', () => ({
  useDhakaDate: () => '2026-10-03',
}));

let mockRole = 'ADMIN';
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockMutate = jest.fn().mockResolvedValue({});
const mockManagementMutate = jest.fn().mockResolvedValue({});
const mockRefresh = jest.fn().mockResolvedValue(undefined);

const mockData = {
  vehicles: [
    {
      id: 'vehicle-1',
      name: 'Van 01',
      driverName: 'Hasan',
      status: 'RUNNING',
    },
  ],
  routes: [
    {
      id: 'route-1',
      name: 'Dhaka to Tangail',
      vehicleId: 'vehicle-1',
      vehicleName: 'Van 01',
      monthlyAmount: 400000,
      stops: [
        {
          id: 'stop-1',
          name: 'Dhaka',
          pickupPoint: {
            latitude: 23.8103,
            longitude: 90.4125,
            enterRadiusMeters: 100,
            exitRadiusMeters: 150,
          },
        },
        { id: 'stop-2', name: 'Gazipur' },
        { id: 'stop-3', name: 'Tangail' },
      ],
    },
  ],
};
const mockExtra = {
  settings: {
    operatingDays: [0, 1, 2, 3, 4, 5, 6],
    transportShifts: [
      { id: 'MORNING', name: 'Morning', startTime: '07:00', endTime: '11:00' },
      { id: 'DAY', name: 'Day', startTime: '11:00', endTime: '15:00' },
    ],
  },
  students: [
    {
      id: 'student-morning',
      studentId: 'child-1',
      routeId: 'route-1',
      vehicleId: 'vehicle-1',
      studentName: 'Morning child',
      stopName: 'Dhaka',
      shiftId: 'MORNING',
      status: 'ACTIVE',
      operatingDays: [6],
    },
    {
      id: 'student-day',
      studentId: 'child-2',
      routeId: 'route-1',
      vehicleId: 'vehicle-1',
      studentName: 'Day child',
      stopName: 'Gazipur',
      shiftId: 'DAY',
      status: 'ACTIVE',
      operatingDays: [6],
    },
    {
      id: 'student-away',
      studentId: 'child-3',
      routeId: 'route-1',
      vehicleId: 'vehicle-1',
      studentName: 'Other day child',
      stopName: 'Dhaka',
      shiftId: 'MORNING',
      status: 'ACTIVE',
      operatingDays: [0],
    },
    {
      id: 'student-inactive',
      studentId: 'child-4',
      routeId: 'route-1',
      vehicleId: 'vehicle-1',
      studentName: 'Inactive child',
      stopName: 'Dhaka',
      shiftId: 'MORNING',
      status: 'INACTIVE',
      operatingDays: [6],
    },
  ],
  schedules: [
    {
      id: 'schedule-am',
      routeId: 'route-1',
      stopId: 'stop-1',
      studentId: null,
      label: 'Morning pickup',
      time: '07:30',
      period: 'MORNING',
      position: 0,
    },
    {
      id: 'schedule-pm',
      routeId: 'route-1',
      stopId: 'stop-3',
      studentId: null,
      label: 'Afternoon return',
      time: '15:30',
      period: 'AFTERNOON',
      position: 0,
    },
  ],
};

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ session: { user: { role: mockRole } } }),
}));
jest.mock('../src/context/DataContext', () => {
  const useData = () => ({
    data: mockData,
    loading: false,
    error: '',
    refresh: mockRefresh,
    mutate: mockMutate,
  });
  return { useData, useCoreData: useData, useDataActions: useData };
});
jest.mock('../src/context/ManagementContext', () => ({
  useManagement: () => ({
    data: mockExtra,
    loading: false,
    error: '',
    refresh: mockRefresh,
    mutate: mockManagementMutate,
  }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-picker/picker', () => {
  const ReactModule = require('react');
  const { View: NativeView } = require('react-native');
  const Picker = (props: object) =>
    ReactModule.createElement(NativeView, props);
  Picker.Item = Picker;
  return { Picker };
});

let screen: TestRenderer.ReactTestRenderer;
const navigation = { navigate: mockNavigate, goBack: mockGoBack } as never;
const route = { params: { id: 'route-1' } } as never;

beforeEach(async () => {
  mockRole = 'ADMIN';
  jest.clearAllMocks();
  await i18n.changeLanguage('en');
});
afterEach(async () => {
  await act(async () => screen?.unmount());
});

async function renderRoute() {
  await act(async () => {
    screen = TestRenderer.create(
      <View>
        <RouteDetailsScreen navigation={navigation} route={route} />
        <ToastHost />
      </View>,
    );
  });
}

function hasText(value: string) {
  return screen.root
    .findAllByType(Text)
    .some(node => node.props.children === value);
}

async function pressText(value: string, role: 'button' | 'tab' = 'button') {
  const target = screen.root.findAll(
    node =>
      node.props.accessibilityRole === role &&
      typeof node.props.onPress === 'function' &&
      node.findAllByType(Text).some(text => text.props.children === value),
    { deep: false },
  )[0];
  expect(target).toBeDefined();
  await act(async () => target.props.onPress());
}

async function pressLabel(value: string) {
  const target = screen.root.findAll(
    node =>
      node.props.accessibilityRole === 'button' &&
      node.props.accessibilityLabel === value &&
      typeof node.props.onPress === 'function',
    { deep: false },
  )[0];
  expect(target).toBeDefined();
  await act(async () => target!.props.onPress());
}

it('filters today’s active passengers by the selected configured transport shift', async () => {
  await renderRoute();
  const shift = screen.root
    .findAllByType(Select)
    .find(node => node.props.label === 'Transport shift')!;
  expect(shift.props.value).toBe('MORNING');
  expect(hasText('Morning child')).toBe(true);
  expect(hasText('Day child')).toBe(false);
  expect(hasText('Other day child')).toBe(false);
  expect(hasText('Inactive child')).toBe(false);

  await act(async () => shift.props.onChange('DAY'));
  expect(hasText('Morning child')).toBe(false);
  expect(hasText('Day child')).toBe(true);

  await act(async () => shift.props.onChange(''));
  expect(hasText('Morning child')).toBe(true);
  expect(hasText('Day child')).toBe(true);
  expect(hasText('Other day child')).toBe(false);
});

it('keeps both map actions connected to live tracking for this route’s vehicle', async () => {
  await renderRoute();
  await pressLabel('View on live map');
  expect(mockNavigate).toHaveBeenLastCalledWith('LiveTracking', {
    vehicleId: 'vehicle-1',
  });
  await pressText('View on live map');
  expect(mockNavigate).toHaveBeenCalledTimes(2);
  expect(mockNavigate).toHaveBeenLastCalledWith('LiveTracking', {
    vehicleId: 'vehicle-1',
  });
});

it('shows route administration shortcuts and opens the existing pickup and alert editors', async () => {
  await renderRoute();
  expect(hasText('Pickup points')).toBe(true);
  expect(hasText('Configured')).toBe(true);
  expect(hasText('Not set')).toBe(true);
  expect(hasText('Set location')).toBe(false);

  await pressText('Pickup points');
  expect(hasText('Set location')).toBe(true);
  await pressText('Alert settings');
  expect(
    screen.root
      .findAllByType(Field)
      .some(node => node.props.label === 'Alert starts within (m)'),
  ).toBe(true);
});

it('switches pickup and return rows and opens the real schedule editor from a row action', async () => {
  await renderRoute();
  expect(hasText('Morning pickup')).toBe(true);
  expect(hasText('Afternoon return')).toBe(false);
  await pressText('Return schedule', 'tab');
  expect(hasText('Morning pickup')).toBe(false);
  expect(hasText('Afternoon return')).toBe(true);
  await pressLabel('Edit schedule: Afternoon return');
  expect(
    screen.root
      .findAllByType(Field)
      .some(node => node.props.label === 'Stop 1'),
  ).toBe(true);
  expect(mockManagementMutate).not.toHaveBeenCalled();
});

it('shows the application action but hides route administration for a guardian', async () => {
  mockRole = 'GUARDIAN';
  await renderRoute();
  expect(screen.root.findByType(RouteScheduleOverview).props.editable).toBe(
    false,
  );
  expect(hasText('Pickup points')).toBe(true);
  expect(hasText('Change locations')).toBe(false);
  expect(hasText('Alert settings')).toBe(false);
  expect(hasText('Set location')).toBe(false);
  expect(hasText('View monthly fees')).toBe(true);
  expect(hasText('Edit schedule')).toBe(false);
  await pressText('Apply for this route');
  expect(mockNavigate).toHaveBeenLastCalledWith('Admission');
  expect(mockManagementMutate).not.toHaveBeenCalled();
});

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { AccessibilityInfo, Animated, StyleSheet } from 'react-native';
import { DashboardData } from '../src/api/types';
import { Button, Field, Notice, Select } from '../src/components/ui';
import { SetupScreen } from '../src/screens/SetupScreen';

const mockMutate = jest.fn();
let mockData: DashboardData;

jest.mock('../src/components/LanguageSwitcher', () => ({
  LanguageSwitcher: () => null,
}));
jest.mock('../src/context/DataContext', () => ({
  useData: () => ({
    data: mockData,
    loading: false,
    error: '',
    refresh: jest.fn(),
    mutate: mockMutate,
  }),
}));
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

let screen: TestRenderer.ReactTestRenderer;
type Panel = 'payments' | 'vehicles' | 'routes';

beforeEach(() => {
  mockMutate.mockReset().mockResolvedValue({});
  mockData = {
    accounts: [
      { method: 'BKASH', number: '01700000001', instructions: 'Send Money' },
    ],
    vehicles: [],
    locations: [],
    routes: [],
    subscriptions: [],
    bills: [],
    payments: [],
    requests: [],
    complaints: [],
    stops: [],
    notifications: [],
  };
});

afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
  jest.restoreAllMocks();
});

async function renderScreen() {
  await act(async () => {
    screen = TestRenderer.create(<SetupScreen />);
  });
}

function panel(name: Panel) {
  return screen.root.findByProps({ testID: `setup-panel-${name}` });
}

function tab(label: string) {
  return screen.root.findAll(
    node =>
      node.props.accessibilityRole === 'tab' &&
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === 'function',
    { deep: false },
  )[0];
}

async function selectTab(label: string) {
  await act(async () => tab(label).props.onPress());
}

async function selectWallet(label: string) {
  await act(async () => {
    panel('payments')
      .findAll(
        node =>
          node.props.accessibilityRole === 'radio' &&
          node.props.accessibilityLabel === label &&
          typeof node.props.onPress === 'function',
        { deep: false },
      )[0]
      .props.onPress();
  });
}

function field(name: Panel, label: string) {
  return panel(name)
    .findAllByType(Field)
    .find(node => node.props.label === label)!;
}

async function fill(name: Panel, values: Record<string, string>) {
  await act(async () => {
    Object.entries(values).forEach(([label, value]) => {
      field(name, label).props.onChangeText(value);
    });
  });
}

async function press(name: Panel, title: string) {
  await act(async () => {
    panel(name)
      .findAllByType(Button)
      .find(node => node.props.title === title)!
      .props.onPress();
  });
}

it('shows one accessible setup panel at a time and preserves unfinished fields between tabs', async () => {
  await renderScreen();
  expect(tab('Payment accounts').props.accessibilityState.selected).toBe(true);
  expect(StyleSheet.flatten(panel('payments').props.style)?.display).not.toBe(
    'none',
  );
  for (const name of ['vehicles', 'routes'] as const) {
    expect(StyleSheet.flatten(panel(name).props.style).display).toBe('none');
    expect(panel(name).props.accessibilityElementsHidden).toBe(true);
    expect(panel(name).props.importantForAccessibility).toBe(
      'no-hide-descendants',
    );
  }
  await fill('payments', { 'Payment instructions': 'Draft account details' });
  await selectTab('Vehicles');
  await fill('vehicles', { 'Vehicle name': 'Morning bus' });
  expect(tab('Vehicles').props.accessibilityState.selected).toBe(true);
  expect(panel('vehicles').props.accessibilityElementsHidden).toBe(false);
  expect(StyleSheet.flatten(panel('payments').props.style).display).toBe(
    'none',
  );
  await selectTab('Payment accounts');
  expect(field('payments', 'Payment instructions').props.value).toBe(
    'Draft account details',
  );
  await selectTab('Vehicles');
  expect(field('vehicles', 'Vehicle name').props.value).toBe('Morning bus');
  expect(mockMutate).not.toHaveBeenCalled();
});

it('respects reduced motion when opening and switching setup tabs', async () => {
  jest
    .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
    .mockResolvedValue(true);
  const timing = jest.spyOn(Animated, 'timing');
  await renderScreen();
  await selectTab('Vehicles');
  await selectTab('Routes');
  expect(timing).not.toHaveBeenCalled();
  expect(tab('Routes').props.accessibilityState.selected).toBe(true);
  expect(panel('routes').props.accessibilityElementsHidden).toBe(false);
});

it('validates payment details and saves the chosen receiving account', async () => {
  await renderScreen();
  await selectWallet('Rocket');
  await fill('payments', {
    'Receiving account number': '123',
    'Payment instructions': 'Send Money to the school office',
  });
  await press('payments', 'Save payment number');
  expect(mockMutate).not.toHaveBeenCalled();
  expect(
    panel('payments')
      .findAllByType(Notice)
      .some(node => node.props.kind === 'error' && !!node.props.text),
  ).toBe(true);
  await fill('payments', { 'Receiving account number': '017000000022' });
  await press('payments', 'Save payment number');
  expect(mockMutate).toHaveBeenCalledWith(
    '/admin/payment-accounts/ROCKET',
    {
      number: '017000000022',
      instructions: 'Send Money to the school office',
    },
    'PUT',
  );
});

it('preserves separate wallet drafts while switching payment methods', async () => {
  await renderScreen();
  await fill('payments', {
    'Payment instructions': 'Draft bKash instructions',
  });
  await selectWallet('Rocket');
  await fill('payments', {
    'Receiving account number': '017000000022',
    'Payment instructions': 'Draft Rocket instructions',
  });
  await selectWallet('bKash');
  expect(field('payments', 'Receiving account number').props.value).toBe(
    '01700000001',
  );
  expect(field('payments', 'Payment instructions').props.value).toBe(
    'Draft bKash instructions',
  );
  await selectWallet('Rocket');
  expect(field('payments', 'Receiving account number').props.value).toBe(
    '017000000022',
  );
  expect(field('payments', 'Payment instructions').props.value).toBe(
    'Draft Rocket instructions',
  );
});

it('loads refreshed account details without overwriting an edited wallet', async () => {
  mockData.accounts = [];
  await renderScreen();
  expect(field('payments', 'Receiving account number').props.value).toBe('');
  await act(async () => {
    mockData.accounts = [
      { method: 'BKASH', number: '01700000001', instructions: 'Send Money' },
    ];
    screen.update(<SetupScreen />);
  });
  expect(field('payments', 'Receiving account number').props.value).toBe(
    '01700000001',
  );
  await fill('payments', { 'Receiving account number': '01700000008' });
  await act(async () => {
    mockData.accounts = [{ ...mockData.accounts[0], number: '01700000009' }];
    screen.update(<SetupScreen />);
  });
  expect(field('payments', 'Receiving account number').props.value).toBe(
    '01700000008',
  );
});

it('adds a vehicle with its driver details and clears the form after saving', async () => {
  await renderScreen();
  await selectTab('Vehicles');
  await fill('vehicles', {
    'Vehicle name': '  Morning bus  ',
    'Registration plate': '  DHAKA-123  ',
    'GPS device IMEI': '123456789012345',
    'Driver name (optional)': 'Karim',
    'Driver phone (optional)': '01700000003',
  });
  await press('vehicles', 'Add vehicle');
  expect(mockMutate).toHaveBeenCalledWith('/vehicles', {
    name: 'Morning bus',
    plate: 'DHAKA-123',
    imei: '123456789012345',
    driverName: 'Karim',
    driverPhone: '01700000003',
  });
  expect(
    panel('vehicles')
      .findAllByType(Field)
      .map(node => node.props.value),
  ).toEqual(['', '', '', '', '']);
});

it('keeps entered vehicle details when saving fails', async () => {
  mockMutate.mockRejectedValueOnce(new Error('Connection unavailable'));
  await renderScreen();
  await selectTab('Vehicles');
  await fill('vehicles', {
    'Vehicle name': 'Morning bus',
    'Registration plate': 'DHAKA-123',
    'GPS device IMEI': '123456789012345',
  });
  await press('vehicles', 'Add vehicle');
  expect(field('vehicles', 'Vehicle name').props.value).toBe('Morning bus');
  expect(field('vehicles', 'GPS device IMEI').props.value).toBe(
    '123456789012345',
  );
  expect(
    panel('vehicles')
      .findAllByType(Notice)
      .some(node => node.props.text === 'Connection unavailable'),
  ).toBe(true);
});

it('guides route setup to the vehicles tab when no vehicle is available', async () => {
  await renderScreen();
  await selectTab('Routes');
  await press('routes', 'Add vehicle');
  expect(tab('Vehicles').props.accessibilityState.selected).toBe(true);
  expect(panel('vehicles').props.accessibilityElementsHidden).toBe(false);
  expect(mockMutate).not.toHaveBeenCalled();
});

it('creates a route with a fee in poisha and trimmed nonempty pickup stops', async () => {
  mockData.vehicles = [
    {
      id: 'bus-1',
      name: 'Morning bus',
      plate: 'DHAKA-123',
      imei: '123456789012345',
    },
  ];
  await renderScreen();
  await selectTab('Routes');
  await fill('routes', {
    'Route / road name': '  Central road  ',
    'Monthly fee (৳)': '1250.50',
    'Pickup stops — one per line':
      '  Main gate  \n\n Central road\n School entrance  ',
  });
  await act(async () => {
    panel('routes')
      .findAllByType(Select)
      .find(node => node.props.label === 'Assigned vehicle')!
      .props.onChange('bus-1');
  });
  await press('routes', 'Create route');
  expect(mockMutate).toHaveBeenCalledWith('/admin/routes', {
    name: 'Central road',
    vehicleId: 'bus-1',
    monthlyAmount: 125050,
    stops: ['Main gate', 'Central road', 'School entrance'],
  });
  expect(field('routes', 'Route / road name').props.value).toBe('');
  expect(field('routes', 'Monthly fee (৳)').props.value).toBe('');
});

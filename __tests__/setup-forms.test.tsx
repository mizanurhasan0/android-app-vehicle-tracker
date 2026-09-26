import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { DashboardData } from '../src/api/types';
import { Button, Empty, Field, Notice, Select } from '../src/components/ui';
import {
  AccountForm,
  VehicleForm,
  RouteForm,
} from '../src/components/setup/SetupForms';

const mockMutate = jest.fn();
const mockAddVehicle = jest.fn();
let mockData: DashboardData;

jest.mock('../src/context/DataContext', () => {
  const useData = () => ({
    data: mockData,
    loading: false,
    error: '',
    refresh: jest.fn(),
    mutate: mockMutate,
  });
  return { useData, useCoreData: useData, useDataActions: useData };
});
jest.mock('@react-native-picker/picker', () => {
  const ReactModule = require('react');
  const { View: NativeView } = require('react-native');
  const Picker = (props: object) =>
    ReactModule.createElement(NativeView, props);
  Picker.Item = (props: object) => ReactModule.createElement(NativeView, props);
  return { Picker };
});
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

let screen: TestRenderer.ReactTestRenderer;
type Panel = 'payments' | 'vehicles' | 'routes';
const forms = {
  payments: AccountForm,
  vehicles: VehicleForm,
  routes: RouteForm,
};

beforeEach(() => {
  mockMutate.mockReset().mockResolvedValue({});
  mockAddVehicle.mockReset();
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

async function renderForm(name: Panel = 'payments') {
  await act(async () => {
    screen = TestRenderer.create(
      name === 'payments' ? (
        <AccountForm />
      ) : name === 'vehicles' ? (
        <VehicleForm />
      ) : (
        <RouteForm onAddVehicle={mockAddVehicle} />
      ),
    );
  });
}

function panel(name: Panel) {
  return screen.root.findByType(forms[name]);
}

async function selectWallet(value: string) {
  await act(async () =>
    panel('payments').findByType(Select).props.onChange(value),
  );
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

it('loads a saved payment account selected by the admin', async () => {
  await renderForm();
  await selectWallet('BKASH');
  expect(field('payments', 'Payment method name').props.value).toBe('bKash');
  expect(field('payments', 'Receiving account number').props.value).toBe(
    '01700000001',
  );
  expect(mockMutate).not.toHaveBeenCalled();
});

it('requires a name and number, and saves any provider with an optional QR image', async () => {
  await renderForm();
  await press('payments', 'Save payment method');
  expect(mockMutate).not.toHaveBeenCalled();
  expect(field('payments', 'Payment method name').props.error).toBeTruthy();
  expect(
    field('payments', 'Receiving account number').props.error,
  ).toBeTruthy();
  await fill('payments', {
    'Payment method name': 'School Bank',
    'Receiving account number': 'AC-1234567890123456',
  });
  const { PaymentImage } = require('../src/components/PaymentImage');
  await act(async () =>
    panel('payments')
      .findByType(PaymentImage)
      .props.onChange('data:image/png;base64,AAAA'),
  );
  await press('payments', 'Save payment method');
  expect(mockMutate).toHaveBeenCalledWith(
    expect.stringMatching(/^\/admin\/payment-accounts\/PAY_/),
    {
      name: 'School Bank',
      number: 'AC-1234567890123456',
      instructions: '',
      imageUrl: 'data:image/png;base64,AAAA',
    },
    'PUT',
  );
});

it('preserves separate saved-account and new-account drafts', async () => {
  await renderForm();
  await selectWallet('BKASH');
  await fill('payments', {
    'Payment instructions': 'Draft bKash instructions',
  });
  await selectWallet('');
  await fill('payments', {
    'Payment method name': 'Nagad',
    'Receiving account number': '017000000022',
  });
  await selectWallet('BKASH');
  expect(field('payments', 'Payment instructions').props.value).toBe(
    'Draft bKash instructions',
  );
  await selectWallet('');
  expect(field('payments', 'Payment method name').props.value).toBe('Nagad');
  expect(field('payments', 'Receiving account number').props.value).toBe(
    '017000000022',
  );
});

it('loads refreshed details without overwriting edited accounts', async () => {
  await renderForm();
  await selectWallet('BKASH');
  await act(async () => {
    mockData.accounts = [{ ...mockData.accounts[0], number: '01700000009' }];
    screen.update(<AccountForm />);
  });
  expect(field('payments', 'Receiving account number').props.value).toBe(
    '01700000009',
  );
  await fill('payments', { 'Receiving account number': '01700000008' });
  await act(async () => {
    mockData.accounts = [{ ...mockData.accounts[0], number: '01700000007' }];
    screen.update(<AccountForm />);
  });
  expect(field('payments', 'Receiving account number').props.value).toBe(
    '01700000008',
  );
});

it('starts with empty vehicle fields and validates required details before saving', async () => {
  await renderForm('vehicles');
  expect(
    panel('vehicles')
      .findAllByType(Field)
      .map(node => node.props.value),
  ).toEqual(['', '', '', '', '']);
  await press('vehicles', 'Add vehicle');
  expect(mockMutate).not.toHaveBeenCalled();
  for (const label of [
    'Vehicle name',
    'Registration plate',
    'GPS device IMEI',
  ]) {
    expect(field('vehicles', label).props.error).toBeTruthy();
  }
  await fill('vehicles', {
    'Vehicle name': 'Morning bus',
    'Registration plate': 'DHAKA-123',
    'GPS device IMEI': '123',
  });
  await press('vehicles', 'Add vehicle');
  expect(mockMutate).not.toHaveBeenCalled();
  expect(field('vehicles', 'GPS device IMEI').props.error).toBeTruthy();
});

it('adds a vehicle with its driver details and clears the form after saving', async () => {
  await renderForm('vehicles');
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
  await renderForm('vehicles');
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

it('invokes the route addVehicle callback when no vehicle is available', async () => {
  await renderForm('routes');
  expect(panel('routes').findByType(Empty).props.title).toBe(
    'Add a vehicle first',
  );
  await press('routes', 'Add vehicle');
  expect(mockAddVehicle).toHaveBeenCalledTimes(1);
  expect(mockMutate).not.toHaveBeenCalled();
});

it('validates an empty route and rejects duplicate start points', async () => {
  mockData.vehicles = [
    {
      id: 'bus-1',
      name: 'Morning bus',
      plate: 'DHAKA-123',
      imei: '123456789012345',
    },
  ];
  await renderForm('routes');
  const vehicle = panel('routes').findByType(Select);
  expect(vehicle.props.value).toBe('');
  expect(vehicle.props.options).toEqual([
    { value: 'bus-1', label: 'Morning bus · DHAKA-123' },
  ]);
  await press('routes', 'Create route');
  expect(mockMutate).not.toHaveBeenCalled();
  expect(vehicle.props.error).toBeTruthy();
  for (const label of [
    'Route / road name',
    'Monthly fee (৳)',
    'Start points — one per line',
  ]) {
    expect(field('routes', label).props.error).toBeTruthy();
  }
  await fill('routes', {
    'Route / road name': 'Central road',
    'Monthly fee (৳)': '1250.50',
    'Start points — one per line': 'Main gate\nMain gate',
  });
  await act(async () => vehicle.props.onChange('bus-1'));
  await press('routes', 'Create route');
  expect(mockMutate).not.toHaveBeenCalled();
  expect(field('routes', 'Start points — one per line').props.error).toBe(
    'Use different stop names, with no more than 50 stops.',
  );
});

it('creates a route with a fee in poisha and trimmed nonempty start points', async () => {
  mockData.vehicles = [
    {
      id: 'bus-1',
      name: 'Morning bus',
      plate: 'DHAKA-123',
      imei: '123456789012345',
    },
  ];
  await renderForm('routes');
  await fill('routes', {
    'Route / road name': '  Central road  ',
    'Monthly fee (৳)': '1250.50',
    'Start points — one per line':
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

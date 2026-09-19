import React from 'react';
import { ToastHost } from '../src/components/Toast';
import { View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { Alert, Linking, Text, TextInput } from 'react-native';
import { i18n } from '../src/i18n';
import { LanguageContext } from '../src/i18n/LanguageContext';
import { Button, Select } from '../src/components/ui';
import { NoorBrand, NoorRow } from '../src/components/Noor';
import {
  NoorVehiclesScreen,
  VehicleDetailsScreen,
  NoorRoutesScreen,
  RouteDetailsScreen,
} from '../src/screens/fleet';
import {
  NoorMenuScreen,
  WelcomeScreen,
  EmergencyScreen,
} from '../src/screens/NoorMenuScreen';

let mockRole = 'ADMIN';
const mockNavigate = jest.fn();
const mockMutate = jest.fn().mockResolvedValue({});
const mockManagementMutate = jest.fn().mockResolvedValue({});
const mockSignOut = jest.fn().mockResolvedValue(undefined);
const mockData = {
  vehicles: [
    {
      id: 'v-123',
      name: 'Morning',
      plate: 'ঢাকা-১২৩',
      imei: '868720065798377',
      driverName: 'Driver',
      model: 'Model',
      status: 'RUNNING',
      purchaseDate: '2026-09-10',
      fitnessExpiresAt: '2027-01-31',
      licenseExpiresAt: '2027-02-01',
    },
  ],
  routes: [
    {
      id: 'r-123',
      name: 'Route',
      vehicleId: 'v-123',
      vehicleName: 'Morning',
      monthlyAmount: 250000,
      stops: [{ id: 'stop-123', name: 'School gate' }],
    },
  ],
};
const mockExtra = {
  settings: { emergencyPhone: '+880 1712-345678' },
  students: [
    {
      id: 's-123',
      routeId: 'r-123',
      vehicleId: 'v-123',
      status: 'ACTIVE',
      driverPhone: '01712345679',
    },
  ],
  schedules: [
    {
      id: 'am',
      routeId: 'r-123',
      stopId: 'stop-123',
      studentId: null,
      label: 'Morning',
      time: '07:30',
      period: 'MORNING',
      position: 0,
    },
    {
      id: 'pm',
      routeId: 'r-123',
      stopId: 'stop-123',
      studentId: null,
      label: 'Afternoon',
      time: '14:30',
      period: 'AFTERNOON',
      position: 1,
    },
  ],
};

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { role: mockRole } },
    signOut: mockSignOut,
  }),
}));
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
jest.mock('../src/context/ManagementContext', () => ({
  useManagement: () => ({
    data: mockExtra,
    loading: false,
    error: '',
    refresh: jest.fn(),
    mutate: mockManagementMutate,
  }),
}));
jest.mock('../src/components/VehicleEditSheet', () => ({
  VehicleEditSheet: () => null,
}));
jest.mock('../src/components/setup/SetupForms', () => ({
  RouteForm: () => null,
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
const navigation = { navigate: mockNavigate } as never;
const vehicleRoute = { params: { id: 'v-123' } } as never;
const routeRoute = { params: { id: 'r-123' } } as never;
const originalData = JSON.stringify({ mockData, mockExtra });
beforeEach(async () => {
  mockRole = 'ADMIN';
  jest.clearAllMocks();
  await i18n.changeLanguage('en');
});
afterEach(async () => {
  await act(async () => screen?.unmount());
  await i18n.changeLanguage('en');
  expect(JSON.stringify({ mockData, mockExtra })).toBe(originalData);
  jest.restoreAllMocks();
});
async function render(element: React.ReactElement) {
  await act(async () => {
    screen = TestRenderer.create(
      <View>
        {element}
        <ToastHost />
      </View>,
    );
  });
}
async function language(value: 'en' | 'bn') {
  await act(async () => {
    await i18n.changeLanguage(value);
  });
}
function textValues() {
  return screen.root.findAllByType(Text).map(node => node.props.children);
}
function field(label: string) {
  return screen.root
    .findAllByType(TextInput)
    .find(node => node.props.accessibilityLabel === label)!;
}
function select(label: string) {
  return screen.root
    .findAllByType(Select)
    .find(node => node.props.label === label)!;
}
async function submit(title: string) {
  const button = screen.root
    .findAllByType(Button)
    .find(node => node.props.title === title)!;
  await act(async () => button.props.onPress());
}
async function press(label: string, role = 'button') {
  const button = screen.root.findAll(
    node =>
      node.props.accessibilityRole === role &&
      typeof node.props.onPress === 'function' &&
      (node.props.accessibilityLabel === label ||
        node.findAllByType(Text).some(text => text.props.children === label)),
    { deep: false },
  )[0];
  await act(async () => button.props.onPress());
}

it('retranslates a filtered vehicle list without changing search text, names or navigation IDs', async () => {
  await render(
    <NoorVehiclesScreen navigation={navigation} route={{} as never} />,
  );
  await act(async () => field('Search vehicles').props.onChangeText('Morning'));
  expect(textValues()).toContain('Running');
  await language('bn');
  expect(field(i18n.t('Search vehicles')).props.value).toBe('Morning');
  expect(field(i18n.t('Search vehicles')).props.placeholder).toBe(
    i18n.t('Search name, plate or driver'),
  );
  expect(textValues()).toContain('চলমান');
  expect(textValues()).toContain('Morning');
  expect(textValues()).toContain('ঢাকা-১২৩');
  expect(textValues()).toContain('ড্রাইভার: Driver');
  await press('Morning');
  expect(mockNavigate).toHaveBeenLastCalledWith('VehicleDetails', {
    id: 'v-123',
  });
  await language('en');
  expect(field('Search vehicles').props.value).toBe('Morning');
  expect(mockMutate).not.toHaveBeenCalled();
});

it('localizes displayed vehicle dates while retaining open metadata inputs and API enum values', async () => {
  await render(
    <VehicleDetailsScreen navigation={navigation} route={vehicleRoute} />,
  );
  expect(textValues()).toContain(
    new Date('2026-09-10T12:00:00+06:00').toLocaleDateString('en-BD', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Dhaka',
    }),
  );
  await submit('Edit vehicle documents and status');
  await act(async () => {
    field('Model').props.onChangeText('Morning custom ০১');
    field('Purchase date (YYYY-MM-DD)').props.onChangeText('2026-09-11');
    select('Status').props.onChange('MAINTENANCE');
  });
  await language('bn');
  expect(textValues()).toContain(
    new Date('2026-09-10T12:00:00+06:00').toLocaleDateString('bn-BD', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Dhaka',
    }),
  );
  expect(field(i18n.t('Model')).props.value).toBe('Morning custom ০১');
  expect(field(i18n.t('Purchase date (YYYY-MM-DD)')).props.value).toBe(
    '2026-09-11',
  );
  expect(select(i18n.t('Status')).props.value).toBe('MAINTENANCE');
  expect(select(i18n.t('Status')).props.options).toEqual([
    { value: 'RUNNING', label: i18n.t('Running') },
    { value: 'MAINTENANCE', label: i18n.t('Maintenance') },
    { value: 'INACTIVE', label: i18n.t('Inactive') },
  ]);
  await submit(i18n.t('Save'));
  expect(mockMutate).toHaveBeenCalledWith(
    '/vehicles/v-123',
    {
      model: 'Morning custom ০১',
      purchaseDate: '2026-09-11',
      fitnessExpiresAt: '2027-01-31',
      licenseExpiresAt: '2027-02-01',
      status: 'MAINTENANCE',
    },
    'PATCH',
  );
});

it('preserves route search and route names across mounted language changes', async () => {
  await render(
    <NoorRoutesScreen navigation={navigation} route={{} as never} />,
  );
  await act(async () => field('Search routes').props.onChangeText('Route'));
  await language('bn');
  expect(field('রুট খুঁজুন').props.value).toBe('Route');
  expect(textValues()).toContain('Route');
  await press('Route');
  expect(mockNavigate).toHaveBeenLastCalledWith('RouteDetails', {
    id: 'r-123',
  });
});

it('retains the selected route period and edits, retranslates validation, and saves raw schedule values', async () => {
  await render(
    <RouteDetailsScreen navigation={navigation} route={routeRoute} />,
  );
  await press('Return schedule', 'tab');
  expect(textValues()).toContain('14:30');
  await submit('Edit schedule');
  await act(async () => {
    field('Stop 1').props.onChangeText('School gate ০১');
    screen.root
      .findAllByType(TextInput)
      .filter(node => node.props.accessibilityLabel === 'Time (HH:mm)')[0]
      .props.onChangeText('bad');
  });
  await submit('Save schedule');
  expect(textValues()).toContain('Enter a valid time as HH:mm.');
  await language('bn');
  expect(textValues()).toContain('HH:mm ফরম্যাটে সঠিক সময় লিখুন।');
  const tab = screen.root.findAll(
    node =>
      node.props.accessibilityRole === 'tab' &&
      node.props.accessibilityState.selected,
    { deep: false },
  )[0];
  expect(
    tab
      .findAllByType(Text)
      .some(node => node.props.children === 'ফেরার সময়সূচি'),
  ).toBe(true);
  expect(textValues()).toContain('১৪:৩০');
  expect(textValues()).toContain('Afternoon');
  expect(field('স্টপ ১').props.value).toBe('School gate ০১');
  const timeFields = screen.root
    .findAllByType(TextInput)
    .filter(node => node.props.accessibilityLabel === 'সময় (HH:mm)');
  expect(timeFields[0].props.value).toBe('bad');
  await act(async () => timeFields[0].props.onChangeText('07:45'));
  await submit('সময়সূচি সংরক্ষণ');
  expect(mockManagementMutate).toHaveBeenCalledWith(
    '/admin/routes/r-123/schedule',
    {
      entries: [
        {
          stopId: 'stop-123',
          studentId: null,
          label: 'School gate ০১',
          time: '07:45',
          period: 'MORNING',
          position: 0,
        },
        {
          stopId: 'stop-123',
          studentId: null,
          label: 'Afternoon',
          time: '14:30',
          period: 'AFTERNOON',
          position: 1,
        },
      ],
    },
    'PUT',
  );
});

it('keeps admin investment navigation and sign-out actions stable after translating menu labels', async () => {
  const alert = jest.spyOn(Alert, 'alert');
  await render(<NoorMenuScreen navigation={navigation} route={{} as never} />);
  expect(textValues()).toContain('Management');
  await press('Investment');
  expect(mockNavigate).toHaveBeenLastCalledWith('Accounts', {
    tab: 'INVESTMENT',
  });
  await language('bn');
  expect(textValues()).toContain('ম্যানেজমেন্ট');
  await press('ইনভেস্টমেন্ট');
  expect(mockNavigate).toHaveBeenLastCalledWith('Accounts', {
    tab: 'INVESTMENT',
  });
  await submit(i18n.t('Sign out'));
  expect(alert).toHaveBeenLastCalledWith(
    i18n.t('Sign out'),
    'আপনি কি লগ আউট করতে চান?',
    expect.any(Array),
  );
  const buttons = alert.mock.calls[alert.mock.calls.length - 1][2]!;
  await act(async () => buttons[1].onPress?.());
  expect(mockSignOut).toHaveBeenCalledTimes(1);
});

it('retranslates the mounted parent menu while preserving its destination', async () => {
  mockRole = 'GUARDIAN';
  await render(<NoorMenuScreen navigation={navigation} route={{} as never} />);
  expect(textValues()).toContain('My children');
  await language('bn');
  expect(textValues()).toContain('আমার সন্তান');
  const contact = screen.root
    .findAllByType(NoorRow)
    .find(node => node.props.title === i18n.t('Contact'))!;
  await act(async () => contact.props.onPress());
  expect(mockNavigate).toHaveBeenLastCalledWith('Contact');
});

it('switches the mounted welcome screen through the language control without changing login variants', async () => {
  const onLogin = jest.fn();
  await render(
    <LanguageContext.Provider
      value={{
        busy: false,
        error: '',
        changeLanguage: async value => {
          await i18n.changeLanguage(value);
        },
      }}
    >
      <WelcomeScreen onLogin={onLogin} />
    </LanguageContext.Provider>,
  );
  expect(textValues()).toContain('Safe Journey, Bright Future');
  await press('বাংলা', 'radio');
  expect(textValues()).toContain('নিরাপদ যাত্রা\nউজ্জ্বল ভবিষ্যৎ');
  expect(textValues()).toContain('নিরাপদ যাত্রা, উজ্জ্বল ভবিষ্যৎ');
  await press(i18n.t('Register'));
  expect(onLogin).toHaveBeenLastCalledWith('parent', true);
  await press(i18n.t('Sign in'));
  expect(onLogin).toHaveBeenLastCalledWith('parent');
  await press('English', 'radio');
  expect(textValues()).toContain('Register');
  const admin = screen.root.findAll(
    node =>
      node.props.accessibilityRole === 'button' &&
      node.props.onPress &&
      node
        .findAllByType(Text)
        .some(
          text =>
            Array.isArray(text.props.children) &&
            text.props.children.includes('Admin Panel'),
        ),
    { deep: false },
  )[0];
  await act(async () => admin.props.onPress());
  expect(onLogin).toHaveBeenLastCalledWith('admin');
});

it('localizes emergency confirmation text while keeping dialed numbers unchanged', async () => {
  const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  const alert = jest.spyOn(Alert, 'alert');
  await render(<EmergencyScreen />);
  expect(textValues()).toContain('Call directly in an emergency.');
  await language('bn');
  expect(textValues()).toContain('জরুরি প্রয়োজনে সরাসরি কল করুন।');
  await submit('অফিসে জরুরি কল');
  expect(openURL).toHaveBeenLastCalledWith('tel:+8801712345678');
  await submit('জাতীয় জরুরি সেবা — ৯৯৯');
  expect(alert).toHaveBeenLastCalledWith(
    'জরুরি কল',
    '৯৯৯ নম্বরে কল করতে চান?',
    expect.any(Array),
  );
  const buttons = alert.mock.calls[alert.mock.calls.length - 1][2]!;
  await act(async () => buttons[1].onPress?.());
  expect(openURL).toHaveBeenLastCalledWith('tel:999');
});

it('retranslates the shared brand default while leaving supplied text untouched', async () => {
  await render(
    <>
      <NoorBrand />
      <NoorBrand subtitle="Morning" />
      <NoorRow icon="student" title="Student" subtitle="Driver" />
    </>,
  );
  await language('bn');
  expect(textValues()).toContain('নিরাপদ যাত্রা, উজ্জ্বল ভবিষ্যৎ');
  expect(textValues()).toContain('Morning');
  expect(textValues()).toContain('Student');
  expect(textValues()).toContain('Driver');
});

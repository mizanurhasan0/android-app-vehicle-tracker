import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { i18n } from '../src/i18n';

let mockRole = 'ADMIN';
let mockRoute = 'Fleet';
const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => ({
  DefaultTheme: { colors: {} },
  NavigationContainer: require('react-native').View,
  createNavigationContainerRef: () => ({
    current: null,
    isReady: () => true,
    navigate: (...args: unknown[]) => mockNavigate(...args),
    getCurrentRoute: () => ({ name: mockRoute }),
  }),
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: () => ({
    Navigator: require('react-native').View,
    Screen: ({ options }: { options: { title?: string } }) =>
      require('react').createElement(
        require('react-native').Text,
        {},
        options.title,
      ),
  }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: require('react-native').View,
  SafeAreaView: require('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ session: { user: { role: mockRole } } }),
}));
jest.mock('../src/context/DataContext', () => ({}));
jest.mock('../src/context/ManagementContext', () => ({}));
jest.mock('../src/i18n/LanguageProvider', () => ({}));

// Import actual screen exports, but never render them or start their data effects.
jest.mock('react-native-webview', () => ({ WebView: () => null }));
jest.mock('@react-native-picker/picker', () => {
  const Picker = require('react-native').View;
  return { Picker: Object.assign(Picker, { Item: Picker }) };
});
jest.mock('../src/components/Noor', () => ({ NoorIcon: () => null }));
const { Navigator } = require('../src/navigation/Navigator');
const { NavigationContainer } = require('@react-navigation/native');

// Route name -> actual module, exported component, untranslated title.
const commonRoutes = {
  Fleet: ['../src/screens/HomeScreen', 'HomeScreen', undefined],
  More: ['../src/screens/NoorMenuScreen', 'NoorMenuScreen', 'More'],
  Vehicles: ['../src/screens/fleet', 'NoorVehiclesScreen', 'Vehicle list'],
  VehicleDetails: [
    '../src/screens/fleet',
    'VehicleDetailsScreen',
    'Vehicle profile',
  ],
  FleetMap: [
    '../src/navigation/routeScreens',
    'FleetMapScreen',
    'Live location',
  ],
  Routes: ['../src/screens/fleet', 'NoorRoutesScreen', 'Routes'],
  RouteDetails: [
    '../src/screens/fleet',
    'RouteDetailsScreen',
    'Route and schedule',
  ],
  Bills: ['../src/navigation/routeScreens', 'BillsScreen', 'Payment'],
  DueList: ['../src/navigation/routeScreens', 'DueScreen', 'Due list'],
  Requested: [
    '../src/navigation/routeScreens',
    'RequestedScreen',
    'Admission applications',
  ],
  Complaints: [
    '../src/navigation/routeScreens',
    'ComplaintsScreen',
    'Complaints',
  ],
  StopRequests: [
    '../src/navigation/routeScreens',
    'StopScreen',
    'Stop service requests',
  ],
  PaymentAccounts: [
    '../src/screens/DirectoryScreens',
    'PaymentAccountsScreen',
    'Payment accounts',
  ],
  Inbox: [
    '../src/screens/NotificationsScreen',
    'NotificationsScreen',
    'Notifications',
  ],
  NotificationDetails: [
    '../src/screens/NotificationsScreen',
    'NotificationDetailsScreen',
    'Notifications',
  ],
  Settings: ['../src/screens/admin', 'SettingsScreen', 'Settings'],
  Emergency: [
    '../src/screens/NoorMenuScreen',
    'EmergencyScreen',
    'Emergency help',
  ],
  LiveTracking: [
    '../src/screens/parent',
    'ParentTrackingScreen',
    'Live Tracking',
  ],
} as const;
const adminRoutes = {
  CreateVehicle: [
    '../src/screens/DirectoryScreens',
    'CreateVehicleScreen',
    'Add vehicle',
  ],
  VehicleHistory: [
    '../src/screens/VehicleHistoryScreen',
    'VehicleHistoryScreen',
    'Travel history',
  ],
  Students: ['../src/screens/admin', 'StudentsScreen', 'Student list'],
  StudentDetails: [
    '../src/screens/admin',
    'StudentProfileScreen',
    'Student profile',
  ],
  Drivers: ['../src/screens/admin', 'DriversScreen', 'Driver list'],
  DriverDetails: [
    '../src/screens/admin',
    'DriverProfileScreen',
    'Driver profile',
  ],
  Attendance: ['../src/screens/admin', 'AttendanceScreen', 'Attendance'],
  Maintenance: ['../src/screens/admin', 'MaintenanceScreen', 'Maintenance'],
  Accounts: ['../src/screens/admin', 'AccountsScreen', 'Income and expenses'],
  Notices: ['../src/screens/admin', 'NoticesScreen', 'Notices'],
  Banners: ['../src/screens/admin', 'BannersScreen', 'Dashboard banners'],
  OperationalRequests: ['../src/screens/admin', 'RequestsScreen', 'Requests'],
  Communication: [
    '../src/screens/admin',
    'CommunicationScreen',
    'Communication',
  ],
  Reports: ['../src/screens/admin', 'ReportsScreen', 'Reports'],
} as const;
const parentRoutes = {
  Receipts: [
    '../src/screens/parent/ReceiptsScreen',
    'ReceiptsScreen',
    'Receipts',
  ],
  ParentProfile: [
    '../src/screens/parent',
    'ParentStudentScreen',
    'Student profile',
  ],
  Admission: [
    '../src/screens/parent',
    'AdmissionScreen',
    'Online admission form',
  ],
  ApplicationStatus: [
    '../src/screens/parent',
    'ApplicationStatusScreen',
    'Application status',
  ],
  TodayJourney: [
    '../src/screens/parent',
    'ParentJourneyScreen',
    "Today's journey",
  ],
  Contact: ['../src/screens/parent', 'ParentContactScreen', 'Contact'],
} as const;

let screen: TestRenderer.ReactTestRenderer;
beforeEach(async () => {
  mockRole = 'ADMIN';
  mockRoute = 'Fleet';
  mockNavigate.mockClear();
  await i18n.changeLanguage('en');
});
afterEach(async () => {
  await act(async () => screen?.unmount());
  await i18n.changeLanguage('en');
});
const tabs = () =>
  screen.root.findAll(
    node =>
      node.props.accessibilityRole === 'tab' &&
      typeof node.props.onPress === 'function',
    { deep: false },
  );
const text = () =>
  screen.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .join(' ');

function routeComponents() {
  const registered = screen.root.findAll(
    node =>
      typeof node.props.name === 'string' &&
      typeof node.props.getComponent === 'function',
  );
  const expected = {
    ...commonRoutes,
    ...(mockRole === 'ADMIN' ? adminRoutes : parentRoutes),
  };
  expect(registered.map(node => node.props.name).sort()).toEqual(
    Object.keys(expected).sort(),
  );
  return Object.fromEntries(
    registered.map(node => {
      const name = node.props.name as keyof typeof expected;
      const [module, exported, title] = expected[name];
      const actual = jest.requireActual(module)[exported];
      expect(actual).toEqual(expect.any(Function));
      expect(node.props.component).toBeUndefined();
      expect(node.props.getComponent()).toBe(actual);
      expect(node.props.getComponent()).toBe(actual);
      expect(node.props.options.title).toBe(
        name === 'More' && mockRole === 'ADMIN'
          ? i18n.t('NOOR TRANSPORT · Admin')
          : title === undefined
          ? undefined
          : i18n.t(title),
      );
      if (name === 'Fleet') expect(node.props.options.headerShown).toBe(false);
      return [name, actual];
    }),
  );
}

it.each(['ADMIN', 'GUARDIAN'])(
  'updates %s navigation titles and tabs without changing the active route',
  async role => {
    mockRole = role;
    const paymentTab = role === 'ADMIN' ? 3 : 2;
    await act(async () => {
      screen = TestRenderer.create(<Navigator />);
    });
    const initialComponents = routeComponents();
    expect(tabs().map(node => node.props.accessibilityLabel)).toEqual(
      role === 'ADMIN'
        ? ['Home', 'Vehicles', 'Students', 'Payment', 'Menu']
        : ['Home', 'Trip', 'Payment', 'Notice', 'More'],
    );
    expect(text()).toContain('Settings');
    expect(text()).toContain('Vehicle list');
    await act(async () => {
      tabs()[paymentTab].props.onPress();
      mockRoute = 'Bills';
      screen.root.findByType(NavigationContainer).props.onStateChange();
    });
    expect(mockNavigate).toHaveBeenCalledWith('Bills');
    expect(routeComponents()).toEqual(initialComponents);
    await act(async () => {
      await i18n.changeLanguage('bn');
    });
    expect(text()).toContain('সেটিংস');
    expect(routeComponents()).toEqual(initialComponents);
    expect(text()).toContain('গাড়ি তালিকা');
    expect(tabs()[paymentTab].props.accessibilityState.selected).toBe(true);
    expect(tabs()[paymentTab].props.accessibilityLabel).toBe(i18n.t('Payment'));
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    expect(text()).toContain('Vehicle list');
    expect(routeComponents()).toEqual(initialComponents);
    expect(tabs()[paymentTab].props.accessibilityState.selected).toBe(true);
  },
);

it('updates authenticated role routes without replacing common screen components', async () => {
  await act(async () => {
    screen = TestRenderer.create(<Navigator />);
  });
  const initial = routeComponents();
  for (const role of ['GUARDIAN', 'ADMIN']) {
    mockRole = role;
    await act(async () => screen.update(<Navigator />));
    const current = routeComponents();
    for (const name of Object.keys(commonRoutes)) {
      expect(current[name]).toBe(initial[name]);
    }
  }
  expect(mockNavigate).not.toHaveBeenCalled();
});

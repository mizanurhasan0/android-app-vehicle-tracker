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

// Keep this test on navigation state and translated titles, independently of data loading.
for (const module of [
  '../src/screens/AuthScreen',
  '../src/screens/HomeScreen',
  '../src/screens/VehiclesScreen',
  '../src/screens/VehicleHistoryScreen',
  '../src/screens/PaymentsScreen',
  '../src/screens/RequestsScreen',
  '../src/screens/NotificationsScreen',
  '../src/screens/DirectoryScreens',
  '../src/screens/NoorFleetScreens',
  '../src/screens/NoorMenuScreen',
  '../src/screens/admin',
  '../src/screens/parent/ParentScreens',
  '../src/screens/parent/ReceiptsScreen',
]) {
  jest.doMock(module, () => ({}));
}
jest.mock('../src/components/Noor', () => ({ NoorIcon: () => null }));
const { Navigator } = require('../App');
const { NavigationContainer } = require('@react-navigation/native');

let screen: TestRenderer.ReactTestRenderer;
beforeEach(async () => {
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

it.each(['ADMIN', 'GUARDIAN'])(
  'updates %s navigation titles and tabs without changing the active route',
  async role => {
    mockRole = role;
    const paymentTab = role === 'ADMIN' ? 3 : 2;
    await act(async () => {
      screen = TestRenderer.create(<Navigator />);
    });
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
    await act(async () => {
      await i18n.changeLanguage('bn');
    });
    expect(text()).toContain('সেটিংস');
    expect(text()).toContain('গাড়ি তালিকা');
    expect(tabs()[paymentTab].props.accessibilityState.selected).toBe(true);
    expect(tabs()[paymentTab].props.accessibilityLabel).toBe(i18n.t('Payment'));
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    await act(async () => {
      await i18n.changeLanguage('en');
    });
    expect(text()).toContain('Vehicle list');
    expect(tabs()[paymentTab].props.accessibilityState.selected).toBe(true);
  },
);

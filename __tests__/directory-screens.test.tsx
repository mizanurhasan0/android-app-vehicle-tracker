import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text, TextInput } from 'react-native';
import { PaymentAccount } from '../src/api/types';
import { Button } from '../src/components/ui';
import { i18n } from '../src/i18n';
import {
  CreateVehicleScreen,
  PaymentAccountsScreen,
} from '../src/screens/DirectoryScreens';

let mockRole: 'ADMIN' | 'GUARDIAN' | null;
let mockAccounts: PaymentAccount[];
const mockMutate = jest.fn();

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    session: mockRole ? { user: { role: mockRole } } : null,
  }),
}));
jest.mock('../src/context/DataContext', () => {
  const useData = () => ({
    data: { accounts: mockAccounts },
    loading: false,
    error: '',
    refresh: jest.fn(),
    mutate: mockMutate,
  });
  return { useData, useCoreData: useData, useDataActions: useData };
});
jest.mock('@react-native-picker/picker', () => {
  const ReactModule = require('react');
  const Picker = (props: object) =>
    ReactModule.createElement(require('react-native').View, props);
  Picker.Item = Picker;
  return { Picker };
});
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

let screen: TestRenderer.ReactTestRenderer;
beforeEach(async () => {
  mockRole = 'ADMIN';
  mockAccounts = [
    { method: 'BKASH', number: '01700000001', instructions: 'Send Money' },
    { method: 'ROCKET', number: '017000000022', instructions: 'Use Payment' },
  ];
  mockMutate.mockReset().mockResolvedValue({});
  await i18n.changeLanguage('en');
});
afterEach(async () => {
  await act(async () => screen?.unmount());
  await i18n.changeLanguage('en');
});

async function render(Component: React.ComponentType) {
  await act(async () => {
    screen = TestRenderer.create(<Component />);
  });
}

const text = () =>
  screen.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat()
    .join(' ');

it('shows the vehicle form to admins', async () => {
  await render(CreateVehicleScreen);
  expect(text()).toContain('Add a vehicle');
  expect(
    screen.root
      .findAllByType(TextInput)
      .some(node => node.props.accessibilityLabel === 'Vehicle name'),
  ).toBe(true);
  expect(screen.root.findByType(Button).props.title).toBe('Add vehicle');
  expect(mockMutate).not.toHaveBeenCalled();
});

it.each(['GUARDIAN', null] as const)(
  'hides vehicle creation for role %s',
  async role => {
    mockRole = role;
    await render(CreateVehicleScreen);
    expect(screen.toJSON()).toBeNull();
    expect(mockMutate).not.toHaveBeenCalled();
  },
);

it('shows editable receiving account details to admins', async () => {
  await render(PaymentAccountsScreen);
  const { Select } = require('../src/components/ui');
  await act(async () => screen.root.findByType(Select).props.onChange('BKASH'));
  expect(
    screen.root
      .findAllByType(TextInput)
      .find(
        node => node.props.accessibilityLabel === 'Receiving account number',
      )?.props.value,
  ).toBe('01700000001');
  expect(
    screen.root
      .findAllByType(Button)
      .some(item => item.props.title === 'Save payment method'),
  ).toBe(true);
  expect(mockMutate).not.toHaveBeenCalled();
});

it('shows both wallets as selectable read-only payment instructions to guardians', async () => {
  mockRole = 'GUARDIAN';
  await render(PaymentAccountsScreen);
  for (const label of ['bKash', 'Rocket', 'Send Money', 'Use Payment']) {
    expect(text()).toContain(label);
  }
  expect(
    screen.root
      .findAllByType(Text)
      .filter(node => node.props.selectable)
      .map(node => node.props.children),
  ).toEqual(mockAccounts.map(account => account.number));
  expect(screen.root.findAllByType(TextInput)).toHaveLength(0);
  expect(screen.root.findAllByType(Button)).toHaveLength(0);
  expect(mockMutate).not.toHaveBeenCalled();
});

it('shows translated empty payment instructions without editing controls to guardians', async () => {
  mockRole = 'GUARDIAN';
  mockAccounts = [];
  await render(PaymentAccountsScreen);
  expect(text()).toContain('No payment accounts yet');
  expect(text()).toContain('Your school will add payment instructions here.');
  await act(async () => {
    await i18n.changeLanguage('bn');
  });
  expect(text()).toContain(i18n.t('No payment accounts yet'));
  expect(text()).toContain(
    i18n.t('Your school will add payment instructions here.'),
  );
  expect(screen.root.findAllByType(TextInput)).toHaveLength(0);
  expect(screen.root.findAllByType(Button)).toHaveLength(0);
  expect(mockMutate).not.toHaveBeenCalled();
});

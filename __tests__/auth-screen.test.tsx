import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text, TextInput } from 'react-native';
import { AuthScreen } from '../src/screens/AuthScreen';

const mockSignIn = jest.fn();
const mockSetServer = jest.fn();
let screen: TestRenderer.ReactTestRenderer;

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    setServer: mockSetServer,
    baseUrl: 'https://school.example',
    startupError: '',
  }),
}));
jest.mock('../src/components/LanguageSwitcher', () => ({
  LanguageSwitcher: () => null,
}));
jest.mock('@react-native-picker/picker', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  const Picker = (props: object) => ReactModule.createElement(View, props);
  Picker.Item = Picker;
  return { Picker };
});
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));

beforeEach(async () => {
  mockSignIn.mockReset().mockResolvedValue(undefined);
  mockSetServer.mockReset().mockResolvedValue(undefined);
  await act(async () => {
    screen = TestRenderer.create(<AuthScreen />);
  });
});
afterEach(async () => {
  await act(async () => screen.unmount());
});

function input(label: string) {
  return screen.root
    .findAllByType(TextInput)
    .find(node => node.props.accessibilityLabel === label)!;
}
function button(label: string) {
  return screen.root.findAll(
    node =>
      node.props.accessibilityRole === 'button' &&
      typeof node.props.onPress === 'function' &&
      node.findAllByType(Text).some(text => text.props.children === label),
    { deep: false },
  )[0];
}
async function press(label: string) {
  await act(async () => button(label).props.onPress());
}
async function fill(values: Record<string, string>) {
  await act(async () => {
    Object.entries(values).forEach(([label, value]) =>
      input(label).props.onChangeText(value),
    );
  });
}

it('preserves entered credentials through visibility changes and keyboard submission', async () => {
  await fill({ 'Phone number': '০১৭১২৩৪৫৬৭৮', Password: 'test-password' });
  expect(input('Password').props.secureTextEntry).toBe(true);
  await press('Show password');
  expect(input('Password').props.secureTextEntry).toBe(false);
  expect(input('Password').props.value).toBe('test-password');
  await press('Hide password');
  expect(input('Password').props.secureTextEntry).toBe(true);
  await act(async () => input('Password').props.onSubmitEditing());
  expect(mockSignIn).toHaveBeenCalledWith(
    '01712345678',
    'test-password',
    undefined,
  );
});

it('keeps guardian registration and server configuration available without losing drafts', async () => {
  await fill({ 'Phone number': '01712345678', Password: 'test-password' });
  await press('Show password');
  await press('New guardian? Create account');
  expect(input('Password').props.secureTextEntry).toBe(true);
  expect(input('Password').props.autoComplete).toBe('new-password');
  await fill({ 'Your name': 'Guardian One' });
  await press('School server settings');
  await fill({ 'Server address': 'https://another-school.example' });
  await press('Save server');
  expect(mockSetServer).toHaveBeenCalledWith('https://another-school.example');
  expect(input('Your name').props.value).toBe('Guardian One');
  expect(input('Password').props.value).toBe('test-password');
  await press('Create account');
  expect(mockSignIn).toHaveBeenCalledWith(
    '01712345678',
    'test-password',
    'Guardian One',
  );
});

it('validates credentials and keeps a failed sign-in editable for retry', async () => {
  await press('Sign in');
  expect(mockSignIn).not.toHaveBeenCalled();
  await fill({ 'Phone number': '01712345678', Password: 'test-password' });
  mockSignIn.mockRejectedValueOnce(
    new Error('Phone number or password is incorrect'),
  );
  await press('Sign in');
  expect(JSON.stringify(screen.toJSON())).toContain(
    'Phone number or password is incorrect',
  );
  expect(input('Password').props.value).toBe('test-password');
  expect(input('Password').props.editable).toBe(true);
  await press('Sign in');
  expect(mockSignIn).toHaveBeenCalledTimes(2);
});

it('disables editing and navigation while a sign-in request is pending', async () => {
  let finish!: () => void;
  mockSignIn.mockImplementationOnce(
    () =>
      new Promise<void>(resolve => {
        finish = resolve;
      }),
  );
  await fill({ 'Phone number': '01712345678', Password: 'test-password' });
  await press('Sign in');
  expect(input('Password').props.editable).toBe(false);
  expect(input('Phone number').props.editable).toBe(false);
  expect(button('School server settings').props.disabled).toBe(true);
  expect(button('New guardian? Create account').props.disabled).toBe(true);
  await act(async () => finish());
  expect(input('Password').props.editable).toBe(true);
});

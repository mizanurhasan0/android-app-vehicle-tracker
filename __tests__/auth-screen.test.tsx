import React from 'react';
import { ToastHost } from '../src/components/Toast';
import TestRenderer, { act } from 'react-test-renderer';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { ApiError } from '../src/api/client';
import { colors } from '../src/theme';
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
  const { View: NativeView } = require('react-native');
  const Picker = (props: object) =>
    ReactModule.createElement(NativeView, props);
  Picker.Item = Picker;
  return { Picker };
});
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

beforeEach(async () => {
  mockSignIn.mockReset().mockResolvedValue(undefined);
  mockSetServer.mockReset().mockResolvedValue(undefined);
  await act(async () => {
    screen = TestRenderer.create(
      <View>
        <AuthScreen />
        <ToastHost />
      </View>,
    );
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
      (node.props.accessibilityLabel === label ||
        node.findAllByType(Text).some(text => text.props.children === label)),
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
    new ApiError('Phone number or password is incorrect', 401, {
      phone: 'Phone number or password is incorrect',
      password: 'Phone number or password is incorrect',
    }),
  );
  await press('Sign in');
  expect(JSON.stringify(screen.toJSON())).toContain(
    'Phone number or password is incorrect',
  );
  expect(input('Password').props.value).toBe('test-password');
  expect(input('Password').props['aria-invalid']).toBe(true);
  expect(input('Phone number').props['aria-invalid']).toBe(true);
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

it('highlights each invalid credential and clears only the corrected field', async () => {
  await press('Sign in');
  expect(mockSignIn).not.toHaveBeenCalled();
  const redOutline = (label: string) =>
    screen.root
      .findAllByType(View)
      .some(
        node =>
          StyleSheet.flatten(node.props.style)?.borderColor === colors.danger &&
          node
            .findAllByType(TextInput)
            .some(control => control.props.accessibilityLabel === label),
      );
  expect(redOutline('Phone number')).toBe(true);
  expect(redOutline('Password')).toBe(true);
  expect(
    screen.root
      .findAllByType(View)
      .some(node => node.props.testID === 'feedback-toast'),
  ).toBe(true);
  await fill({ 'Phone number': '01712345678' });
  expect(redOutline('Phone number')).toBe(false);
  expect(input('Phone number').props.accessibilityHint).toBeUndefined();
  expect(redOutline('Password')).toBe(true);
  await fill({ Password: 'valid-password' });
  expect(redOutline('Password')).toBe(false);
  await press('Sign in');
  expect(mockSignIn).toHaveBeenCalledTimes(1);
});

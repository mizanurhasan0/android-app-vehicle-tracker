import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { TextInput } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthScreen } from '../src/screens/AuthScreen';
import { Button, Field } from '../src/components/ui';
import { i18n } from '../src/i18n';
import {
  LanguageProvider,
  LANGUAGE_STORAGE_KEY,
} from '../src/i18n/LanguageProvider';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn() },
}));
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    signIn: jest.fn(),
    baseUrl: 'https://school.example',
    setServer: jest.fn(),
    startupError: '',
  }),
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

let screen: TestRenderer.ReactTestRenderer;
let stored: string | null;
beforeEach(async () => {
  await i18n.changeLanguage('en');
  stored = null;
  jest.mocked(AsyncStorage.getItem).mockImplementation(async () => stored);
  jest.mocked(AsyncStorage.setItem).mockImplementation(async (_key, value) => {
    stored = value;
  });
});
afterEach(async () => {
  await act(async () => screen?.unmount());
  await i18n.changeLanguage('en');
  jest.clearAllMocks();
});
async function renderApp() {
  await act(async () => {
    screen = TestRenderer.create(
      <LanguageProvider>
        <AuthScreen />
      </LanguageProvider>,
    );
  });
}
async function choose(label: string) {
  const button = screen.root.findAll(
    node =>
      node.props.accessibilityRole === 'radio' &&
      node.props.accessibilityLabel === label &&
      node.props.onPress,
  )[0];
  await act(async () => button.props.onPress());
}

it('switches the sign-in screen immediately, preserves form input, and restores the saved language', async () => {
  await renderApp();
  const input = screen.root
    .findAllByType(TextInput)
    .find(node => node.props.keyboardType === 'phone-pad')!;
  await act(async () => input.props.onChangeText('০১৭১২৩৪৫৬৭৮'));
  await choose('বাংলা');
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(LANGUAGE_STORAGE_KEY, 'bn');
  expect(
    screen.root
      .findAllByType(Field)
      .find(field => field.props.label === 'ফোন নম্বর')?.props.value,
  ).toBe('01712345678');
  expect(JSON.stringify(screen.toJSON())).toContain('লগইন করুন');
  await act(async () => screen.unmount());
  await i18n.changeLanguage('en');
  await renderApp();
  expect(i18n.language).toBe('bn');
  await choose('English');
  expect(stored).toBe('en');
  expect(JSON.stringify(screen.toJSON())).toContain('Sign in');
});

it('retranslates an already visible validation message when the language changes', async () => {
  await renderApp();
  const submit = screen.root
    .findAllByType(Button)
    .find(button => button.props.title === 'Sign in')!;
  await act(async () => submit.props.onPress());
  expect(JSON.stringify(screen.toJSON())).toContain(
    'Enter a valid 11-digit Bangladesh phone number.',
  );
  await choose('বাংলা');
  expect(JSON.stringify(screen.toJSON())).toContain(
    'বাংলাদেশের সঠিক ১১ সংখ্যার ফোন নম্বর দিন।',
  );
});

it('retains the current language and reports a failed save', async () => {
  await renderApp();
  jest
    .mocked(AsyncStorage.setItem)
    .mockRejectedValueOnce(new Error('Storage unavailable'));
  await choose('বাংলা');
  expect(i18n.language).toBe('en');
  expect(JSON.stringify(screen.toJSON())).toContain(
    'Could not save your language. Please try again.',
  );
  await choose('বাংলা');
  expect(i18n.language).toBe('bn');
});

it('keeps the app usable when restoring storage fails', async () => {
  jest
    .mocked(AsyncStorage.getItem)
    .mockRejectedValueOnce(new Error('Storage unavailable'));
  await renderApp();
  expect(JSON.stringify(screen.toJSON())).toContain(
    'Could not restore your language. Please select it again.',
  );
  await choose('বাংলা');
  expect(i18n.language).toBe('bn');
});

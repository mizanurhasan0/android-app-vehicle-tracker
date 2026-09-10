import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import {
  AccessibilityInfo,
  Animated,
  Modal,
  Text,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProfileDrawer } from '../src/components/ProfileDrawer';
import { Field, Notice } from '../src/components/ui';
import { i18n } from '../src/i18n';
import {
  LanguageProvider,
  LANGUAGE_STORAGE_KEY,
} from '../src/i18n/LanguageProvider';

const mockUpdateProfile = jest.fn();
const mockSignOut = jest.fn();
const mockClose = jest.fn();
const mockUser = {
  id: 'guardian-1',
  name: 'QA Guardian',
  phone: '01712345678',
  role: 'GUARDIAN',
  verified: 1,
};

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    session: { user: mockUser },
    updateProfile: mockUpdateProfile,
    signOut: mockSignOut,
  }),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn() },
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
beforeEach(async () => {
  await i18n.changeLanguage('en');
  mockUpdateProfile.mockReset().mockResolvedValue(undefined);
  mockSignOut.mockReset().mockResolvedValue(undefined);
  mockClose.mockReset();
  mockUser.name = 'QA Guardian';
  jest.mocked(AsyncStorage.getItem).mockResolvedValue('en');
  jest.mocked(AsyncStorage.setItem).mockResolvedValue(undefined);
  jest
    .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
    .mockResolvedValue(true);
});
afterEach(async () => {
  await act(async () => screen?.unmount());
  await i18n.changeLanguage('en');
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

function drawer(visible = true) {
  return (
    <LanguageProvider>
      <ProfileDrawer visible={visible} onClose={mockClose} />
    </LanguageProvider>
  );
}
async function renderDrawer() {
  await act(async () => {
    screen = TestRenderer.create(drawer());
  });
}
function action(title: string) {
  return screen.root.findAll(
    node =>
      node.props.title === title && typeof node.props.onPress === 'function',
    { deep: false },
  )[0];
}
async function press(title: string) {
  await act(async () => action(title).props.onPress());
}
function fullName() {
  return screen.root
    .findAllByType(Field)
    .find(node => node.props.label === 'Full name')!;
}
async function editName(value: string) {
  await act(async () => fullName().props.onChangeText(value));
}
function labeledButton(label: string) {
  return screen.root.findAll(
    node =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === 'function',
    { deep: false },
  )[0];
}
function notice(text: string) {
  return screen.root
    .findAllByType(Notice)
    .some(node => node.props.text === text);
}

it('shows account details, keeps the phone read-only, and saves only a trimmed full name', async () => {
  await renderDrawer();
  expect(
    screen.root
      .findAllByType(Text)
      .some(node => node.props.children === mockUser.phone),
  ).toBe(true);
  await press('Edit profile');
  expect(screen.root.findAllByType(TextInput)).toHaveLength(1);
  expect(fullName().props.value).toBe('QA Guardian');
  expect(action('Save changes').props.disabled).toBe(true);
  await editName('  Updated Guardian  ');
  await press('Save changes');
  expect(mockUpdateProfile).toHaveBeenCalledWith({ name: 'Updated Guardian' });
  expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
  expect(notice('Profile updated.')).toBe(true);
  expect(fullName()).toBeUndefined();
});

it('discards a canceled draft and starts again from the current profile', async () => {
  await renderDrawer();
  await press('Edit profile');
  await editName('Unsaved name');
  await press('Cancel');
  expect(mockUpdateProfile).not.toHaveBeenCalled();
  expect(fullName()).toBeUndefined();
  await press('Edit profile');
  expect(fullName().props.value).toBe('QA Guardian');
  await editName('   ');
  await press('Save changes');
  expect(notice('Enter a name between 2 and 80 characters.')).toBe(true);
  expect(mockUpdateProfile).not.toHaveBeenCalled();
});

it('preserves the draft after a failed save and allows retry', async () => {
  mockUpdateProfile.mockRejectedValueOnce(new Error('Connection unavailable'));
  await renderDrawer();
  await press('Edit profile');
  await editName('Retry Guardian');
  await press('Save changes');
  expect(notice('Connection unavailable')).toBe(true);
  expect(fullName().props.value).toBe('Retry Guardian');
  await press('Save changes');
  expect(mockUpdateProfile).toHaveBeenCalledTimes(2);
  expect(notice('Profile updated.')).toBe(true);
});

it('prevents duplicate saves while an update is pending', async () => {
  let resolveSave!: () => void;
  mockUpdateProfile.mockImplementation(
    () =>
      new Promise<void>(resolve => {
        resolveSave = resolve;
      }),
  );
  await renderDrawer();
  await press('Edit profile');
  await editName('Pending Guardian');
  await act(async () => {
    action('Save changes').props.onPress();
  });
  expect(action('Save changes').props.busy).toBe(true);
  expect(fullName().props.editable).toBe(false);
  expect(labeledButton('Close profile').props.disabled).toBe(true);
  await act(async () => screen.root.findByType(Modal).props.onRequestClose());
  expect(mockClose).not.toHaveBeenCalled();
  await act(async () => {
    action('Save changes').props.onPress();
  });
  expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
  await act(async () => resolveSave());
  expect(notice('Profile updated.')).toBe(true);
});

it.each(['Close profile', 'Close profile drawer', 'Android back'])(
  'supports %s dismissal with reduced motion',
  async label => {
    const timing = jest.spyOn(Animated, 'timing');
    await renderDrawer();
    await act(async () => {
      if (label === 'Android back') {
        screen.root.findByType(Modal).props.onRequestClose();
      } else {
        labeledButton(label).props.onPress();
      }
    });
    expect(mockClose).toHaveBeenCalledTimes(1);
    expect(timing).not.toHaveBeenCalled();
    await act(async () => screen.update(drawer(false)));
    expect(
      screen.root.findAllByType(Modal).every(node => !node.props.visible),
    ).toBe(true);
  },
);

it('changes and persists language directly from the drawer', async () => {
  await renderDrawer();
  await act(async () => labeledButton('বাংলা').props.onPress());
  expect(i18n.language).toBe('bn');
  expect(AsyncStorage.setItem).toHaveBeenCalledWith(LANGUAGE_STORAGE_KEY, 'bn');
  expect(JSON.stringify(screen.toJSON())).toContain('QA Guardian');
  await act(async () => labeledButton('English').props.onPress());
  expect(i18n.language).toBe('en');
});

it('reports a failed sign-out and allows a successful retry', async () => {
  mockSignOut.mockRejectedValueOnce(new Error('Connection unavailable'));
  await renderDrawer();
  await press('Sign out');
  expect(notice('Connection unavailable')).toBe(true);
  expect(mockClose).not.toHaveBeenCalled();
  await press('Sign out');
  expect(mockSignOut).toHaveBeenCalledTimes(2);
  expect(mockClose).toHaveBeenCalledTimes(1);
});

it('returns from editing to account settings on Android back without closing the drawer', async () => {
  await renderDrawer();
  await press('Edit profile');
  await editName('Unsaved edit');
  await act(async () => screen.root.findByType(Modal).props.onRequestClose());
  expect(mockClose).not.toHaveBeenCalled();
  expect(mockUpdateProfile).not.toHaveBeenCalled();
  expect(fullName()).toBeUndefined();
  expect(labeledButton('English')).toBeDefined();
  await press('Edit profile');
  expect(fullName().props.value).toBe('QA Guardian');
});

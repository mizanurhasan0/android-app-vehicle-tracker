import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Alert, Linking, Text } from 'react-native';
import { TelegramConnectionCard } from '../src/components/TelegramConnectionCard';
import { i18n } from '../src/i18n';

const mockMutate = jest.fn();
interface MockTelegramStatus {
  enabled: boolean;
  connected: boolean;
  connectedAt: string | null;
  username: string | null;
  firstName: string | null;
  chatIdLast4: string | null;
}

let mockTelegram: MockTelegramStatus = {
  enabled: true,
  connected: false,
  connectedAt: null,
  username: null,
  firstName: null,
  chatIdLast4: null,
};

jest.mock('../src/context/DataContext', () => ({
  useCoreData: () => ({ data: { telegram: mockTelegram }, loading: false, error: '' }),
  useDataActions: () => ({ mutate: mockMutate }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));

let screen: TestRenderer.ReactTestRenderer;

beforeEach(async () => {
  await i18n.changeLanguage('en');
  mockTelegram = {
    enabled: true,
    connected: false,
    connectedAt: null,
    username: null,
    firstName: null,
    chatIdLast4: null,
  };
  mockMutate.mockReset();
  jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
});

afterEach(async () => {
  await act(async () => screen?.unmount());
  jest.restoreAllMocks();
});

async function renderCard() {
  await act(async () => {
    screen = TestRenderer.create(<TelegramConnectionCard />);
  });
}

function button(label: string) {
  return screen.root.findAll(
    node =>
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === 'function',
    { deep: false },
  )[0];
}

it('opens the secure Telegram connection link and explains the next step', async () => {
  mockMutate.mockResolvedValue({
    enabled: true,
    url: 'https://t.me/noor_bot?start=connect_token',
    expiresAt: '2026-09-19T13:30:00.000Z',
  });
  await renderCard();

  await act(async () => button('Connect Telegram').props.onPress());

  expect(mockMutate).toHaveBeenCalledWith(
    '/telegram/connect',
    undefined,
    'GET',
  );
  expect(Linking.openURL).toHaveBeenCalledWith(
    'https://t.me/noor_bot?start=connect_token',
  );
  expect(
    screen.root.findAllByType(Text).some(node =>
      node.props.children?.toString().includes('tap Start'),
    ),
  ).toBe(true);
});

it('confirms before disconnecting a connected Telegram account', async () => {
  mockTelegram = {
    enabled: true,
    connected: true,
    connectedAt: '2026-09-19T12:00:00.000Z',
    username: 'guardian_bot',
    firstName: 'Guardian',
    chatIdLast4: '1234',
  };
  mockMutate.mockResolvedValue(undefined);
  await renderCard();

  await act(async () => button('Disconnect Telegram').props.onPress());
  expect(Alert.alert).toHaveBeenCalledTimes(1);
  const actions = jest.mocked(Alert.alert).mock.calls[0][2] as {
    onPress?: () => void;
  }[];
  await act(async () => actions[1].onPress?.());

  expect(mockMutate).toHaveBeenCalledWith('/telegram', undefined, 'DELETE');
});

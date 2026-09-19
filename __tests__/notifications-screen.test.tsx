import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import {
  NotificationDetailsScreen,
  NotificationsScreen,
} from '../src/screens/NotificationsScreen';
import { Button } from '../src/components/ui';
import { i18n } from '../src/i18n';
import { Notification } from '../src/api/types';

const mockNavigate = jest.fn();
const mockPush = jest.fn();
const mockRefresh = jest.fn().mockResolvedValue(undefined);
const mockMutate = jest.fn().mockResolvedValue(undefined);
const mockExpire = jest.fn().mockResolvedValue(undefined);
const mockListTelegramDeliveries = jest.fn();
let mockRole = 'ADMIN';
let mockToken: string | undefined = 'admin-token';

const mockNotification: Notification = {
  id: 'notification-1',
  entityId: '',
  title: 'School notice',
  body: 'Bus arrives at 7:30.',
  createdAt: '2026-09-10T00:00:00Z',
  readAt: null,
};
const mockData = {
  bills: [],
  payments: [],
  requests: [],
  complaints: [],
  stops: [],
  notifications: [mockNotification],
};

jest.mock('../src/api/telegram', () => ({
  listTelegramDeliveries: (...args: unknown[]) =>
    mockListTelegramDeliveries(...args),
}));
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    session: {
      token: mockToken,
      user: { name: 'QA User', phone: '01712345678', role: mockRole },
    },
    baseUrl: 'https://api.example.com',
    expire: mockExpire,
  }),
}));
jest.mock('../src/context/DataContext', () => ({
  useCoreData: () => ({
    data: mockData,
    loading: false,
    error: '',
    refresh: mockRefresh,
    mutate: mockMutate,
  }),
}));
jest.mock('../src/context/ManagementContext', () => ({
  useManagement: () => ({ data: null }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));

let screen: TestRenderer.ReactTestRenderer;
const navigation = { navigate: mockNavigate, push: mockPush } as never;

beforeEach(async () => {
  await i18n.changeLanguage('en');
  mockRole = 'ADMIN';
  mockToken = 'admin-token';
  mockNavigate.mockReset();
  mockPush.mockReset();
  mockRefresh.mockReset().mockResolvedValue(undefined);
  mockMutate.mockReset().mockResolvedValue(undefined);
  mockExpire.mockReset().mockResolvedValue(undefined);
  mockListTelegramDeliveries.mockReset().mockResolvedValue([]);
  mockData.notifications[0].readAt = null;
});

afterEach(async () => {
  await act(async () => screen?.unmount());
});

function textContent() {
  return screen.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat()
    .filter(value => value !== null && value !== undefined)
    .map(String)
    .join(' ');
}

it('shows each guardian Telegram delivery with status and failure details', async () => {
  mockListTelegramDeliveries.mockResolvedValue([
    {
      id: 'delivery-1',
      notificationId: 'notification-1',
      userId: 'guardian-1',
      userName: 'Rahim Uddin',
      chatId: '9988',
      title: 'Pickup alert',
      body: 'The vehicle is near the pickup point.',
      status: 'SENT',
      attempts: 1,
      lastError: null,
      telegramMessageId: 41,
      createdAt: '2026-09-10T07:00:00Z',
      updatedAt: '2026-09-10T07:00:01Z',
      sentAt: '2026-09-10T07:00:01Z',
    },
    {
      id: 'delivery-2',
      notificationId: 'notification-2',
      guardianName: 'Karim Uddin',
      title: 'Pickup alert',
      body: 'Telegram could not be reached.',
      status: 'FAILED',
      attempts: 3,
      lastError: 'Bot was blocked by the user',
      createdAt: '2026-09-10T07:05:00Z',
      sentAt: null,
    },
  ]);

  await act(async () => {
    screen = TestRenderer.create(
      <NotificationsScreen navigation={navigation} route={{} as never} />,
    );
    await Promise.resolve();
  });

  expect(mockListTelegramDeliveries).toHaveBeenCalledWith(
    'https://api.example.com',
    'admin-token',
  );
  const content = textContent();
  expect(content).toContain('Rahim Uddin');
  expect(content).toContain('Sent');
  expect(content).toContain('Karim Uddin');
  expect(content).toContain('Failed');
  expect(content).toContain('Bot was blocked by the user');
  expect(content).toMatch(/Attempts\s*:\s*3/);
});

it('keeps existing notification navigation unchanged for admins', async () => {
  await act(async () => {
    screen = TestRenderer.create(
      <NotificationsScreen navigation={navigation} route={{} as never} />,
    );
    await Promise.resolve();
  });

  const notice = screen.root.findAll(
    node =>
      node.props.accessibilityRole === 'button' &&
      node.props.accessibilityLabel === 'School notice',
    { deep: false },
  )[0];
  await act(async () => notice.props.onPress());

  expect(mockNavigate).toHaveBeenCalledWith('NotificationDetails', {
    id: 'notification-1',
  });
  expect(mockPush).not.toHaveBeenCalled();
});

it('shows Telegram delivery summary on notification details when supplied by API', async () => {
  mockRole = 'GUARDIAN';
  mockToken = undefined;
  mockData.notifications[0].telegramDelivery = {
    status: 'FAILED',
    sentAt: null,
    lastError: 'Telegram connection expired',
  };

  await act(async () => {
    screen = TestRenderer.create(
      <NotificationDetailsScreen
        navigation={navigation}
        route={{ params: { id: 'notification-1' } } as never}
      />,
    );
  });

  expect(textContent()).toContain('Telegram delivery');
  expect(textContent()).toContain('Failed');
  expect(textContent()).toContain('Telegram connection expired');
  expect(screen.root.findByType(Button)).toBeDefined();
  delete mockData.notifications[0].telegramDelivery;
});

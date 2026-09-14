import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { HomeScreen } from '../src/screens/HomeScreen';
import {
  NotificationsScreen,
  NotificationDetailsScreen,
} from '../src/screens/NotificationsScreen';
import { Button } from '../src/components/ui';
import { i18n, locale } from '../src/i18n';
import { ProfileDrawer } from '../src/components/ProfileDrawer';
let mockRole = 'ADMIN';
const mockNavigate = jest.fn();
const mockPush = jest.fn();
const mockMutate = jest.fn().mockResolvedValue({});
let mockLoading = false,
  mockError = '';
const mockData = {
  bills: [
    {
      id: 'old-paid',
      month: '2026-08',
      status: 'PAID',
      amount: 90000,
      guardianName: 'A',
    },
    {
      id: 'paid',
      month: '2026-09',
      status: 'PAID',
      amount: 250000,
      guardianName: 'A',
    },
    {
      id: 'pending',
      month: '2026-09',
      status: 'UNPAID',
      amount: 250000,
      pendingSubmissionId: 'p1',
      guardianName: 'B',
    },
    {
      id: 'old-due',
      month: '2026-08',
      status: 'UNPAID',
      amount: 100000,
      guardianName: 'B',
    },
  ],
  payments: [],
  notifications: [
    {
      id: 'n1',
      entityId: '',
      title: 'School notice',
      body: 'Bus arrives at 7:30.',
      createdAt: '2026-09-10T00:00:00Z',
      readAt: null,
    },
  ],
  vehicles: [
    {
      id: 'v1',
      name: 'গাড়ি-০১',
      plate: 'ঢাকা-১২৩',
      imei: '868720065798377',
      status: 'RUNNING',
      driverName: 'Nur Alam',
    },
  ],
  locations: [],
  requests: [],
  routes: [],
  subscriptions: [],
};
const initialBills = mockData.bills;
const mockManagement = {
  data: { students: [], attendance: [], maintenance: [], requests: [] },
  loading: false,
  error: '',
  refresh: jest.fn(),
};
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    session: {
      user: { name: 'QA User', phone: '01712345678', role: mockRole },
    },
    signOut: jest.fn(),
  }),
}));
jest.mock('../src/context/DataContext', () => ({
  useData: () => ({
    data: mockData,
    loading: mockLoading,
    error: mockError,
    refresh: jest.fn(),
    mutate: mockMutate,
  }),
}));
jest.mock('../src/context/ManagementContext', () => ({
  useManagement: () => mockManagement,
}));
jest.mock('../src/components/ProfileDrawer', () => ({
  ProfileDrawer: () => null,
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-picker/picker', () => {
  const Picker = require('react-native').View;
  Picker.Item = Picker;
  return { Picker };
});
let screen: TestRenderer.ReactTestRenderer;
const navigation = { navigate: mockNavigate, push: mockPush } as never;
beforeEach(async () => {
  await i18n.changeLanguage('en');
  mockRole = 'ADMIN';
  mockLoading = false;
  mockError = '';
  mockData.bills = initialBills;
  mockData.notifications[0].entityId = '';
  mockMutate.mockReset().mockResolvedValue({});
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-10T06:00:00Z'));
});
afterEach(async () => {
  await act(async () => screen?.unmount());
  await i18n.changeLanguage('en');
  jest.restoreAllMocks();
});
function button(label: string) {
  return screen.root.findAll(
    node =>
      node.props.accessibilityRole === 'button' &&
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === 'function',
    { deep: false },
  )[0];
}
async function render() {
  await act(async () => {
    screen = TestRenderer.create(
      <HomeScreen navigation={navigation} route={{} as never} />,
    );
  });
}
it('shows this month billed/paid separately from arrears and keeps pending proofs unpaid', async () => {
  await render();
  expect(button('Billed this month, ৳5,000')).toBeDefined();
  expect(button('Outstanding dues, ৳3,500')).toBeDefined();
  expect(
    screen.root
      .findAllByType(Text)
      .some(node => node.props.children === 'Paid: ৳2,500'),
  ).toBe(true);
  await act(async () => button('Outstanding dues, ৳3,500').props.onPress());
  expect(mockNavigate).toHaveBeenLastCalledWith('DueList');
});
it('connects the four admin quick actions and unread inbox', async () => {
  await render();
  for (const [label, destination] of [
    ['Add student', 'Students'],
    ['Add payment', 'Bills'],
    ['Send notice', 'Notices'],
  ]) {
    const target = screen.root.findAll(
      node =>
        node.props.accessibilityLabel === label &&
        typeof node.props.onPress === 'function',
      { deep: false },
    )[0];
    await act(async () => target.props.onPress());
    expect(mockNavigate).toHaveBeenLastCalledWith(destination);
  }
  await act(async () => button('Add expense').props.onPress());
  expect(mockNavigate).toHaveBeenLastCalledWith('Accounts', { tab: 'EXPENSE' });
  await act(async () => button('Notifications, 1 unread').props.onPress());
  expect(mockNavigate).toHaveBeenLastCalledWith('Inbox');
});
it.each(['loading', 'error'])(
  'does not display zero financial balances when initial fetch is %s',
  async state => {
    mockData.bills = [];
    mockLoading = state === 'loading';
    mockError = state === 'error' ? 'Connection unavailable' : '';
    await render();
    expect(button('Billed this month, —')).toBeDefined();
    expect(button('Outstanding dues, —')).toBeDefined();
  },
);
it('guardian dashboard hides administration and never invents a live GPS state', async () => {
  mockRole = 'GUARDIAN';
  await render();
  expect(button('Add expense')).toBeUndefined();
  expect(button('Send notice')).toBeUndefined();
  expect(button('View location, Live Tracking')).toBeDefined();
  expect(
    screen.root
      .findAllByType(Text)
      .some(node => node.props.children === '● Live'),
  ).toBe(false);
  await act(async () => button('Application, New admission').props.onPress());
  expect(mockNavigate).toHaveBeenLastCalledWith('Admission');
});
it('retranslates a mounted admin dashboard with localized amounts and dates while preserving data', async () => {
  const originalData = JSON.stringify(mockData);
  await render();
  expect(button('Billed this month, ৳5,000')).toBeDefined();
  const date = () =>
    new Date('2026-09-10T12:00:00+06:00').toLocaleDateString(locale(), {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Dhaka',
    });
  const hasDate = () =>
    screen.root
      .findAllByType(Text)
      .some(
        node =>
          Array.isArray(node.props.children) &&
          node.props.children.includes(date()),
      );
  expect(hasDate()).toBe(true);
  await act(async () => {
    await i18n.changeLanguage('bn');
  });
  expect(button('এই মাসের পাওনা, ৳৫,০০০')).toBeDefined();
  expect(button('বকেয়া, ৳৩,৫০০')).toBeDefined();
  expect(
    screen.root
      .findAllByType(Text)
      .some(node => node.props.children === 'পরিশোধিত: ৳২,৫০০'),
  ).toBe(true);
  expect(hasDate()).toBe(true);
  expect(
    screen.root
      .findAllByType(Text)
      .some(node => node.props.children === 'গাড়ি-০১'),
  ).toBe(true);
  expect(
    screen.root
      .findAllByType(Text)
      .some(node => node.props.children === 'ড্রাইভার: Nur Alam'),
  ).toBe(true);
  await act(async () => button('খরচ যোগ').props.onPress());
  expect(mockNavigate).toHaveBeenLastCalledWith('Accounts', { tab: 'EXPENSE' });
  await act(async () => button('বকেয়া, ৳৩,৫০০').props.onPress());
  expect(mockNavigate).toHaveBeenLastCalledWith('DueList');
  await act(async () => {
    await i18n.changeLanguage('en');
  });
  expect(button('Billed this month, ৳5,000')).toBeDefined();
  expect(JSON.stringify(mockData)).toBe(originalData);
  expect(mockMutate).not.toHaveBeenCalled();
});
it('keeps an open guardian profile and offline vehicle state when the mounted language changes', async () => {
  mockRole = 'GUARDIAN';
  await render();
  await act(async () => button('Profile, QA User').props.onPress());
  expect(screen.root.findByType(ProfileDrawer).props.visible).toBe(true);
  await act(async () => {
    await i18n.changeLanguage('bn');
  });
  expect(button('প্রোফাইল, QA User')).toBeDefined();
  expect(screen.root.findByType(ProfileDrawer).props.visible).toBe(true);
  expect(button('খরচ যোগ')).toBeUndefined();
  expect(button('নোটিশ পাঠান')).toBeUndefined();
  expect(
    screen.root
      .findAllByType(Text)
      .some(node => node.props.children === 'অফলাইন'),
  ).toBe(true);
  expect(
    screen.root
      .findAllByType(Text)
      .some(node => node.props.children === '● লাইভ'),
  ).toBe(false);
  await act(async () => button('আবেদন, নতুন ভর্তি').props.onPress());
  expect(mockNavigate).toHaveBeenLastCalledWith('Admission');
});
it('opens a notification detail and persists the read decision', async () => {
  await act(async () => {
    screen = TestRenderer.create(
      <NotificationsScreen navigation={navigation} route={{} as never} />,
    );
  });
  await act(async () => button('School notice').props.onPress());
  expect(mockNavigate).toHaveBeenCalledWith('NotificationDetails', {
    id: 'n1',
  });
  await act(async () =>
    screen.update(
      <NotificationDetailsScreen
        navigation={navigation}
        route={{ params: { id: 'n1' } } as never}
      />,
    ),
  );
  expect(
    screen.root
      .findAllByType(Text)
      .some(node => node.props.children === 'Bus arrives at 7:30.'),
  ).toBe(true);
  await act(async () => screen.root.findByType(Button).props.onPress());
  expect(mockMutate).toHaveBeenCalledWith(
    '/notifications/n1/read',
    undefined,
    'PATCH',
  );
});

it.each(['ADMIN', 'GUARDIAN'])(
  'opens the linked bill directly for %s and marks the notification read',
  async role => {
    mockRole = role;
    mockData.notifications[0].entityId = 'old-due';
    await act(async () => {
      screen = TestRenderer.create(
        <NotificationsScreen navigation={navigation} route={{} as never} />,
      );
    });
    await act(async () => button('School notice').props.onPress());
    expect(mockPush).toHaveBeenCalledWith('Bills', { billId: 'old-due' });
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockMutate).toHaveBeenCalledWith(
      '/notifications/n1/read',
      undefined,
      'PATCH',
    );
  },
);

it('still opens the linked record when saving the read status fails', async () => {
  mockData.notifications[0].entityId = 'old-due';
  mockMutate.mockRejectedValueOnce(new Error('Could not save read status'));
  await act(async () => {
    screen = TestRenderer.create(
      <NotificationsScreen navigation={navigation} route={{} as never} />,
    );
  });
  await act(async () => button('School notice').props.onPress());
  expect(mockPush).toHaveBeenCalledWith('Bills', { billId: 'old-due' });
});

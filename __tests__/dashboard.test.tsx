import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { AccessibilityInfo, Text } from 'react-native';
import { HomeScreen, dashboardItems } from '../src/screens/HomeScreen';
import { ProfileDrawer } from '../src/components/ProfileDrawer';
import {
  NotificationsScreen,
  NotificationDetailsScreen,
} from '../src/screens/NotificationsScreen';
import { Button } from '../src/components/ui';

let mockRole = 'ADMIN';
const mockNavigate = jest.fn();
const mockMutate = jest.fn().mockResolvedValue({});
let mockLoading = false;
let mockError = '';
const mockData = {
  bills: [
    { id: 'paid-july', month: '2026-07', status: 'PAID', amount: 120050 },
    { id: 'paid-august', month: '2026-08', status: 'PAID', amount: 80000 },
    { id: 'due-august', month: '2026-08', status: 'UNPAID', amount: 150000 },
    {
      id: 'due-september',
      month: '2026-09',
      status: 'UNPAID',
      amount: 25000,
      pendingSubmissionId: 'pending',
    },
  ],
  payments: [
    { id: 'approved', billId: 'paid-july', status: 'APPROVED', amount: 120050 },
    {
      id: 'pending',
      billId: 'due-september',
      status: 'PENDING',
      amount: 25000,
    },
    {
      id: 'rejected',
      billId: 'due-august',
      status: 'REJECTED',
      amount: 150000,
    },
  ],
  notifications: [
    {
      id: 'n1',
      title: 'School notice',
      body: 'Bus arrives at 7:30.',
      createdAt: '2026-09-10T00:00:00Z',
      readAt: null,
    },
  ],
};
const initialBills = mockData.bills;
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
jest.mock('../src/components/LanguageSwitcher', () => ({
  LanguageSwitcher: () => null,
}));
jest.mock('../src/components/ProfileDrawer', () => ({
  ProfileDrawer: () => null,
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
const navigation = { navigate: mockNavigate } as never;
beforeEach(() => {
  mockRole = 'ADMIN';
  mockLoading = false;
  mockError = '';
  mockData.bills = initialBills;
  jest.clearAllMocks();
  jest
    .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
    .mockResolvedValue(true);
});
afterEach(async () => {
  await act(async () => screen?.unmount());
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
it('opens every admin shortcut and the unread notification destination', async () => {
  await act(async () => {
    screen = TestRenderer.create(
      <HomeScreen navigation={navigation} route={{} as never} />,
    );
  });
  for (const item of dashboardItems) {
    await act(async () => button(item.label).props.onPress());
    expect(mockNavigate).toHaveBeenLastCalledWith(item.screen);
  }
  await act(async () => button('Notifications, 1 unread').props.onPress());
  expect(mockNavigate).toHaveBeenLastCalledWith('Inbox');
});
it('keeps vehicle creation out of the guardian dashboard', async () => {
  mockRole = 'GUARDIAN';
  await act(async () => {
    screen = TestRenderer.create(
      <HomeScreen navigation={navigation} route={{} as never} />,
    );
  });
  expect(button('Create vehicle')).toBeUndefined();
  expect(button('Vehicles')).toBeDefined();
  expect(button('Student list')).toBeDefined();
  expect(button('Total paid, ৳2,000.5')).toBeDefined();
  expect(button('Total collected, ৳2,000.5')).toBeUndefined();
  for (const item of dashboardItems.filter(shortcut => !shortcut.adminOnly)) {
    await act(async () => button(item.label).props.onPress());
    expect(mockNavigate).toHaveBeenLastCalledWith(item.screen);
  }
});
it('totals paid and unpaid bills across months without counting payment submissions again', async () => {
  await act(async () => {
    screen = TestRenderer.create(
      <HomeScreen navigation={navigation} route={{} as never} />,
    );
  });
  expect(button('Total collected, ৳2,000.5')).toBeDefined();
  expect(button('Due balance, ৳1,750')).toBeDefined();
  expect(button('Total collected, ৳2,000.5').props.accessibilityHint).toBe(
    'Across all months',
  );
  await act(async () => button('Total collected, ৳2,000.5').props.onPress());
  expect(mockNavigate).toHaveBeenLastCalledWith('Bills');
  await act(async () => button('Due balance, ৳1,750').props.onPress());
  expect(mockNavigate).toHaveBeenLastCalledWith('DueList');
});
it.each(['loading', 'error'] as const)(
  'does not show zero balances when initial data is unavailable during %s',
  async state => {
    mockData.bills = [];
    mockLoading = state === 'loading';
    mockError = state === 'error' ? 'Connection unavailable' : '';
    await act(async () => {
      screen = TestRenderer.create(
        <HomeScreen navigation={navigation} route={{} as never} />,
      );
    });
    expect(button('Total collected, —')).toBeDefined();
    expect(button('Due balance, —')).toBeDefined();
  },
);
it('opens the profile drawer from the user banner and closes it on dismissal', async () => {
  await act(async () => {
    screen = TestRenderer.create(
      <HomeScreen navigation={navigation} route={{} as never} />,
    );
  });
  expect(screen.root.findAllByType(ProfileDrawer)).toHaveLength(0);
  await act(async () => button('Open profile, QA User').props.onPress());
  expect(screen.root.findByType(ProfileDrawer).props.visible).toBe(true);
  expect(
    button('Open profile, QA User').props.accessibilityState.expanded,
  ).toBe(true);
  await act(async () => screen.root.findByType(ProfileDrawer).props.onClose());
  expect(screen.root.findAllByType(ProfileDrawer)).toHaveLength(0);
  expect(
    button('Open profile, QA User').props.accessibilityState.expanded,
  ).toBe(false);
});
it('opens a notification detail and persists its read action', async () => {
  await act(async () => {
    screen = TestRenderer.create(
      <NotificationsScreen navigation={navigation} route={{} as never} />,
    );
  });
  await act(async () => button('School notice').props.onPress());
  expect(mockNavigate).toHaveBeenCalledWith('NotificationDetails', {
    id: 'n1',
  });
  await act(async () => {
    screen.update(
      <NotificationDetailsScreen
        navigation={navigation}
        route={{ params: { id: 'n1' } } as never}
      />,
    );
  });
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

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Alert, StyleSheet } from 'react-native';
import { DashboardData, User } from '../src/api/types';
import { Button, Field } from '../src/components/ui';
import { RequestsScreen } from '../src/screens/RequestsScreen';

const mockMutate = jest.fn();
let mockRole: User['role'] = 'ADMIN';
let mockData: DashboardData;
let screen: TestRenderer.ReactTestRenderer;

jest.mock('../src/components/LanguageSwitcher', () => ({
  LanguageSwitcher: () => null,
}));
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ session: { user: { role: mockRole } } }),
}));
jest.mock('../src/context/DataContext', () => ({
  useData: () => ({
    data: mockData,
    loading: false,
    error: '',
    refresh: jest.fn(),
    mutate: mockMutate,
  }),
}));
jest.mock('@react-native-picker/picker', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  const Picker = (props: object) => ReactModule.createElement(View, props);
  Picker.Item = (props: object) => ReactModule.createElement(View, props);
  return { Picker };
});
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));

beforeEach(() => {
  mockRole = 'ADMIN';
  mockMutate.mockReset().mockResolvedValue({});
  mockData = {
    accounts: [],
    vehicles: [],
    locations: [],
    routes: [],
    subscriptions: [],
    bills: [],
    payments: [],
    notifications: [],
    requests: [
      {
        id: 'request-1',
        studentName: 'Student One',
        guardianName: 'Guardian',
        guardianPhone: '01700000001',
        routeName: 'Central road',
        stopName: 'Main gate',
        vehicleName: 'Morning bus',
        status: 'PENDING',
        note: '',
      },
    ],
    complaints: [
      {
        id: 'complaint-1',
        studentName: 'Student One',
        guardianName: 'Guardian',
        category: 'LATE_PICKUP',
        description: 'The bus arrived late.',
        status: 'OPEN',
        note: '',
      },
    ],
    stops: [
      {
        id: 'stop-1',
        studentName: 'Student One',
        guardianName: 'Guardian',
        reason: 'Moving to another school',
        status: 'PENDING',
        note: '',
      },
    ],
  };
});

afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
  jest.restoreAllMocks();
});

async function renderScreen() {
  await act(async () => {
    screen = TestRenderer.create(<RequestsScreen />);
  });
}

function disclosures() {
  return screen.root.findAll(
    node =>
      node.props.accessibilityRole === 'button' &&
      typeof node.props.accessibilityState?.expanded === 'boolean' &&
      typeof node.props.onPress === 'function',
    { deep: false },
  );
}

function actionPanels() {
  return screen.root.findAll(
    node =>
      typeof node.props.accessibilityElementsHidden === 'boolean' &&
      !node.props.testID,
    { deep: false },
  );
}

function tab(label: string) {
  return screen.root.findAll(
    node =>
      node.props.accessibilityRole === 'tab' &&
      node.props.accessibilityLabel === label &&
      typeof node.props.onPress === 'function',
    { deep: false },
  )[0];
}

function section(label: string) {
  return screen.root.findByProps({ testID: `request-section-${label}` });
}

async function selectTab(label: string) {
  await act(async () => tab(label).props.onPress());
}

it('opens each review independently and preserves notes when collapsed', async () => {
  await renderScreen();
  expect(disclosures()).toHaveLength(3);
  actionPanels().forEach(panel => {
    expect(StyleSheet.flatten(panel.props.style).display).toBe('none');
    expect(panel.props.importantForAccessibility).toBe('no-hide-descendants');
  });
  await act(async () => disclosures()[0].props.onPress());
  expect(actionPanels()[0].props.accessibilityElementsHidden).toBe(false);
  expect(actionPanels()[1].props.accessibilityElementsHidden).toBe(true);
  const fields = () => actionPanels()[0].findAllByType(Field);
  await act(async () => {
    fields()
      .find(field => field.props.label === 'Call note')!
      .props.onChangeText('Guardian confirmed pickup');
    fields()
      .find(field => field.props.label === 'Review note / rejection reason')!
      .props.onChangeText('Coverage confirmed');
  });
  await act(async () => disclosures()[0].props.onPress());
  await act(async () => disclosures()[0].props.onPress());
  expect(fields().map(field => field.props.value)).toEqual([
    'Guardian confirmed pickup',
    'Coverage confirmed',
  ]);
  await selectTab('Complaints');
  await act(async () => disclosures()[1].props.onPress());
  await selectTab('Stop requests');
  await act(async () => disclosures()[2].props.onPress());
  actionPanels().forEach(panel => {
    expect(panel.props.accessibilityElementsHidden).toBe(false);
  });
  expect(mockMutate).not.toHaveBeenCalled();
});

it('shows only the selected section and keeps review drafts across tab changes', async () => {
  await renderScreen();
  const labels = ['Applications', 'Complaints', 'Stop requests'];
  for (const selected of labels) {
    await selectTab(selected);
    labels.forEach(label => {
      const visible = label === selected;
      expect(tab(label).props.accessibilityState.selected).toBe(visible);
      expect(section(label).props.accessibilityElementsHidden).toBe(!visible);
      expect(section(label).props.importantForAccessibility).toBe(
        visible ? 'auto' : 'no-hide-descendants',
      );
      expect(StyleSheet.flatten(section(label).props.style).display).toBe(
        visible ? undefined : 'none',
      );
    });
  }
  await selectTab('Applications');
  await act(async () => disclosures()[0].props.onPress());
  await act(async () => {
    section('Applications')
      .findAllByType(Field)
      .find(field => field.props.label === 'Call note')!
      .props.onChangeText('Call again tomorrow');
  });
  await selectTab('Complaints');
  await selectTab('Applications');
  expect(disclosures()[0].props.accessibilityState.expanded).toBe(true);
  expect(
    section('Applications')
      .findAllByType(Field)
      .find(field => field.props.label === 'Call note')!.props.value,
  ).toBe('Call again tomorrow');
  expect(mockMutate).not.toHaveBeenCalled();
});

it('keeps empty sections reachable from their tabs', async () => {
  mockData.requests = [];
  mockData.complaints = [];
  mockData.stops = [];
  await renderScreen();
  expect(tab('Applications').props.accessibilityState.selected).toBe(true);
  for (const label of ['Complaints', 'Stop requests', 'Applications']) {
    await selectTab(label);
    expect(section(label).props.accessibilityElementsHidden).toBe(false);
    expect(tab(label).props.accessibilityState.selected).toBe(true);
  }
});

it('keeps approval confirmation and submits the selected request after expansion', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  await renderScreen();
  await act(async () => disclosures()[0].props.onPress());
  await act(async () => {
    actionPanels()[0]
      .findAllByType(Button)
      .find(button => button.props.title === 'Approve')!
      .props.onPress();
  });
  expect(mockMutate).not.toHaveBeenCalled();
  const confirm = alert.mock.calls[0][2]!.find(
    button => button.text === 'Confirm',
  )!;
  await act(async () => confirm.onPress!());
  expect(mockMutate).toHaveBeenCalledWith(
    '/admin/requests/request-1/decision',
    {
      decision: 'APPROVED',
      note: '',
    },
    'PATCH',
  );
});

it('does not expose admin actions in the guardian view', async () => {
  mockRole = 'GUARDIAN';
  await renderScreen();
  expect(disclosures()).toHaveLength(0);
  expect(tab('Applications')).toBeUndefined();
  expect(
    screen.root
      .findAllByType(Button)
      .some(button => button.props.title === 'Send service request'),
  ).toBe(true);
  expect(mockMutate).not.toHaveBeenCalled();
});

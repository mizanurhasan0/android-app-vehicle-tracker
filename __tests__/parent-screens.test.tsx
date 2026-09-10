import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParams } from '../src/navigation/types';
import { ManagementOverview, Student } from '../src/api/management';
import { DashboardData } from '../src/api/types';
import { Button, Field, Select } from '../src/components/ui';
import {
  AdmissionScreen,
  ApplicationStatusScreen,
  ParentJourneyScreen,
} from '../src/screens/parent/ParentScreens';
import {
  contactUrl,
  dhakaDate,
  studentSchedule,
} from '../src/screens/parent/parentUtils';

const mockMutate = jest.fn();
const mockRefresh = jest.fn();
const mockPickPhoto = jest.fn();
let mockData: DashboardData;
let mockManagement: ManagementOverview;
let screen: TestRenderer.ReactTestRenderer;
const navigation = {
  navigate: jest.fn(),
  replace: jest.fn(),
  canGoBack: jest.fn(() => true),
  goBack: jest.fn(),
};
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    session: {
      user: {
        id: 'parent',
        name: 'Guardian',
        phone: '01700000001',
        role: 'GUARDIAN',
      },
    },
  }),
}));
jest.mock('../src/context/DataContext', () => ({
  useData: () => ({
    data: mockData,
    loading: false,
    error: '',
    refresh: mockRefresh,
    mutate: mockMutate,
  }),
}));
jest.mock('../src/context/ManagementContext', () => ({
  useManagement: () => ({
    data: mockManagement,
    loading: false,
    error: '',
    refresh: mockRefresh,
  }),
}));
jest.mock('../src/utils/photo', () => ({
  pickStudentPhoto: () => mockPickPhoto(),
}));
jest.mock('../src/components/FleetMap', () => ({ FleetMap: () => null }));
jest.mock('../src/components/VehicleCard', () => ({ VehicleCard: () => null }));
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
  jest.clearAllMocks();
  mockMutate.mockResolvedValue({ id: 'new-request' });
  mockRefresh.mockResolvedValue(undefined);
  mockData = {
    vehicles: [],
    locations: [],
    subscriptions: [],
    payments: [],
    bills: [],
    accounts: [],
    requests: [],
    stops: [],
    complaints: [],
    notifications: [],
    routes: [
      {
        id: 'route-1',
        name: 'South road',
        vehicleId: 'bus-1',
        vehicleName: 'Bus 1',
        monthlyAmount: 250000,
        stops: [{ id: 'stop-1', name: 'Main gate' }],
      },
      {
        id: 'route-2',
        name: 'North road',
        vehicleId: 'bus-2',
        vehicleName: 'Bus 2',
        monthlyAmount: 280000,
        stops: [{ id: 'stop-2', name: 'North gate' }],
      },
    ],
  };
  mockManagement = {
    students: [],
    drivers: [],
    attendance: [],
    maintenance: [],
    ledger: [],
    notices: [],
    requests: [],
    schedules: [],
    settings: {
      businessName: 'Noor Transport',
      phone: '',
      address: '',
      emergencyPhone: '',
      whatsappNumber: '',
      paymentReminder: '',
      absenceMessage: '',
      delayMessage: '',
      holidayMessage: '',
      emergencyMessage: '',
    },
  };
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
});
const props = <N extends keyof HomeStackParams>(
  name: N,
  params?: HomeStackParams[N],
) =>
  ({
    navigation,
    route: { key: name, name, params },
  } as unknown as NativeStackScreenProps<HomeStackParams, N>);
async function button(title: string) {
  await act(async () =>
    screen.root
      .findAllByType(Button)
      .find(item => item.props.title === title)!
      .props.onPress(),
  );
}
async function field(label: string, value: string) {
  await act(async () =>
    screen.root
      .findAllByType(Field)
      .find(item => item.props.label === label)!
      .props.onChangeText(value),
  );
}
async function selectRoute(index: number) {
  await act(async () =>
    screen.root
      .findAll(
        node =>
          node.props.accessibilityRole === 'radio' &&
          typeof node.props.onPress === 'function',
        { deep: false },
      )
      [index].props.onPress(),
  );
}

it('validates and submits the reviewed admission fields, using the authenticated guardian', async () => {
  await act(async () => {
    screen = TestRenderer.create(<AdmissionScreen {...props('Admission')} />);
  });
  await button('পরবর্তী');
  expect(
    screen.root
      .findAllByType(Field)
      .some(item => item.props.label === 'শিক্ষার্থীর নাম *'),
  ).toBe(true);
  await field('শিক্ষার্থীর নাম *', ' Student One ');
  await field('শ্রেণি *', 'Class 6');
  await field('রোল নম্বর', '21');
  mockPickPhoto.mockResolvedValue('data:image/jpeg;base64,cGhvdG8=');
  await act(async () =>
    screen.root
      .findAll(
        node =>
          node.props.accessibilityLabel === 'শিক্ষার্থীর ছবি নির্বাচন করুন' &&
          typeof node.props.onPress === 'function',
        { deep: false },
      )[0]
      .props.onPress(),
  );
  await button('পরবর্তী');
  await field('পিকআপ ঠিকানা *', ' House 12 ');
  await field('ড্রপ ঠিকানা', 'Madrasa');
  await field('জরুরি যোগাযোগ নম্বর', '01700000002');
  await button('পরবর্তী');
  await selectRoute(0);
  await act(async () =>
    screen.root.findByType(Select).props.onChange('stop-1'),
  );
  await button('পরবর্তী');
  expect(mockMutate).not.toHaveBeenCalled();
  await button('আবেদন জমা দিন');
  expect(mockMutate).toHaveBeenCalledWith('/requests/guardian/new', {
    studentName: 'Student One',
    routeId: 'route-1',
    stopId: 'stop-1',
    className: 'Class 6',
    roll: '21',
    photoUrl: 'data:image/jpeg;base64,cGhvdG8=',
    emergencyContact: '01700000002',
    pickupAddress: 'House 12',
    dropAddress: 'Madrasa',
  });
  expect(navigation.replace).toHaveBeenCalledWith('ApplicationStatus', {
    id: 'new-request',
  });
});

it('clears the old pickup stop when changing route and preserves earlier student fields', async () => {
  await act(async () => {
    screen = TestRenderer.create(<AdmissionScreen {...props('Admission')} />);
  });
  await field('শিক্ষার্থীর নাম *', 'Student One');
  await field('শ্রেণি *', 'Class 6');
  await button('পরবর্তী');
  await field('পিকআপ ঠিকানা *', 'House 12');
  await button('পরবর্তী');
  await selectRoute(0);
  await act(async () =>
    screen.root.findByType(Select).props.onChange('stop-1'),
  );
  await selectRoute(1);
  expect(screen.root.findByType(Select).props.value).toBe('');
  expect(screen.root.findByType(Select).props.options).toEqual([
    { value: 'stop-2', label: 'North gate' },
  ]);
  await button('পরবর্তী');
  expect(mockMutate).not.toHaveBeenCalled();
  expect(screen.root.findByType(Select).props.label).toBe('পিকআপ স্টপ *');
  await button('আগের ধাপ');
  await button('আগের ধাপ');
  expect(
    screen.root
      .findAllByType(Field)
      .find(item => item.props.label === 'শিক্ষার্থীর নাম *')!.props.value,
  ).toBe('Student One');
});

it('does not show approval for a pending admission or invent a review timestamp', async () => {
  mockData.requests = [
    {
      id: 'request',
      studentName: 'Student One',
      guardianName: 'Guardian',
      guardianPhone: '01700000001',
      routeName: 'South road',
      stopName: 'Main gate',
      vehicleName: 'Bus 1',
      status: 'PENDING',
      note: '',
    },
  ];
  await act(async () => {
    screen = TestRenderer.create(
      <ApplicationStatusScreen
        {...props('ApplicationStatus', { id: 'request' })}
      />,
    );
  });
  const text = screen.root
    .findAllByType(Text)
    .map(item => item.props.children)
    .flat()
    .join(' ');
  expect(text).toContain('পর্যালোচনার অপেক্ষায়');
  expect(text).not.toContain('আবেদন গৃহীত হয়েছে');
  expect(text).not.toContain('Invalid Date');
});

const student = {
  id: 'student',
  routeId: 'route-1',
  stopId: 'stop-1',
  studentName: 'Student One',
  routeName: 'South road',
  vehicleName: 'Bus 1',
  vehicleId: 'bus-1',
} as Student;
it('shows schedules as scheduled and keeps missing attendance unknown', async () => {
  mockManagement.students = [student];
  mockManagement.schedules = [
    {
      id: 'schedule',
      routeId: 'route-1',
      stopId: 'stop-1',
      studentId: 'student',
      label: 'Morning pickup',
      time: '06:00',
      period: 'MORNING',
      position: 1,
    },
  ];
  await act(async () => {
    screen = TestRenderer.create(
      <ParentJourneyScreen {...props('TodayJourney')} />,
    );
  });
  const text = screen.root
    .findAllByType(Text)
    .map(item => item.props.children)
    .flat()
    .join(' ');
  expect(text).toContain('এখনও নথিভুক্ত হয়নি');
  expect(text).toContain('নির্ধারিত সময়');
  expect(text).not.toContain('সম্পন্ন');
  expect(text).not.toContain('পৌঁছেছে');
});

it('selects only the student’s scheduled stops and orders them by route position', () => {
  const entry = {
    routeId: 'route-1',
    stopId: null,
    studentId: null,
    label: 'Stop',
    time: '06:00',
    period: 'MORNING' as const,
    position: 1,
  };
  const entries = [
    { ...entry, id: 'later', position: 3 },
    { ...entry, id: 'other-student', studentId: 'other' },
    { ...entry, id: 'other-route', routeId: 'route-2' },
    { ...entry, id: 'other-stop', stopId: 'stop-2' },
    { ...entry, id: 'earlier', studentId: 'student', stopId: 'stop-1' },
  ];
  expect(
    studentSchedule(entries, student, 'MORNING').map(item => item.id),
  ).toEqual(['earlier', 'later']);
});

it('normalizes Bangladesh WhatsApp links and rejects arbitrary URI content', () => {
  expect(contactUrl('01712 345678', 'whatsapp')).toBe(
    'https://wa.me/8801712345678',
  );
  expect(contactUrl('+8801712345678', 'call')).toBe('tel:+8801712345678');
  expect(contactUrl('01712345678', 'sms')).toBe('sms:01712345678');
  expect(() => contactUrl('01712345678?body=private', 'sms')).toThrow();
  expect(() => contactUrl('https://example.test', 'call')).toThrow();
  expect(dhakaDate(Date.parse('2026-09-09T18:15:00Z'))).toBe('2026-09-10');
});

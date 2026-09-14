import React from 'react';
import { ToastHost } from '../src/components/Toast';
import TestRenderer, { act } from 'react-test-renderer';
import { Linking, Text, View } from 'react-native';
import { api } from '../src/api/client';
import {
  ManagementOverview,
  ManagementReport,
  Student,
} from '../src/api/management';
import { DashboardData } from '../src/api/types';
import { i18n } from '../src/i18n';
import { currentMonth } from '../src/utils/format';
import { saveReportFile } from '../src/utils/photo';
import {
  CommunicationScreen,
  NoticesScreen,
  RequestsScreen,
  SettingsScreen,
} from '../src/screens/admin/OfficeScreens';
import { ReportsScreen } from '../src/screens/admin/ReportsScreen';
import {
  Choice,
  FormModal,
  Heading,
  Input,
  Tabs,
} from '../src/screens/admin/AdminUi';

const mockMutate = jest.fn();
const mockUpdateProfile = jest.fn();
const mockNavigate = jest.fn();
const mockExpire = jest.fn();
let mockRole = 'ADMIN';
let mockManagement: ManagementOverview;
let mockTransport: DashboardData;
let mockReport: ManagementReport;
let screen: TestRenderer.ReactTestRenderer;

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('../src/api/client', () => ({
  api: jest.fn(),
  ApiError: class extends Error {},
}));
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    baseUrl: 'https://school.example',
    session: {
      token: 'token',
      user: { name: 'Admin', phone: '01700000000', role: mockRole },
    },
    updateProfile: mockUpdateProfile,
    signOut: jest.fn(),
    expire: mockExpire,
  }),
}));
jest.mock('../src/context/DataContext', () => ({
  useData: () => ({ data: mockTransport }),
}));
jest.mock('../src/context/ManagementContext', () => ({
  useManagement: () => ({ data: mockManagement, mutate: mockMutate }),
}));
jest.mock('../src/components/LanguageSwitcher', () => ({
  LanguageSwitcher: () => null,
}));
jest.mock('../src/utils/photo', () => ({ saveReportFile: jest.fn() }));
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
  jest.clearAllMocks();
  await i18n.changeLanguage('en');
  mockRole = 'ADMIN';
  mockMutate.mockResolvedValue({});
  mockUpdateProfile.mockResolvedValue(undefined);
  jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  jest.mocked(saveReportFile).mockResolvedValue(true);
  const student: Student = {
    id: 'student-1',
    subscriptionId: 'subscription-1',
    guardianId: 'guardian-1',
    studentName: 'Student',
    studentCode: '001',
    className: 'Class 6',
    roll: '01',
    photoUrl: '',
    guardianName: 'Guardian',
    guardianPhone: '01700000001',
    pickupAddress: '',
    dropAddress: '',
    emergencyContact: '',
    routeId: 'route-1',
    routeName: 'Route',
    stopId: 'stop-1',
    stopName: 'Stop',
    vehicleId: 'bus-1',
    vehicleName: 'Vehicle',
    driverName: 'Driver',
    driverPhone: '01700000002',
    monthlyAmount: 250050,
    status: 'ACTIVE',
    startedAt: '2026-09-01',
  };
  mockManagement = {
    students: [student],
    drivers: [],
    attendance: [],
    maintenance: [],
    ledger: [],
    schedules: [],
    settings: {
      businessName: 'Business name',
      phone: '01700000000',
      address: 'Address',
      emergencyPhone: '',
      whatsappNumber: '',
      paymentReminder: 'Payment reminder',
      absenceMessage: 'Absence message',
      delayMessage: 'Vehicle delay',
      holidayMessage: 'Holiday message',
      emergencyMessage: 'Emergency message',
    },
    notices: [
      {
        id: 'notice-1',
        title: 'Title',
        body: 'Message',
        category: 'GENERAL',
        audience: 'ALL',
        targetId: null,
        createdAt: '2026-09-01T12:00:00Z',
      },
    ],
    requests: [
      {
        id: 'request-1',
        userId: 'guardian-1',
        userName: 'Guardian',
        studentId: 'student-1',
        studentName: 'Student',
        driverId: null,
        vehicleId: null,
        category: 'ABSENCE',
        title: 'Title',
        description: 'Description',
        date: '2026-09-01',
        status: 'PENDING',
        note: 'Note',
        createdAt: '2026-09-01T12:00:00Z',
        reviewedAt: null,
      },
    ],
  };
  mockTransport = {
    vehicles: [{ id: 'bus-1', name: 'Vehicle', plate: '001', imei: '12345' }],
    routes: [
      {
        id: 'route-1',
        name: 'Route',
        vehicleId: 'bus-1',
        vehicleName: 'Vehicle',
        monthlyAmount: 250050,
        stops: [{ id: 'stop-1', name: 'Stop' }],
      },
    ],
    bills: [],
    locations: [],
    subscriptions: [],
    payments: [],
    accounts: [],
    requests: [],
    stops: [],
    complaints: [],
    notifications: [],
  };
  mockReport = {
    month: currentMonth(),
    billing: { expected: 250050, paid: 0, due: 250050, previousDue: 0 },
    cashflow: {
      fareReceived: 250050,
      otherIncome: 0,
      expenses: 0,
      investment: 0,
      net: 250050,
    },
    students: { total: 1, active: 1 },
    drivers: 0,
    vehicles: 1,
    attendance: { present: 0, absent: 0, leave: 0 },
    ledger: [
      {
        id: 'ledger-1',
        type: 'EXPENSE',
        category: 'OFFICE',
        title: 'Title',
        amount: 250050,
        date: '2026-09-01',
        note: 'Note',
        vehicleId: null,
        driverId: null,
        maintenanceId: null,
        createdAt: '2026-09-01T12:00:00Z',
      },
    ],
  };
  jest.mocked(api).mockImplementation(async () => mockReport);
});

afterEach(async () => {
  await act(async () => screen?.unmount());
  await i18n.changeLanguage('en');
  jest.restoreAllMocks();
});

const text = () =>
  screen.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat()
    .join(' ');
const modal = () =>
  screen.root.findAllByType(FormModal).find(node => node.props.visible)!;
const input = (label: string) =>
  screen.root.findAllByType(Input).find(node => node.props.label === label)!;
const choice = (label: string) =>
  screen.root.findAllByType(Choice).find(node => node.props.label === label)!;
const render = async (Component: React.ComponentType) => {
  await act(async () => {
    screen = TestRenderer.create(
      <View>
        <Component />
        <ToastHost />
      </View>,
    );
  });
};
const switchLanguage = async (language: 'en' | 'bn') => {
  await act(async () => {
    await i18n.changeLanguage(language);
  });
};
const press = async (label: string, role = 'button') => {
  const button = screen.root.findAll(
    node =>
      node.props.accessibilityRole === role &&
      typeof node.props.onPress === 'function' &&
      node.findAllByType(Text).some(child => child.props.children === label),
    { deep: false },
  )[0];
  expect(button).toBeDefined();
  await act(async () => button.props.onPress());
};
const startAdding = async () => {
  await act(async () =>
    screen.root
      .findAllByType(Heading)
      .find(node => node.props.onAction)!
      .props.onAction(),
  );
};
const save = async () => {
  await act(async () => modal().props.onSave());
};

it('updates a mounted notice form and its validation while preserving target IDs and authored text', async () => {
  await render(NoticesScreen);
  expect(text()).toContain('Notices for guardians');
  await startAdding();
  await act(async () => input('Title *').props.onChangeText('Title'));
  await act(async () => input('Message *').props.onChangeText('Message'));
  await act(async () => choice('Send to').props.onChange('ROUTE'));
  await save();
  expect(text()).toContain('Select who should receive the notice.');
  await switchLanguage('bn');
  expect(text()).toContain('অভিভাবকদের নোটিশ');
  expect(text()).toContain('যাকে পাঠাবেন তাকে নির্বাচন করুন।');
  expect(input('শিরোনাম *').props.value).toBe('Title');
  expect(input('বার্তা *').props.value).toBe('Message');
  expect(choice('যাকে পাঠাবেন').props.value).toBe('ROUTE');
  expect(choice('প্রাপক নির্বাচন করুন').props.options).toEqual([
    { value: 'route-1', label: 'Route' },
  ]);
  await act(async () =>
    choice('প্রাপক নির্বাচন করুন').props.onChange('route-1'),
  );
  await switchLanguage('en');
  expect(choice('Select recipient').props.value).toBe('route-1');
  await save();
  expect(mockMutate).toHaveBeenCalledWith('/admin/notices', {
    title: 'Title',
    body: 'Message',
    category: 'GENERAL',
    audience: 'ROUTE',
    targetId: 'route-1',
  });
});

it('preserves request decisions and notes while translating tabs and their count', async () => {
  await render(RequestsScreen);
  expect(screen.root.findByType(Tabs).props.options[0].label).toBe('New (1)');
  await press(i18n.t('Reject'));
  await act(async () =>
    input('Reason for rejection *').props.onChangeText('Note'),
  );
  await switchLanguage('bn');
  expect(screen.root.findByType(Tabs).props.options[0].label).toBe('নতুন (১)');
  expect(modal().props.title).toBe('অনুরোধ প্রত্যাখ্যান');
  expect(input('প্রত্যাখ্যানের কারণ *').props.value).toBe('Note');
  expect(text()).toContain('Description');
  await save();
  expect(mockMutate).toHaveBeenCalledWith(
    '/admin/management-requests/request-1/decision',
    { decision: 'REJECTED', note: 'Note' },
    'PATCH',
  );
});

it('preserves a new request category, student and date while switching the open form', async () => {
  await render(RequestsScreen);
  await startAdding();
  await act(async () => input('Title').props.onChangeText('Title'));
  await act(async () => input('Description').props.onChangeText('Description'));
  await act(async () =>
    input('Date (YYYY-MM-DD)').props.onChangeText('2026-09-01'),
  );
  await act(async () => choice('Student').props.onChange('student-1'));
  await switchLanguage('bn');
  expect(choice('ধরন').props.value).toBe('ABSENCE');
  expect(choice(i18n.t('Student')).props.value).toBe('student-1');
  expect(input(i18n.t('Date (YYYY-MM-DD)')).props.value).toBe('2026-09-01');
  await save();
  expect(mockMutate).toHaveBeenCalledWith('/management/requests', {
    category: 'ABSENCE',
    title: 'Title',
    description: 'Description',
    date: '2026-09-01',
    studentId: 'student-1',
  });
});

it('keeps settings permissions, section identity, profile data and navigation stable', async () => {
  mockRole = 'GUARDIAN';
  await render(SettingsScreen);
  await press('My profile');
  await act(async () => input('Your name').props.onChangeText('Admin'));
  await switchLanguage('bn');
  expect(modal().props.title).toBe('আমার প্রোফাইল');
  expect(input('আপনার নাম').props.value).toBe('Admin');
  expect(text()).not.toContain('ব্যবসার তথ্য');
  expect(text()).not.toContain('SMS সেটিংস');
  await save();
  expect(mockUpdateProfile).toHaveBeenCalledWith({ name: 'Admin' });
  expect(mockMutate).not.toHaveBeenCalled();
  await act(async () => screen.unmount());
  mockRole = 'ADMIN';
  await render(SettingsScreen);
  await press('পেমেন্ট পদ্ধতি');
  expect(mockNavigate).toHaveBeenCalledWith('PaymentAccounts');
  await switchLanguage('en');
  await press('Payment methods');
  expect(mockNavigate).toHaveBeenLastCalledWith('PaymentAccounts');
});

it('preserves authored SMS settings while translating an open settings section', async () => {
  await render(SettingsScreen);
  await press('SMS settings');
  await act(async () =>
    input('Payment reminder').props.onChangeText('Custom message ১২৩'),
  );
  await switchLanguage('bn');
  expect(modal().props.title).toBe('SMS সেটিংস');
  expect(input('পেমেন্ট রিমাইন্ডার').props.value).toBe('Custom message ১২৩');
  await save();
  expect(mockMutate).toHaveBeenCalledWith(
    '/admin/settings',
    {
      paymentReminder: 'Custom message ১২৩',
      absenceMessage: 'Absence message',
      delayMessage: 'Vehicle delay',
      holidayMessage: 'Holiday message',
      emergencyMessage: 'Emergency message',
    },
    'PATCH',
  );
});

it('keeps SMS recipients and template contents intact after switching language', async () => {
  await render(CommunicationScreen);
  await press('Payment reminder');
  await act(async () => choice('Recipient').props.onChange('01700000001'));
  await switchLanguage('bn');
  expect(modal().props.title).toBe('SMS বার্তা');
  expect(choice('প্রাপক').props.value).toBe('01700000001');
  expect(choice('প্রাপক').props.options).toEqual([
    { value: '01700000001', label: 'Guardian · Student' },
  ]);
  expect(input('বার্তা').props.value).toBe('Payment reminder');
  await save();
  const url = jest.mocked(Linking.openURL).mock.calls[0][0];
  expect(url).toMatch(/^sms:01700000001[?&]body=/);
  expect(decodeURIComponent(url.split('body=')[1])).toBe('Payment reminder');
  await act(async () => input('বার্তা').props.onChangeText('Message ১২৩'));
  await switchLanguage('en');
  expect(input('Message').props.value).toBe('Message ১২৩');
  await save();
  expect(
    decodeURIComponent(
      jest.mocked(Linking.openURL).mock.calls[1][0].split('body=')[1],
    ),
  ).toBe('Message ১২৩');
});

it('retranslates reports and saved feedback without refetching or altering CSV data', async () => {
  await render(ReportsScreen);
  await press('Student report', 'radio');
  await press('Excel (CSV)');
  const englishCsv = jest.mocked(saveReportFile).mock.calls[0][1];
  expect(englishCsv).toContain('"Student report"');
  expect(englishCsv).toContain(
    '"Student","001","Class 6","Guardian","01700000001","Route","Vehicle","2500.5","ACTIVE"',
  );
  await switchLanguage('bn');
  expect(text()).toContain('রিপোর্ট সংরক্ষণ হয়েছে।');
  expect(text()).toContain('২,৫০০.৫');
  expect(text()).toContain(
    'Student · 001 · Class 6 · Guardian · 01700000001 · Route · Vehicle',
  );
  expect(input('রিপোর্টের মাস (YYYY-MM)').props.value).toBe(mockReport.month);
  expect(
    screen.root
      .findAllByType(Heading)
      .some(node => node.props.title === 'শিক্ষার্থী রিপোর্ট'),
  ).toBe(true);
  expect(api).toHaveBeenCalledTimes(1);
  await press('এক্সেল (CSV)');
  const [filename, banglaCsv, mime] = jest.mocked(saveReportFile).mock.calls[1];
  expect(filename).toBe(`noor-students-${mockReport.month}.csv`);
  expect(mime).toBe('text/csv');
  expect(banglaCsv).toContain('"শিক্ষার্থী রিপোর্ট"');
  expect(banglaCsv).toContain('"শিক্ষার্থী","আইডি"');
  expect(banglaCsv.split('\r\n').at(-1)).toBe(englishCsv.split('\r\n').at(-1));
  expect(mockManagement.students[0].status).toBe('ACTIVE');
  await press('PDF ডাউনলোড');
  expect(jest.mocked(saveReportFile).mock.calls[2][1]).toContain('২,৫০০.৫');
  expect(api).toHaveBeenCalledTimes(1);
});

it('preserves report dates and retranslates visible validation without another request', async () => {
  await render(ReportsScreen);
  await press('Daily report', 'radio');
  await act(async () =>
    input('Attendance date (YYYY-MM-DD)').props.onChangeText('2026-09-02'),
  );
  await act(async () =>
    input('Report month (YYYY-MM)').props.onChangeText('2026-13'),
  );
  expect(text()).toContain('Enter the month in YYYY-MM format.');
  await switchLanguage('bn');
  expect(text()).toContain('মাস YYYY-MM ফরম্যাটে দিন।');
  expect(input('উপস্থিতির তারিখ (YYYY-MM-DD)').props.value).toBe('2026-09-02');
  expect(input('রিপোর্টের মাস (YYYY-MM)').props.value).toBe('2026-13');
  expect(api).toHaveBeenCalledTimes(1);
  expect(saveReportFile).not.toHaveBeenCalled();
});

it('opens the notified operational request even when it has already been reviewed', async () => {
  mockManagement.requests.push({
    ...mockManagement.requests[0],
    id: 'reviewed-request',
    title: 'Reviewed request',
    status: 'APPROVED',
  });
  await act(async () => {
    screen = TestRenderer.create(
      <RequestsScreen
        route={{
          key: 'target',
          name: 'OperationalRequests',
          params: { id: 'reviewed-request' },
        }}
      />,
    );
  });
  expect(screen.root.findByType(Tabs).props.value).toBe('APPROVED');
  expect(text()).toContain('Reviewed request');
  expect(
    screen.root
      .findAllByType(Text)
      .some(node => node.props.children === 'Title'),
  ).toBe(false);
  expect(mockMutate).not.toHaveBeenCalled();
});

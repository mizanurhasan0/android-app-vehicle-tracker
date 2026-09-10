import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { ManagementOverview, Student } from '../src/api/management';
import { DashboardData } from '../src/api/types';
import {
  AttendanceScreen,
  AccountsScreen,
  MaintenanceScreen,
} from '../src/screens/admin/OperationsScreens';
import {
  StudentsScreen,
  StudentProfileScreen,
  DriversScreen,
  DriverProfileScreen,
} from '../src/screens/admin/PeopleScreens';
import {
  NoticesScreen,
  RequestsScreen,
  CommunicationScreen,
  SettingsScreen,
} from '../src/screens/admin/OfficeScreens';
import {
  Choice,
  FormModal,
  Heading,
  Input,
  SmallButton,
  today,
} from '../src/screens/admin/AdminUi';

const mockMutate = jest.fn();
const mockUpdateProfile = jest.fn();
const mockRefresh = jest.fn();
let mockRole = 'ADMIN';
let mockParams: object = {};
let mockData: DashboardData;
let mockManagement: ManagementOverview;
let screen: TestRenderer.ReactTestRenderer;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  useRoute: () => ({ params: mockParams }),
}));
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({
    session: {
      user: {
        id: 'admin',
        name: 'Admin Name',
        phone: '01700000000',
        role: mockRole,
      },
    },
    updateProfile: mockUpdateProfile,
    signOut: jest.fn(),
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
    mutate: mockMutate,
  }),
}));
jest.mock('../src/components/LanguageSwitcher', () => ({
  LanguageSwitcher: () => null,
}));
jest.mock('../src/utils/photo', () => ({
  pickStudentPhoto: jest.fn(),
  saveReportFile: jest.fn(),
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
const student = (id: string, name = 'Student One'): Student => ({
  id,
  subscriptionId: id,
  studentName: name,
  studentCode: id,
  className: 'Class 6',
  roll: '21',
  photoUrl: '',
  guardianId: 'guardian',
  guardianName: 'Guardian',
  guardianPhone: '01700000001',
  pickupAddress: '',
  dropAddress: '',
  emergencyContact: '',
  routeId: 'route-1',
  routeName: 'South road',
  stopId: 'stop-1',
  stopName: 'Main gate',
  vehicleId: 'bus-1',
  vehicleName: 'Bus 1',
  driverName: 'Driver One',
  driverPhone: '01700000002',
  monthlyAmount: 250000,
  status: 'ACTIVE',
  startedAt: '2026-09-01',
});
beforeEach(() => {
  jest.clearAllMocks();
  mockRole = 'ADMIN';
  mockParams = {};
  mockMutate.mockResolvedValue({ id: 'new-item' });
  mockUpdateProfile.mockResolvedValue(undefined);
  mockRefresh.mockResolvedValue(undefined);
  mockData = {
    vehicles: [
      { id: 'bus-1', name: 'Bus 1', plate: 'Dhaka-1234', imei: '12345' },
    ],
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
    students: [student('student-1'), student('student-2', 'Student Two')],
    drivers: [
      {
        id: 'driver-1',
        name: 'Driver One',
        phone: '01700000002',
        nid: '',
        address: '',
        joiningDate: '',
        monthlySalary: 1200000,
        status: 'ACTIVE',
        vehicleId: 'bus-1',
        vehicleName: 'Bus 1',
        routeName: 'South road',
        createdAt: '2026-09-01',
      },
    ],
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
const render = async (Component: React.ComponentType) => {
  await act(async () => {
    screen = TestRenderer.create(<Component />);
  });
};
const setInput = async (label: string, value: string) => {
  await act(async () =>
    screen.root
      .findAllByType(Input)
      .find(item => item.props.label === label)!
      .props.onChangeText(value),
  );
};
const select = async (label: string, value: string) => {
  await act(async () =>
    screen.root
      .findAllByType(Choice)
      .find(item => item.props.label === label)!
      .props.onChange(value),
  );
};
const save = async () => {
  await act(async () =>
    screen.root
      .findAllByType(FormModal)
      .find(item => item.props.visible)!
      .props.onSave(),
  );
};

it('creates a linked student with the selected stop and integer poisha, and resets the stop on a route change', async () => {
  await render(StudentsScreen);
  await act(async () =>
    screen.root
      .findAllByType(SmallButton)
      .find(item => item.props.title === 'যোগ করুন')!
      .props.onPress(),
  );
  await setInput('শিক্ষার্থীর নাম *', ' New Student ');
  await setInput('অভিভাবকের মোবাইল নম্বর *', '01700000001');
  await select('রুট *', 'route-1');
  await select('পিকআপ স্থান *', 'stop-1');
  await select('রুট *', 'route-2');
  expect(
    screen.root
      .findAllByType(Choice)
      .find(item => item.props.label === 'পিকআপ স্থান *')!.props.value,
  ).toBe('');
  await save();
  expect(mockMutate).not.toHaveBeenCalled();
  await select('পিকআপ স্থান *', 'stop-2');
  await setInput('মাসিক ভাড়া (৳) *', '2800.50');
  await save();
  expect(mockMutate).toHaveBeenCalledWith(
    '/admin/students',
    expect.objectContaining({
      studentName: 'New Student',
      guardianPhone: '01700000001',
      routeId: 'route-2',
      stopId: 'stop-2',
      monthlyAmount: 280050,
    }),
    'POST',
  );
});
it('saves only explicitly selected attendance and never silently marks remaining students present', async () => {
  await render(AttendanceScreen);
  expect(
    screen.root
      .findAllByType(SmallButton)
      .find(item => item.props.title === 'সেভ করুন')!.props.disabled,
  ).toBe(true);
  await act(async () =>
    screen.root
      .findAll(
        node =>
          node.props.accessibilityRole === 'radio' &&
          node.props.accessibilityLabel === 'Student One: অনুপস্থিত' &&
          typeof node.props.onPress === 'function',
        { deep: false },
      )[0]
      .props.onPress(),
  );
  await act(async () =>
    screen.root
      .findAllByType(SmallButton)
      .find(item => item.props.title === 'সেভ করুন')!
      .props.onPress(),
  );
  expect(mockMutate).toHaveBeenCalledWith(
    '/admin/attendance',
    { entries: [{ studentId: 'student-1', date: today(), status: 'ABSENT' }] },
    'PUT',
  );
});
it('keeps the student form open with a recoverable server error', async () => {
  mockMutate.mockRejectedValue(new Error('Guardian must register first'));
  await render(StudentsScreen);
  await act(async () =>
    screen.root
      .findAllByType(SmallButton)
      .find(item => item.props.title === 'যোগ করুন')!
      .props.onPress(),
  );
  await setInput('শিক্ষার্থীর নাম *', 'New Student');
  await setInput('অভিভাবকের মোবাইল নম্বর *', '01700000001');
  await select('রুট *', 'route-1');
  await select('পিকআপ স্থান *', 'stop-1');
  await save();
  expect(screen.root.findByType(FormModal).props.visible).toBe(true);
  expect(screen.root.findByType(FormModal).props.error).toBe(
    'Guardian must register first',
  );
  expect(screen.root.findByType(FormModal).props.busy).toBe(false);
});
it('limits parent settings to their own profile and signout', async () => {
  mockRole = 'GUARDIAN';
  await render(SettingsScreen);
  const text = screen.root
    .findAllByType(Text)
    .map(item => item.props.children)
    .flat()
    .join(' ');
  expect(text).toContain('আমার প্রোফাইল');
  expect(text).not.toContain('ব্যবসার তথ্য');
  expect(text).not.toContain('SMS সেটিংস');
  expect(mockMutate).not.toHaveBeenCalled();
});
it('requires a target before sending a scoped notice', async () => {
  await render(NoticesScreen);
  await act(async () =>
    screen.root
      .findAllByType(Heading)
      .find(item => item.props.onAction)!
      .props.onAction(),
  );
  await setInput('শিরোনাম *', 'Holiday');
  await setInput('বার্তা *', 'Tomorrow transport is closed.');
  await select('যাকে পাঠাবেন', 'STUDENT');
  await save();
  expect(mockMutate).not.toHaveBeenCalled();
  await select('প্রাপক নির্বাচন করুন', 'student-1');
  await save();
  expect(mockMutate).toHaveBeenCalledWith('/admin/notices', {
    title: 'Holiday',
    body: 'Tomorrow transport is closed.',
    category: 'GENERAL',
    audience: 'STUDENT',
    targetId: 'student-1',
  });
});
it.each([
  StudentsScreen,
  DriversScreen,
  AttendanceScreen,
  MaintenanceScreen,
  AccountsScreen,
  NoticesScreen,
  RequestsScreen,
  CommunicationScreen,
  SettingsScreen,
])(
  'renders the management screen %p from real empty operational records',
  async Component => {
    await render(Component);
    expect(screen.toJSON()).toBeTruthy();
  },
);
it('renders stable student and driver detail routes', async () => {
  mockParams = { id: 'student-1' };
  await render(StudentProfileScreen);
  expect(screen.toJSON()).toBeTruthy();
  await act(async () => screen.unmount());
  mockParams = { id: 'driver-1' };
  await render(DriverProfileScreen);
  expect(screen.toJSON()).toBeTruthy();
});

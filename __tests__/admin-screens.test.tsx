import React from 'react';
import { ToastHost } from '../src/components/Toast';
import TestRenderer, { act } from 'react-test-renderer';
import { Alert, Text, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { i18n, locale } from '../src/i18n';
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
  Detail,
  ErrorText,
  FormModal,
  Heading,
  IconButton,
  Input,
  SmallButton,
  Tabs,
  niceDate,
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
  const { View: NativeView } = require('react-native');
  const MockPicker = (props: object) =>
    ReactModule.createElement(NativeView, props);
  MockPicker.Item = (props: object) =>
    ReactModule.createElement(NativeView, props);
  return { Picker: MockPicker };
});
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
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
beforeEach(async () => {
  await i18n.changeLanguage('en');
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
  await i18n.changeLanguage('en');
});
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
const setInput = async (label: string, value: string) => {
  await act(async () =>
    screen.root
      .findAllByType(Input)
      .find(item => item.props.label === i18n.t(label))!
      .props.onChangeText(value),
  );
};
const select = async (label: string, value: string) => {
  await act(async () =>
    screen.root
      .findAllByType(Choice)
      .find(item => item.props.label === i18n.t(label))!
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
const textContent = () =>
  screen.root
    .findAllByType(Text)
    .map(item => item.props.children)
    .flat()
    .join(' ');
const changeLanguage = async (language: 'en' | 'bn') => {
  await act(async () => {
    await i18n.changeLanguage(language);
  });
};
const pressButton = async (title: string) => {
  await act(async () =>
    (
      screen.root
        .findAllByType(SmallButton)
        .find(item => item.props.title === i18n.t(title)) ||
      screen.root
        .findAllByType(IconButton)
        .find(item => item.props.title === i18n.t(title))
    )!.props.onPress(),
  );
};
const openForm = async () => {
  await act(async () =>
    screen.root
      .findAllByType(Heading)
      .find(item => item.props.onAction)!
      .props.onAction(),
  );
};
const pressAccessible = async (role: string, label: string) => {
  await act(async () =>
    screen.root
      .findAll(
        node =>
          node.props.accessibilityRole === role &&
          node.props.accessibilityLabel === label &&
          typeof node.props.onPress === 'function',
        { deep: false },
      )[0]
      .props.onPress(),
  );
};

it('creates a linked student with the selected stop and integer poisha, and resets the stop on a route change', async () => {
  await render(StudentsScreen);
  await act(async () =>
    screen.root
      .findAllByType(SmallButton)
      .find(item => item.props.title === i18n.t('Add'))!
      .props.onPress(),
  );
  await setInput('Student name *', ' New Student ');
  await setInput('Guardian mobile number *', '01700000001');
  await select('Route *', 'route-1');
  await select('Pickup stop *', 'stop-1');
  await select('Route *', 'route-2');
  expect(
    screen.root
      .findAllByType(Choice)
      .find(item => item.props.label === 'Pickup stop *')!.props.value,
  ).toBe('');
  await save();
  expect(mockMutate).not.toHaveBeenCalled();
  expect(textContent()).toContain('Select a pickup stop.');
  expect(
    screen.root
      .findAllByType(Choice)
      .find(item => item.props.label === 'Pickup stop *')!.props.error,
  ).toBe('Select a pickup stop.');
  expect(
    screen.root
      .findAllByType(View)
      .some(node => node.props.testID === 'feedback-toast'),
  ).toBe(true);
  await changeLanguage('bn');
  expect(textContent()).toContain('ওঠার স্টপ নির্বাচন করুন।');
  expect(
    screen.root
      .findAllByType(TextInput)
      .find(item => item.props.accessibilityLabel === i18n.t('Student name *'))!
      .props.value,
  ).toBe(' New Student ');
  expect(
    screen.root
      .findAllByType(Choice)
      .find(item => item.props.label === i18n.t('Route *'))!.props.value,
  ).toBe('route-2');
  expect(
    screen.root
      .findAllByType(Picker.Item)
      .some(
        item =>
          item.props.label === 'North road · Bus 2' &&
          item.props.value === 'route-2',
      ),
  ).toBe(true);
  await select('Pickup stop *', 'stop-2');
  expect(
    screen.root
      .findAllByType(Choice)
      .find(item => item.props.label === i18n.t('Pickup stop *'))!.props.error,
  ).toBeUndefined();
  await setInput('Monthly fee (৳) *', '2800.50');
  await save();
  expect(mockMutate).toHaveBeenCalledWith(
    '/admin/students',
    expect.objectContaining({
      studentName: 'New Student',
      guardianPhone: '01700000001',
      routeId: 'route-2',
      stopId: 'stop-2',
      monthlyAmount: 280050,
      status: 'ACTIVE',
    }),
    'POST',
  );
  expect(mockMutate.mock.calls[0][1]).not.toHaveProperty('guardianName');
});
it('filters the student list by the selected vehicle', async () => {
  mockManagement.students[1] = {
    ...student('student-2', 'Student Two'),
    routeId: 'route-2',
    routeName: 'North road',
    stopId: 'stop-2',
    stopName: 'North gate',
    vehicleId: 'bus-2',
    vehicleName: 'Bus 2',
  };
  await render(StudentsScreen);
  const vehicleFilter = () =>
    screen.root
      .findAllByType(Picker)
      .find(item => item.props.accessibilityLabel === 'Filter by vehicle')!;
  expect(vehicleFilter().props.selectedValue).toBe('');
  expect(
    screen.root.findAllByType(Picker.Item).map(item => item.props.label),
  ).toEqual(expect.arrayContaining(['All vehicles', 'Bus 1', 'Bus 2']));
  await act(async () => vehicleFilter().props.onValueChange('bus-2'));
  expect(textContent()).toContain('Bus 2');
  expect(textContent()).toContain('Student Two');
  expect(textContent()).not.toContain('Student One');
  await act(async () => vehicleFilter().props.onValueChange(''));
  expect(textContent()).toContain('Student One');
});
it('shows search inline and hides the vehicle filter while searching', async () => {
  await render(StudentsScreen);
  await pressAccessible('button', 'Search students');
  expect(
    screen.root
      .findAllByType(Picker)
      .some(item => item.props.accessibilityLabel === 'Filter by vehicle'),
  ).toBe(false);
  expect(screen.root.findByType(TextInput).props.accessibilityLabel).toBe(
    'Search students',
  );
  await pressAccessible('button', 'Close search');
  expect(
    screen.root
      .findAllByType(Picker)
      .some(item => item.props.accessibilityLabel === 'Filter by vehicle'),
  ).toBe(true);
});
it.each([
  ['en', true],
  ['bn', true],
  ['en', false],
  ['en', undefined],
] as const)(
  'shows new guardian credentials in %s only when creation is confirmed (%s)',
  async (language, guardianAccountCreated) => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    try {
      mockMutate.mockResolvedValue({
        ...student('new-student'),
        guardianAccountCreated,
      });
      await changeLanguage(language);
      await render(StudentsScreen);
      await pressButton('Add');
      await setInput('Student name *', 'New Student');
      await setInput('Guardian name (optional)', ' New Guardian ');
      await setInput('Guardian mobile number *', '+8801700000001');
      await select('Route *', 'route-1');
      await select('Pickup stop *', 'stop-1');
      await save();
      expect(mockMutate).toHaveBeenCalledWith(
        '/admin/students',
        expect.objectContaining({ guardianName: 'New Guardian' }),
        'POST',
      );
      expect(screen.root.findByType(FormModal).props.visible).toBe(false);
      if (guardianAccountCreated) {
        expect(alert).toHaveBeenCalledWith(
          i18n.t('Student added'),
          i18n.t(
            'A guardian account was created. Share these Parent App login details with the guardian:\nMobile number: {{phone}}\nPassword: {{password}}',
            { phone: '01700000001', password: 'password' },
          ),
        );
      } else {
        expect(alert).not.toHaveBeenCalled();
      }
    } finally {
      alert.mockRestore();
    }
  },
);
it('keeps guardian account details out of student profile edits', async () => {
  mockParams = { id: 'student-1' };
  await render(StudentProfileScreen);
  await pressButton('Edit');
  expect(
    screen.root
      .findAllByType(Input)
      .some(item => item.props.label === 'Guardian name (optional)'),
  ).toBe(false);
  await setInput('Roll number', '23');
  await save();
  expect(mockMutate).toHaveBeenCalledWith(
    '/admin/students/student-1',
    expect.objectContaining({ roll: '23' }),
    'PATCH',
  );
  expect(mockMutate.mock.calls[0][1]).not.toHaveProperty('guardianName');
});
it('saves only explicitly selected attendance and never silently marks remaining students present', async () => {
  await render(AttendanceScreen);
  expect(
    screen.root
      .findAllByType(SmallButton)
      .find(item => item.props.title === i18n.t('Save'))!.props.disabled,
  ).toBe(true);
  await act(async () =>
    screen.root
      .findAll(
        node =>
          node.props.accessibilityRole === 'radio' &&
          node.props.accessibilityLabel === 'Student One: Absent' &&
          typeof node.props.onPress === 'function',
        { deep: false },
      )[0]
      .props.onPress(),
  );
  await changeLanguage('bn');
  expect(textContent()).toContain('নির্বাচন করা হয়নি: ১');
  expect(
    screen.root.findAll(
      node =>
        node.props.accessibilityRole === 'radio' &&
        node.props.accessibilityLabel === 'Student One: অনুপস্থিত',
      { deep: false },
    )[0].props.accessibilityState.checked,
  ).toBe(true);
  await act(async () =>
    screen.root
      .findAllByType(SmallButton)
      .find(item => item.props.title === i18n.t('Save'))!
      .props.onPress(),
  );
  expect(mockMutate).toHaveBeenCalledWith(
    '/admin/attendance',
    { entries: [{ studentId: 'student-1', date: today(), status: 'ABSENT' }] },
    'PUT',
  );
  expect(textContent()).toContain('উপস্থিতি সংরক্ষণ হয়েছে।');
  await changeLanguage('en');
  expect(textContent()).toContain('Attendance saved.');
});
it('keeps the student form open with a recoverable server error', async () => {
  mockMutate.mockRejectedValue(new Error('Guardian must register first'));
  await render(StudentsScreen);
  await act(async () =>
    screen.root
      .findAllByType(SmallButton)
      .find(item => item.props.title === i18n.t('Add'))!
      .props.onPress(),
  );
  await setInput('Student name *', 'New Student');
  await setInput('Guardian mobile number *', '01700000001');
  await select('Route *', 'route-1');
  await select('Pickup stop *', 'stop-1');
  await save();
  expect(screen.root.findByType(FormModal).props.visible).toBe(true);
  expect(screen.root.findByType(FormModal).props.error).toBe(
    'Guardian must register first',
  );
  expect(screen.root.findByType(FormModal).props.busy).toBe(false);
  await changeLanguage('bn');
  expect(textContent()).toContain('Guardian must register first');
  expect(screen.root.findByType(FormModal).props.visible).toBe(true);
});

it('switches shared controls and known errors without translating data values', async () => {
  const Controls = () => (
    <>
      <Input label="Name" value="Active" onChangeText={jest.fn()} />
      <Choice
        label="Vehicle"
        value="bus-1"
        options={[{ value: 'bus-1', label: 'Paid' }]}
        onChange={jest.fn()}
      />
      <Detail label="Status" value="Paid" />
      <ErrorText message="Could not save. Please try again." />
      <FormModal
        title="Edit student details"
        visible
        onClose={jest.fn()}
        onSave={jest.fn()}
      />
    </>
  );
  await render(Controls);
  expect(textContent()).toContain('Could not save. Please try again.');
  await changeLanguage('bn');
  expect(textContent()).toContain('সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।');
  expect(textContent()).toContain('শিক্ষার্থীর তথ্য সম্পাদনা');
  expect(textContent()).toContain(i18n.t('Save'));
  expect(textContent()).toContain('Paid');

  expect(screen.root.findByType(TextInput).props.value).toBe('Active');
  expect(screen.root.findByType(TextInput).props.accessibilityLabel).toBe(
    i18n.t('Name'),
  );
  expect(screen.root.findByType(Picker).props.selectedValue).toBe('bus-1');
  expect(
    screen.root
      .findAllByType(Picker.Item)
      .some(item => item.props.label === 'Paid'),
  ).toBe(true);
  expect(
    screen.root
      .findAllByType(Picker.Item)
      .some(item => item.props.label === i18n.t('Select an option')),
  ).toBe(true);
});

it('keeps driver fields and status intact while switching an open form', async () => {
  await render(DriversScreen);
  await pressButton('Add');
  await setInput('Name *', 'Paid');
  await setInput('Mobile number *', '01700000002');
  await setInput('NID', '1234567890');
  await setInput('Address', 'Maintenance');
  await setInput('Monthly salary (৳)', '12000.50');
  await setInput('Joining date (YYYY-MM-DD)', '2026-09-01');
  await select('Assigned vehicle', 'bus-1');
  await select('Status', 'LEAVE');
  await changeLanguage('bn');
  expect(textContent()).toContain('ড্রাইভার যোগ করুন');
  expect(
    screen.root
      .findAllByType(Picker.Item)
      .some(
        item => item.props.value === 'LEAVE' && item.props.label === 'ছুটি',
      ),
  ).toBe(true);
  expect(
    screen.root
      .findAllByType(TextInput)
      .find(item => item.props.accessibilityLabel === i18n.t('NID'))!.props
      .value,
  ).toBe('1234567890');
  await save();
  expect(mockMutate).toHaveBeenCalledWith(
    '/admin/drivers',
    {
      name: 'Paid',
      phone: '01700000002',
      nid: '1234567890',
      address: 'Maintenance',
      joiningDate: '2026-09-01',
      monthlySalary: 1200050,
      vehicleId: 'bus-1',
      status: 'LEAVE',
    },
    'POST',
  );
});

it('keeps maintenance selections and description payloads stable across languages', async () => {
  await render(MaintenanceScreen);
  await openForm();
  await select('Vehicle *', 'bus-1');
  await setInput('Work title *', 'Paid');
  await setInput('Details', 'Active');
  await setInput('Total cost (৳)', '250.50');
  await setInput('Service date (YYYY-MM-DD)', '2026-09-01');
  await setInput('Next service (YYYY-MM-DD)', '2026-10-01');
  await select('Status', 'COMPLETED');
  await pressAccessible('checkbox', 'Oil change');
  await changeLanguage('bn');
  expect(textContent()).toContain('রক্ষণাবেক্ষণ যোগ করুন');
  expect(
    screen.root.findAll(
      node =>
        node.props.accessibilityRole === 'checkbox' &&
        node.props.accessibilityLabel === 'তেল পরিবর্তন',
      { deep: false },
    )[0].props.accessibilityState.checked,
  ).toBe(true);
  await changeLanguage('en');
  expect(
    screen.root.findAll(
      node =>
        node.props.accessibilityRole === 'checkbox' &&
        node.props.accessibilityLabel === 'Oil change',
      { deep: false },
    )[0].props.accessibilityState.checked,
  ).toBe(true);
  await save();
  expect(mockMutate).toHaveBeenCalledWith(
    '/admin/maintenance',
    {
      vehicleId: 'bus-1',
      title: 'Paid',
      description: 'Active\nকাজ: তেল পরিবর্তন',
      serviceDate: '2026-09-01',
      nextServiceDate: '2026-10-01',
      amount: 25050,
      status: 'COMPLETED',
    },
    'POST',
  );
});

it('translates account categories while preserving amounts, notes and API enums', async () => {
  mockParams = { tab: 'EXPENSE' };
  await render(AccountsScreen);
  await openForm();
  await select('Category', 'SALARY');
  await select('Driver *', 'driver-1');
  await select('Vehicle (if applicable)', 'bus-1');
  await setInput('Title *', 'Paid');
  await setInput('Note', 'Leave');
  await setInput('Amount (৳) *', '1234.50');
  await setInput('Date (YYYY-MM-DD)', '2026-09-01');
  await changeLanguage('bn');
  expect(textContent()).toContain('খরচ যোগ করুন');
  expect(
    screen.root
      .findAllByType(Picker.Item)
      .some(
        item =>
          item.props.value === 'SALARY' &&
          item.props.label === 'ড্রাইভারের বেতন',
      ),
  ).toBe(true);
  expect(
    screen.root
      .findAllByType(TextInput)
      .find(item => item.props.accessibilityLabel === i18n.t('Amount (৳) *'))!
      .props.value,
  ).toBe('1234.50');
  await save();
  expect(mockMutate).toHaveBeenCalledWith('/admin/ledger', {
    type: 'EXPENSE',
    category: 'SALARY',
    title: 'Paid',
    amount: 123450,
    date: '2026-09-01',
    note: 'Leave',
    vehicleId: 'bus-1',
    driverId: 'driver-1',
  });
});

it.each([
  [StudentProfileScreen, 'student-1', 'Payment summary', 'পেমেন্ট সারাংশ'],
  [DriverProfileScreen, 'driver-1', 'Monthly salary', 'মাসিক বেতন'],
] as const)(
  'updates profile labels, statuses and dates on a mounted screen %p',
  async (Component, id, english, bangla) => {
    mockParams = { id };
    mockManagement.attendance = [
      {
        id: 'attendance-1',
        studentId: 'student-1',
        driverId: 'driver-1',
        date: '2026-09-01',
        status: 'PRESENT',
        note: '',
        updatedAt: '2026-09-01T00:00:00+06:00',
      },
    ];
    await render(Component);
    await act(async () =>
      screen.root.findByType(Tabs).props.onChange('ATTENDANCE'),
    );
    expect(textContent()).toContain(english);
    expect(textContent()).toContain('Present');
    const englishDate = niceDate('2026-09-01');
    expect(textContent()).toContain(englishDate);
    await changeLanguage('bn');
    expect(textContent()).toContain(bangla);
    expect(textContent()).toContain('উপস্থিত');
    expect(textContent()).toContain(niceDate('2026-09-01'));
    expect(niceDate('2026-09-01')).not.toBe(englishDate);
    expect(niceDate('2026-09-01')).toBe(
      new Date('2026-09-01T00:00:00+06:00').toLocaleDateString(locale(), {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Dhaka',
      }),
    );
    expect(textContent()).toContain('South road');
    expect(textContent()).toContain('Bus 1');
    expect(mockMutate).not.toHaveBeenCalled();
  },
);
it('limits parent settings to their own profile and signout', async () => {
  mockRole = 'GUARDIAN';
  await render(SettingsScreen);
  const text = screen.root
    .findAllByType(Text)
    .map(item => item.props.children)
    .flat()
    .join(' ');
  expect(text).toContain('My profile');
  expect(text).not.toContain('Business information');
  expect(text).not.toContain('SMS settings');
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
  await setInput('Title *', 'Holiday');
  await setInput('Message *', 'Tomorrow transport is closed.');
  await select('Send to', 'STUDENT');
  await save();
  expect(mockMutate).not.toHaveBeenCalled();
  await select('Select recipient', 'student-1');
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

it('uses the selected destination fare for enrollment without submitting a client price override', async () => {
  mockData.routes[0].stops.push(
    { id: 'khilkhet', name: 'Khilkhet' },
    { id: 'mirpur', name: 'Mirpur' },
  );
  mockData.routes[0].fares = [
    {
      boardingStopId: 'stop-1',
      dropoffStopId: 'khilkhet',
      monthlyAmount: 100000,
    },
    {
      boardingStopId: 'stop-1',
      dropoffStopId: 'mirpur',
      monthlyAmount: 150000,
    },
  ];
  await render(StudentsScreen);
  await pressButton('Add');
  await setInput('Student name *', 'Journey Student');
  await setInput('Guardian mobile number *', '01700000001');
  await select('Route *', 'route-1');
  await select('Pickup stop *', 'stop-1');
  await select('Destination stop', 'khilkhet');
  const fareValue = () =>
    screen.root
      .findAllByType(Detail)
      .find(node => node.props.label === 'Journey monthly fee')!.props.value;
  expect(fareValue()).toContain('1,000');
  expect(
    screen.root
      .findAllByType(Input)
      .some(node => node.props.label === 'Monthly fee (৳) *'),
  ).toBe(false);
  await select('Destination stop', 'mirpur');
  expect(fareValue()).toContain('1,500');
  await save();
  expect(mockMutate).toHaveBeenCalledWith(
    '/admin/students',
    expect.objectContaining({ stopId: 'stop-1', dropoffStopId: 'mirpur' }),
    'POST',
  );
  expect(mockMutate.mock.calls[0][1]).not.toHaveProperty('monthlyAmount');
});

it('keeps an existing agreed journey fee when editing a profile after route pricing changes', async () => {
  mockData.routes[0].stops.push({ id: 'mirpur', name: 'Mirpur' });
  mockData.routes[0].fares = [
    {
      boardingStopId: 'stop-1',
      dropoffStopId: 'mirpur',
      monthlyAmount: 180000,
    },
  ];
  mockManagement.students[0] = {
    ...mockManagement.students[0],
    dropoffStopId: 'mirpur',
    dropoffStopName: 'Mirpur',
    monthlyAmount: 150000,
  };
  mockParams = { id: 'student-1' };
  await render(StudentProfileScreen);
  await pressButton('Edit');
  expect(
    screen.root
      .findAllByType(Detail)
      .find(node => node.props.label === 'Journey monthly fee')!.props.value,
  ).toContain('1,500');
  await setInput('Roll number', '22');
  await save();
  expect(mockMutate).toHaveBeenCalledWith(
    '/admin/students/student-1',
    expect.objectContaining({ dropoffStopId: 'mirpur', roll: '22' }),
    'PATCH',
  );
  expect(mockMutate.mock.calls[0][1]).not.toHaveProperty('monthlyAmount');
});

it('keeps attendance separate per shift and excludes unscheduled services', async () => {
  mockManagement.settings.operatingDays = [0, 1, 2, 3, 4, 6];
  mockManagement.students = [
    {
      ...student('morning'),
      studentId: 'child',
      shiftId: 'MORNING',
      operatingDays: [1],
    },
    {
      ...student('day'),
      studentId: 'child',
      shiftId: 'DAY',
      operatingDays: [1],
    },
    {
      ...student('off-day', 'Not travelling'),
      shiftId: 'MORNING',
      operatingDays: [2],
    },
  ];
  await render(AttendanceScreen);
  await setInput('Date (YYYY-MM-DD)', '2026-09-14');
  await select('Transport shift', 'DAY');
  expect(textContent()).not.toContain('Not travelling');
  await openForm(); // Mark all present only for the selected shift.
  await pressButton('Save');
  expect(mockMutate).toHaveBeenCalledWith(
    '/admin/attendance',
    {
      entries: [{ studentId: 'day', date: '2026-09-14', status: 'PRESENT' }],
    },
    'PUT',
  );
  await select('Transport shift', 'MORNING');
  expect(
    screen.root
      .findAllByType(SmallButton)
      .find(item => item.props.title === 'Save')!.props.disabled,
  ).toBe(true);
});

it('offers no student attendance on institution closed days even when the service includes that day', async () => {
  mockManagement.settings.operatingDays = [0, 1, 2, 3, 4, 6];
  mockManagement.students = [{ ...student('friday'), operatingDays: [5] }];
  await render(AttendanceScreen);
  await setInput('Date (YYYY-MM-DD)', '2026-09-18');
  expect(textContent()).toContain(
    'No students scheduled for this date and shift.',
  );
  await openForm();
  expect(
    screen.root
      .findAllByType(SmallButton)
      .find(item => item.props.title === 'Save')!.props.disabled,
  ).toBe(true);
  expect(mockMutate).not.toHaveBeenCalled();
});

it('saves institution weekdays and configurable shift times as structured settings', async () => {
  await render(SettingsScreen);
  await act(async () =>
    screen.root
      .findAll(
        node =>
          node.props.accessibilityRole === 'button' &&
          typeof node.props.onPress === 'function' &&
          node
            .findAllByType(Text)
            .some(
              text => text.props.children === 'Transport shifts and weekdays',
            ),
        { deep: false },
      )[0]
      .props.onPress(),
  );
  await pressAccessible('checkbox', 'Friday');
  await pressButton('+ Add shift');
  const inputs = screen.root.findAllByType(Input);
  await act(async () => {
    inputs
      .filter(item => item.props.label === 'Shift name')
      .slice(-1)[0]
      .props.onChangeText('Late class');
    inputs
      .filter(item => item.props.label === 'Start time (HH:mm)')
      .slice(-1)[0]
      .props.onChangeText('19:00');
    inputs
      .filter(item => item.props.label === 'Return time (HH:mm)')
      .slice(-1)[0]
      .props.onChangeText('21:00');
  });
  await save();
  expect(mockMutate).toHaveBeenCalledWith(
    '/admin/settings',
    {
      operatingDays: [0, 1, 2, 3, 4, 5, 6],
      transportShifts: expect.arrayContaining([
        expect.objectContaining({
          id: expect.stringMatching(/^SHIFT_/),
          name: 'Late class',
          startTime: '19:00',
          endTime: '21:00',
        }),
      ]),
    },
    'PATCH',
  );
});

it('updates a canonical enrollment without sending the create-only studentId field', async () => {
  mockManagement.students[0].studentId = 'canonical-child';
  mockParams = { id: mockManagement.students[0].id };
  await render(StudentProfileScreen);
  await pressButton('Edit');
  await setInput('Roll number', '24');
  await save();
  expect(mockMutate).toHaveBeenCalledWith(
    `/admin/students/${mockManagement.students[0].id}`,
    expect.objectContaining({ roll: '24' }),
    'PATCH',
  );
  expect(mockMutate.mock.calls[0][1]).not.toHaveProperty('studentId');
});

it('starts an active new service when reusing a stopped student profile', async () => {
  mockManagement.students[0].studentId = 'canonical-child';
  mockManagement.students[0].status = 'STOPPED';
  mockParams = { id: mockManagement.students[0].id };
  await render(StudentProfileScreen);
  await pressAccessible('button', 'Add service in another shift');
  await save();
  expect(mockMutate).toHaveBeenCalledWith(
    '/admin/students',
    expect.objectContaining({
      studentId: 'canonical-child',
      status: 'ACTIVE',
      operatingDays: [0, 1, 2, 3, 4, 6],
    }),
    'POST',
  );
});

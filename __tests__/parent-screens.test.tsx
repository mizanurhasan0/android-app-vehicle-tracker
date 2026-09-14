import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Linking, Text } from 'react-native';
import { i18n } from '../src/i18n';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParams } from '../src/navigation/types';
import { ManagementOverview, Student } from '../src/api/management';
import { DashboardData } from '../src/api/types';
import { Button, Field, Select } from '../src/components/ui';
import {
  AdmissionScreen,
  ApplicationStatusScreen,
  ParentContactScreen,
  ParentJourneyScreen,
  ParentStudentScreen,
  ParentTrackingScreen,
} from '../src/screens/parent/ParentScreens';
import { Segment, StudentAvatar } from '../src/screens/parent/ParentUI';
import { NoorRow } from '../src/components/Noor';
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

beforeEach(async () => {
  await i18n.changeLanguage('en');
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
  await i18n.changeLanguage('en');
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
      .find(item => item.props.title === i18n.t(title))!
      .props.onPress(),
  );
}
async function field(label: string, value: string) {
  await act(async () =>
    screen.root
      .findAllByType(Field)
      .find(item => item.props.label === i18n.t(label))!
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

const text = () =>
  screen.root
    .findAllByType(Text)
    .map(item => item.props.children)
    .flat()
    .join(' ');
async function language(value: 'en' | 'bn') {
  await act(async () => {
    await i18n.changeLanguage(value);
  });
}

it('validates and submits the reviewed admission fields, using the authenticated guardian', async () => {
  await act(async () => {
    screen = TestRenderer.create(<AdmissionScreen {...props('Admission')} />);
  });
  await button('Next');
  expect(
    screen.root
      .findAllByType(Field)
      .some(item => item.props.label === 'Student name *'),
  ).toBe(true);
  await field('Student name *', ' Student One ');
  await field('Class *', 'Class 6');
  await field('Roll number', '21');
  mockPickPhoto.mockResolvedValue('data:image/jpeg;base64,cGhvdG8=');
  await act(async () =>
    screen.root
      .findAll(
        node =>
          node.props.accessibilityLabel === 'Select a student photo' &&
          typeof node.props.onPress === 'function',
        { deep: false },
      )[0]
      .props.onPress(),
  );
  await button('Next');
  await field('Pickup address *', ' House 12 ');
  await field('Drop-off address', 'Madrasa');
  await field('Emergency contact number', '01700000002');
  await button('Next');
  await selectRoute(0);
  await act(async () =>
    screen.root.findByType(Select).props.onChange('stop-1'),
  );
  await language('bn');
  expect(screen.root.findByType(Select).props.value).toBe('stop-1');
  expect(screen.root.findByType(Select).props.options).toEqual([
    { value: 'stop-1', label: 'Main gate' },
  ]);
  await button('Next');
  expect(text()).toContain('আবেদন পর্যালোচনা');
  expect(text()).toContain('Student One');
  expect(text()).toContain('Class 6');
  expect(text()).toContain('House 12');
  expect(mockMutate).not.toHaveBeenCalled();
  await button('Submit application');
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
  await field('Student name *', 'Student One');
  await field('Class *', 'Class 6');
  await button('Next');
  await field('Pickup address *', 'House 12');
  await button('Next');
  await selectRoute(0);
  await act(async () =>
    screen.root.findByType(Select).props.onChange('stop-1'),
  );
  await selectRoute(1);
  expect(screen.root.findByType(Select).props.value).toBe('');
  expect(screen.root.findByType(Select).props.options).toEqual([
    { value: 'stop-2', label: 'North gate' },
  ]);
  await button('Next');
  expect(mockMutate).not.toHaveBeenCalled();
  expect(screen.root.findByType(Select).props.label).toBe('Pickup stop *');
  await button('Previous step');
  await button('Previous step');
  expect(
    screen.root
      .findAllByType(Field)
      .find(item => item.props.label === 'Student name *')!.props.value,
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
  expect(text()).toContain('Awaiting review');
  expect(text()).not.toContain('Application approved');
  expect(text()).not.toContain('Invalid Date');
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
  expect(text()).toContain('Not recorded yet');
  expect(text()).toContain('Scheduled time');
  expect(text()).not.toContain('Completed');
  expect(text()).not.toContain('Arrived');
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

it('relocalizes mounted admission validation without replacing entered text', async () => {
  await act(async () => {
    screen = TestRenderer.create(<AdmissionScreen {...props('Admission')} />);
  });
  await field('Student name *', 'শিক্ষার্থী One');
  await button('Next');
  expect(text()).toContain('Enter the student name and class.');
  await language('bn');
  expect(text()).toContain('শিক্ষার্থীর নাম ও শ্রেণি লিখুন।');
  expect(screen.root.findAllByType(Field)[0].props.value).toBe(
    'শিক্ষার্থী One',
  );
  await field('Class *', 'Class 6');
  await language('en');
  expect(text()).toContain('Enter the student name and class.');
  expect(screen.root.findAllByType(Field)[1].props.value).toBe('Class 6');
  expect(mockMutate).not.toHaveBeenCalled();
});

it('keeps the selected application and a note that matches a translation key verbatim', async () => {
  const request = {
    id: 'first',
    studentName: 'Student One',
    guardianName: 'Guardian',
    guardianPhone: '01700000001',
    routeName: 'South road',
    stopName: 'Main gate',
    vehicleName: 'Bus 1',
    status: 'PENDING' as const,
    note: '',
  };
  mockData.requests = [
    request,
    {
      ...request,
      id: 'second',
      studentName: 'Student Two',
      status: 'REJECTED',
      note: 'Approved',
    },
  ];
  const original = JSON.stringify(mockData.requests);
  await act(async () => {
    screen = TestRenderer.create(
      <ApplicationStatusScreen {...props('ApplicationStatus')} />,
    );
  });
  await act(async () =>
    screen.root.findByType(Select).props.onChange('second'),
  );
  await language('bn');
  expect(screen.root.findByType(Select).props.value).toBe('second');
  expect(text()).toContain('আবেদন অনুমোদিত হয়নি');
  expect(text()).toContain('Student Two');
  expect(text()).toContain('Approved');
  await language('en');
  expect(text()).toContain('Application not approved');
  expect(JSON.stringify(mockData.requests)).toBe(original);
});

it('keeps the child and afternoon tab selected while translating attendance and dates', async () => {
  const second = { ...student, id: 'second', studentName: 'Student Two' };
  mockManagement.students = [student, second];
  mockManagement.schedules = [
    {
      id: 'afternoon',
      routeId: 'route-1',
      stopId: 'stop-1',
      studentId: 'second',
      period: 'AFTERNOON',
      label: 'Afternoon pickup',
      time: '15:30',
      position: 1,
    },
  ];
  mockManagement.attendance = [
    {
      id: 'attendance',
      studentId: 'second',
      driverId: null,
      date: dhakaDate(),
      status: 'PRESENT',
      note: 'Active',
      updatedAt: '',
    },
  ];
  const original = JSON.stringify(mockManagement);
  await act(async () => {
    screen = TestRenderer.create(
      <ParentJourneyScreen {...props('TodayJourney')} />,
    );
  });
  await act(async () =>
    screen.root.findByType(Select).props.onChange('second'),
  );
  await act(async () =>
    screen.root.findByType(Segment).props.onChange('AFTERNOON'),
  );
  expect(text()).toContain('15:30');
  await language('bn');
  expect(screen.root.findByType(Select).props.value).toBe('second');
  expect(screen.root.findByType(Segment).props.value).toBe('AFTERNOON');
  expect(screen.root.findByType(Segment).props.options).toEqual([
    { value: 'MORNING', label: 'সকাল' },
    { value: 'AFTERNOON', label: 'বিকাল' },
  ]);
  expect(text()).toContain('Student Two');
  expect(text()).toContain('Afternoon pickup');
  expect(text()).toContain('উপস্থিত');
  expect(text()).toContain('Active');
  expect(text()).toContain('১৫:৩০');
  expect(text()).toContain(
    new Date(`${dhakaDate()}T00:00:00+06:00`).toLocaleDateString('bn-BD', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }),
  );
  await language('en');
  expect(text()).toContain('Present');
  expect(screen.root.findByType(Segment).props.value).toBe('AFTERNOON');
  expect(JSON.stringify(mockManagement)).toBe(original);
  await button('View live location');
  expect(navigation.navigate).toHaveBeenCalledWith('LiveTracking', {
    vehicleId: 'bus-1',
  });
});

it('relocalizes the selected student profile while preserving names, roll, photo and status', async () => {
  mockManagement.students = [
    student,
    {
      ...student,
      id: 'second',
      studentName: 'Active',
      guardianName: 'Guardian',
      className: 'Class 6',
      roll: '21',
      monthlyAmount: 250000,
      status: 'ACTIVE',
      photoUrl: 'https://example.test/photo.jpg',
      driverName: 'Driver',
      driverPhone: '01700000001',
    },
  ];
  const original = JSON.stringify(mockManagement.students);
  await act(async () => {
    screen = TestRenderer.create(
      <ParentStudentScreen {...props('ParentProfile', { id: 'second' })} />,
    );
  });
  await language('bn');
  expect(screen.root.findByType(Select).props.value).toBe('second');
  expect(text()).toContain('অভিভাবকের তথ্য');
  expect(text()).toContain('Active');
  expect(text()).toContain('Guardian');
  expect(text()).toContain('Class 6');
  expect(text()).toContain('21');
  expect(text()).toContain('৳২,৫০০');
  expect(screen.root.findByType(StudentAvatar).props.photoUrl).toBe(
    'https://example.test/photo.jpg',
  );
  expect(
    screen.root.findAll(
      node => node.props.accessibilityLabel === 'Active — ছবি',
    ).length,
  ).toBeGreaterThan(0);
  await language('en');
  expect(text()).toContain('Guardian information');
  expect(text()).toContain('৳2,500');
  expect(JSON.stringify(mockManagement.students)).toBe(original);
});

it('keeps contact selection and phone targets when switching language', async () => {
  mockManagement.students = [
    student,
    {
      ...student,
      id: 'second',
      studentName: 'Student Two',
      driverName: 'Driver',
      driverPhone: '01700000002',
    },
  ];
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  try {
    await act(async () => {
      screen = TestRenderer.create(<ParentContactScreen />);
    });
    await act(async () =>
      screen.root.findByType(Select).props.onChange('second'),
    );
    await language('bn');
    expect(screen.root.findByType(Select).props.value).toBe('second');
    const row = screen.root
      .findAllByType(NoorRow)
      .find(item => item.props.title === 'ড্রাইভারের সাথে কথা বলুন')!;
    expect(row.props.subtitle).toBe('Driver · 01700000002');
    await act(async () => row.props.onPress());
    expect(open).toHaveBeenCalledWith('tel:01700000002');
    await language('en');
    expect(text()).toContain('Call the driver');
    expect(screen.root.findByType(Select).props.value).toBe('second');
  } finally {
    open.mockRestore();
  }
});

it('keeps the tracked vehicle and localizes last-update text on a mounted screen', async () => {
  mockData.vehicles = [
    { id: 'first', name: 'Bus 1', plate: 'ABC-1', imei: '111111111111111' },
    {
      id: 'second',
      name: 'Bus 2',
      plate: 'ABC-2',
      imei: '222222222222222',
      driverName: 'Driver',
    },
  ];
  mockData.locations = [
    {
      imei: '222222222222222',
      status: 'lastKnown',
      latitude: 23.8,
      longitude: 90.4,
      lastSeen: '2026-09-10T05:00:00Z',
    },
  ];
  mockData.subscriptions = [
    {
      id: 'service',
      studentName: 'Student Two',
      routeName: 'South road',
      stopName: 'Main gate',
      vehicleName: 'Bus 2',
      vehicleId: 'second',
      status: 'ACTIVE',
    },
  ];
  const original = JSON.stringify(mockData);
  await act(async () => {
    screen = TestRenderer.create(
      <ParentTrackingScreen
        {...props('LiveTracking', { vehicleId: 'second' })}
      />,
    );
  });
  expect(text()).toContain('Last updated:');
  await language('bn');
  expect(screen.root.findByType(Select).props.value).toBe('second');
  expect(text()).toContain('বর্তমান অবস্থান');
  expect(text()).toContain('সর্বশেষ আপডেট:');
  expect(text()).toContain('ড্রাইভার: Driver');
  expect(text()).toContain('রুট: South road');
  expect(text()).toContain('Bus 2');
  expect(text()).toContain('23.80000, 90.40000');
  await language('en');
  expect(text()).toContain('Current location');
  expect(JSON.stringify(mockData)).toBe(original);
});

it('requires a configured destination and previews its own fare before submitting an admission', async () => {
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
  await act(async () => {
    screen = TestRenderer.create(<AdmissionScreen {...props('Admission')} />);
  });
  await field('Student name *', 'Journey Student');
  await field('Class *', 'Class 6');
  await button('Next');
  await field('Pickup address *', 'Uttara');
  await button('Next');
  await selectRoute(0);
  const choose = async (label: string, value: string) => {
    await act(async () =>
      screen.root
        .findAllByType(Select)
        .find(node => node.props.label === label)!
        .props.onChange(value),
    );
  };
  await choose('Pickup stop *', 'stop-1');
  await button('Next');
  expect(text()).toContain('Select a destination with a configured fare.');
  await choose('Destination stop *', 'khilkhet');
  expect(text()).toContain('1,000');
  await choose('Destination stop *', 'mirpur');
  expect(text()).toContain('1,500');
  await choose('Pickup stop *', 'khilkhet');
  const destinationSelect = () =>
    screen.root
      .findAllByType(Select)
      .find(node => node.props.label === 'Destination stop *')!;
  expect(destinationSelect().props.value).toBe('');
  expect(destinationSelect().props.options).toEqual([]);
  await choose('Pickup stop *', 'stop-1');
  await choose('Destination stop *', 'mirpur');
  await button('Next');
  expect(text()).toContain('Mirpur');
  expect(text()).toContain('1,500');
  await button('Submit application');
  expect(mockMutate).toHaveBeenCalledWith(
    '/requests/guardian/new',
    expect.objectContaining({ stopId: 'stop-1', dropoffStopId: 'mirpur' }),
  );
  expect(mockMutate.mock.calls[0][1]).not.toHaveProperty('monthlyAmount');
});

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Student, Driver, Attendance } from '../src/api/management';
import { Vehicle, Route } from '../src/api/types';
import { NoorVehiclesScreen } from '../src/screens/fleet/VehiclesScreen';
import { NoorRoutesScreen } from '../src/screens/fleet/RoutesScreen';
import { StudentsScreen } from '../src/screens/admin/people/StudentsScreen';
import { DriversScreen } from '../src/screens/admin/people/DriversScreen';
import {
  FormModal,
  Input,
  SmallButton,
  Tabs,
  today,
} from '../src/screens/admin/AdminUi';
import { Notice } from '../src/components/ui/Notice';
import { i18n } from '../src/i18n';

const mockNavigate = jest.fn();
const mockNavigation = { navigate: mockNavigate };
const mockRefresh = jest.fn().mockResolvedValue(undefined);
const mockMutate = jest.fn().mockResolvedValue({});
let mockLoading = false;
let mockError = '';
let mockData: { vehicles: Vehicle[]; routes: Route[]; requests: [] };
let mockManagement: {
  students: Student[];
  drivers: Driver[];
  attendance: Attendance[];
};
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
}));
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ session: { user: { role: 'ADMIN' } } }),
}));
jest.mock('../src/context/DataContext', () => {
  const useData = () => ({
    data: mockData,
    loading: mockLoading,
    error: mockError,
    refresh: mockRefresh,
    mutate: mockMutate,
  });
  return {
    useData,
    useCoreData: useData,
    useDataActions: () => ({ refresh: mockRefresh, mutate: mockMutate }),
  };
});
jest.mock('../src/context/ManagementContext', () => ({
  useManagement: () => ({
    data: mockManagement,
    loading: mockLoading,
    error: mockError,
    refresh: mockRefresh,
    mutate: mockMutate,
  }),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('../src/utils/photo', () => ({ pickStudentPhoto: jest.fn() }));
jest.mock('@react-native-picker/picker', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  const MockPicker = (props: object) => ReactModule.createElement(View, props);
  MockPicker.Item = (props: object) => ReactModule.createElement(View, props);
  return { Picker: MockPicker };
});

const student = (index: number): Student => ({
  id: `student-${index}`,
  subscriptionId: `student-${index}`,
  studentName: `Student ${index}`,
  studentCode: `code-${index}`,
  className: '',
  roll: '',
  photoUrl: '',
  guardianId: 'guardian',
  guardianName: 'Guardian',
  guardianPhone: '01700000000',
  pickupAddress: '',
  dropAddress: '',
  emergencyContact: '',
  routeId: `route-${index}`,
  routeName: 'South road',
  stopId: 'stop',
  stopName: 'Gate',
  vehicleId: `vehicle-${index}`,
  vehicleName: `Bus ${index}`,
  driverName: '',
  driverPhone: '',
  monthlyAmount: 250000,
  status: 'ACTIVE',
  startedAt: '2026-09-01',
});
let screen: TestRenderer.ReactTestRenderer;
beforeEach(async () => {
  jest.clearAllMocks();
  await i18n.changeLanguage('en');
  mockLoading = false;
  mockError = '';
  mockData = {
    vehicles: Array.from({ length: 500 }, (_, index) => ({
      id: `vehicle-${index}`,
      name: `Vehicle ${index}`,
      plate: `plate-${index}`,
      imei: `imei-${index}`,
    })),
    routes: Array.from({ length: 500 }, (_, index) => ({
      id: `route-${index}`,
      name: `Route ${index}`,
      vehicleId: `vehicle-${index}`,
      vehicleName: 'Bus',
      monthlyAmount: 250000,
      stops: [],
    })),
    requests: [],
  };
  mockManagement = {
    students: Array.from({ length: 500 }, (_, index) => student(index)),
    drivers: Array.from({ length: 500 }, (_, index) => ({
      id: `driver-${index}`,
      name: `Driver ${index}`,
      phone: `017${index}`,
      nid: '',
      address: '',
      joiningDate: '',
      monthlySalary: 0,
      status: 'ACTIVE',
      vehicleId: null,
      vehicleName: null,
      routeName: null,
      createdAt: '',
    })),
    attendance: [],
  };
});
afterEach(async () => {
  await act(async () => screen?.unmount());
  await i18n.changeLanguage('en');
});
async function render(element: React.ReactElement) {
  await act(async () => {
    screen = TestRenderer.create(element);
  });
}
const text = () =>
  screen.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat()
    .join(' ');
const list = () => screen.root.findByType(FlatList);
const cases = [
  {
    name: 'Vehicles',
    prefix: 'Vehicle',
    element: (
      <NoorVehiclesScreen
        navigation={mockNavigation as never}
        route={{} as never}
      />
    ),
    search: 'Search vehicles',
    destination: 'VehicleDetails',
    id: 'vehicle-499',
  },
  {
    name: 'Routes',
    prefix: 'Route',
    element: (
      <NoorRoutesScreen
        navigation={mockNavigation as never}
        route={{} as never}
      />
    ),
    search: 'Search routes',
    destination: 'RouteDetails',
    id: 'route-499',
  },
  {
    name: 'Students',
    prefix: 'Student',
    element: <StudentsScreen />,
    search: 'Search students',
    destination: 'StudentDetails',
    id: 'student-499',
  },
  {
    name: 'Drivers',
    prefix: 'Driver',
    element: <DriversScreen />,
    search: 'Search drivers...',
    destination: 'DriverDetails',
    id: 'driver-499',
  },
];
async function search(label: string, value: string) {
  if (
    label === 'Search students' &&
    !screen.root
      .findAllByType(TextInput)
      .some(node => node.props.accessibilityLabel === label)
  ) {
    await act(async () =>
      screen.root
        .findAll(
          node =>
            node.props.accessibilityRole === 'button' &&
            typeof node.props.onPress === 'function',
          { deep: false },
        )
        .find(node => node.props.accessibilityLabel === label)!
        .props.onPress(),
    );
  }
  const input = screen.root
    .findAllByType(TextInput)
    .find(
      node =>
        node.props.accessibilityLabel === label ||
        node.props.placeholder === label,
    )!;
  await act(async () => input.props.onChangeText(value));
}

it.each(cases)(
  '$name mounts only 10 of 500 actual rows, keeps all records searchable and navigable',
  async ({ element, prefix, search: label, destination, id }) => {
    await render(element);
    // FlatList/VirtualizedList are real: count row text mounted in the renderer,
    // rather than asserting renderItem calls or using a mock that slices data.
    const names = () =>
      screen.root
        .findAllByType(Text)
        .filter(node =>
          new RegExp(`^${prefix} \\d+$`).test(node.props.children),
        );
    expect(list().props.data).toHaveLength(500);
    expect(names()).toHaveLength(10);
    expect(text()).not.toContain(`${prefix} 499`);
    let parent = list().parent;
    while (parent) {
      expect(parent.type).not.toBe(ScrollView);
      parent = parent.parent;
    }
    await act(async () =>
      screen.root.findByType(RefreshControl).props.onRefresh(),
    );
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    await search(label, `${prefix} 499`);
    expect(list().props.data).toHaveLength(1);
    expect(names()).toHaveLength(1);
    const row = screen.root
      .findAll(
        node =>
          node.props.accessibilityRole === 'button' &&
          typeof node.props.onPress === 'function',
        { deep: false },
      )
      .find(node =>
        node
          .findAllByType(Text)
          .some(child => child.props.children === `${prefix} 499`),
      )!;
    await act(async () => row.props.onPress());
    expect(mockNavigate).toHaveBeenCalledWith(destination, { id });
    await search(label, 'no-such-record');
    expect(list().props.data).toHaveLength(0);
    expect(names()).toHaveLength(0);
    expect(text()).toMatch(
      /No matching vehicles|No routes yet|No students found|No drivers found/,
    );
  },
);

it.each(cases)(
  '$name keeps a bounded mounted window after scrolling to record 499',
  async ({ element, prefix }) => {
    jest.useFakeTimers();
    try {
      await render(element);
      const scroll = screen.root.findByType(ScrollView);
      await act(async () => {
        scroll.props.onLayout({
          nativeEvent: { layout: { width: 390, height: 600, x: 0, y: 0 } },
        });
        scroll.props.onContentSizeChange(390, 50200);
        // Supply native cell measurements, which the test renderer does not lay out.
        screen.root
          .findAll(
            node =>
              typeof node.props.onCellLayout === 'function' && node.props.item,
          )
          .forEach(cell => {
            cell.props.onCellLayout(
              {
                nativeEvent: {
                  layout: {
                    width: 366,
                    height: 100,
                    x: 0,
                    y: 200 + cell.props.index * 100,
                  },
                },
              },
              cell.props.cellKey,
              cell.props.index,
            );
          });
      });
      await act(async () => {
        scroll.props.onScroll({
          timeStamp: 100,
          nativeEvent: {
            contentOffset: { x: 0, y: 49600 },
            contentSize: { width: 390, height: 50200 },
            layoutMeasurement: { width: 390, height: 600 },
            zoomScale: 1,
          },
        });
      });
      for (let batch = 0; batch < 5; batch += 1) {
        await act(async () => {
          jest.advanceTimersByTime(100);
        });
      }
      const mounted = screen.root
        .findAllByType(Text)
        .filter(node =>
          new RegExp(`^${prefix} \\d+$`).test(node.props.children),
        );
      expect(
        mounted.some(node => node.props.children === `${prefix} 499`),
      ).toBe(true);
      expect(mounted.length).toBeLessThan(50);
      expect(list().props.data).toHaveLength(500);
      console.info(
        `${prefix} list: 500 records, 10 initially mounted, ${mounted.length} mounted after scrolling to record 499`,
      );
    } finally {
      await act(async () => screen.unmount());
      jest.useRealTimers();
    }
  },
);

it.each(cases)(
  '$name preserves loading, errors and refresh with empty data',
  async ({ element }) => {
    mockData.vehicles = [];
    mockData.routes = [];
    mockManagement.students = [];
    mockManagement.drivers = [];
    mockLoading = true;
    mockError = 'Could not load records';
    await render(element);
    expect(screen.root.findByType(RefreshControl).props.refreshing).toBe(true);
    expect(screen.root.findByType(Notice).props.text).toBe(mockError);
    expect(list().props.data).toHaveLength(0);
  },
);

it('preserves canonical student ordering, active-service selection, attendance precedence and vehicle filtering', async () => {
  mockManagement.students = [
    { ...student(0), id: 'old', studentId: 'child', status: 'STOPPED' },
    { ...student(1), studentId: 'child' },
    { ...student(2), studentId: 'child' },
    { ...student(3), studentId: 'stopped', status: 'STOPPED' },
    { ...student(4), studentId: 'stopped', status: 'STOPPED' },
  ];
  mockManagement.attendance = ['ABSENT', 'LEAVE'].map((status, index) => ({
    id: `${index}`,
    studentId: index ? 'student-2' : 'old',
    driverId: null,
    date: today(),
    status: status as Attendance['status'],
    note: '',
    updatedAt: '',
  }));
  await render(<StudentsScreen />);
  expect(list().props.data.map((item: Student) => item.id)).toEqual([
    'student-1',
    'student-4',
  ]);
  expect(text()).toContain('Leave');
  expect(text()).toContain('Total students: 2');
  await act(async () => screen.root.findByType(Tabs).props.onChange('ABSENT'));
  expect(list().props.data.map((item: Student) => item.id)).toEqual([
    'student-1',
  ]);
  await act(async () => screen.root.findByType(Tabs).props.onChange('LEAVE'));
  expect(list().props.data).toHaveLength(1);
  await act(async () =>
    screen.root
      .findAllByType(Picker)
      .find(node => node.props.accessibilityLabel === 'Filter by vehicle')!
      .props.onValueChange('vehicle-4'),
  );
  expect(list().props.data).toHaveLength(0);
  await act(async () => screen.root.findByType(Tabs).props.onChange('ALL'));
  expect(list().props.data.map((item: Student) => item.id)).toEqual([
    'student-4',
  ]);
});

it('updates precomputed route counts when enrollments change', async () => {
  await render(cases[1].element);
  expect(text()).toContain('1 people');
  mockManagement = {
    ...mockManagement,
    students: [
      student(0),
      { ...student(1), routeId: 'route-0' },
      { ...student(2), routeId: 'route-0', status: 'STOPPED' },
    ],
  };
  await act(async () =>
    screen.update(
      <NoorRoutesScreen
        navigation={mockNavigation as never}
        route={{} as never}
      />,
    ),
  );
  expect(text()).toContain('2 people');
  expect(text()).toContain('0 people');
});

it.each([
  {
    element: <StudentsScreen />,
    label: 'Student name *',
    searchLabel: 'Search students',
  },
  {
    element: <DriversScreen />,
    label: 'Name *',
    searchLabel: 'Search drivers...',
  },
])(
  'keeps a real form draft and instance while list data and language change: $label',
  async ({ element, label, searchLabel }) => {
    await render(element);
    await act(async () =>
      screen.root
        .findAllByType(SmallButton)
        .find(node => node.props.title === 'Add')!
        .props.onPress(),
    );
    const modal = screen.root.findByType(FormModal);
    await act(async () =>
      screen.root
        .findAllByType(Input)
        .find(node => node.props.label === label)!
        .props.onChangeText('Draft student or driver'),
    );
    await search(searchLabel, '499');
    await act(async () => {
      await i18n.changeLanguage('bn');
    });
    expect(screen.root.findByType(FormModal)).toBe(modal);
    expect(modal.props.visible).toBe(true);
    expect(
      screen.root
        .findAllByType(TextInput)
        .some(node => node.props.value === 'Draft student or driver'),
    ).toBe(true);
    expect(list().props.data).toHaveLength(1);
  },
);

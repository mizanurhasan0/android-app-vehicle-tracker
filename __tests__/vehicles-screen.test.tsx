import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text, TextInput } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParams } from '../src/navigation/types';
import { VehiclesScreen } from '../src/screens/VehiclesScreen';
import { FleetMap } from '../src/components/FleetMap';
import { VehicleEditSheet } from '../src/components/VehicleEditSheet';
import { VehicleListRow } from '../src/components/VehicleListRow';
import { Select } from '../src/components/ui';
import { Vehicle } from '../src/api/types';

let mockRole = 'ADMIN';
const mockNavigate = jest.fn();
const vehicles: Vehicle[] = [
  {
    id: 'one',
    name: 'Campus bus',
    plate: 'DHAKA 123',
    imei: '111',
    driverName: 'Rahim',
  },
  {
    id: 'two',
    name: 'City shuttle',
    plate: 'METRO 456',
    imei: '222',
    driverName: 'Karim',
  },
];
const mockData = {
  vehicles,
  locations: [],
  subscriptions: [],
  requests: [],
};
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ session: { user: { role: mockRole } } }),
}));
jest.mock('../src/context/DataContext', () => {
  const useData = () => ({
    data: mockData,
    loading: false,
    error: '',
    refresh: jest.fn(),
  });
  return { useData, useCoreData: useData, useDataActions: useData };
});
jest.mock('../src/components/FleetMap', () => ({
  ...jest.requireActual('../src/components/FleetMap'),
  FleetMap: () => null,
}));
jest.mock('react-native-webview', () => ({ WebView: 'WebView' }));
jest.mock('../src/components/VehicleEditSheet', () => ({
  VehicleEditSheet: () => null,
}));
jest.mock('@react-native-picker/picker', () => ({ Picker: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

let screen: TestRenderer.ReactTestRenderer;
const props = {
  navigation: { navigate: mockNavigate },
  route: {},
} as unknown as NativeStackScreenProps<HomeStackParams, 'Vehicles'>;
const rows = () => screen.root.findAllByType(VehicleListRow);
function pressables(root = screen.root) {
  return root.findAll(
    node =>
      typeof node.props.onPress === 'function' &&
      ['button', 'tab'].includes(node.props.accessibilityRole),
    { deep: false },
  );
}
function pressableWithText(label: string) {
  return pressables().find(node =>
    node.findAllByType(Text).some(text => text.props.children === label),
  )!;
}
async function renderScreen() {
  await act(async () => {
    screen = TestRenderer.create(<VehiclesScreen {...props} />);
  });
}
beforeEach(() => {
  mockRole = 'ADMIN';
  mockData.vehicles = [...vehicles];
  jest.clearAllMocks();
});
afterEach(async () => {
  await act(async () => screen?.unmount());
});

it('keeps map markers and accessible list selection in sync in both directions', async () => {
  await renderScreen();
  expect(screen.root.findByType(FleetMap).props.selectedId).toBeUndefined();
  expect(screen.root.findByType(FleetMap).props.vehicles).toEqual(vehicles);
  await act(async () => pressables(rows()[1])[0].props.onPress());
  expect(screen.root.findByType(FleetMap).props.selectedId).toBe('two');
  expect(pressables(rows()[1])[0].props.accessibilityState.selected).toBe(true);
  expect(rows()[0].props.selected).toBe(false);
  await act(async () => screen.root.findByType(FleetMap).props.onSelect('one'));
  expect(rows()[0].props.selected).toBe(true);
  expect(rows()[1].props.selected).toBe(false);
});

it('opens the edit sheet for the requested vehicle independently of map selection', async () => {
  await renderScreen();
  const edit = pressables(rows()[1]).find(
    button => button.props.accessibilityLabel === 'Edit City shuttle',
  )!;
  await act(async () => edit.props.onPress());
  expect(screen.root.findByType(VehicleEditSheet).props.vehicle).toEqual(
    vehicles[1],
  );
  expect(screen.root.findByType(FleetMap).props.selectedId).toBeUndefined();
  await act(async () =>
    screen.root.findByType(VehicleEditSheet).props.onSaved(),
  );
  expect(screen.root.findAllByType(VehicleEditSheet)).toHaveLength(0);
});

it('keeps editing unavailable to guardians', async () => {
  mockRole = 'GUARDIAN';
  await renderScreen();
  expect(rows()).toHaveLength(2);
  expect(rows().every(row => row.props.onEdit === undefined)).toBe(true);
  expect(pressableWithText('+ Add vehicle')).toBeUndefined();
  expect(pressableWithText('Recorded journeys')).toBeUndefined();
  expect(screen.root.findAllByType(VehicleEditSheet)).toHaveLength(0);
  expect(screen.root.findAllByType(FleetMap)).toHaveLength(1);
});

it('returns to the fleet overview when a data refresh removes the selection', async () => {
  await renderScreen();
  await act(async () => rows()[1].props.onSelect());
  mockData.vehicles = [vehicles[0]];
  await act(async () => screen.update(<VehiclesScreen {...props} />));
  expect(screen.root.findByType(FleetMap).props.selectedId).toBeUndefined();
  expect(rows()[0].props.selected).toBe(false);
  mockData.vehicles = [];
  await act(async () => screen.update(<VehiclesScreen {...props} />));
  expect(screen.root.findByType(FleetMap).props.selectedId).toBeUndefined();
  expect(rows()).toHaveLength(0);
  expect(
    screen.root
      .findAllByType(Text)
      .some(node => node.props.children === 'No vehicles yet'),
  ).toBe(true);
});

it('keeps all vehicles visible while opening details and clearing map selection', async () => {
  await renderScreen();
  await act(async () => rows()[1].props.onSelect());
  expect(screen.root.findByType(FleetMap).props.vehicles).toEqual(vehicles);
  await act(async () => pressableWithText('Vehicle details').props.onPress());
  expect(mockNavigate).toHaveBeenCalledWith('VehicleDetails', { id: 'two' });
  await act(async () => pressableWithText('Show all on map').props.onPress());
  expect(screen.root.findByType(FleetMap).props.vehicles).toEqual(vehicles);
  expect(screen.root.findByType(FleetMap).props.selectedId).toBeUndefined();
});

it('shows the map and bottom list without search, filters or a second toolbar', async () => {
  await renderScreen();
  expect(screen.root.findAllByType(TextInput)).toHaveLength(0);
  expect(screen.root.findAllByType(Select)).toHaveLength(0);
  expect(pressableWithText('+ Add vehicle')).toBeUndefined();
  expect(rows()).toHaveLength(2);
});

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text, TextInput } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeStackParams } from '../src/navigation/types';
import { VehiclesScreen } from '../src/screens/VehiclesScreen';
import { FleetMap } from '../src/components/FleetMap';
import { RecordedJourney } from '../src/components/RecordedJourney';
import { VehicleEditSheet } from '../src/components/VehicleEditSheet';
import { VehicleListRow } from '../src/components/VehicleListRow';
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
jest.mock('../src/context/DataContext', () => ({
  useData: () => ({
    data: mockData,
    loading: false,
    error: '',
    refresh: jest.fn(),
  }),
}));
jest.mock('../src/components/FleetMap', () => ({ FleetMap: () => null }));
jest.mock('../src/components/RecordedJourney', () => ({
  RecordedJourney: () => null,
}));
jest.mock('../src/components/VehicleEditSheet', () => ({
  VehicleEditSheet: () => null,
}));
jest.mock('@react-native-picker/picker', () => ({ Picker: () => null }));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
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
  expect(screen.root.findByType(FleetMap).props.selectedId).toBe('one');
  await act(async () => pressables(rows()[1])[0].props.onPress());
  expect(screen.root.findByType(FleetMap).props.selectedId).toBe('two');
  expect(pressables(rows()[1])[0].props.accessibilityState.selected).toBe(true);
  expect(rows()[0].props.selected).toBe(false);
  await act(async () => screen.root.findByType(FleetMap).props.onSelect('one'));
  expect(rows()[0].props.selected).toBe(true);
  expect(rows()[1].props.selected).toBe(false);
});

it.each(['CITY', 'metro 456', 'karim'])(
  'finds vehicles by name, plate, or driver using %s and clears the search',
  async query => {
    await renderScreen();
    await act(async () =>
      screen.root.findByType(TextInput).props.onChangeText(query),
    );
    expect(rows().map(row => row.props.vehicle.id)).toEqual(['two']);
    const clear = pressables().find(
      button => button.props.accessibilityLabel === 'Clear search',
    )!;
    await act(async () => clear.props.onPress());
    expect(screen.root.findByType(TextInput).props.value).toBe('');
    expect(rows().map(row => row.props.vehicle.id)).toEqual(['one', 'two']);
  },
);

it('opens the edit sheet for the requested vehicle independently of map selection', async () => {
  await renderScreen();
  const edit = pressables(rows()[1]).find(
    button => button.props.accessibilityLabel === 'Edit City shuttle',
  )!;
  await act(async () => edit.props.onPress());
  expect(screen.root.findByType(VehicleEditSheet).props.vehicle).toEqual(
    vehicles[1],
  );
  expect(screen.root.findByType(FleetMap).props.selectedId).toBe('one');
  await act(async () =>
    screen.root.findByType(VehicleEditSheet).props.onSaved(),
  );
  expect(screen.root.findAllByType(VehicleEditSheet)).toHaveLength(0);
  await act(async () => pressableWithText('+ Add vehicle').props.onPress());
  expect(mockNavigate).toHaveBeenCalledWith('CreateVehicle');
});

it('keeps creation, editing, and recorded journeys unavailable to guardians', async () => {
  mockRole = 'GUARDIAN';
  await renderScreen();
  expect(rows()).toHaveLength(2);
  expect(rows().every(row => row.props.onEdit === undefined)).toBe(true);
  expect(pressableWithText('+ Add vehicle')).toBeUndefined();
  expect(pressableWithText('Recorded journeys')).toBeUndefined();
  expect(screen.root.findAllByType(RecordedJourney)).toHaveLength(0);
  expect(screen.root.findAllByType(VehicleEditSheet)).toHaveLength(0);
  expect(screen.root.findAllByType(FleetMap)).toHaveLength(1);
});

it('opens recordings and full history for the selected vehicle and returns to its map', async () => {
  await renderScreen();
  await act(async () => rows()[1].props.onSelect());
  await act(async () => pressableWithText('Recorded journeys').props.onPress());
  expect(screen.root.findByType(RecordedJourney).props.vehicle).toEqual(
    vehicles[1],
  );
  await act(async () =>
    screen.root.findByType(RecordedJourney).props.onFullHistory(),
  );
  expect(mockNavigate).toHaveBeenCalledWith('VehicleHistory', {
    imei: '222',
    name: 'City shuttle',
  });
  await act(async () => screen.root.findByType(RecordedJourney).props.onBack());
  expect(screen.root.findByType(FleetMap).props.selectedId).toBe('two');
});

it('falls back to an available vehicle when a data refresh removes the selection', async () => {
  await renderScreen();
  await act(async () => rows()[1].props.onSelect());
  mockData.vehicles = [vehicles[0]];
  await act(async () => screen.update(<VehiclesScreen {...props} />));
  expect(screen.root.findByType(FleetMap).props.selectedId).toBe('one');
  expect(rows()[0].props.selected).toBe(true);
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

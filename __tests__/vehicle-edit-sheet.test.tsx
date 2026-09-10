import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Modal } from 'react-native';
import { Vehicle } from '../src/api/types';
import { VehicleEditSheet } from '../src/components/VehicleEditSheet';
import { Button, Field, Notice } from '../src/components/ui';
import { i18n } from '../src/i18n';

const mockMutate = jest.fn();
const mockClose = jest.fn();
const mockSaved = jest.fn();
let mockRole = 'ADMIN';

jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ session: { user: { role: mockRole } } }),
}));
jest.mock('../src/context/DataContext', () => ({
  useData: () => ({ mutate: mockMutate }),
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

const vehicle: Vehicle = {
  id: 'vehicle-1',
  name: 'School bus',
  plate: 'BUS 01',
  imei: '123456789012345',
  driverName: 'Driver One',
  driverPhone: '01712345678',
};
let screen: TestRenderer.ReactTestRenderer;
beforeEach(async () => {
  await i18n.changeLanguage('en');
  mockRole = 'ADMIN';
  mockMutate.mockReset().mockResolvedValue(vehicle);
  mockSaved.mockReset();
  mockClose.mockReset();
});
afterEach(async () => {
  await act(async () => screen?.unmount());
});

function sheet(selected: Vehicle | null = vehicle) {
  return (
    <VehicleEditSheet
      vehicle={selected}
      onClose={mockClose}
      onSaved={mockSaved}
    />
  );
}
async function render() {
  await act(async () => {
    screen = TestRenderer.create(sheet());
  });
}
function field(label: string) {
  return screen.root
    .findAllByType(Field)
    .find(node => node.props.label === label)!;
}
async function change(label: string, value: string) {
  await act(async () => field(label).props.onChangeText(value));
}
function save() {
  return screen.root
    .findAllByType(Button)
    .find(node => node.props.title === 'Save changes')!;
}

it('patches the selected vehicle with trimmed edits and allows clearing optional driver fields', async () => {
  await render();
  expect(save().props.disabled).toBe(true);
  await change('Vehicle name', '  Morning bus  ');
  await change('Driver name (optional)', '');
  await change('Driver phone (optional)', '');
  await act(async () => save().props.onPress());
  expect(mockMutate).toHaveBeenCalledWith(
    '/vehicles/vehicle-1',
    {
      name: 'Morning bus',
      plate: vehicle.plate,
      imei: vehicle.imei,
      driverName: '',
      driverPhone: '',
    },
    'PATCH',
  );
  expect(mockSaved).toHaveBeenCalledTimes(1);
  expect(mockClose).toHaveBeenCalledTimes(1);
});

it('validates required fields and device identifiers before saving', async () => {
  await render();
  await change('GPS device IMEI', '123');
  await act(async () => save().props.onPress());
  expect(mockMutate).not.toHaveBeenCalled();
  expect(screen.root.findByType(Notice).props.text).toBe(
    'Enter a vehicle name, plate and a 14–17 digit IMEI.',
  );
  expect(mockClose).not.toHaveBeenCalled();
});

it('keeps edited values open when the server rejects a save', async () => {
  mockMutate.mockRejectedValue(new Error('IMEI is already assigned'));
  await render();
  await change('GPS device IMEI', '987654321098765');
  await act(async () => save().props.onPress());
  expect(screen.root.findByType(Notice).props.text).toBe(
    'IMEI is already assigned',
  );
  expect(field('GPS device IMEI').props.value).toBe('987654321098765');
  expect(mockSaved).not.toHaveBeenCalled();
  expect(mockClose).not.toHaveBeenCalled();
});

it('prevents duplicate submissions and dismissal while a save is pending', async () => {
  let resolve!: () => void;
  mockMutate.mockImplementation(
    () =>
      new Promise<void>(done => {
        resolve = done;
      }),
  );
  await render();
  await change('Vehicle name', 'New name');
  await act(async () => {
    save().props.onPress();
    save().props.onPress();
  });
  expect(mockMutate).toHaveBeenCalledTimes(1);
  expect(save().props.busy).toBe(true);
  expect(field('Vehicle name').props.editable).toBe(false);
  await act(async () => screen.root.findByType(Modal).props.onRequestClose());
  expect(mockClose).not.toHaveBeenCalled();
  await act(async () => resolve());
  expect(mockClose).toHaveBeenCalledTimes(1);
});

it('preserves drafts on refresh and initializes a fresh draft for another vehicle', async () => {
  await render();
  await change('Vehicle name', 'Draft name');
  await act(async () =>
    screen.update(sheet({ ...vehicle, name: 'Refreshed name' })),
  );
  expect(field('Vehicle name').props.value).toBe('Draft name');
  await act(async () =>
    screen.update(sheet({ ...vehicle, id: 'vehicle-2', name: 'Second bus' })),
  );
  expect(field('Vehicle name').props.value).toBe('Second bus');
});

it('does not render editing controls for guardians', async () => {
  mockRole = 'GUARDIAN';
  await render();
  expect(screen.toJSON()).toBeNull();
  expect(mockMutate).not.toHaveBeenCalled();
});

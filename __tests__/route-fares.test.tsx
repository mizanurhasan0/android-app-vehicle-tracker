import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text, View } from 'react-native';
import { Route } from '../src/api/types';
import { RouteFareManager } from '../src/components/RouteFareManager';
import { Button, Field, Select } from '../src/components/ui';
import { FormModal } from '../src/screens/admin/AdminUi';
import { i18n } from '../src/i18n';

const mockMutate = jest.fn();
jest.mock('../src/context/DataContext', () => ({
  useData: () => ({ mutate: mockMutate }),
}));
jest.mock('@react-native-picker/picker', () => {
  const ReactModule = require('react');
  const { View: NativeView } = require('react-native');
  const Picker = (props: object) =>
    ReactModule.createElement(NativeView, props);
  Picker.Item = (props: object) => ReactModule.createElement(NativeView, props);
  return { Picker };
});
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

const route: Route = {
  id: 'route-1',
  name: 'Uttara to Mirpur',
  vehicleId: 'bus-1',
  vehicleName: 'School bus',
  monthlyAmount: 200000,
  stops: [
    { id: 'uttara', name: 'Uttara' },
    { id: 'khilkhet', name: 'Khilkhet' },
    { id: 'mirpur', name: 'Mirpur' },
  ],
  fares: [
    {
      boardingStopId: 'uttara',
      dropoffStopId: 'khilkhet',
      monthlyAmount: 100000,
    },
  ],
};
let screen: TestRenderer.ReactTestRenderer;
beforeEach(async () => {
  mockMutate.mockReset().mockResolvedValue({});
  await i18n.changeLanguage('en');
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
  await i18n.changeLanguage('en');
});
async function press(title: string) {
  await act(async () =>
    screen.root
      .findAllByType(Button)
      .find(node => node.props.title === i18n.t(title))!
      .props.onPress(),
  );
}
async function field(label: string, value: string) {
  await act(async () =>
    screen.root
      .findAllByType(Field)
      .find(node => node.props.label === i18n.t(label))!
      .props.onChangeText(value),
  );
}
async function choose(label: string, value: string) {
  await act(async () =>
    screen.root
      .findAllByType(Select)
      .find(node => node.props.label === i18n.t(label))!
      .props.onChange(value),
  );
}
async function open() {
  await act(async () => {
    screen = TestRenderer.create(<RouteFareManager route={route} editable />);
  });
  await press('Manage route fares');
}
async function save() {
  await act(async () => screen.root.findByType(FormModal).props.onSave());
}

it('saves different monthly amounts for two destinations on the same route in poisha', async () => {
  await open();
  await choose('Boarding stop', 'uttara');
  expect(
    screen.root
      .findAllByType(Select)
      .find(node => node.props.label === 'Destination stop')!.props.options,
  ).not.toContainEqual({ value: 'uttara', label: 'Uttara' });
  await choose('Destination stop', 'mirpur');
  await field('Journey monthly fee (৳)', '1500.50');
  await press('Add fare');
  expect(mockMutate).not.toHaveBeenCalled();
  await save();
  expect(mockMutate).toHaveBeenCalledWith(
    '/admin/routes/route-1/fares',
    {
      fares: [
        {
          boardingStopId: 'uttara',
          dropoffStopId: 'khilkhet',
          monthlyAmount: 100000,
        },
        {
          boardingStopId: 'uttara',
          dropoffStopId: 'mirpur',
          monthlyAmount: 150050,
        },
      ],
    },
    'PUT',
  );
  expect(screen.root.findByType(FormModal).props.visible).toBe(false);
});

it('prevents duplicate pairs and keeps an unsaved new fare from being silently discarded', async () => {
  await open();
  await choose('Boarding stop', 'uttara');
  await choose('Destination stop', 'khilkhet');
  await field('Journey monthly fee (৳)', '1200');
  await press('Add fare');
  expect(screen.root.findByType(FormModal).props.error).toContain(
    'already has a fare',
  );
  await save();
  expect(screen.root.findByType(FormModal).props.error).toContain(
    'Add the entered fare',
  );
  expect(mockMutate).not.toHaveBeenCalled();
});

it('validates edited fees and preserves the draft after a failed save', async () => {
  await open();
  await field('Uttara → Khilkhet (৳)', '0');
  await save();
  expect(mockMutate).not.toHaveBeenCalled();
  expect(screen.root.findByType(FormModal).props.visible).toBe(true);
  const amountField = () =>
    screen.root
      .findAllByType(Field)
      .find(node => node.props.label === 'Uttara → Khilkhet (৳)')!;
  expect(amountField().props.error).toBeTruthy();
  expect(
    screen.root
      .findAllByType(View)
      .some(node => node.props.testID === 'feedback-toast'),
  ).toBe(true);
  await field('Uttara → Khilkhet (৳)', '1100');
  expect(amountField().props.error).toBeUndefined();
  mockMutate.mockRejectedValueOnce(new Error('Connection unavailable'));
  await save();
  expect(screen.root.findByType(FormModal).props.error).toBe(
    'Connection unavailable',
  );
  expect(
    screen.root
      .findAllByType(Field)
      .find(node => node.props.label === 'Uttara → Khilkhet (৳)')!.props.value,
  ).toBe('1100');
  await save();
  expect(mockMutate).toHaveBeenLastCalledWith(
    '/admin/routes/route-1/fares',
    {
      fares: [
        {
          boardingStopId: 'uttara',
          dropoffStopId: 'khilkhet',
          monthlyAmount: 110000,
        },
      ],
    },
    'PUT',
  );
});

it('persists fare removal and cancels changes when the editor is reopened', async () => {
  await open();
  await press('Remove fare');
  await act(async () => screen.root.findByType(FormModal).props.onClose());
  await press('Manage route fares');
  expect(
    screen.root
      .findAllByType(Field)
      .some(node => node.props.label === 'Uttara → Khilkhet (৳)'),
  ).toBe(true);
  await press('Remove fare');
  await save();
  expect(mockMutate).toHaveBeenCalledWith(
    '/admin/routes/route-1/fares',
    { fares: [] },
    'PUT',
  );
});

it('offers guardians a read-only fare list and renders its Bangla labels', async () => {
  await i18n.changeLanguage('bn');
  await act(async () => {
    screen = TestRenderer.create(<RouteFareManager route={route} />);
  });
  expect(screen.root.findAllByType(Button)).toHaveLength(0);
  const text = screen.root
    .findAllByType(Text)
    .flatMap(node => node.props.children)
    .join(' ');
  expect(text).toContain('Uttara');
  expect(text).toContain('Khilkhet');
  expect(text).toContain(i18n.t('Stop-to-stop monthly fares'));
  expect(i18n.t('Stop-to-stop monthly fares')).not.toBe(
    'Stop-to-stop monthly fares',
  );
});

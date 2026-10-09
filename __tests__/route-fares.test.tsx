import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { Route } from '../src/api/types';
import { RouteFareManager } from '../src/components/RouteFareManager';
import { Button, Field, Select } from '../src/components/ui';
import { i18n } from '../src/i18n';

const mockMutate = jest.fn();
jest.mock('../src/context/DataContext', () => {
  const useData = () => ({ mutate: mockMutate });
  return { useData, useCoreData: useData, useDataActions: useData };
});
jest.mock('@react-native-picker/picker', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  const Picker = (props: object) => ReactModule.createElement(View, props);
  Picker.Item = (props: object) => ReactModule.createElement(View, props);
  return { Picker };
});

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
  await act(async () => {
    await i18n.changeLanguage('en');
    screen = TestRenderer.create(<RouteFareManager route={route} editable />);
  });
});
afterEach(async () => {
  await act(async () => screen?.unmount());
});

async function press(title: string) {
  await act(async () => {
    screen.root
      .findAllByType(Button)
      .find(node => node.props.title === i18n.t(title))!
      .props.onPress();
  });
}
async function choose(label: string, value: string) {
  await act(async () => {
    screen.root
      .findAllByType(Select)
      .find(node => node.props.label === i18n.t(label))!
      .props.onChange(value);
  });
}
async function field(value: string) {
  await act(async () => {
    screen.root
      .findAllByType(Field)
      .find(node => node.props.label === i18n.t('Journey monthly fee (৳)'))!
      .props.onChangeText(value);
  });
}
function text() {
  return screen.root
    .findAllByType(Text)
    .flatMap(node => node.props.children)
    .join(' ');
}

it('adds a route fee to the table before saving every fee together in poisha', async () => {
  await choose('Start point', 'uttara');
  await choose('End point', 'mirpur');
  await field('1500.50');
  await press('Add fare');

  expect(mockMutate).not.toHaveBeenCalled();
  expect(text()).toContain('Uttara');
  expect(text()).toContain('Mirpur');
  await press('Save monthly fees');
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
});

it('loads a selected fare into the form and can remove a fee from the table', async () => {
  const edit = screen.root.findAll(
    node =>
      node.props.accessibilityLabel ===
      'Edit transport fee: Uttara to Khilkhet',
  )[0];
  await act(async () => edit.props.onPress());
  expect(
    screen.root
      .findAllByType(Field)
      .find(node => node.props.label === i18n.t('Journey monthly fee (৳)'))!
      .props.value,
  ).toBe('1000');

  await field('1100');
  await press('Update fare');
  expect(text()).toContain('৳1,100');

  const remove = screen.root.findAll(
    node =>
      node.props.accessibilityLabel ===
      `${i18n.t('Remove fare')}: Uttara to Khilkhet`,
  )[0];
  await act(async () => remove.props.onPress());
  await press('Save monthly fees');
  expect(mockMutate).toHaveBeenCalledWith(
    '/admin/routes/route-1/fares',
    { fares: [] },
    'PUT',
  );
});

it('rejects a duplicate journey pair', async () => {
  await choose('Start point', 'uttara');
  await choose('End point', 'khilkhet');
  await field('1200');
  await press('Add fare');
  const endPoint = screen.root
    .findAllByType(Select)
    .find(node => node.props.label === 'End point')!;
  expect(endPoint.props.error).toContain('already has a fare');
  expect(mockMutate).not.toHaveBeenCalled();
});

it('shows guardians the same read-only table in Bangla', async () => {
  await act(async () => {
    await i18n.changeLanguage('bn');
    screen.unmount();
    screen = TestRenderer.create(<RouteFareManager route={route} />);
  });
  expect(screen.root.findAllByType(Button)).toHaveLength(0);
  expect(text()).toContain('Uttara');
  expect(text()).toContain('Khilkhet');
  expect(text()).toContain(i18n.t('Monthly transport fees'));
});

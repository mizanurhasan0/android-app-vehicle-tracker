import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { RecordedJourney } from '../src/components/RecordedJourney';
import { HistoryMap } from '../src/components/HistoryMap';
import { Button, Field } from '../src/components/ui';
import { HistoryRoute } from '../src/api/types';

const mockRetry = jest.fn();
const mockHistoryHook = jest.fn();
jest.mock('../src/hooks/useVehicleHistory', () => ({
  useVehicleHistory: (...args: unknown[]) => mockHistoryHook(...args),
}));
jest.mock('../src/components/HistoryMap', () => ({ HistoryMap: 'HistoryMap' }));
// The React Native preset treats FlatList as a host node. Render its public
// slots here so interactions exercise the actual journey header and rows.
jest.mock('react-native/Libraries/Lists/FlatList', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  const FlatList = ({
    data,
    renderItem,
    ListHeaderComponent,
    ListEmptyComponent,
    ListFooterComponent,
  }: {
    data: Array<{ id: string }>;
    renderItem: (value: {
      item: { id: string };
      index: number;
    }) => React.ReactNode;
    ListHeaderComponent: React.ReactNode;
    ListEmptyComponent: React.ReactNode;
    ListFooterComponent: React.ReactNode;
  }) =>
    ReactModule.createElement(
      View,
      null,
      ListHeaderComponent,
      data.length
        ? data.map((item, index) =>
            ReactModule.createElement(
              View,
              { key: item.id },
              renderItem({ item, index }),
            ),
          )
        : ListEmptyComponent,
      ListFooterComponent,
    );
  return { __esModule: true, default: FlatList };
});
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

const point = {
  id: 'first',
  imei: '123',
  vehicleId: 'bus',
  latitude: 23.8,
  longitude: 90.4,
  speed: 10,
  course: 0,
  gpsTime: '2026-09-10T01:00:00Z',
  receivedAt: '2026-09-10T01:00:01Z',
};
const route: HistoryRoute = {
  imei: '123',
  from: '2026-09-09T18:00:00.000Z',
  to: '2026-09-10T18:00:00.000Z',
  timezone: 'Asia/Dhaka',
  freshness: { pendingPoints: 0, oldestPendingAt: null, complete: true },
  segments: [
    {
      points: [point, { ...point, id: 'second', longitude: 90.41, speed: 20 }],
    },
  ],
  pointCount: 2,
  displayedPointCount: 2,
  simplified: false,
  distanceMeters: 1500,
  gapCount: 0,
};
const props = {
  vehicle: { id: 'bus', imei: '123', name: 'School bus', plate: 'BUS 01' },
  onBack: jest.fn(),
  onFullHistory: jest.fn(),
};
let screen: TestRenderer.ReactTestRenderer;

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-09-10T08:00:00Z'));
  jest.clearAllMocks();
  mockHistoryHook.mockReturnValue({ loading: false, route, retry: mockRetry });
});
afterEach(async () => {
  await act(async () => screen?.unmount());
  jest.useRealTimers();
});
async function render() {
  await act(async () => {
    screen = TestRenderer.create(<RecordedJourney {...props} />);
  });
}
async function press(label: string) {
  const target = screen.root
    .findAll(item => typeof item.props.onPress === 'function')
    .find(item => item.props.accessibilityLabel === label);
  expect(target).toBeDefined();
  await act(async () => target!.props.onPress());
}
async function button(title: string) {
  const target = screen.root
    .findAllByType(Button)
    .find(item => item.props.title === title);
  expect(target).toBeDefined();
  await act(async () => target!.props.onPress());
}

it('selects saved samples on the map and resets selection when changing days', async () => {
  await render();
  expect(mockHistoryHook).toHaveBeenLastCalledWith(
    '123',
    '2026-09-09T18:00:00.000Z',
    '2026-09-10T18:00:00.000Z',
  );
  expect(screen.root.findByType(HistoryMap).props.selected.id).toBe('first');
  await press('Show recorded position 2');
  expect(screen.root.findByType(HistoryMap).props.selected).toEqual(
    route.segments[0].points[1],
  );
  expect(
    screen.root
      .findAll(item => typeof item.props.onPress === 'function')
      .find(
        item => item.props.accessibilityLabel === 'Show recorded position 2',
      )?.props.accessibilityState.selected,
  ).toBe(true);
  await press('Previous day');
  expect(mockHistoryHook).toHaveBeenLastCalledWith(
    '123',
    '2026-09-08T18:00:00.000Z',
    '2026-09-09T18:00:00.000Z',
  );
  expect(screen.root.findByType(HistoryMap).props.selected.id).toBe('first');
  await press('Next day');
  expect(mockHistoryHook).toHaveBeenLastCalledWith(
    '123',
    '2026-09-09T18:00:00.000Z',
    '2026-09-10T18:00:00.000Z',
  );
  expect(
    screen.root
      .findAll(item => typeof item.props.onPress === 'function')
      .find(item => item.props.accessibilityLabel === 'Next day')?.props
      .disabled,
  ).toBe(true);
});

it('rejects impossible and future dates, then loads a valid chosen date', async () => {
  await render();
  await press('Choose journey date');
  await act(async () =>
    screen.root.findByType(Field).props.onChangeText('2026-02-30'),
  );
  await button('Show selected date');
  expect(JSON.stringify(screen.toJSON())).toContain('Enter a valid date');
  expect(mockHistoryHook).toHaveBeenLastCalledWith('123', route.from, route.to);
  await act(async () =>
    screen.root.findByType(Field).props.onChangeText('2026-09-11'),
  );
  await button('Show selected date');
  expect(JSON.stringify(screen.toJSON())).toContain(
    'Choose today or an earlier date.',
  );
  expect(mockHistoryHook).toHaveBeenLastCalledWith('123', route.from, route.to);
  await act(async () =>
    screen.root.findByType(Field).props.onChangeText('2026-08-31'),
  );
  await button('Show selected date');
  expect(mockHistoryHook).toHaveBeenLastCalledWith(
    '123',
    '2026-08-30T18:00:00.000Z',
    '2026-08-31T18:00:00.000Z',
  );
  expect(screen.root.findAllByType(Field)).toHaveLength(0);
});

it('removes old route and samples while loading a different day and exposes retry on failure', async () => {
  await render();
  expect(screen.root.findAllByType(HistoryMap)).toHaveLength(1);
  mockHistoryHook.mockReturnValue({ loading: true, retry: mockRetry });
  await press('Previous day');
  expect(screen.root.findAllByType(HistoryMap)).toHaveLength(0);
  expect(
    screen.root
      .findAll(item => typeof item.props.onPress === 'function')
      .filter(item =>
        item.props.accessibilityLabel?.startsWith('Show recorded position'),
      ),
  ).toHaveLength(0);
  expect(JSON.stringify(screen.toJSON())).toContain(
    'Loading recorded journey…',
  );
  mockHistoryHook.mockReturnValue({
    loading: false,
    error: 'History storage unavailable',
    retry: mockRetry,
  });
  await act(async () => screen.update(<RecordedJourney {...props} />));
  expect(screen.root.findAllByType(HistoryMap)).toHaveLength(0);
  expect(JSON.stringify(screen.toJSON())).toContain('Unable to load history.');
  await button('Retry history');
  expect(mockRetry).toHaveBeenCalledTimes(1);
});

it('shows empty recording guidance and invokes full history and change vehicle actions', async () => {
  mockHistoryHook.mockReturnValue({
    loading: false,
    route: { ...route, segments: [], pointCount: 0 },
    retry: mockRetry,
  });
  await render();
  expect(screen.root.findAllByType(HistoryMap)).toHaveLength(0);
  expect(JSON.stringify(screen.toJSON())).toContain(
    'Earlier journeys cannot be recovered',
  );
  const actions = screen.root.findAll(
    item => typeof item.props.onPress === 'function',
  );
  await act(async () =>
    actions.find(item => item.props.onPress === props.onBack)!.props.onPress(),
  );
  await act(async () =>
    actions
      .find(item => item.props.onPress === props.onFullHistory)!
      .props.onPress(),
  );
  expect(props.onBack).toHaveBeenCalledTimes(1);
  expect(props.onFullHistory).toHaveBeenCalledTimes(1);
  await button('Refresh history');
  expect(mockRetry).toHaveBeenCalledTimes(1);
});

import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import {
  AccessibilityInfo,
  AppState,
  AppStateStatus,
  Text,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useDeadline } from '../src/hooks/useDeadline';
import { FleetMap } from '../src/components/FleetMap';
import { VehicleCard } from '../src/components/VehicleCard';
import { VehicleListRow } from '../src/components/VehicleListRow';
import { Location } from '../src/api/types';

jest.mock('react-native-webview', () => ({ WebView: 'WebView' }));
const epoch = Date.parse('2026-09-19T06:00:00Z');
const vehicle = { id: 'v1', imei: '123', name: 'Bus', plate: 'BUS 1' };
const location: Location = {
  imei: '123',
  latitude: 23.8,
  longitude: 90.4,
  status: 'live',
  lastSeen: new Date(epoch).toISOString(),
};
let screen: TestRenderer.ReactTestRenderer;
let listeners: Set<(state: AppStateStatus) => void>;
const inject = jest.fn();
beforeEach(() => {
  jest.useFakeTimers({
    doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate'],
  });
  jest.setSystemTime(epoch);
  listeners = new Set();
  Object.defineProperty(AppState, 'currentState', {
    configurable: true,
    writable: true,
    value: 'active',
  });
  jest
    .spyOn(AppState, 'addEventListener')
    .mockImplementation((_type, listener) => {
      listeners.add(listener);
      return {
        remove: () => {
          listeners.delete(listener);
        },
      };
    });
  jest
    .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
    .mockResolvedValue(true);
  inject.mockClear();
});
afterEach(async () => {
  await act(async () => screen?.unmount());
  expect(listeners.size).toBe(0);
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});
async function render(element: React.ReactElement) {
  await act(async () => {
    screen = TestRenderer.create(element, {
      createNodeMock: () => ({ injectJavaScript: inject }),
    });
  });
}
async function advance(ms: number) {
  await act(async () => {
    jest.advanceTimersByTime(ms);
  });
}
async function appState(state: AppStateStatus) {
  await act(async () => {
    AppState.currentState = state;
    [...listeners].forEach(listener => listener(state));
  });
}
function Probe({ deadline }: { deadline?: number }) {
  const revision = useDeadline(deadline);
  return <Text>{revision}</Text>;
}
function packets() {
  return inject.mock.calls.map(([script]: [string]) =>
    JSON.parse(script.match(/window\.updateFleet\((.*)\);true;/)![1]),
  );
}
it('expires a live map marker at 180s with identical props and no HTTP or socket events', async () => {
  const vehicles = [vehicle],
    locations = [location];
  await render(
    <FleetMap vehicles={vehicles} locations={locations} onSelect={jest.fn()} />,
  );
  const web = screen.root.findByType(WebView);
  const source = web.props.source;
  await act(async () =>
    web.props.onMessage({ nativeEvent: { data: '{"type":"ready"}' } }),
  );
  expect(packets()[0].upsert[0].live).toBe(true);
  inject.mockClear();
  expect(jest.getTimerCount()).toBe(1);
  await advance(179_999);
  expect(inject).not.toHaveBeenCalled();
  await advance(1);
  expect(packets()).toEqual([
    { upsert: [expect.objectContaining({ id: 'v1', live: false })] },
  ]);
  expect(screen.root.findByType(WebView).props.source).toBe(source);
  expect(jest.getTimerCount()).toBe(0);
});
it('uses just the nearest map deadline and skips unrelated/invalid/offline locations', async () => {
  const later = {
    ...location,
    imei: '456',
    lastSeen: new Date(epoch + 30_000).toISOString(),
  };
  await render(
    <FleetMap
      vehicles={[vehicle, { ...vehicle, id: 'v2', imei: '456' }]}
      locations={[location, later, { ...location, imei: 'unknown' }]}
      onSelect={jest.fn()}
    />,
  );
  await act(async () =>
    screen.root
      .findByType(WebView)
      .props.onMessage({ nativeEvent: { data: '{"type":"ready"}' } }),
  );
  inject.mockClear();
  expect(jest.getTimerCount()).toBe(1);
  await advance(180_000);
  expect(
    packets()[0].upsert.map((marker: { id: string }) => marker.id),
  ).toEqual(['v1']);
  expect(jest.getTimerCount()).toBe(1);
  await advance(30_000);
  expect(
    packets()[1].upsert.map((marker: { id: string }) => marker.id),
  ).toEqual(['v2']);
  expect(jest.getTimerCount()).toBe(0);
  await act(async () =>
    screen.update(
      <FleetMap
        vehicles={[vehicle]}
        locations={[
          { ...location, status: 'offline' },
          { ...later, latitude: NaN },
        ]}
        onSelect={jest.fn()}
      />,
    ),
  );
  expect(jest.getTimerCount()).toBe(0);
});
it.each(['live', 'lastKnown'] as const)(
  'repaints mounted %s card and row offline without data changes',
  async status => {
    const current = { ...location, status };
    await render(
      <>
        <VehicleCard
          vehicle={vehicle}
          location={current}
          busy={false}
          onOpenURL={jest.fn()}
        />
        <VehicleListRow
          vehicle={vehicle}
          location={current}
          selected={false}
          onSelect={jest.fn()}
        />
      </>,
    );
    const labels = () =>
      screen.root
        .findAll(node => typeof node.props?.accessibilityLabel === 'string')
        .map(node => node.props.accessibilityLabel as string);
    expect(
      labels().some(
        label => label.startsWith('Bus,') && label.includes('Offline'),
      ),
    ).toBe(false);
    await advance(180_000);
    expect(labels()).toContain('Bus, Offline');
    expect(
      labels().some(label => label.startsWith('Bus, BUS 1, Offline')),
    ).toBe(true);
    expect(jest.getTimerCount()).toBe(0);
  },
);
it('rechecks suspended GPS deadlines on resume without waiting for network', async () => {
  await render(
    <FleetMap
      vehicles={[vehicle]}
      locations={[location]}
      onSelect={jest.fn()}
    />,
  );
  await act(async () =>
    screen.root
      .findByType(WebView)
      .props.onMessage({ nativeEvent: { data: '{"type":"ready"}' } }),
  );
  inject.mockClear();
  await appState('background');
  expect(jest.getTimerCount()).toBe(0);
  jest.setSystemTime(epoch + 240_000);
  await appState('active');
  expect(packets()[0].upsert[0].live).toBe(false);
  expect(jest.getTimerCount()).toBe(0);
});
it('reschedules replaced deadlines and cleans timers/listeners on dependency changes and unmount', async () => {
  await render(<Probe deadline={epoch + 1000} />);
  expect(jest.getTimerCount()).toBe(1);
  await act(async () => screen.update(<Probe deadline={epoch + 2000} />));
  expect(jest.getTimerCount()).toBe(1);
  expect(listeners.size).toBe(1);
  await advance(1000);
  expect(screen.root.findByType(Text).props.children).toBe(0);
  await advance(1000);
  expect(screen.root.findByType(Text).props.children).toBe(1);
  expect(jest.getTimerCount()).toBe(0);
  await act(async () => screen.update(<Probe deadline={epoch + 5000} />));
  await act(async () => screen.update(<Probe />));
  expect(jest.getTimerCount()).toBe(0);
  expect(listeners.size).toBe(0);
  await act(async () => screen.update(<Probe deadline={epoch + 5000} />));
  await act(async () => screen.unmount());
  expect(jest.getTimerCount()).toBe(0);
  expect(listeners.size).toBe(0);
});
it.each([undefined, NaN, Infinity])(
  'does no timer or listener work for an irrelevant deadline %s',
  async deadline => {
    await render(<Probe deadline={deadline} />);
    expect(jest.getTimerCount()).toBe(0);
    expect(listeners.size).toBe(0);
  },
);

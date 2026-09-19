/** @jest-environment node */
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { JSDOM } from 'jsdom';
import { WebView } from 'react-native-webview';
import { FleetMap } from '../src/components/FleetMap';
import { HistoryMap } from '../src/components/HistoryMap';
import { HistoryRoute, Location, Vehicle } from '../src/api/types';
import { i18n } from '../src/i18n';

jest.mock('react-native-webview', () => ({ WebView: 'WebView' }));

let screen: TestRenderer.ReactTestRenderer;
let dom: JSDOM | undefined;
const inject = jest.fn((script: string) => dom?.window.eval(script));
const vehicles: Vehicle[] = Array.from({ length: 100 }, (_, index) => ({
  id: `v${index}`,
  imei: `imei${index}`,
  name: `Bus ${index}`,
  plate: `${index}`,
}));
let locations: Location[];
const onSelect = jest.fn();
function web() {
  return screen.root.findByType(WebView);
}
function openDocument() {
  dom?.window.close();
  dom = new JSDOM(web().props.source.html, {
    runScripts: 'dangerously',
    beforeParse(window) {
      Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', {
        get: () => 400,
      });
      Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
        get: () => 360,
      });
    },
  });
}
async function render(element: React.ReactElement) {
  await act(async () => {
    screen = TestRenderer.create(element, {
      createNodeMock: () => ({ injectJavaScript: inject }),
    });
  });
  openDocument();
}
async function ready() {
  await act(async () => {
    web().props.onMessage({ nativeEvent: { data: '{"type":"ready"}' } });
  });
}
async function update(selectedId?: string) {
  await act(async () => {
    screen.update(
      <FleetMap {...{ vehicles, locations, selectedId, onSelect }} />,
    );
  });
}
function packets() {
  return inject.mock.calls.map(([script]) =>
    JSON.parse(script.match(/window\.updateFleet\((.*)\);true;/)![1]),
  );
}
beforeEach(async () => {
  await i18n.changeLanguage('en');
  inject.mockClear();
  onSelect.mockClear();
  locations = vehicles.map((vehicle, index) => ({
    imei: vehicle.imei,
    latitude: 23.8 + index * 0.00001,
    longitude: 90.4 + index * 0.00001,
    status: 'live',
    lastSeen: new Date().toISOString(),
  }));
});
afterEach(async () => {
  await act(async () => screen?.unmount());
  dom?.window.close();
  dom = undefined;
  await i18n.changeLanguage('en');
  jest.restoreAllMocks();
});

it('sends 1 marker per socket change, reuses all 100 buttons, and sends no geometry for selection', async () => {
  await render(<FleetMap {...{ vehicles, locations, onSelect }} />);
  const source = web().props.source;
  expect(inject).not.toHaveBeenCalled();
  await ready();
  expect(packets()[0]).toMatchObject({ reset: true, selectedId: null });
  expect(packets()[0].upsert).toHaveLength(100);
  const snapshotBytes = Buffer.byteLength(inject.mock.calls[0][0]);
  const document = dom!.window.document;
  const buttons = [...document.querySelectorAll('.marker')];
  expect(buttons).toHaveLength(100);
  const tiles = [...document.querySelectorAll('#tiles img')];
  const initialLeft = parseFloat((buttons[0] as HTMLElement).style.left);
  const zoom = Number((tiles[0] as HTMLImageElement).src.split('/')[3]);
  const onUntouchedMutation = jest.fn();
  const untouched = new dom!.window.MutationObserver(onUntouchedMutation);
  untouched.observe(buttons[1], {
    attributes: true,
    childList: true,
    subtree: true,
  });
  const create = jest.spyOn(document, 'createElement');
  inject.mockClear();

  for (let index = 1; index <= 10; index++) {
    locations = locations.map((location, i) =>
      i === 0 ? { ...location, longitude: 90.4 + index * 0.00001 } : location,
    );
    await update();
  }
  expect(inject).toHaveBeenCalledTimes(10);
  expect(packets().map(packet => packet.upsert.length)).toEqual(
    Array(10).fill(1),
  );
  expect(
    packets().every(packet => !packet.reset && !('selectedId' in packet)),
  ).toBe(true);
  expect(packets()[9].upsert[0].longitude).toBe(locations[0].longitude);
  const deltaBytes = inject.mock.calls.reduce(
    (sum, [script]) => sum + Buffer.byteLength(script),
    0,
  );
  expect(deltaBytes).toBeLessThan(snapshotBytes * 10 * 0.02);
  expect(parseFloat((buttons[0] as HTMLElement).style.left)).toBeCloseTo(
    initialLeft + ((locations[0].longitude! - 90.4) / 360) * 256 * 2 ** zoom,
    6,
  );
  expect([...document.querySelectorAll('.marker')]).toEqual(buttons);
  expect([...document.querySelectorAll('#tiles img')]).toEqual(tiles);
  expect(untouched.takeRecords()).toHaveLength(0);
  expect(onUntouchedMutation).not.toHaveBeenCalled();
  expect(create).not.toHaveBeenCalled();
  expect(web().props.source).toBe(source);

  inject.mockClear();
  await update('v0');
  expect(packets()).toEqual([{ selectedId: 'v0' }]);
  expect(document.querySelector('.selected')).toBe(buttons[0]);
  expect((buttons[0] as HTMLElement).style.left).toBe('200px');
  inject.mockClear();
  locations = locations.map(location => ({ ...location, speed: 42 }));
  await update('v0');
  expect(inject).not.toHaveBeenCalled();
  untouched.disconnect();
});

it('patches removals, stale/status changes and translated labels without replacing the map', async () => {
  await render(<FleetMap {...{ vehicles, locations, onSelect }} />);
  await ready();
  const source = web().props.source;
  const document = dom!.window.document;
  const button = document.querySelector('[data-vehicle-id="v0"]');
  const tile = document.querySelector('#tiles img');
  inject.mockClear();
  locations = locations.map((location, index) => ({
    ...location,
    ...(index === 0
      ? { lastSeen: new Date(Date.now() - 180_001).toISOString() }
      : {}),
    ...(index === 1 ? { latitude: NaN } : {}),
    ...(index === 2 ? { status: 'lastKnown' as const } : {}),
  }));
  await update();
  expect(
    packets()[0].upsert.map((marker: { id: string }) => marker.id),
  ).toEqual(['v0', 'v2']);
  expect(packets()[0].remove).toEqual(['v1']);
  expect(button?.classList.contains('live')).toBe(false);
  expect(document.querySelector('[data-vehicle-id="v1"]')).toBeNull();
  await act(async () => {
    await i18n.changeLanguage('bn');
  });
  expect(document.querySelector('[data-vehicle-id="v0"]')).toBe(button);
  expect(button?.getAttribute('aria-label')).toBe(
    i18n.t('Select {{name}}', { name: 'Bus 0' }),
  );
  expect(document.documentElement.lang).toBe('bn');
  expect(document.querySelector('#tiles img')).toBe(tile);
  expect(web().props.source).toBe(source);
  inject.mockClear();
  locations = locations.map((location, index) =>
    index === 1 ? { ...location, latitude: 23.8 } : location,
  );
  await update();
  expect(packets()[0].upsert).toHaveLength(1);
  expect(document.querySelectorAll('.marker')).toHaveLength(100);
});

it('replays the latest snapshot after loading, retry, and ready without a load-start event', async () => {
  await render(<FleetMap {...{ vehicles, locations, onSelect }} />);
  await ready();
  await act(async () => web().props.onLoadStart());
  inject.mockClear();
  locations = locations.map((location, index) =>
    index === 0 ? { ...location, longitude: 90.405 } : location,
  );
  await update('v0');
  locations = locations.slice(0, 99);
  await update('v1');
  expect(inject).not.toHaveBeenCalled();
  openDocument();
  await ready();
  expect(packets()[0].upsert).toHaveLength(99);
  expect(packets()[0]).toMatchObject({ reset: true, selectedId: 'v1' });
  expect(packets()[0].upsert[0].longitude).toBe(90.405);
  await act(async () => web().props.onLoadEnd());
  expect(inject).toHaveBeenCalledTimes(1);

  inject.mockClear();
  openDocument();
  await ready();
  expect(packets()[0].upsert).toHaveLength(99);
  expect(
    dom!.window.document
      .querySelector('.selected')
      ?.getAttribute('data-vehicle-id'),
  ).toBe('v1');
  await act(async () => web().props.onContentProcessDidTerminate());
  inject.mockClear();
  await update('v2');
  expect(inject).not.toHaveBeenCalled();
  openDocument();
  // Load-end is also a fallback if the ready message was lost.
  await act(async () => web().props.onLoadEnd());
  expect(packets()[0]).toMatchObject({ reset: true, selectedId: 'v2' });
  expect(packets()[0].upsert).toHaveLength(99);
  await ready();
  expect(
    dom!.window.document
      .querySelector('.selected')
      ?.getAttribute('data-vehicle-id'),
  ).toBe('v2');
});

it('keeps history source stable for playback/language and restores current selection after route load', async () => {
  const point = {
    id: 'p',
    imei: '123',
    vehicleId: null,
    latitude: 23.8,
    longitude: 90.4,
    speed: 0,
    course: 0,
    gpsTime: '',
    receivedAt: '',
  };
  const route: HistoryRoute = {
    imei: '123',
    from: '',
    to: '',
    timezone: 'Asia/Dhaka',
    freshness: { pendingPoints: 0, oldestPendingAt: null, complete: true },
    segments: [{ points: [point, { ...point, longitude: 90.41 }] }],
    pointCount: 2,
    displayedPointCount: 2,
    simplified: false,
    distanceMeters: 1000,
    gapCount: 0,
  };
  await render(<HistoryMap route={route} selected={point} />);
  await ready();
  const source = web().props.source;
  inject.mockClear();
  const selected = { ...point, longitude: 90.41 };
  await act(async () =>
    screen.update(<HistoryMap route={route} selected={selected} />),
  );
  expect(inject).toHaveBeenCalledTimes(1);
  expect(inject.mock.calls[0][0]).toContain('selectHistoryPoint([23.8,90.41])');
  await act(async () => {
    await i18n.changeLanguage('bn');
  });
  expect(web().props.source).toBe(source);
  const nextRoute = { ...route, segments: [{ points: [selected] }] };
  await act(async () =>
    screen.update(<HistoryMap route={nextRoute} selected={selected} />),
  );
  expect(web().props.source).not.toBe(source);
  openDocument();
  await ready();
  const document = dom!.window.document;
  expect(
    document
      .querySelector('[data-layer="selection"] circle')
      ?.getAttribute('cx'),
  ).toBe('200');
  expect(document.documentElement.lang).toBe('bn');
  openDocument();
  await act(async () => web().props.onLoadEnd());
  expect(
    dom!.window.document.querySelector('[data-layer="selection"] circle'),
  ).not.toBeNull();
});

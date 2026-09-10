/** @jest-environment node */
import { JSDOM, VirtualConsole } from 'jsdom';
import {
  fleetMapHtml,
  fleetMapMarkers,
  hasMapPosition,
} from '../src/components/FleetMap';
import { Location, Vehicle } from '../src/api/types';

jest.mock('react-native-webview', () => ({ WebView: 'WebView' }));

const vehicles: Vehicle[] = [
  { id: 'a', imei: '123', name: 'School bus', plate: 'A' },
  {
    id: 'b',
    imei: '456',
    name: '</script><script>window.injected=true</script>',
    plate: 'B',
  },
];
const locations: Location[] = [
  {
    imei: '123',
    latitude: 0,
    longitude: 0,
    lastSeen: new Date().toISOString(),
    status: 'live',
  },
  {
    imei: '456',
    latitude: 23.8,
    longitude: 90.4,
    lastSeen: new Date().toISOString(),
    status: 'lastKnown',
  },
];

it('accepts zero coordinates and rejects non-finite, absent, and out-of-range positions', () => {
  expect(hasMapPosition(locations[0])).toBe(true);
  for (const value of [undefined, NaN, Infinity, 91]) {
    expect(hasMapPosition({ ...locations[0], latitude: value })).toBe(false);
  }
  expect(hasMapPosition({ ...locations[0], longitude: 181 })).toBe(false);
  expect(fleetMapMarkers(vehicles, [locations[0]])).toEqual([
    expect.objectContaining({ id: 'a', latitude: 0, longitude: 0, live: true }),
  ]);
});

it('renders actual vehicle positions, selects pins, and updates without evaluating vehicle content', () => {
  const errors: Error[] = [];
  const messages: Array<{ type: string; id?: string }> = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  const dom = new JSDOM(
    fleetMapHtml(fleetMapMarkers(vehicles, locations), 'b'),
    {
      runScripts: 'dangerously',
      virtualConsole,
      beforeParse(window) {
        Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', {
          get: () => 400,
        });
        Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
          get: () => 360,
        });
        Object.assign(window, {
          ReactNativeWebView: {
            postMessage: (value: string) => messages.push(JSON.parse(value)),
          },
        });
      },
    },
  );
  try {
    const document = dom.window.document;
    expect(errors).toEqual([]);
    expect(dom.window.eval('window.injected')).toBeUndefined();
    expect(document.querySelector('.selected span')?.textContent).toBe(
      vehicles[1].name,
    );
    expect(
      document.querySelector('.selected')?.getAttribute('aria-pressed'),
    ).toBe('true');
    expect(document.querySelectorAll('#tiles img').length).toBeGreaterThan(0);
    expect(document.querySelectorAll('polyline')).toHaveLength(0);
    dom.window.eval('window.fleetAction("fit")');
    expect(document.querySelectorAll('.marker')).toHaveLength(2);
    (
      document.querySelector('[data-vehicle-id="a"]') as HTMLButtonElement
    ).click();
    expect(messages).toContainEqual({ type: 'select', id: 'a' });
    expect(document.querySelector('.selected span')?.textContent).toBe(
      'School bus',
    );
    const position = (document.querySelector('.selected') as HTMLElement).style
      .left;
    expect(position).toBe('200px');
    dom.window.eval(
      `window.setFleetData(${JSON.stringify(
        fleetMapMarkers(vehicles, locations),
      )}, "b")`,
    );
    expect(
      document.querySelector('.selected')?.getAttribute('data-vehicle-id'),
    ).toBe('b');
    expect(
      (document.querySelector('.selected') as HTMLElement).style.left,
    ).toBe('200px');
    dom.window.eval(
      'window.fleetAction("in");window.fleetAction("out");window.fleetAction("focus");',
    );
    dom.window.eval(
      'window.setFleetLabels({language:"bn",contributors:"অবদানকারী"})',
    );
    expect(document.documentElement.lang).toBe('bn');
    expect(document.getElementById('contributors')?.textContent).toBe(
      'অবদানকারী',
    );
    (document.querySelector('#tiles img') as HTMLImageElement).dispatchEvent(
      new dom.window.Event('error'),
    );
    expect(messages).toContainEqual({ type: 'tileError' });
    dom.window.eval('window.setFleetData([], null)');
    expect(document.querySelectorAll('.marker')).toHaveLength(0);
    expect(document.querySelectorAll('#tiles img')).toHaveLength(0);
    expect(errors).toEqual([]);
  } finally {
    dom.window.close();
  }
});

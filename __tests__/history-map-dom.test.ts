/** @jest-environment node */
import { JSDOM, VirtualConsole } from 'jsdom';
import { historyMapHtml, historyMapLabels } from '../src/components/HistoryMap';
import { HistoryRoute } from '../src/api/types';
jest.mock('react-native-webview', () => ({ WebView: 'WebView' }));
it('parses real map controls and executes initial rendering, zoom, fit and playback', () => {
  const point = {
    id: '1',
    imei: '123',
    vehicleId: null,
    latitude: 23.8,
    longitude: 90.4,
    speed: 3,
    course: 0,
    gpsTime: '2026-09-05T01:00:00Z',
    receivedAt: '2026-09-05T01:00:01Z',
  };
  const route: HistoryRoute = {
    imei: '123',
    from: '',
    to: '',
    timezone: 'Asia/Dhaka',
    freshness: { pendingPoints: 0, oldestPendingAt: null, complete: true },
    segments: [
      { points: [point, { ...point, longitude: 90.41 }] },
      { points: [{ ...point, latitude: 23.9 }] },
    ],
    pointCount: 3,
    displayedPointCount: 3,
    simplified: false,
    distanceMeters: 1000,
    gapCount: 1,
  };
  const errors: Error[] = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  const dom = new JSDOM(historyMapHtml(route), {
    runScripts: 'dangerously',
    virtualConsole,
    beforeParse(window) {
      Object.defineProperty(window.HTMLElement.prototype, 'clientWidth', {
        get: () => 400,
      });
      Object.defineProperty(window.HTMLElement.prototype, 'clientHeight', {
        get: () => 360,
      });
    },
  });
  try {
    const document = dom.window.document;
    expect(errors).toEqual([]);
    expect(document.querySelectorAll('#controls button')).toHaveLength(3);
    expect(document.querySelectorAll('#route polyline')).toHaveLength(1);
    expect(document.querySelectorAll('#tiles img').length).toBeGreaterThan(0);
    const beforeZoom = document
      .querySelector('#route polyline')
      ?.getAttribute('points');
    (document.getElementById('plus') as HTMLButtonElement).click();
    expect(
      document.querySelector('#route polyline')?.getAttribute('points'),
    ).not.toBe(beforeZoom);
    const zoomedRoute = document
      .querySelector('#route polyline')
      ?.getAttribute('points');
    dom.window.eval(
      `window.setHistoryLabels(${JSON.stringify(historyMapLabels('bn'))})`,
    );
    expect(document.getElementById('fit')?.textContent).toBe('পুরো রুট');
    expect(document.getElementById('plus')?.getAttribute('aria-label')).toBe(
      'বড় করুন',
    );
    expect(document.querySelector('#route')?.textContent).toContain('শুরু');
    expect(
      document.querySelector('#route polyline')?.getAttribute('points'),
    ).toBe(zoomedRoute);
    dom.window.eval(
      `window.setHistoryLabels(${JSON.stringify(historyMapLabels('en'))})`,
    );
    expect(document.getElementById('fit')?.textContent).toBe('Fit');
    (document.getElementById('minus') as HTMLButtonElement).click();
    (document.getElementById('fit') as HTMLButtonElement).click();
    dom.window.eval('window.selectHistoryPoint([23.8,90.4])');
    expect(document.querySelectorAll('#route circle')).toHaveLength(4);
    expect(errors).toEqual([]);
  } finally {
    dom.window.close();
  }
});

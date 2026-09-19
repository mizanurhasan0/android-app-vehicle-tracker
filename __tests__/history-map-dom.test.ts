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
    const polyline = document.querySelector('#route polyline');
    (document.getElementById('plus') as HTMLButtonElement).click();
    expect(
      document.querySelector('#route polyline')?.getAttribute('points'),
    ).not.toBe(beforeZoom);
    expect(document.querySelector('#route polyline')).toBe(polyline);
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
    expect(document.querySelector('#route polyline')).toBe(polyline);
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

it('moves a playback overlay over 2000 points with zero route/tile mutations or SVG allocations', () => {
  const points = Array.from({ length: 2000 }, (_, index) => ({
    id: `${index}`,
    imei: '123',
    vehicleId: null,
    latitude: 23.8 + index * 0.00001,
    longitude: 90.4 + index * 0.00001,
    speed: 3,
    course: 0,
    gpsTime: '',
    receivedAt: '',
  }));
  const route: HistoryRoute = {
    imei: '123',
    from: '',
    to: '',
    timezone: 'Asia/Dhaka',
    freshness: { pendingPoints: 0, oldestPendingAt: null, complete: true },
    segments: [
      { points: points.slice(0, 1000) },
      { points: points.slice(1000) },
    ],
    pointCount: 2000,
    displayedPointCount: 2000,
    simplified: false,
    distanceMeters: 1000,
    gapCount: 1,
  };
  const dom = new JSDOM(historyMapHtml(route), {
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
  try {
    const document = dom.window.document;
    const lines = [...document.querySelectorAll('polyline')];
    expect(lines).toHaveLength(2);
    expect(
      lines.map(line => line.getAttribute('points')!.split(' ').length),
    ).toEqual([1000, 1000]);
    const geometry = lines.map(line => line.getAttribute('points'));
    const tiles = [...document.querySelectorAll('#tiles img')];
    dom.window.eval('window.selectHistoryPoint([23.8,90.4])');
    const circle = document.querySelector('[data-layer="selection"] circle');
    const create = jest.spyOn(document, 'createElementNS');
    const observer = new dom.window.MutationObserver(() => {});
    observer.observe(document.getElementById('route')!, {
      attributes: true,
      childList: true,
      subtree: true,
    });
    const tileObserver = new dom.window.MutationObserver(() => {});
    tileObserver.observe(document.getElementById('tiles')!, {
      attributes: true,
      childList: true,
      subtree: true,
    });
    for (let index = 1; index <= 100; index++) {
      dom.window.eval(
        `window.selectHistoryPoint([${points[index].latitude},${points[index].longitude}])`,
      );
    }
    expect(document.querySelector('[data-layer="selection"] circle')).toBe(
      circle,
    );
    const expected = geometry[0]!.split(' ')[100].split(',');
    expect(circle?.getAttribute('cx')).toBe(expected[0]);
    expect(circle?.getAttribute('cy')).toBe(expected[1]);
    const mutations = observer.takeRecords();
    expect(mutations.length).toBeGreaterThan(0);
    expect(
      mutations.every(mutation =>
        (mutation.target as Element).closest('[data-layer="selection"]'),
      ),
    ).toBe(true);
    expect(tileObserver.takeRecords()).toHaveLength(0);
    expect(create).not.toHaveBeenCalled();
    lines.forEach((line, index) => {
      expect(document.querySelectorAll('polyline')[index]).toBe(line);
      expect(line.getAttribute('points')).toBe(geometry[index]);
    });
    tiles.forEach((tile, index) =>
      expect(document.querySelectorAll('#tiles img')[index]).toBe(tile),
    );
    dom.window.eval('window.selectHistoryPoint(null)');
    expect(
      document.querySelector('[data-layer="selection"] circle'),
    ).toBeNull();
    (tiles[0] as HTMLImageElement).dispatchEvent(new dom.window.Event('error'));
    dom.window.eval(
      `window.setHistoryLabels(${JSON.stringify(historyMapLabels('bn'))})`,
    );
    expect(document.getElementById('status')?.textContent).toBe(
      historyMapLabels('bn').unavailable,
    );
    expect(lines[0].getAttribute('points')).toBe(geometry[0]);
    observer.disconnect();
    tileObserver.disconnect();
    create.mockRestore();
  } finally {
    dom.window.close();
  }
});

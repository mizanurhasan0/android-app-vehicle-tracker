import {
  dhakaDate,
  historyRange,
  parseDay,
  shiftPeriod,
} from '../src/utils/historyDates';
import { historyMapHtml } from '../src/components/HistoryMap';
import { HistoryRoute } from '../src/api/types';
jest.mock('react-native-webview', () => ({ WebView: 'WebView' }));
it('uses Dhaka midnight independently of the phone timezone', () => {
  expect(dhakaDate(Date.parse('2026-09-05T17:59:59Z'))).toBe('2026-09-05');
  expect(dhakaDate(Date.parse('2026-09-05T18:00:00Z'))).toBe('2026-09-06');
  expect(historyRange('2026-09-06', 'day')).toMatchObject({
    from: '2026-09-05T18:00:00.000Z',
    to: '2026-09-06T18:00:00.000Z',
  });
});
it('uses Monday weeks and leap/calendar months across years', () => {
  expect(historyRange('2026-01-01', 'week').label).toBe(
    '2025-12-29 — 2026-01-04',
  );
  expect(historyRange('2024-02-29', 'month').to).toBe(
    '2024-02-29T18:00:00.000Z',
  );
  expect(shiftPeriod('2026-01-31', 'month', 1)).toBe('2026-02-01');
  expect(shiftPeriod('2026-01-01', 'day', -1)).toBe('2025-12-31');
  expect(() => parseDay('2026-02-29')).toThrow('valid date');
  expect(() => parseDay('2026-2-01')).toThrow('valid date');
});
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
  segments: [{ points: [point] }, { points: [{ ...point, latitude: 23.9 }] }],
  pointCount: 2,
  displayedPointCount: 2,
  simplified: false,
  distanceMeters: 0,
  gapCount: 1,
};
it('preserves disconnected segments and excludes untrusted strings from map HTML', () => {
  const html = historyMapHtml({
    ...route,
    imei: '</script><script>bad()</script>',
  });
  expect(html).toContain('segments=[[[23.8,90.4]],[[23.9,90.4]]]');
  expect(html).not.toContain('bad()');
  expect(html).not.toContain('script src=');
  expect(html).toContain('OpenStreetMap');
});
it('rejects unbounded and invalid map geometry', () => {
  expect(() =>
    historyMapHtml({
      ...route,
      segments: [{ points: Array(2001).fill(point) }],
    }),
  ).toThrow('display limit');
  expect(() =>
    historyMapHtml({
      ...route,
      segments: [{ points: [{ ...point, latitude: NaN }] }],
    }),
  ).toThrow('invalid coordinates');
});

it('bounds dates to tracker years and prevents period overflow', () => {
  expect(() => parseDay('0000-01-01')).toThrow('2000–2099');
  expect(() => parseDay('9999-12-31')).toThrow('2000–2099');
  expect(shiftPeriod('2000-01-01', 'day', -1)).toBe('2000-01-01');
  expect(shiftPeriod('2099-12-31', 'month', 1)).toBe('2099-12-31');
});

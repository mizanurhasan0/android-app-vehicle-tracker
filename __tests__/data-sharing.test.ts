import { structuralShare } from '../src/utils/structuralShare';
import { createLocationStore } from '../src/context/locationStore';
import { Location } from '../src/api/types';

it('shares equal JSON subtrees without concealing edits, deletion, nulls, or array ordering', () => {
  const original = {
    rows: [
      { id: 'a', paid: false },
      { id: 'b', paid: true },
    ],
    optional: 'present',
    nullable: null,
  };
  expect(structuralShare(original, JSON.parse(JSON.stringify(original)))).toBe(
    original,
  );
  const edited = structuralShare(original, {
    ...original,
    rows: [
      { id: 'a', paid: true },
      { id: 'b', paid: true },
    ],
  });
  expect(edited.rows[0]).not.toBe(original.rows[0]);
  expect(edited.rows[1]).toBe(original.rows[1]);
  expect(edited.rows[0].paid).toBe(true);
  expect(structuralShare<unknown>(original, { rows: [] })).toEqual({
    rows: [],
  });
  expect(structuralShare<unknown>({ value: null }, { value: 0 })).toEqual({
    value: 0,
  });
  expect(structuralShare(original.rows, [...original.rows].reverse())).toEqual(
    [...original.rows].reverse(),
  );
  const special = JSON.parse('{"__proto__":{"safe":true}}');
  expect(structuralShare({}, special)).toEqual(special);
  expect(Object.getPrototypeOf(structuralShare({}, special))).toBe(
    Object.prototype,
  );
});

const point: Location = {
  imei: 'one',
  status: 'live',
  latitude: 23,
  longitude: 90,
  lastSeen: '2026-09-19T10:00:00Z',
};
it('suppresses exact duplicates but publishes every changed location field without reordering devices', () => {
  const store = createLocationStore();
  store.replace([point, { ...point, imei: 'two' }], 0);
  const listener = jest.fn();
  const unsubscribe = store.subscribe(listener);
  const previous = store.getSnapshot();
  store.update({ ...point });
  expect(listener).not.toHaveBeenCalled();
  expect(store.getSnapshot()).toBe(previous);
  store.update({ ...point, status: 'offline', speed: 0 });
  expect(listener).toHaveBeenCalledTimes(1);
  expect(store.getSnapshot().map(item => item.imei)).toEqual(['one', 'two']);
  expect(store.getSnapshot()[1]).toBe(previous[1]);
  store.update({ ...point, lastSeen: '2026-09-19T10:00:01Z' });
  expect(listener).toHaveBeenCalledTimes(2);
  expect(store.getSnapshot()[0]).not.toHaveProperty('speed');
  unsubscribe();
  store.update(point);
  expect(listener).toHaveBeenCalledTimes(2);
});

it('preserves duplicate events received during HTTP but accepts authoritative status and removals later', () => {
  const store = createLocationStore();
  store.update(point);
  const revision = store.getRevision();
  store.update({ ...point });
  store.replace([{ ...point, latitude: 1, status: 'offline' }], revision);
  expect(store.getSnapshot()).toEqual([point]);
  store.replace([{ ...point, status: 'offline' }], store.getRevision());
  expect(store.getSnapshot()[0].status).toBe('offline');
  store.replace([], store.getRevision());
  expect(store.getSnapshot()).toEqual([]);
});

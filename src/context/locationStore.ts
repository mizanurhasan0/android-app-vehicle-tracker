import { Location } from '../api/types';
import { structuralShare } from '../utils/structuralShare';

/** One store per authenticated provider. Socket traffic never updates core context. */
export function createLocationStore() {
  let locations: Location[] = [];
  let revision = 0;
  const changedAt = new Map<string, number>();
  const listeners = new Set<() => void>();
  const publish = (next: Location[]) => {
    const shared = structuralShare(locations, next);
    if (shared === locations) return;
    locations = shared;
    listeners.forEach(listener => listener());
  };
  return {
    getSnapshot: () => locations,
    getRevision: () => revision,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    update(location: Location) {
      // Even a duplicate event confirms this device after an HTTP request began.
      changedAt.set(location.imei, ++revision);
      const index = locations.findIndex(item => item.imei === location.imei);
      if (index < 0) publish([...locations, location]);
      else {
        const shared = structuralShare(locations[index], location);
        if (shared === locations[index]) return;
        const next = locations.slice();
        next[index] = shared;
        publish(next);
      }
    },
    replace(snapshot: Location[], startedAt: number) {
      // A full HTTP snapshot remains authoritative except for events received
      // during that request. Do not resurrect devices omitted by later snapshots.
      const duringRequest = locations.filter(
        item => (changedAt.get(item.imei) || 0) > startedAt,
      );
      const overrides = new Map(duringRequest.map(item => [item.imei, item]));
      const next = snapshot.map(item => {
        const override = overrides.get(item.imei);
        overrides.delete(item.imei);
        return override || item;
      });
      publish([...next, ...overrides.values()]);
      const present = new Set(locations.map(item => item.imei));
      for (const imei of changedAt.keys())
        if (!present.has(imei)) changedAt.delete(imei);
    },
  };
}

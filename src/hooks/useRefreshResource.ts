import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/client';
import { structuralShare } from '../utils/structuralShare';

/** Mount inside a credential-keyed provider: no cache or pending work crosses auth. */
export function useRefreshResource<T, Snapshot>(
  initial: T,
  fetchSnapshot: (force: boolean) => Promise<Snapshot>,
  select: (snapshot: Snapshot) => T,
  expire: () => Promise<void>,
  isAuthenticated: () => boolean,
) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const gate = useRef({
    live: true,
    generation: 0,
    pending: null as Promise<void> | null,
  }).current;
  useEffect(() => {
    gate.live = true;
    return () => {
      gate.live = false;
      gate.generation++;
      gate.pending = null;
    };
  }, [gate]);
  const isCurrent = useCallback(
    () => gate.live && isAuthenticated(),
    [gate, isAuthenticated],
  );
  const load = useCallback(
    (showLoading = false, force = false): Promise<void> => {
      if (!isCurrent()) return Promise.resolve();
      // Timer overlaps join the current snapshot. Manual, foreground and
      // post-write refresh supersede it, so they can never publish pre-write data.
      if (!force && gate.pending) return gate.pending;
      const request = ++gate.generation;
      if (showLoading) setLoading(true);
      const work = (async () => {
        try {
          const snapshot = await fetchSnapshot(force);
          if (isCurrent() && request === gate.generation) {
            const next = select(snapshot);
            setData(previous => structuralShare(previous, next));
            setError('');
          }
        } catch (problem) {
          if (
            isCurrent() &&
            problem instanceof ApiError &&
            problem.status === 401
          )
            await expire();
          if (isCurrent() && request === gate.generation)
            setError(
              problem instanceof Error
                ? problem.message
                : 'Could not refresh data.',
            );
        } finally {
          if (isCurrent() && request === gate.generation) {
            gate.pending = null;
            setLoading(false);
          }
        }
      })();
      gate.pending = work;
      return work;
    },
    [fetchSnapshot, select, expire, gate, isCurrent],
  );
  const refresh = useCallback(() => load(true, true), [load]);
  return { data, loading, error, load, refresh, isCurrent };
}

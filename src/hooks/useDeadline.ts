import { useEffect, useReducer } from 'react';
import { AppState } from 'react-native';

/** Invalidate local time-derived values at a deadline and on foreground resume.
 * Pass undefined when time cannot affect the consumer. No polling is used.
 */
export function useDeadline(deadline: number | undefined): number {
  const [revision, invalidate] = useReducer((value: number) => value + 1, 0);
  useEffect(() => {
    if (deadline === undefined || !Number.isFinite(deadline)) return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const clear = () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    };
    const schedule = () => {
      clear();
      const remaining = deadline - Date.now();
      if (
        remaining > 0 &&
        AppState.currentState !== 'background' &&
        AppState.currentState !== 'inactive'
      ) {
        // Avoid the platform's signed 32-bit timeout overflow for distant dates.
        timer = setTimeout(wake, Math.min(remaining, 2_147_483_647));
      }
    };
    const wake = () => {
      if (disposed) return;
      invalidate();
      schedule();
    };
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') wake();
      else clear();
    });
    // Also cover a deadline crossed between rendering and effect installation.
    if (deadline <= Date.now()) invalidate();
    schedule();
    return () => {
      disposed = true;
      clear();
      subscription.remove();
    };
  }, [deadline]);
  return revision;
}

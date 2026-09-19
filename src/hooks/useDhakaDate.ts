import { dhakaDate } from '../utils/dates';
import { useDeadline } from './useDeadline';

/** Calendar-derived views must advance even when every API response is unchanged. */
export function useDhakaDate() {
  const today = dhakaDate();
  useDeadline(Date.parse(`${today}T00:00:00+06:00`) + 86_400_000);
  return today;
}

import { useEffect, useState } from 'react';
import { api } from '../api/client';
import type { HistoryDay, HistorySummary } from '../api/types';
import { useAuth } from '../context/AuthContext';
import { historyRange } from '../utils/historyDates';

/** The day view still shows the other recorded days in its calendar month. */
export function useRecordedHistoryDays(
  imei: string,
  day: string,
  enabled: boolean,
  revision: number,
) {
  const { baseUrl, session } = useAuth();
  const month = historyRange(day, 'month');
  const token = session?.token;
  const key = `${baseUrl}|${token}|${imei}|${month.from}|${month.to}|${revision}`;
  const [state, setState] = useState<{ key: string; days: HistoryDay[] }>({
    key: '',
    days: [],
  });

  useEffect(() => {
    if (!enabled || !token || session?.user.role !== 'ADMIN') return;
    const abort = new AbortController();
    const query = `from=${encodeURIComponent(
      month.from,
    )}&to=${encodeURIComponent(month.to)}&timezone=Asia%2FDhaka`;
    api<HistorySummary>(
      baseUrl,
      `/locations/${encodeURIComponent(imei)}/history/summary?${query}`,
      token,
      undefined,
      'GET',
      abort.signal,
    )
      .then(summary => {
        if (!abort.signal.aborted) setState({ key, days: summary.days });
      })
      .catch(() => {
        // The selected day's history remains available if this extra list fails.
      });
    return () => abort.abort();
  }, [
    enabled,
    key,
    baseUrl,
    token,
    session?.user.role,
    imei,
    month.from,
    month.to,
  ]);

  return enabled && state.key === key ? state.days : undefined;
}

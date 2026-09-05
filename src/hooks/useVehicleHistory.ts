import { useEffect, useState } from 'react';
import { api, ApiError } from '../api/client';
import { HistoryRoute, HistorySummary } from '../api/types';
import { useAuth } from '../context/AuthContext';
export function useVehicleHistory(imei: string, from: string, to: string) {
  const { baseUrl, session, expire } = useAuth();
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{
    key?: string;
    loading: boolean;
    error?: string;
    summary?: HistorySummary;
    route?: HistoryRoute;
  }>({ loading: true });
  const token = session?.token;
  const admin = session?.user.role === 'ADMIN';
  const key = `${baseUrl}|${token}|${imei}|${from}|${to}|${revision}`;
  useEffect(() => {
    const abort = new AbortController();
    setState({ key, loading: true });
    if (!admin || !token) {
      setState({
        key,
        loading: false,
        error: 'History is available to administrators only.',
      });
      return () => abort.abort();
    }
    const query = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(
      to,
    )}&timezone=Asia%2FDhaka`;
    const path = `/locations/${encodeURIComponent(imei)}/history`;
    Promise.allSettled([
      api<HistorySummary>(
        baseUrl,
        `${path}/summary?${query}`,
        token,
        undefined,
        'GET',
        abort.signal,
      ),
      api<HistoryRoute>(
        baseUrl,
        `${path}/route?${query}&maxPoints=2000`,
        token,
        undefined,
        'GET',
        abort.signal,
      ),
    ])
      .then(async ([summaryResult, routeResult]) => {
        if (abort.signal.aborted) return;
        const failures = [summaryResult, routeResult].filter(
          (result): result is PromiseRejectedResult =>
            result.status === 'rejected',
        );
        if (
          failures.some(
            result =>
              result.reason instanceof ApiError && result.reason.status === 401,
          )
        ) {
          await expire();
          return;
        }
        const failure = failures[0]?.reason;
        setState({
          key,
          loading: false,
          summary:
            summaryResult.status === 'fulfilled'
              ? summaryResult.value
              : undefined,
          route:
            routeResult.status === 'fulfilled' ? routeResult.value : undefined,
          error:
            failure instanceof ApiError && failure.status === 503
              ? 'History storage is temporarily unavailable. Please retry shortly.'
              : failure instanceof ApiError && failure.status === 413
              ? 'This route is too large to display. Select an individual day below or a shorter period.'
              : failure instanceof Error
              ? failure.message
              : failure
              ? 'Unable to load history.'
              : undefined,
        });
      })
      .catch(error => {
        if (!abort.signal.aborted)
          setState({
            key,
            loading: false,
            error:
              error instanceof Error
                ? error.message
                : 'Unable to load history.',
          });
      });
    return () => abort.abort();
  }, [key, baseUrl, token, admin, imei, from, to, expire]);
  return {
    ...(state.key === key ? state : { loading: true }),
    retry: () => setRevision(n => n + 1),
  };
}

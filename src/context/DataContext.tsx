import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { io } from 'socket.io-client';
import { api, ApiError } from '../api/client';
import { DashboardData, Location } from '../api/types';
import { loadDashboard } from '../api/dashboard';
import { useAuth } from './AuthContext';
const empty: DashboardData = {
  vehicles: [],
  locations: [],
  routes: [],
  subscriptions: [],
  bills: [],
  accounts: [],
  payments: [],
  requests: [],
  complaints: [],
  stops: [],
  notifications: [],
};
interface DataValue {
  data: DashboardData;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  mutate: <T>(path: string, body?: unknown, method?: string) => Promise<T>;
}
const DataContext = createContext<DataValue | null>(null);
export function DataProvider({ children }: React.PropsWithChildren) {
  const { session, baseUrl, expire } = useAuth();
  const token = session!.token;
  const [data, setData] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const live = useRef(true);
  const credentials = useRef({ token, baseUrl });
  credentials.current = { token, baseUrl };
  const isCurrent = useCallback(
    () =>
      live.current &&
      credentials.current.token === token &&
      credentials.current.baseUrl === baseUrl,
    [token, baseUrl],
  );
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  const load = useCallback(
    async (showLoading: boolean) => {
      if (!isCurrent()) return;
      const request = ++generation.current;
      if (showLoading) setLoading(true);
      try {
        const snapshot = await loadDashboard(baseUrl, token);
        if (isCurrent() && request === generation.current) {
          setData(snapshot);
          setError('');
        }
      } catch (problem) {
        if (
          isCurrent() &&
          problem instanceof ApiError &&
          problem.status === 401
        )
          await expire();
        if (isCurrent() && request === generation.current)
          setError(
            problem instanceof Error
              ? problem.message
              : 'Could not refresh data.',
          );
      } finally {
        if (isCurrent() && request === generation.current) setLoading(false);
      }
    },
    [baseUrl, token, expire, isCurrent],
  );
  const refresh = useCallback(() => load(true), [load]);
  useEffect(() => {
    load(true);
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') load(false);
    }, 20_000);
    let previousState = AppState.currentState;
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active' && previousState !== 'active') load(false);
      previousState = state;
    });
    // HTTPS deployments proxy /socket.io on the same origin; local development uses port 3001.
    const socketUrl = new URL(baseUrl);
    const liveUrl =
      socketUrl.protocol === 'http:' && socketUrl.port === '3000'
        ? `http://${socketUrl.hostname}:3001`
        : socketUrl.origin;
    const socket = io(liveUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnectionDelayMax: 10_000,
    });
    socket.on('location:update', (location: Location) => {
      if (AppState.currentState !== 'active') return;
      setData(current => ({
        ...current,
        locations: [
          ...current.locations.filter(item => item.imei !== location.imei),
          location,
        ],
      }));
    });
    return () => {
      clearInterval(timer);
      listener.remove();
      socket.disconnect();
    };
  }, [baseUrl, token, load]);
  const mutate = useCallback(
    async <T,>(path: string, body?: unknown, method = 'POST'): Promise<T> => {
      if (!isCurrent()) throw new Error('Please sign in again.');
      try {
        const result = await api<T>(baseUrl, path, token, body, method);
        if (isCurrent()) await load(false);
        return result;
      } catch (problem) {
        if (
          isCurrent() &&
          problem instanceof ApiError &&
          problem.status === 401
        )
          await expire();
        throw problem;
      }
    },
    [baseUrl, token, load, expire, isCurrent],
  );
  const value = useMemo(
    () => ({ data, loading, error, refresh, mutate }),
    [data, loading, error, refresh, mutate],
  );
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}
export function useData() {
  const value = useContext(DataContext);
  if (!value) throw new Error('DataProvider is required');
  return value;
}

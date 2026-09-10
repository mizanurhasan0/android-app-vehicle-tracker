import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { api, ApiError } from '../api/client';
import { ManagementOverview } from '../api/management';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';

interface ManagementValue {
  data: ManagementOverview | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  mutate: <T>(path: string, body?: unknown, method?: string) => Promise<T>;
}
const ManagementContext = createContext<ManagementValue | null>(null);
export function ManagementProvider({ children }: React.PropsWithChildren) {
  const { session, baseUrl, expire } = useAuth();
  const { refresh: refreshCore } = useData();
  const [data, setData] = useState<ManagementOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const live = useRef(true);
  const token = session?.token;
  const credentials = useRef({ token, baseUrl });
  credentials.current = { token, baseUrl };
  const isCurrent = useCallback(
    () =>
      live.current &&
      credentials.current.token === token &&
      credentials.current.baseUrl === baseUrl,
    [token, baseUrl],
  );
  const load = useCallback(
    async (showLoading = false) => {
      if (!token || !isCurrent()) return;
      const request = ++generation.current;
      if (showLoading) setLoading(true);
      try {
        const result = await api<ManagementOverview>(
          baseUrl,
          '/management/overview',
          token,
        );
        if (isCurrent() && request === generation.current) {
          setData(result);
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
              : 'তথ্য লোড করা যায়নি। আবার চেষ্টা করুন।',
          );
      } finally {
        if (isCurrent() && request === generation.current) setLoading(false);
      }
    },
    [baseUrl, token, expire, isCurrent],
  );
  const refresh = useCallback(() => load(true), [load]);
  useEffect(() => {
    live.current = true;
    setData(null);
    setError('');
    setLoading(!!token);
    load(true);
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') load();
    }, 20000);
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active') load();
    });
    return () => {
      live.current = false;
      clearInterval(timer);
      listener.remove();
    };
  }, [load, token]);
  const mutate = useCallback(
    async <T,>(path: string, body?: unknown, method = 'POST'): Promise<T> => {
      if (!token || !isCurrent()) throw new Error('Please sign in again.');
      try {
        const result = await api<T>(baseUrl, path, token, body, method);
        if (isCurrent()) await Promise.all([load(), refreshCore()]);
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
    [baseUrl, token, expire, load, refreshCore, isCurrent],
  );
  return (
    <ManagementContext.Provider
      value={{ data, loading, error, refresh, mutate }}
    >
      {children}
    </ManagementContext.Provider>
  );
}
export function useManagement() {
  const value = useContext(ManagementContext);
  if (!value) throw new Error('ManagementProvider is required');
  return value;
}

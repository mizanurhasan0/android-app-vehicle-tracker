import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import { AppState } from 'react-native';
import { api, ApiError } from '../api/client';
import { ManagementOverview, Student } from '../api/management';
import { useRefreshResource } from '../hooks/useRefreshResource';
import { useCredentialScope } from '../hooks/useCredentialScope';
import { useAuth } from './AuthContext';
import { useDataActions } from './DataContext';

interface ManagementValue {
  data: ManagementOverview | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  mutate: <T>(path: string, body?: unknown, method?: string) => Promise<T>;
  listArchivedStudents: () => Promise<Student[]>;
}
const ManagementContext = createContext<ManagementValue | null>(null);
const selectOverview = (snapshot: ManagementOverview | null) => snapshot;
export function ManagementProvider({ children }: React.PropsWithChildren) {
  const { session, baseUrl, expire } = useAuth();
  const token = session?.token;
  const isAuthenticated = useCredentialScope(baseUrl, token);
  return (
    <ManagementScope
      key={JSON.stringify([baseUrl, token])}
      baseUrl={baseUrl}
      token={token}
      expire={expire}
      isAuthenticated={isAuthenticated}
    >
      {children}
    </ManagementScope>
  );
}
interface ScopeProps extends React.PropsWithChildren {
  baseUrl: string;
  token?: string;
  expire: () => Promise<void>;
  isAuthenticated: () => boolean;
}
function ManagementScope({
  children,
  baseUrl,
  token,
  expire,
  isAuthenticated,
}: ScopeProps) {
  const { refresh: refreshCore } = useDataActions();
  const fetchSnapshot = useCallback(
    () =>
      token
        ? api<ManagementOverview>(baseUrl, '/management/overview', token)
        : Promise.resolve(null),
    [baseUrl, token],
  );
  const { data, loading, error, load, refresh, isCurrent } = useRefreshResource<
    ManagementOverview | null,
    ManagementOverview | null
  >(null, fetchSnapshot, selectOverview, expire, isAuthenticated);
  useEffect(() => {
    load(true);
    if (!token) return;
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') load();
    }, 20_000);
    let previousState = AppState.currentState;
    const listener = AppState.addEventListener('change', state => {
      if (state === 'active' && previousState !== 'active') load(false, true);
      previousState = state;
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, [load, token]);
  const mutate = useCallback(
    async <T,>(path: string, body?: unknown, method = 'POST'): Promise<T> => {
      if (!token || !isCurrent()) throw new Error('Please sign in again.');
      try {
        const result = await api<T>(baseUrl, path, token, body, method);
        if (isCurrent()) await Promise.all([load(false, true), refreshCore()]);
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
  const listArchivedStudents = useCallback(async (): Promise<Student[]> => {
    if (!token || !isCurrent()) throw new Error('Please sign in again.');
    try {
      return await api<Student[]>(baseUrl, '/admin/students/archived', token);
    } catch (problem) {
      if (isCurrent() && problem instanceof ApiError && problem.status === 401)
        await expire();
      throw problem;
    }
  }, [baseUrl, token, expire, isCurrent]);
  const value = useMemo(
    () => ({ data, loading, error, refresh, mutate, listArchivedStudents }),
    [data, loading, error, refresh, mutate, listArchivedStudents],
  );
  return (
    <ManagementContext.Provider value={value}>
      {children}
    </ManagementContext.Provider>
  );
}
export function useManagement() {
  const value = useContext(ManagementContext);
  if (!value) throw new Error('ManagementProvider is required');
  return value;
}

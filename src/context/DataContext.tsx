import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from 'react';
import { AppState } from 'react-native';
import { io } from 'socket.io-client';
import { api, ApiError } from '../api/client';
import { DashboardData, Location } from '../api/types';
import { createDashboardLoader } from '../api/dashboard';
import { useRefreshResource } from '../hooks/useRefreshResource';
import { useCredentialScope } from '../hooks/useCredentialScope';
import { createLocationStore } from './locationStore';
import { useAuth } from './AuthContext';

type CoreData = Omit<DashboardData, 'locations'>;
const empty: CoreData = {
  vehicles: [],
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
interface DataActions {
  refresh: () => Promise<void>;
  mutate: <T>(path: string, body?: unknown, method?: string) => Promise<T>;
}
interface CoreValue extends DataActions {
  data: CoreData;
  loading: boolean;
  error: string;
}
const CoreContext = createContext<CoreValue | null>(null);
const ActionsContext = createContext<DataActions | null>(null);
const LocationsContext = createContext<ReturnType<
  typeof createLocationStore
> | null>(null);

export function DataProvider({ children }: React.PropsWithChildren) {
  const { session, baseUrl, expire } = useAuth();
  const token = session?.token;
  const includeTelegram = session?.user?.role === 'GUARDIAN';
  const isAuthenticated = useCredentialScope(baseUrl, token);
  // Remount before rendering another account/server: no data, socket, callbacks
  // or cached configuration may cross a credential boundary.
  return (
    <DataScope
      key={JSON.stringify([baseUrl, token])}
      baseUrl={baseUrl}
      token={token}
      includeTelegram={includeTelegram}
      expire={expire}
      isAuthenticated={isAuthenticated}
    >
      {children}
    </DataScope>
  );
}
interface ScopeProps extends React.PropsWithChildren {
  baseUrl: string;
  token?: string;
  includeTelegram: boolean;
  expire: () => Promise<void>;
  isAuthenticated: () => boolean;
}
function DataScope({
  children,
  baseUrl,
  token,
  includeTelegram,
  expire,
  isAuthenticated,
}: ScopeProps) {
  const locations = useMemo(createLocationStore, []);
  const loader = useMemo(
    () =>
      createDashboardLoader(baseUrl, token || '', {
        includeTelegram,
      }),
    [baseUrl, token, includeTelegram],
  );
  const fetchSnapshot = useCallback(
    async (force: boolean) => {
      const revision = locations.getRevision();
      const snapshot = token
        ? await loader(force)
        : { ...empty, locations: [] };
      return { snapshot, revision };
    },
    [loader, locations, token],
  );
  const select = useCallback(
    ({ snapshot, revision }: Awaited<ReturnType<typeof fetchSnapshot>>) => {
      const { locations: points, ...core } = snapshot;
      locations.replace(points, revision);
      return core;
    },
    [locations],
  );
  const { data, loading, error, load, refresh, isCurrent } = useRefreshResource(
    empty,
    fetchSnapshot,
    select,
    expire,
    isAuthenticated,
  );
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
    const socketUrl = new URL(baseUrl);
    const liveUrl =
      socketUrl.protocol === 'http:' && socketUrl.port === '3000'
        ? 'http://' + socketUrl.hostname + ':3001'
        : socketUrl.origin;
    const socket = io(liveUrl, {
      auth: { token },
      transports: ['websocket'],
      reconnectionDelayMax: 10_000,
    });
    let connected = true;
    socket.on('location:update', (location: Location) => {
      if (connected && isCurrent() && AppState.currentState === 'active')
        locations.update(location);
    });
    return () => {
      connected = false;
      clearInterval(timer);
      listener.remove();
      socket.disconnect();
    };
  }, [baseUrl, token, load, locations, isCurrent]);
  const mutate = useCallback(
    async <T,>(path: string, body?: unknown, method = 'POST'): Promise<T> => {
      if (!token || !isCurrent()) throw new Error('Please sign in again.');
      try {
        const result = await api<T>(baseUrl, path, token, body, method);
        if (isCurrent()) await load(false, true);
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
  const actions = useMemo(() => ({ refresh, mutate }), [refresh, mutate]);
  const value = useMemo(
    () => ({ data, loading, error, ...actions }),
    [data, loading, error, actions],
  );
  return (
    <ActionsContext.Provider value={actions}>
      <CoreContext.Provider value={value}>
        <LocationsContext.Provider value={locations}>
          {children}
        </LocationsContext.Provider>
      </CoreContext.Provider>
    </ActionsContext.Provider>
  );
}

/** Migrate non-tracking screens here; data deliberately excludes locations. */
export function useCoreData() {
  const value = useContext(CoreContext);
  if (!value) throw new Error('DataProvider is required');
  return value;
}
/** For command-only consumers; neither polling nor GPS subscribes them to data. */
export function useDataActions() {
  const value = useContext(ActionsContext);
  if (!value) throw new Error('DataProvider is required');
  return value;
}
export function useLocations() {
  const store = useContext(LocationsContext);
  if (!store) throw new Error('DataProvider is required');
  return useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
}
/** Backwards-compatible API: tracking consumers continue receiving live locations. */
export function useData() {
  const core = useCoreData();
  const locations = useLocations();
  const data = useMemo(
    () => ({ ...core.data, locations }),
    [core.data, locations],
  );
  return useMemo(() => ({ ...core, data }), [core, data]);
}

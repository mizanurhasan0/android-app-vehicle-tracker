import { ApiError, api } from './client';
import { DashboardData, Location, TelegramStatus, Vehicle } from './types';

export interface DashboardLoadOptions {
  /** Only guardians may call the Telegram status endpoint. */
  includeTelegram?: boolean;
}

/** Fetch independent dashboard resources together; publish only a full snapshot. */
export async function loadDashboard(
  baseUrl: string,
  token: string,
  get = <T>(path: string) => api<T>(baseUrl, path, token),
  options: DashboardLoadOptions = {},
): Promise<DashboardData> {
  const [
    vehicles,
    locations,
    routes,
    subscriptions,
    bills,
    accounts,
    payments,
    requests,
    complaints,
    stops,
    notifications,
    telegram,
  ] = await Promise.all([
    get<{ vehicles: Vehicle[] }>('/vehicles'),
    get<{ devices: Location[] }>('/locations'),
    get<DashboardData['routes']>('/routes'),
    get<DashboardData['subscriptions']>('/subscriptions'),
    get<DashboardData['bills']>('/payments/monthly'),
    get<DashboardData['accounts']>('/payments/accounts'),
    get<DashboardData['payments']>('/payments/submissions'),
    get<DashboardData['requests']>('/requests/mine'),
    get<DashboardData['complaints']>('/complaints'),
    get<DashboardData['stops']>('/stop-requests'),
    get<DashboardData['notifications']>('/notifications'),
    options.includeTelegram
      ? get<TelegramStatus>('/telegram/status').catch(error => {
          // Keep clients compatible with a server deployed before Telegram.
          if (error instanceof ApiError && [404, 405].includes(error.status))
            return undefined;
          throw error;
        })
      : Promise.resolve(undefined),
  ]);
  return {
    vehicles: vehicles.vehicles,
    locations: locations.devices,
    routes,
    subscriptions,
    bills,
    accounts,
    payments,
    requests,
    complaints,
    stops,
    notifications,
    ...(telegram ? { telegram } : {}),
  };
}

// Only routes/fares and payment destination configuration tolerate a one-minute
// delay. Vehicles (including status), permissions/subscriptions, money, requests,
// notifications, and location freshness still poll every 20s while active.
// No persistence/global cache: each credential-keyed DataProvider owns a loader.
export const CONFIG_CACHE_MS = 60_000;
const slowPaths = new Set(['/routes', '/payments/accounts']);
export function createDashboardLoader(
  baseUrl: string,
  token: string,
  options: DashboardLoadOptions = {},
) {
  let cache = new Map<string, { value: unknown; fetchedAt: number }>();
  let generation = 0;
  return async (force = false): Promise<DashboardData> => {
    const request = ++generation;
    if (force) cache = new Map();
    const staged = new Map(cache);
    const get = async <T>(path: string): Promise<T> => {
      const cached = cache.get(path);
      if (!force && cached && Date.now() - cached.fetchedAt < CONFIG_CACHE_MS)
        return cached.value as T;
      const value = await api<T>(baseUrl, path, token);
      if (slowPaths.has(path))
        staged.set(path, { value, fetchedAt: Date.now() });
      return value;
    };
    const snapshot = await loadDashboard(baseUrl, token, get, options);
    // Failed/obsolete batches cannot refresh the cache's age or resurrect stale
    // configuration following a write. Publish only complete, successful batches.
    if (request === generation) cache = staged;
    return snapshot;
  };
}

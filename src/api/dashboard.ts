import { api } from './client';
import { DashboardData, Location, Vehicle } from './types';

/** Fetch independent dashboard resources together; publish only a full snapshot. */
export async function loadDashboard(
  baseUrl: string,
  token: string,
): Promise<DashboardData> {
  const get = <T>(path: string) => api<T>(baseUrl, path, token);
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
  };
}

import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { BannerItem } from '../../components/BannerCarousel';
import { HomeStackParams } from '../../navigation/types';
import { useData } from '../../context/DataContext';
import { useManagement } from '../../context/ManagementContext';
import { isServiceScheduled } from '../../utils/transport';
import { useDhakaDate } from '../../hooks/useDhakaDate';

export type HomeNavigation = NativeStackScreenProps<
  HomeStackParams,
  'Fleet'
>['navigation'];

export function useDashboardData() {
  const core = useData();
  const management = useManagement();
  const data = core.data;
  const extra = management.data;
  const today = useDhakaDate(),
    month = today.slice(0, 7);
  const monthBills = data.bills.filter(b => b.month === month);
  const expected = monthBills.reduce((s, b) => s + b.amount, 0);
  const paid = monthBills
    .filter(b => b.status === 'PAID')
    .reduce((s, b) => s + b.amount, 0);
  const due = data.bills
    .filter(b => b.status === 'UNPAID')
    .reduce((s, b) => s + b.amount, 0);
  const duePeople = new Set(
    data.bills.filter(b => b.status === 'UNPAID').map(b => b.guardianName),
  ).size;
  const unknown = (core.loading || !!core.error) && !data.bills.length;
  const unread = data.notifications.filter(n => !n.readAt).length;
  const student =
    extra?.students.find(s => s.status === 'ACTIVE') || extra?.students[0];
  const students = extra?.students || [];
  const scheduled = students.filter(
    s =>
      s.status === 'ACTIVE' &&
      isServiceScheduled(s, today, extra?.settings.operatingDays),
  );
  const active = scheduled.length;
  const scheduledIds = new Set(scheduled.map(s => s.id));
  const absent =
    extra?.attendance.filter(
      a =>
        a.studentId &&
        scheduledIds.has(a.studentId) &&
        a.date === today &&
        a.status === 'ABSENT',
    ).length || 0;
  const maintenance =
    extra?.maintenance.filter(m => m.status === 'IN_PROGRESS') || [];
  const activeMaintenanceIds = new Set(maintenance.map(m => m.vehicleId));
  const running = data.vehicles.filter(
    v =>
      v.status === 'RUNNING' || (!v.status && !activeMaintenanceIds.has(v.id)),
  ).length;
  const requestCount =
    data.requests.filter(r => r.status === 'PENDING').length +
    (extra?.requests.filter(r => r.status === 'PENDING').length || 0);
  const vehicle =
    data.vehicles.find(v => v.id === student?.vehicleId) || data.vehicles[0];
  const location = data.locations.find(l => l.imei === vehicle?.imei);
  const pending = data.requests.find(r => r.status === 'PENDING');
  const banners: BannerItem[] = (extra?.banners || [])
    .filter(
      banner =>
        (banner.active === true || banner.active === 1) &&
        !!banner.imageUrl &&
        !!banner.redirectRoute,
    )
    .map(banner => ({
      id: banner.id,
      imageUrl: banner.imageUrl,
      redirectRoute: banner.redirectRoute,
      sliderDuration: banner.sliderDuration,
    }));
  return {
    core,
    management,
    data,
    extra,
    today,
    expected,
    paid,
    due,
    duePeople,
    unknown,
    unread,
    student,
    students,
    active,
    absent,
    maintenance,
    activeMaintenanceIds,
    running,
    requestCount,
    vehicle,
    location,
    pending,
    banners,
  };
}

export type DashboardData = ReturnType<typeof useDashboardData>;

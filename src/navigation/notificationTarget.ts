import { ManagementOverview } from '../api/management';
import { DashboardData, Notification, User } from '../api/types';
import { HomeStackParams } from './types';

type Destination = {
  [Screen in keyof HomeStackParams]: [Screen, HomeStackParams[Screen]];
}[keyof HomeStackParams];

// Resolve by record identity, never by translated or administrator-written text.
// Only link records available to the signed-in user; retain the notification
// itself as the fallback for notices and records that are no longer available.
export function notificationTarget(
  notification: Notification,
  role: User['role'],
  data: Pick<
    DashboardData,
    'payments' | 'bills' | 'requests' | 'complaints' | 'stops'
  >,
  management: ManagementOverview | null,
): Destination {
  const id = notification.entityId;
  if (id) {
    if (data.payments.some(item => item.id === id))
      return ['Bills', { paymentId: id }];
    if (data.bills.some(item => item.id === id))
      return ['Bills', { billId: id }];
    if (data.requests.some(item => item.id === id))
      return [role === 'ADMIN' ? 'Requested' : 'ApplicationStatus', { id }];
    if (data.complaints.some(item => item.id === id))
      return ['Complaints', { id }];
    if (data.stops.some(item => item.id === id))
      return ['StopRequests', { id }];
    if (role === 'ADMIN' && management?.requests.some(item => item.id === id))
      return ['OperationalRequests', { id }];
  }
  return ['NotificationDetails', { id: notification.id }];
}

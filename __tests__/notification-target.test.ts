import { notificationTarget } from '../src/navigation/notificationTarget';
import { DashboardData, Notification, User } from '../src/api/types';
import { ManagementOverview } from '../src/api/management';

const notification: Notification = {
  id: 'notification-1',
  entityId: 'linked-record',
  title: 'An arbitrary notice title',
  body: 'An arbitrary message',
  createdAt: '2026-09-14T00:00:00Z',
  readAt: null,
};
const empty: DashboardData = {
  accounts: [],
  bills: [],
  complaints: [],
  locations: [],
  notifications: [],
  payments: [],
  requests: [],
  routes: [],
  stops: [],
  subscriptions: [],
  vehicles: [],
};

it.each([
  ['ADMIN', 'bills', 'Bills', 'billId'],
  ['GUARDIAN', 'bills', 'Bills', 'billId'],
  ['ADMIN', 'payments', 'Bills', 'paymentId'],
  ['GUARDIAN', 'payments', 'Bills', 'paymentId'],
  ['ADMIN', 'requests', 'Requested', 'id'],
  ['GUARDIAN', 'requests', 'ApplicationStatus', 'id'],
  ['ADMIN', 'complaints', 'Complaints', 'id'],
  ['GUARDIAN', 'complaints', 'Complaints', 'id'],
  ['ADMIN', 'stops', 'StopRequests', 'id'],
  ['GUARDIAN', 'stops', 'StopRequests', 'id'],
] as const)(
  'routes %s %s by record identity',
  (role, collection, screen, parameter) => {
    // Only identity is consumed by the resolver; other record fields are irrelevant.
    const data = { ...empty, [collection]: [{ id: notification.entityId }] };
    expect(notificationTarget(notification, role, data, null)).toEqual([
      screen,
      { [parameter]: notification.entityId },
    ]);
  },
);

it.each(['ADMIN', 'GUARDIAN'] as User['role'][])(
  'keeps unavailable records and general notices readable for %s',
  role => {
    for (const entityId of ['', 'deleted-record']) {
      expect(
        notificationTarget(
          { ...notification, entityId, title: 'Payment completed' },
          role,
          empty,
          null,
        ),
      ).toEqual(['NotificationDetails', { id: notification.id }]);
    }
  },
);

it('only opens the operational request screen for administrators', () => {
  const management = {
    requests: [{ id: notification.entityId }],
  } as ManagementOverview;
  expect(notificationTarget(notification, 'ADMIN', empty, management)).toEqual([
    'OperationalRequests',
    { id: notification.entityId },
  ]);
  expect(
    notificationTarget(notification, 'GUARDIAN', empty, management),
  ).toEqual(['NotificationDetails', { id: notification.id }]);
});

export type Status =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'UNPAID'
  | 'PAID'
  | 'ACTIVE'
  | 'STOPPED'
  | 'OPEN'
  | 'RESOLVED';
export interface User {
  id: string;
  name: string;
  phone: string;
  role: 'ADMIN' | 'GUARDIAN';
  verified: number;
}
export interface Session {
  token: string;
  expiresAt: string;
  user: User;
}
export interface Vehicle {
  id: string;
  name: string;
  plate: string;
  imei: string;
  driverName?: string;
  driverPhone?: string;
}
export interface Location {
  imei: string;
  status: 'live' | 'lastKnown' | 'waiting' | 'offline';
  latitude?: number;
  longitude?: number;
  speed?: number;
  positionAt?: string;
  lastSeen: string;
}
export interface Route {
  id: string;
  name: string;
  vehicleId: string;
  vehicleName: string;
  monthlyAmount: number;
  stops: { id: string; name: string }[];
}
export interface Subscription {
  id: string;
  studentName: string;
  routeName: string;
  stopName: string;
  vehicleName: string;
  vehicleId: string;
  status: Status;
}
export interface Bill {
  id: string;
  studentName: string;
  guardianName: string;
  month: string;
  amount: number;
  status: Status;
  pendingSubmissionId: string | null;
  paidAt: string | null;
}
export interface PaymentAccount {
  method: 'BKASH' | 'ROCKET';
  number: string;
  instructions: string;
}
export interface Payment {
  id: string;
  billId: string;
  guardianName: string;
  guardianPhone: string;
  studentName: string;
  month: string;
  method: string;
  senderNumber: string;
  recipientNumber: string;
  amount: number;
  transactionId: string;
  status: Status;
  note: string;
  createdAt: string;
}
export interface ServiceRequest {
  id: string;
  studentName: string;
  guardianName: string;
  guardianPhone: string;
  routeName: string;
  stopName: string;
  vehicleName: string;
  status: Status;
  note: string;
}
export interface Complaint {
  id: string;
  studentName: string;
  guardianName: string;
  category: string;
  description: string;
  status: Status;
  note: string;
}
export interface StopRequest {
  id: string;
  studentName: string;
  guardianName: string;
  reason: string;
  status: Status;
  note: string;
}
export interface Notification {
  id: string;
  title: string;
  body: string;
  entityId: string;
  createdAt: string;
  readAt: string | null;
}
export interface DashboardData {
  vehicles: Vehicle[];
  locations: Location[];
  routes: Route[];
  subscriptions: Subscription[];
  bills: Bill[];
  accounts: PaymentAccount[];
  payments: Payment[];
  requests: ServiceRequest[];
  complaints: Complaint[];
  stops: StopRequest[];
  notifications: Notification[];
}

export interface HistoryPoint {
  id: string;
  imei: string;
  vehicleId: string | null;
  latitude: number;
  longitude: number;
  speed: number;
  course: number;
  gpsTime: string;
  receivedAt: string;
}
export interface HistoryMetadata {
  imei: string;
  from: string;
  to: string;
  timezone: 'Asia/Dhaka';
  freshness: {
    pendingPoints: number;
    oldestPendingAt: string | null;
    complete: boolean;
  };
}
export interface HistoryDay {
  date: string;
  pointCount: number;
  distanceMeters: number;
  firstAt: string | null;
  lastAt: string | null;
  gapCount: number;
}
export interface HistorySummary extends HistoryMetadata {
  days: HistoryDay[];
}
export interface HistoryRoute extends HistoryMetadata {
  segments: { points: HistoryPoint[] }[];
  pointCount: number;
  displayedPointCount: number;
  simplified: boolean;
  distanceMeters: number;
  gapCount: number;
}

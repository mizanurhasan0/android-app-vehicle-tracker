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
  model?: string;
  purchaseDate?: string;
  fitnessExpiresAt?: string;
  licenseExpiresAt?: string;
  status?: 'RUNNING' | 'MAINTENANCE' | 'INACTIVE';
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
export interface RouteFare {
  boardingStopId: string;
  dropoffStopId: string;
  monthlyAmount: number;
}
export interface Route {
  id: string;
  name: string;
  vehicleId: string;
  vehicleName: string;
  monthlyAmount: number;
  stops: {
    id: string;
    name: string;
    pickupPoint?: {
      latitude: number;
      longitude: number;
      enterRadiusMeters: number;
      exitRadiusMeters: number;
    };
  }[];
  fares?: RouteFare[];
}
export interface Subscription {
  studentId?: string;
  shiftId?: string;
  operatingDays?: number[];
  id: string;
  studentName: string;
  routeName: string;
  stopName: string;
  dropoffStopId?: string | null;
  dropoffStopName?: string | null;
  vehicleName: string;
  vehicleId: string;
  status: Status;
}
export interface Bill {
  studentId?: string;
  shiftId?: string;
  id: string;
  subscriptionId?: string;
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
  studentId?: string;
  shiftId?: string;
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
  studentCode?: string;
  className?: string;
  roll?: string;
  photoUrl?: string;
  emergencyContact?: string;
  pickupAddress?: string;
  dropAddress?: string;
  studentId?: string;
  guardianId?: string;
  shiftId?: string;
  operatingDays?: number[];
  monthlyAmount?: number;
  id: string;
  studentName: string;
  guardianName: string;
  guardianPhone: string;
  routeName: string;
  stopName: string;
  dropoffStopId?: string | null;
  dropoffStopName?: string | null;
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
  /** Present when the API includes Telegram delivery metadata. */
  telegramDelivery?: TelegramDeliverySummary;
  telegramStatus?: TelegramDeliveryStatus;
}

export type TelegramDeliveryStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SENDING'
  | 'SENT'
  | 'SKIPPED'
  | 'FAILED'
  | 'CANCELLED';

/** The server may expose either the legacy provider fields or the Telegram-specific names. */
export interface TelegramDelivery {
  id: string;
  notificationId: string | null;
  userId?: string;
  guardianId?: string;
  userName?: string;
  guardianName?: string;
  chatId?: string | number;
  chatIdLast4?: string;
  title: string;
  body: string;
  status: TelegramDeliveryStatus;
  attempts: number;
  lastError?: string | null;
  providerMessageId?: string | null;
  telegramMessageId?: number | null;
  createdAt: string;
  updatedAt?: string;
  sentAt?: string | null;
}

/** Small optional projection used by notifications without changing old records. */
export type TelegramDeliverySummary = Pick<
  TelegramDelivery,
  'status' | 'sentAt' | 'lastError'
>;

export interface TelegramStatus {
  enabled: boolean;
  connected: boolean;
  connectedAt: string | null;
  username: string | null;
  firstName: string | null;
  chatIdLast4: string | null;
}

export interface TelegramConnectResponse {
  enabled: true;
  url: string;
  expiresAt: string;
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
  /** Guardian-only status; absent for admins and older API versions. */
  telegram?: TelegramStatus;
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

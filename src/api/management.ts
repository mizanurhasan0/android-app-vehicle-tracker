/** Management API amounts are integer poisha; dates are YYYY-MM-DD. */
export interface Student {
  id: string; subscriptionId: string; guardianId: string; studentName: string;
  studentCode: string; className: string; roll: string; photoUrl: string;
  guardianName: string; guardianPhone: string; pickupAddress: string; dropAddress: string;
  emergencyContact: string; routeId: string; routeName: string; stopId: string; stopName: string;
  vehicleId: string; vehicleName: string; driverName: string | null; driverPhone: string | null;
  monthlyAmount: number; status: 'ACTIVE' | 'STOPPED'; startedAt: string;
}
export interface StudentInput {
  studentName: string; guardianPhone: string; routeId: string; stopId: string;
  studentCode?: string; className?: string; roll?: string; photoUrl?: string;
  pickupAddress?: string; dropAddress?: string; emergencyContact?: string;
  monthlyAmount?: number; status?: 'ACTIVE' | 'STOPPED';
}
export interface Driver {
  id: string; name: string; phone: string; nid: string; address: string;
  joiningDate: string; monthlySalary: number; status: 'ACTIVE' | 'LEAVE' | 'INACTIVE';
  vehicleId: string | null; vehicleName: string | null; routeName: string | null;
  createdAt: string;
}
export interface DriverInput {
  name: string; phone: string; nid?: string; address?: string; joiningDate?: string;
  monthlySalary?: number; status?: Driver['status']; vehicleId?: string | null;
}
export interface Attendance {
  id: string; studentId: string | null; driverId: string | null; date: string;
  status: 'PRESENT' | 'ABSENT' | 'LEAVE'; note: string; updatedAt: string;
}
export interface AttendanceInput {
  studentId?: string; driverId?: string; date: string; status: Attendance['status']; note?: string;
}
export interface Maintenance {
  id: string; vehicleId: string; vehicleName: string; title: string; description: string;
  serviceDate: string; nextServiceDate: string | null; amount: number;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED'; createdAt: string;
}
export interface MaintenanceInput {
  vehicleId: string; title: string; description?: string; serviceDate: string;
  nextServiceDate?: string | null; amount: number; status?: Maintenance['status'];
}
export interface LedgerEntry {
  id: string; type: 'INCOME' | 'EXPENSE' | 'INVESTMENT'; category: string;
  title: string; amount: number; date: string; note: string; vehicleId: string | null;
  driverId: string | null; maintenanceId: string | null; createdAt: string;
}
export interface LedgerInput {
  type: LedgerEntry['type']; category: string; title: string; amount: number;
  date: string; note?: string; vehicleId?: string; driverId?: string;
}
export interface Notice {
  id: string; title: string; body: string; category: string;
  audience: 'ALL' | 'ROUTE' | 'VEHICLE' | 'STUDENT'; targetId: string | null; createdAt: string;
}
export interface NoticeInput {
  title: string; body: string; category: string; audience: Notice['audience']; targetId?: string;
}
export interface ManagementRequest {
  id: string; userId: string; userName: string; studentId: string | null; studentName: string | null;
  driverId: string | null; vehicleId: string | null; category: 'ABSENCE' | 'LEAVE' | 'MAINTENANCE' | 'OTHER';
  title: string; description: string; date: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED'; note: string; createdAt: string; reviewedAt: string | null;
}
export interface ManagementRequestInput {
  studentId?: string; driverId?: string; vehicleId?: string; category: ManagementRequest['category'];
  title: string; description: string; date?: string;
}
export interface BusinessSettings {
  businessName: string; phone: string; address: string; emergencyPhone: string;
  whatsappNumber: string; paymentReminder: string; absenceMessage: string;
  delayMessage: string; holidayMessage: string; emergencyMessage: string;
}
export interface RouteSchedule {
  id: string; routeId: string; stopId: string | null; studentId: string | null;
  label: string; time: string; period: 'MORNING' | 'AFTERNOON'; position: number;
}
export type ScheduleInput = Omit<RouteSchedule, 'id' | 'routeId'>;
export interface ManagementOverview {
  students: Student[]; drivers: Driver[]; attendance: Attendance[]; maintenance: Maintenance[];
  ledger: LedgerEntry[]; notices: Notice[]; requests: ManagementRequest[];
  settings: BusinessSettings; schedules: RouteSchedule[];
}
export interface ManagementReport {
  month: string;
  billing: { expected: number; paid: number; due: number; previousDue: number };
  cashflow: { fareReceived: number; otherIncome: number; expenses: number; investment: number; net: number };
  students: { total: number; active: number };
  drivers: number; vehicles: number;
  attendance: { present: number; absent: number; leave: number };
  ledger: LedgerEntry[];
}
/** GET /management/overview; guardian responses contain only their own student data.
 * POST /admin/students (guardianPhone must belong to a registered guardian)
 * PATCH /admin/students/:id with Partial<StudentInput>
 * POST /admin/drivers; PATCH /admin/drivers/:id with Partial<DriverInput>
 * PUT /admin/attendance {entries: AttendanceInput[]} (atomic batch)
 * POST /admin/maintenance; PATCH /admin/maintenance/:id with Partial<MaintenanceInput>
 * POST /admin/ledger; POST /admin/notices
 * POST /management/requests
 * PATCH /admin/management-requests/:id/decision {decision:'APPROVED'|'REJECTED',note?:string}
 * PATCH /admin/settings with Partial<BusinessSettings>
 * PUT /admin/routes/:id/schedule {entries: ScheduleInput[]}
 * GET /admin/reports?month=YYYY-MM (aggregated real payment/ledger data)
 */

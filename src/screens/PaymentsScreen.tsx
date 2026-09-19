import React from 'react';
import { useManagement } from '../context/ManagementContext';
import { transportShifts } from '../utils/transport';
import { AdminPaymentDesk } from './AdminPaymentDesk';
import { GuardianPaymentsScreen } from './payments/GuardianPaymentsScreen';
import { useAuth } from '../context/AuthContext';

export function PaymentsScreen({
  dueOnly = false,
  initialTab = 'review',
  billId,
  paymentId,
}: {
  dueOnly?: boolean;
  initialTab?: 'review' | 'bills';
  billId?: string;
  paymentId?: string;
} = {}) {
  const { session } = useAuth();
  const management = useManagement();
  const shifts = transportShifts(management.data?.settings);
  return session?.user.role === 'ADMIN' ? (
    <AdminPaymentDesk
      shifts={shifts}
      initialTab={initialTab}
      dueOnly={dueOnly}
      billId={billId}
      paymentId={paymentId}
    />
  ) : (
    <GuardianPaymentsScreen
      shifts={shifts}
      dueOnly={dueOnly}
      billId={billId}
      paymentId={paymentId}
    />
  );
}

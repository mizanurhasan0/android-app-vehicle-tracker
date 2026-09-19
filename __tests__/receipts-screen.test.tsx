import React from 'react';
import { ToastHost } from '../src/components/Toast';
import { View } from 'react-native';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
import { i18n } from '../src/i18n';
import { billingMonthLabel } from '../src/screens/parent/parentUtils';
import { Bill, DashboardData, Payment } from '../src/api/types';
import { Button, Empty } from '../src/components/ui';
import {
  approvedReceiptPayment,
  receiptDocument,
  ReceiptsScreen,
} from '../src/screens/parent/ReceiptsScreen';

let mockData: DashboardData;
const mockSave = jest.fn();
const mockRefresh = jest.fn();
const business = {
  businessName: 'Noor School Transport',
  phone: '01700000001',
  address: 'Dhaka',
};
const paidBill: Bill = {
  id: 'paid-bill-1',
  subscriptionId: 'child-1',
  studentName: 'Paid Student',
  guardianName: 'Guardian',
  month: '2026-09',
  amount: 250000,
  status: 'PAID',
  pendingSubmissionId: null,
  paidAt: '2026-09-10T05:00:00Z',
};
const approvedPayment: Payment = {
  id: 'approved-payment',
  billId: paidBill.id,
  guardianName: 'Guardian',
  guardianPhone: '01700000002',
  studentName: paidBill.studentName,
  month: '2026-09',
  method: 'BKASH',
  senderNumber: '01700000002',
  recipientNumber: '01700000001',
  amount: 250000,
  transactionId: 'APPROVED123',
  status: 'APPROVED',
  note: '',
  createdAt: '2026-09-10T04:30:00Z',
};
jest.mock('../src/context/DataContext', () => {
  const useData = () => ({
    data: mockData,
    loading: false,
    error: '',
    refresh: mockRefresh,
  });
  return { useData, useCoreData: useData, useDataActions: useData };
});
jest.mock('../src/context/ManagementContext', () => ({
  useManagement: () => ({
    data: { settings: business },
    loading: false,
    error: '',
    refresh: mockRefresh,
  }),
}));
jest.mock('../src/utils/photo', () => ({
  saveReportFile: (...args: unknown[]) => mockSave(...args),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-picker/picker', () => {
  const ReactModule = require('react');
  const { View: NativeView } = require('react-native');
  const Picker = (props: object) =>
    ReactModule.createElement(NativeView, props);
  Picker.Item = (props: object) => ReactModule.createElement(NativeView, props);
  return { Picker };
});
let screen: TestRenderer.ReactTestRenderer;
beforeEach(async () => {
  await i18n.changeLanguage('en');
  jest.clearAllMocks();
  mockSave.mockResolvedValue(true);
  mockRefresh.mockResolvedValue(undefined);
  mockData = {
    vehicles: [],
    locations: [],
    routes: [],
    subscriptions: [],
    accounts: [],
    requests: [],
    complaints: [],
    stops: [],
    notifications: [],
    payments: [approvedPayment],
    bills: [
      paidBill,
      {
        ...paidBill,
        id: 'unpaid',
        studentName: 'Unpaid Student',
        status: 'UNPAID',
        paidAt: null,
        pendingSubmissionId: 'pending-payment',
      },
    ],
  };
});
afterEach(async () => {
  if (screen) await act(async () => screen.unmount());
  await i18n.changeLanguage('en');
});
async function render() {
  await act(async () => {
    screen = TestRenderer.create(
      <View>
        <ReceiptsScreen />
        <ToastHost />
      </View>,
    );
  });
}
async function selectReceipt() {
  await act(async () =>
    screen.root
      .findAll(
        node =>
          typeof node.props.onPress === 'function' &&
          node.props.accessibilityLabel ===
            i18n.t('View receipt - {{student}} - {{month}}', {
              student: paidBill.studentName,
              month: billingMonthLabel(paidBill.month),
            }),
        { deep: false },
      )[0]
      .props.onPress(),
  );
}
async function save() {
  await act(async () =>
    screen.root
      .findAllByType(Button)
      .find(button => button.props.title === i18n.t('Save PDF receipt'))!
      .props.onPress(),
  );
}
const text = () =>
  screen.root
    .findAllByType(Text)
    .map(item => item.props.children)
    .flat()
    .join(' ');

async function language(value: 'en' | 'bn') {
  await act(async () => {
    await i18n.changeLanguage(value);
  });
}

it('lists only paid bills and never offers a receipt for an unpaid pending submission', async () => {
  await render();
  expect(text()).toContain('Paid Student');
  expect(text()).not.toContain('Unpaid Student');
  expect(screen.root.findAllByType(Button)).toHaveLength(0);
  mockData = { ...mockData, bills: [mockData.bills[1]] };
  await act(async () =>
    screen.update(
      <View>
        <ReceiptsScreen />
        <ToastHost />
      </View>,
    ),
  );
  expect(screen.root.findByType(Empty).props.title).toBe('No receipts yet');
  expect(mockSave).not.toHaveBeenCalled();
});

it('renders and exports the real paid bill, configured business and matching approved transaction', async () => {
  mockData.payments = [
    {
      ...approvedPayment,
      id: 'pending',
      transactionId: 'PENDING123',
      status: 'PENDING',
    },
    approvedPayment,
  ];
  await render();
  await selectReceipt();
  expect(text()).toContain('Noor School Transport');
  expect(text()).toContain('APPROVED123');
  expect(text()).not.toContain('PENDING123');
  expect(text()).toContain(paidBill.id);
  await save();
  expect(mockSave).toHaveBeenCalledWith(
    'noor-receipt-2026-09-paid-bill-1.pdf',
    expect.any(String),
    'application/pdf',
  );
  const body = mockSave.mock.calls[0][1];
  expect(body).toContain('Student: Paid Student');
  expect(body).toContain('Bill reference: paid-bill-1');
  expect(body).toContain('Transaction ID: APPROVED123');
  expect(body).toContain('Recipient number: 01700000001');
  expect(body).not.toContain('PENDING123');
  expect(text()).toContain('Receipt saved.');
});

it('reports cancelled or failed exports without claiming that the PDF was saved', async () => {
  await render();
  await selectReceipt();
  mockSave.mockResolvedValueOnce(false);
  await save();
  expect(text()).toContain('Save cancelled.');
  expect(text()).not.toContain('Receipt saved.');
  mockSave.mockRejectedValueOnce(new Error('Storage unavailable'));
  await save();
  expect(text()).toContain('Storage unavailable');
  expect(text()).not.toContain('Receipt saved.');
});

it('removes export actions if the selected record stops being paid after refresh', async () => {
  await render();
  await selectReceipt();
  mockData = { ...mockData, bills: [{ ...paidBill, status: 'UNPAID' }] };
  await act(async () =>
    screen.update(
      <View>
        <ReceiptsScreen />
        <ToastHost />
      </View>,
    ),
  );
  expect(screen.root.findAllByType(Button)).toHaveLength(0);
  expect(mockSave).not.toHaveBeenCalled();
});

it('rejects unpaid document creation and excludes mismatched or unapproved payment proof', () => {
  expect(() =>
    receiptDocument(
      { ...paidBill, status: 'UNPAID' },
      approvedPayment,
      business,
    ),
  ).toThrow();
  for (const payment of [
    { ...approvedPayment, billId: 'another-bill' },
    { ...approvedPayment, amount: 150000 },
    { ...approvedPayment, status: 'REJECTED' as const },
  ]) {
    expect(approvedReceiptPayment(paidBill, [payment])).toBeUndefined();
    expect(receiptDocument(paidBill, payment, business)).not.toContain(
      'APPROVED123',
    );
  }
  const document = receiptDocument(
    { ...paidBill, studentName: 'Student\nInjected line', paidAt: null },
    undefined,
    business,
  );
  expect(document).toContain('Student: Student Injected line');
  expect(document).toContain('Date not recorded');
  expect(document).not.toContain('Invalid Date');
});

it('switches mounted receipt labels, dates and exports while preserving the selected bill and payment data', async () => {
  const original = JSON.stringify(mockData);
  await render();
  expect(text()).toContain('Paid bill receipts');
  expect(text()).toContain('September 2026');
  expect(text()).toContain('৳2,500');
  await language('bn');
  expect(text()).toContain('পরিশোধিত বিলের রসিদ');
  expect(text()).toContain('সেপ্টেম্বর ২০২৬');
  await selectReceipt();
  expect(text()).toContain('পেমেন্ট রসিদ');
  expect(text()).toContain('৳২,৫০০');
  expect(text()).toContain('Guardian');
  expect(text()).toContain('APPROVED123');
  expect(text()).toContain(
    new Date(paidBill.paidAt!).toLocaleString('bn-BD', {
      timeZone: 'Asia/Dhaka',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }),
  );
  await save();
  const bangla = mockSave.mock.calls[0][1];
  expect(bangla).toContain('পেমেন্ট রসিদ');
  expect(bangla).toContain('পরিশোধিত টাকা: ৳২,৫০০');
  expect(bangla).toContain('অভিভাবক: Guardian');
  expect(bangla).toContain('ট্রানজেকশন আইডি: APPROVED123');
  expect(bangla).toContain('বিলের মাস: সেপ্টেম্বর ২০২৬');
  await language('en');
  expect(text()).toContain('Payment receipt');
  expect(text()).toContain('Receipt saved.');
  expect(text()).toContain(paidBill.id);
  expect(text()).toContain('APPROVED123');
  await save();
  expect(mockSave.mock.calls[1][0]).toBe(mockSave.mock.calls[0][0]);
  expect(mockSave.mock.calls[1][1]).toContain('Amount paid: ৳2,500');
  expect(mockSave.mock.calls[1][1]).toContain('Billing month: September 2026');
  expect(mockSave.mock.calls[1][1]).toContain('Transaction ID: APPROVED123');
  expect(JSON.stringify(mockData)).toBe(original);
});

it('shows save feedback in the current language when switching while an export is pending', async () => {
  let complete!: (saved: boolean) => void;
  mockSave.mockImplementationOnce(
    () =>
      new Promise<boolean>(resolve => {
        complete = resolve;
      }),
  );
  await render();
  await selectReceipt();
  let work: Promise<unknown>;
  act(() => {
    work = screen.root
      .findAllByType(Button)
      .find(item => item.props.title === 'Save PDF receipt')!
      .props.onPress();
  });
  await language('bn');
  await act(async () => {
    complete(true);
    await work;
  });
  expect(text()).toContain('রসিদ সংরক্ষণ করা হয়েছে।');
  expect(mockSave.mock.calls[0][1]).toContain('Payment receipt');
  await language('en');
  expect(text()).toContain('Receipt saved.');
});

it('identifies the shift in exported receipts for the same student', () => {
  const settings = {
    ...business,
    transportShifts: [
      {
        id: 'MORNING',
        name: 'Early school',
        startTime: '07:00',
        endTime: '11:00',
      },
      {
        id: 'DAY',
        name: 'Afternoon school',
        startTime: '11:00',
        endTime: '15:00',
      },
    ],
  };
  const morning = receiptDocument(
    { ...paidBill, shiftId: 'MORNING' },
    approvedPayment,
    settings,
  );
  const day = receiptDocument(
    { ...paidBill, shiftId: 'DAY' },
    approvedPayment,
    settings,
  );
  expect(morning).toContain('Early school');
  expect(day).toContain('Afternoon school');
  expect(day).not.toContain('Early school');
});

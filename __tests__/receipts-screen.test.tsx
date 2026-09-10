import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Text } from 'react-native';
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
jest.mock('../src/context/DataContext', () => ({
  useData: () => ({
    data: mockData,
    loading: false,
    error: '',
    refresh: mockRefresh,
  }),
}));
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
}));
jest.mock('@react-native-picker/picker', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  const Picker = (props: object) => ReactModule.createElement(View, props);
  Picker.Item = (props: object) => ReactModule.createElement(View, props);
  return { Picker };
});
let screen: TestRenderer.ReactTestRenderer;
beforeEach(() => {
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
});
async function render() {
  await act(async () => {
    screen = TestRenderer.create(<ReceiptsScreen />);
  });
}
async function selectReceipt() {
  await act(async () =>
    screen.root
      .findAll(
        node =>
          typeof node.props.onPress === 'function' &&
          node.props.accessibilityLabel?.startsWith('রসিদ দেখুন'),
        { deep: false },
      )[0]
      .props.onPress(),
  );
}
async function save() {
  await act(async () =>
    screen.root
      .findAllByType(Button)
      .find(button => button.props.title === 'PDF রসিদ সংরক্ষণ')!
      .props.onPress(),
  );
}
const text = () =>
  screen.root
    .findAllByType(Text)
    .map(item => item.props.children)
    .flat()
    .join(' ');

it('lists only paid bills and never offers a receipt for an unpaid pending submission', async () => {
  await render();
  expect(text()).toContain('Paid Student');
  expect(text()).not.toContain('Unpaid Student');
  expect(screen.root.findAllByType(Button)).toHaveLength(0);
  mockData = { ...mockData, bills: [mockData.bills[1]] };
  await act(async () => screen.update(<ReceiptsScreen />));
  expect(screen.root.findByType(Empty).props.title).toBe('এখনও কোনো রসিদ নেই');
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
  expect(body).toContain('শিক্ষার্থী: Paid Student');
  expect(body).toContain('বিলের রেফারেন্স: paid-bill-1');
  expect(body).toContain('ট্রানজেকশন আইডি: APPROVED123');
  expect(body).toContain('প্রাপকের নম্বর: 01700000001');
  expect(body).not.toContain('PENDING123');
  expect(text()).toContain('রসিদ সংরক্ষণ করা হয়েছে।');
});

it('reports cancelled or failed exports without claiming that the PDF was saved', async () => {
  await render();
  await selectReceipt();
  mockSave.mockResolvedValueOnce(false);
  await save();
  expect(text()).toContain('সংরক্ষণ বাতিল করা হয়েছে।');
  expect(text()).not.toContain('রসিদ সংরক্ষণ করা হয়েছে।');
  mockSave.mockRejectedValueOnce(new Error('Storage unavailable'));
  await save();
  expect(text()).toContain('Storage unavailable');
  expect(text()).not.toContain('রসিদ সংরক্ষণ করা হয়েছে।');
});

it('removes export actions if the selected record stops being paid after refresh', async () => {
  await render();
  await selectReceipt();
  mockData = { ...mockData, bills: [{ ...paidBill, status: 'UNPAID' }] };
  await act(async () => screen.update(<ReceiptsScreen />));
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
  expect(document).toContain('শিক্ষার্থী: Student Injected line');
  expect(document).toContain('তারিখ নথিভুক্ত হয়নি');
  expect(document).not.toContain('Invalid Date');
});

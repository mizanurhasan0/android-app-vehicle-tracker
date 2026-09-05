import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Alert } from 'react-native';
import { PaymentsScreen } from '../src/screens/PaymentsScreen';
import { ReviewActions } from '../src/components/ReviewActions';
import { Button, Field, Select } from '../src/components/ui';
import { DashboardData, User } from '../src/api/types';
const mockMutate = jest.fn();
let mockUser: Pick<User, 'role'> = { role: 'GUARDIAN' };
let mockData: DashboardData;
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ session: { user: mockUser } }),
}));
jest.mock('../src/context/DataContext', () => ({
  useData: () => ({
    data: mockData,
    loading: false,
    error: '',
    refresh: jest.fn(),
    mutate: mockMutate,
  }),
}));
jest.mock('@react-native-picker/picker', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  const Picker = (props: object) => ReactModule.createElement(View, props);
  Picker.Item = (props: object) => ReactModule.createElement(View, props);
  return { Picker };
});
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
}));
beforeEach(() => {
  mockUser = { role: 'GUARDIAN' };
  mockMutate.mockReset().mockResolvedValue({});
  mockData = {
    vehicles: [],
    locations: [],
    routes: [],
    subscriptions: [],
    complaints: [],
    stops: [],
    requests: [],
    notifications: [],
    payments: [],
    accounts: [
      { method: 'BKASH', number: '01700000001', instructions: 'Send Money' },
    ],
    bills: [
      {
        id: 'bill-1',
        studentName: 'Student One',
        guardianName: 'Guardian',
        month: '2026-09',
        amount: 150000,
        status: 'UNPAID',
        pendingSubmissionId: null,
        paidAt: null,
      },
    ],
  };
});
afterEach(() => jest.restoreAllMocks());
it('submits the selected bill amount and transaction details without marking it paid locally', async () => {
  let screen!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    screen = TestRenderer.create(<PaymentsScreen />);
  });
  await act(async () => {
    screen.root
      .findAllByType(Button)
      .find(button => button.props.title === 'I’ve paid · submit details')!
      .props.onPress();
  });
  await act(async () => {
    screen.root
      .findAllByType(Select)
      .find(select => select.props.label === 'Payment method')!
      .props.onChange('BKASH');
    screen.root
      .findAllByType(Field)
      .find(field => field.props.label === 'Number you sent money from')!
      .props.onChangeText('01700000002');
    screen.root
      .findAllByType(Field)
      .find(field => field.props.label === 'Transaction ID')!
      .props.onChangeText('ABC1234567');
  });
  await act(async () => {
    mockData.accounts = [{ ...mockData.accounts[0], number: '01700000009' }];
    screen.update(<PaymentsScreen />);
  });
  await act(async () => {
    screen.root
      .findAllByType(Button)
      .find(button => button.props.title === 'Submit for verification')!
      .props.onPress();
  });
  expect(mockMutate).toHaveBeenCalledWith('/payments/submissions', {
    billId: 'bill-1',
    method: 'BKASH',
    senderNumber: '01700000002',
    recipientNumber: '01700000001',
    transactionId: 'ABC1234567',
    amount: 150000,
  });
  expect(mockData.bills[0].status).toBe('UNPAID');
  await act(async () => screen.unmount());
});
it('hides submission for a bill already awaiting review', async () => {
  mockData.bills[0].pendingSubmissionId = 'payment-1';
  let screen!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    screen = TestRenderer.create(<PaymentsScreen />);
  });
  expect(
    screen.root
      .findAllByType(Button)
      .some(button => button.props.title === 'I’ve paid · submit details'),
  ).toBe(false);
  await act(async () => screen.unmount());
});
it('requires a rejection reason and an explicit approval confirmation', async () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  let screen!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    screen = TestRenderer.create(
      <ReviewActions path="/admin/payments/payment-1/decision" />,
    );
  });
  await act(async () => {
    screen.root
      .findAllByType(Button)
      .find(button => button.props.title === 'Reject with reason')!
      .props.onPress();
  });
  expect(mockMutate).not.toHaveBeenCalled();
  await act(async () => {
    screen.root
      .findAllByType(Button)
      .find(button => button.props.title === 'Approve')!
      .props.onPress();
  });
  expect(alert).toHaveBeenCalled();
  expect(mockMutate).not.toHaveBeenCalled();
  await act(async () => {
    alert.mock.calls[0][2]![1].onPress!();
  });
  expect(mockMutate).toHaveBeenCalledWith(
    '/admin/payments/payment-1/decision',
    { decision: 'APPROVED', note: '' },
    'PATCH',
  );
  await act(async () => screen.unmount());
});

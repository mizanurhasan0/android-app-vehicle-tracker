import React from 'react';
import { ToastHost } from '../src/components/Toast';
import TestRenderer, { act } from 'react-test-renderer';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { PaymentsScreen } from '../src/screens/PaymentsScreen';
import { ReviewActions } from '../src/components/ReviewActions';
import { Button, Empty, Field, Select } from '../src/components/ui';
import { DashboardData, User } from '../src/api/types';
jest.mock('../src/components/LanguageSwitcher', () => ({
  LanguageSwitcher: () => null,
}));
const mockMutate = jest.fn();
let mockUser: Pick<User, 'role'> = { role: 'GUARDIAN' };
let mockData: DashboardData;
jest.mock('../src/context/AuthContext', () => ({
  useAuth: () => ({ session: { user: mockUser } }),
}));
jest.mock('../src/context/ManagementContext', () => ({
  useManagement: () => ({ data: null }),
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
  const { View: NativeView } = require('react-native');
  const Picker = (props: object) =>
    ReactModule.createElement(NativeView, props);
  Picker.Item = (props: object) => ReactModule.createElement(NativeView, props);
  return { Picker };
});
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
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
it('prevents switching bills while a submission is still in progress', async () => {
  mockData.bills.push({ ...mockData.bills[0], id: 'bill-2', month: '2026-10' });
  let finish!: () => void;
  mockMutate.mockImplementationOnce(
    () =>
      new Promise<void>(resolve => {
        finish = resolve;
      }),
  );
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
    screen.root
      .findAllByType(Button)
      .find(button => button.props.title === 'Submit for verification')!
      .props.onPress();
  });
  await act(async () => pressTab(screen, 'Your bills'));
  const billButtons = () =>
    screen.root
      .findAllByType(Button)
      .filter(button => button.props.title === 'I’ve paid · submit details');
  expect(billButtons()).toHaveLength(2);
  expect(billButtons().every(button => button.props.disabled)).toBe(true);
  await act(async () => finish());
  expect(billButtons().some(button => button.props.disabled)).toBe(false);
  expect(mockMutate).toHaveBeenCalledTimes(1);
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

function seedAdminPayments() {
  mockUser = { role: 'ADMIN' };
  const payment = {
    id: 'pending-new',
    billId: 'bill-1',
    studentName: 'Student One',
    guardianName: 'Guardian',
    guardianPhone: '01700000002',
    month: '2026-09',
    method: 'BKASH',
    senderNumber: '01700000002',
    recipientNumber: '01700000001',
    amount: 150000,
    transactionId: 'NEW123456',
    status: 'PENDING' as const,
    note: '',
    createdAt: '2026-09-08T10:00:00Z',
  };
  mockData.payments = [
    payment,
    {
      ...payment,
      id: 'approved',
      status: 'APPROVED',
      transactionId: 'PAID123456',
    },
    {
      ...payment,
      id: 'pending-old',
      transactionId: 'OLD123456',
      createdAt: '2026-09-07T10:00:00Z',
    },
    {
      ...payment,
      id: 'rejected',
      status: 'REJECTED',
      transactionId: 'FAIL123456',
      month: '2026-08',
    },
  ];
}

function pressTab(screen: TestRenderer.ReactTestRenderer, title: string) {
  screen.root
    .findAll(node => !!node.props.onPress && !!node.props.accessibilityRole, {
      deep: false,
    })
    .find(
      node =>
        node.props.accessibilityRole === 'tab' &&
        node.findAllByType(Text).some(text => text.props.children === title),
    )!
    .props.onPress();
}

it('shows one guardian tab at a time and preserves payment drafts and history filters', async () => {
  let screen!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    screen = TestRenderer.create(<PaymentsScreen />);
  });
  const panel = (label: string) =>
    screen.root.findByProps({ testID: `payment-panel-${label}` });
  const labels = ['Your bills', 'Payment history', 'Payment form'];
  const expectActive = (active: string) =>
    labels.forEach(label => {
      expect(panel(label).props.accessibilityElementsHidden).toBe(
        label !== active,
      );
      expect(panel(label).props.importantForAccessibility).toBe(
        label === active ? 'auto' : 'no-hide-descendants',
      );
      expect(StyleSheet.flatten(panel(label).props.style).display).toBe(
        label === active ? undefined : 'none',
      );
    });
  expectActive('Your bills');
  await act(async () => {
    panel('Your bills')
      .findAllByType(Button)
      .find(button => button.props.title === 'I’ve paid · submit details')!
      .props.onPress();
  });
  expectActive('Payment form');
  await act(async () => {
    panel('Payment form')
      .findAllByType(Select)
      .find(select => select.props.label === 'Payment method')!
      .props.onChange('BKASH');
    panel('Payment form')
      .findAllByType(Field)
      .find(field => field.props.label === 'Transaction ID')!
      .props.onChangeText('DRAFT1234');
  });
  await act(async () => pressTab(screen, 'Payment history'));
  expectActive('Payment history');
  await act(async () => {
    panel('Payment history').findByType(Select).props.onChange('REJECTED');
  });
  await act(async () => pressTab(screen, 'Your bills'));
  expectActive('Your bills');
  await act(async () => pressTab(screen, 'Payment form'));
  expectActive('Payment form');
  expect(
    panel('Payment form')
      .findAllByType(Field)
      .find(field => field.props.label === 'Transaction ID')!.props.value,
  ).toBe('DRAFT1234');
  expect(
    panel('Payment form')
      .findAllByType(Select)
      .find(select => select.props.label === 'Payment method')!.props.value,
  ).toBe('BKASH');
  await act(async () => pressTab(screen, 'Payment history'));
  expect(panel('Payment history').findByType(Select).props.value).toBe(
    'REJECTED',
  );
  expect(mockMutate).not.toHaveBeenCalled();
  await act(async () => screen.unmount());
});

it('lets guardians select only eligible bills from the form tab and cancel back to their bills', async () => {
  mockData.bills.push(
    { ...mockData.bills[0], id: 'paid-bill', status: 'PAID' },
    {
      ...mockData.bills[0],
      id: 'pending-bill',
      pendingSubmissionId: 'payment-1',
    },
  );
  let screen!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    screen = TestRenderer.create(<PaymentsScreen />);
  });
  await act(async () => pressTab(screen, 'Payment form'));
  const selector = screen.root
    .findAllByType(Select)
    .find(select => select.props.label === 'Select a bill')!;
  expect(
    selector.props.options.map((option: { value: string }) => option.value),
  ).toEqual(['bill-1']);
  await act(async () => selector.props.onChange('bill-1'));
  expect(
    screen.root
      .findAllByType(Button)
      .some(button => button.props.title === 'Submit for verification'),
  ).toBe(true);
  await act(async () => {
    screen.root
      .findAllByType(Button)
      .find(button => button.props.title === 'Cancel')!
      .props.onPress();
  });
  expect(
    screen.root.findByProps({ testID: 'payment-panel-Your bills' }).props
      .accessibilityElementsHidden,
  ).toBe(false);
  expect(
    screen.root
      .findAllByType(Button)
      .some(button => button.props.title === 'Submit for verification'),
  ).toBe(false);
  expect(mockMutate).not.toHaveBeenCalled();
  await act(async () => screen.unmount());
});

it('removes a stale form when the selected bill begins awaiting review', async () => {
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
    mockData.bills[0].pendingSubmissionId = 'payment-1';
    screen.update(<PaymentsScreen />);
  });
  expect(
    screen.root
      .findAllByType(Button)
      .some(button => button.props.title === 'Submit for verification'),
  ).toBe(false);
  expect(
    screen.root
      .findByProps({ testID: 'payment-panel-Payment form' })
      .findByType(Empty).props.title,
  ).toBe('No bills available for payment');
  expect(mockMutate).not.toHaveBeenCalled();
  await act(async () => screen.unmount());
});

it('opens the oldest pending payments first and reveals review actions only on demand', async () => {
  seedAdminPayments();
  let screen!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    screen = TestRenderer.create(<PaymentsScreen />);
  });
  const reviewButtons = screen.root
    .findAll(node => !!node.props.onPress && !!node.props.accessibilityRole, {
      deep: false,
    })
    .filter(node =>
      node.props.accessibilityLabel?.startsWith('Review payment ·'),
    );
  expect(reviewButtons.map(node => node.props.accessibilityLabel)).toEqual([
    'Review payment · Student One · OLD123456',
    'Review payment · Student One · NEW123456',
  ]);
  expect(screen.root.findAllByType(ReviewActions)).toHaveLength(0);
  await act(async () => {
    reviewButtons[0].props.onPress();
  });
  expect(screen.root.findByType(ReviewActions).props.path).toBe(
    '/admin/payments/pending-old/decision',
  );
  expect(screen.root.findByType(ReviewActions).props.confirmation).toContain(
    'OLD123456',
  );
  await act(async () => screen.unmount());
});

it('searches transaction IDs and separates reviewed history from the pending queue', async () => {
  seedAdminPayments();
  let screen!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    screen = TestRenderer.create(<PaymentsScreen />);
  });
  await act(async () => {
    screen.root
      .findAllByType(Field)
      .find(field => field.props.label === 'Search records')!
      .props.onChangeText('  new123  ');
  });
  expect(
    screen.root
      .findAll(node => !!node.props.onPress && !!node.props.accessibilityRole, {
        deep: false,
      })
      .filter(node =>
        node.props.accessibilityLabel?.startsWith('Review payment ·'),
      ),
  ).toHaveLength(1);
  await act(async () => {
    screen.root
      .findAllByType(Button)
      .find(button => button.props.title === 'Clear filters')!
      .props.onPress();
    pressTab(screen, 'History');
  });
  expect(
    screen.root
      .findAll(node => !!node.props.onPress && !!node.props.accessibilityRole, {
        deep: false,
      })
      .filter(node =>
        node.props.accessibilityLabel?.startsWith('View details ·'),
      ),
  ).toHaveLength(2);
  await act(async () => {
    screen.root
      .findAllByType(Select)
      .find(select => select.props.label === 'Billing month')!
      .props.onChange('2026-08');
  });
  const history = screen.root
    .findAll(node => !!node.props.onPress && !!node.props.accessibilityRole, {
      deep: false,
    })
    .filter(node =>
      node.props.accessibilityLabel?.startsWith('View details ·'),
    );
  expect(history).toHaveLength(1);
  expect(history[0].props.accessibilityLabel).toContain('FAIL123456');
  expect(screen.root.findAllByType(ReviewActions)).toHaveLength(0);
  await act(async () => screen.unmount());
});

it('creates bills from the bills tab and rejects invalid billing months', async () => {
  seedAdminPayments();
  let screen!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    screen = TestRenderer.create(<PaymentsScreen />);
  });
  await act(async () => {
    pressTab(screen, 'Monthly bills');
  });
  await act(async () => {
    screen.root
      .findAllByType(Button)
      .find(button => button.props.title === 'Create monthly bills')!
      .props.onPress();
  });
  const monthField = () =>
    screen.root
      .findAllByType(Field)
      .find(field => field.props.label === 'Billing month (YYYY-MM)')!;
  const generate = () =>
    screen.root
      .findAllByType(Button)
      .find(button => button.props.title === 'Generate bills')!;
  await act(async () => {
    monthField().props.onChangeText('2026-13');
  });
  await act(async () => {
    generate().props.onPress();
  });
  expect(mockMutate).not.toHaveBeenCalled();
  await act(async () => {
    monthField().props.onChangeText('2026-10');
  });
  await act(async () => {
    generate().props.onPress();
  });
  expect(mockMutate).toHaveBeenCalledWith('/admin/bills/generate', {
    month: '2026-10',
  });
  await act(async () => screen.unmount());
});

it('opens the submission linked to a bill and clears the billing month filter', async () => {
  seedAdminPayments();
  mockData.bills[0].pendingSubmissionId = 'pending-new';
  let screen!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    screen = TestRenderer.create(<PaymentsScreen />);
  });
  await act(async () => {
    pressTab(screen, 'Monthly bills');
  });
  await act(async () => {
    screen.root
      .findAllByType(Select)
      .find(select => select.props.label === 'Billing month')!
      .props.onChange('2026-09');
  });
  await act(async () => {
    screen.root
      .findAllByType(Button)
      .find(button => button.props.title === 'Review payment')!
      .props.onPress();
  });
  expect(screen.root.findByType(ReviewActions).props.path).toBe(
    '/admin/payments/pending-new/decision',
  );
  expect(
    screen.root
      .findAllByType(Select)
      .find(select => select.props.label === 'Billing month')!.props.value,
  ).toBe('ALL');
  expect(
    screen.root
      .findAllByType(Field)
      .find(field => field.props.label === 'Search records')!.props.value,
  ).toBe('NEW123456');
  await act(async () => screen.unmount());
});

it.each(['ADMIN', 'GUARDIAN'] as const)(
  'shows unpaid bills including pending submissions in the %s due list',
  async role => {
    mockUser = { role };
    mockData.bills.push({
      ...mockData.bills[0],
      id: 'paid',
      studentName: 'Paid Student',
      status: 'PAID',
    });
    mockData.bills.push({
      ...mockData.bills[0],
      id: 'pending',
      studentName: 'Pending Student',
      pendingSubmissionId: 'payment-1',
    });
    let screen!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      screen = TestRenderer.create(
        <PaymentsScreen dueOnly initialTab="bills" />,
      );
    });
    const rendered = screen.root
      .findAllByType(Text)
      .map(node => node.props.children)
      .filter(value => typeof value === 'string');
    expect(rendered).toContain('Student One');
    expect(rendered).toContain('Pending Student');
    expect(rendered).not.toContain('Paid Student');
    await act(async () => screen.unmount());
  },
);

it('highlights invalid payment fields, clears each corrected field, and submits only valid proof', async () => {
  let screen!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    screen = TestRenderer.create(
      <View>
        <PaymentsScreen />
        <ToastHost />
      </View>,
    );
  });
  const press = async (title: string) => {
    await act(async () =>
      screen.root
        .findAllByType(Button)
        .find(node => node.props.title === title)!
        .props.onPress(),
    );
  };
  const field = (label: string) =>
    screen.root.findAllByType(Field).find(node => node.props.label === label)!;
  await press('I’ve paid · submit details');
  expect(
    screen.root
      .findAllByType(Button)
      .find(node => node.props.title === 'Submit for verification')!.props
      .disabled,
  ).toBe(true);
  const method = () =>
    screen.root
      .findAllByType(Select)
      .find(node => node.props.label === 'Payment method')!;
  await act(async () => method().props.onChange('BKASH'));
  await press('Submit for verification');
  expect(mockMutate).not.toHaveBeenCalled();
  expect(field('Number you sent money from').props.error).toBeTruthy();
  expect(field('Transaction ID').props.error).toBeTruthy();
  expect(
    screen.root
      .findAllByType(View)
      .some(node => node.props.testID === 'feedback-toast'),
  ).toBe(true);
  await act(async () =>
    field('Number you sent money from').props.onChangeText('01700000002'),
  );
  expect(field('Number you sent money from').props.error).toBeUndefined();
  expect(field('Transaction ID').props.error).toBeTruthy();
  await act(async () =>
    field('Transaction ID').props.onChangeText('CORRECT123'),
  );
  expect(field('Transaction ID').props.error).toBeUndefined();
  await press('Submit for verification');
  expect(mockMutate).toHaveBeenCalledTimes(1);
  expect(mockMutate).toHaveBeenCalledWith(
    '/payments/submissions',
    expect.objectContaining({
      senderNumber: '01700000002',
      transactionId: 'CORRECT123',
    }),
  );
  await act(async () => screen.unmount());
});

it.each(['pending-new', 'approved', 'rejected'])(
  'opens notified admin payment %s in its correct tab with details expanded',
  async paymentId => {
    seedAdminPayments();
    let screen!: TestRenderer.ReactTestRenderer;
    await act(async () => {
      screen = TestRenderer.create(
        <PaymentsScreen initialTab="bills" paymentId={paymentId} />,
      );
    });
    const disclosures = screen.root.findAll(
      node =>
        typeof node.props.accessibilityState?.expanded === 'boolean' &&
        node.props.accessibilityLabel?.includes(' · '),
      { deep: false },
    );
    expect(disclosures).toHaveLength(1);
    expect(disclosures[0].props.accessibilityState.expanded).toBe(true);
    expect(disclosures[0].props.accessibilityLabel).toContain(
      mockData.payments.find(item => item.id === paymentId)!.transactionId,
    );
    expect(mockMutate).not.toHaveBeenCalled();
    await act(async () => screen.unmount());
  },
);

it('opens the notified guardian payment in history and uses its bill for correction', async () => {
  seedAdminPayments();
  mockUser = { role: 'GUARDIAN' };
  mockData.bills.unshift({
    ...mockData.bills[0],
    id: 'unrelated-bill',
    studentName: 'Another student',
  });
  let screen!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    screen = TestRenderer.create(<PaymentsScreen paymentId="rejected" />);
  });
  const panel = screen.root.findByProps({
    testID: 'payment-panel-Payment history',
  });
  expect(panel.props.accessibilityElementsHidden).toBe(false);
  expect(
    panel
      .findAllByType(Text)
      .some(
        node =>
          Array.isArray(node.props.children) &&
          node.props.children.includes('FAIL123456'),
      ),
  ).toBe(true);
  await act(async () =>
    screen.root
      .findAllByType(Button)
      .find(item => item.props.title === 'Pay now')!
      .props.onPress(),
  );
  const form = screen.root.findByProps({
    testID: 'payment-panel-Payment form',
  });
  expect(form.props.accessibilityElementsHidden).toBe(false);
  expect(
    form
      .findAllByType(Text)
      .some(
        node =>
          Array.isArray(node.props.children) &&
          node.props.children.includes('Student One'),
      ),
  ).toBe(true);
  expect(
    form
      .findAllByType(Text)
      .some(
        node =>
          Array.isArray(node.props.children) &&
          node.props.children.includes('Another student'),
      ),
  ).toBe(false);
  await act(async () => screen.unmount());
});

it('focuses the notified bill and can restore all bills', async () => {
  mockData.bills.push({
    ...mockData.bills[0],
    id: 'bill-2',
    studentName: 'Student Two',
  });
  let screen!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    screen = TestRenderer.create(<PaymentsScreen billId="bill-2" />);
  });
  const panel = () =>
    screen.root.findByProps({ testID: 'payment-panel-Your bills' });
  expect(
    panel()
      .findAllByType(Text)
      .some(node => node.props.children === 'Student Two'),
  ).toBe(true);
  expect(
    panel()
      .findAllByType(Text)
      .some(node => node.props.children === 'Student One'),
  ).toBe(false);
  await act(async () =>
    screen.root
      .findAllByType(Button)
      .find(item => item.props.title === 'Show all records')!
      .props.onPress(),
  );
  expect(
    panel()
      .findAllByType(Text)
      .some(node => node.props.children === 'Student One'),
  ).toBe(true);
  await act(async () => screen.unmount());
});

it('shows each shift when choosing bills for the same student', async () => {
  mockData.bills[0].shiftId = 'MORNING';
  mockData.bills.push({ ...mockData.bills[0], id: 'day-bill', shiftId: 'DAY' });
  let screen!: TestRenderer.ReactTestRenderer;
  await act(async () => {
    screen = TestRenderer.create(<PaymentsScreen />);
  });
  await act(async () => pressTab(screen, 'Payment form'));
  const picker = screen.root
    .findAllByType(Select)
    .find(item => item.props.label === 'Select a bill')!;
  expect(picker.props.options).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        value: 'bill-1',
        label: expect.stringContaining('Morning'),
      }),
      expect.objectContaining({
        value: 'day-bill',
        label: expect.stringContaining('Day'),
      }),
    ]),
  );
  await act(async () => screen.unmount());
});

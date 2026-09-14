import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import {
  AccessibilityInfo,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import {
  dismissToast,
  showToast,
  ToastHost,
  ToastMessage,
} from '../src/components/Toast';
import { Field, Notice, Select } from '../src/components/ui';
import {
  Choice,
  ErrorText,
  Input,
  useAction as useAdminAction,
} from '../src/screens/admin/AdminUi';
import { useAction } from '../src/hooks/useAction';
import { ValidationError } from '../src/utils/validation';
import { i18n } from '../src/i18n';
import { colors } from '../src/theme';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: require('react-native').View,
  useSafeAreaInsets: () => ({ top: 24, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-picker/picker', () => {
  const ReactModule = require('react');
  const NativeView = require('react-native').View;
  const MockPicker = (props: object) =>
    ReactModule.createElement(NativeView, props);
  MockPicker.Item = (props: object) =>
    ReactModule.createElement(NativeView, props);
  return { Picker: MockPicker };
});

let screen: TestRenderer.ReactTestRenderer;
const toasts = () =>
  screen.root
    .findAllByType(View)
    .filter(node => node.props.testID === 'feedback-toast');
const closeButton = () =>
  screen.root.findAll(
    node =>
      node.props?.accessibilityRole === 'button' &&
      typeof node.props.onPress === 'function',
    { deep: false },
  )[0];
const text = () =>
  screen.root
    .findAllByType(Text)
    .flatMap(node => node.props.children)
    .join(' ');
async function render(element: React.ReactElement) {
  await act(async () => {
    screen = TestRenderer.create(element);
  });
}
beforeEach(async () => {
  jest.useFakeTimers();
  dismissToast();
  jest
    .spyOn(AccessibilityInfo, 'announceForAccessibility')
    .mockImplementation(() => {});
  jest
    .spyOn(AccessibilityInfo, 'getRecommendedTimeoutMillis')
    .mockImplementation(async timeout => timeout);
  await i18n.changeLanguage('en');
});
afterEach(async () => {
  await act(async () => screen?.unmount());
  dismissToast();
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
  await i18n.changeLanguage('en');
});

it('shows one accessible dismissible toast for duplicate page and modal reports', async () => {
  await render(
    <>
      <ToastHost />
      <Notice text="Connection unavailable" kind="error" />
      <ErrorText message="Connection unavailable" />
    </>,
  );
  expect(toasts()).toHaveLength(1);
  expect(text()).toContain('Connection unavailable');
  expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledTimes(1);
  await act(async () => {
    showToast('Connection unavailable');
  });
  expect(toasts()).toHaveLength(1);
  expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledTimes(1);
  await act(async () => closeButton().props.onPress());
  expect(toasts()).toHaveLength(0);
  await act(async () => {
    showToast('Connection unavailable');
  });
  expect(toasts()).toHaveLength(1);
  expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledTimes(2);
});

it('auto-hides feedback after the accessibility-adjusted duration and replaces stale errors', async () => {
  jest
    .mocked(AccessibilityInfo.getRecommendedTimeoutMillis)
    .mockImplementation(async timeout => timeout + 1000);
  await render(<ToastHost />);
  await act(async () => {
    showToast('First failure');
  });
  expect(
    AccessibilityInfo.getRecommendedTimeoutMillis,
  ).toHaveBeenLastCalledWith(8000);
  await act(async () => jest.advanceTimersByTime(8000));
  expect(toasts()).toHaveLength(1);
  await act(async () => {
    showToast('Saved successfully.', 'success');
  });
  expect(text()).not.toContain('First failure');
  expect(
    AccessibilityInfo.getRecommendedTimeoutMillis,
  ).toHaveBeenLastCalledWith(4500);
  await act(async () => jest.advanceTimersByTime(1000));
  expect(toasts()).toHaveLength(1);
  await act(async () => jest.advanceTimersByTime(4500));
  expect(toasts()).toHaveLength(0);
});

it('keeps a toast above a native modal and restores the root host when the modal closes', async () => {
  await render(
    <>
      <ToastHost />
      <ToastHost modal />
      <ToastMessage message="Check the destination" kind="warning" />
    </>,
  );
  const hosts = screen.root.findAllByType(ToastHost);
  expect(hosts[0].findAllByType(Text)).toHaveLength(0);
  expect(
    hosts[1].findAllByType(Text).map(node => node.props.children),
  ).toContain('Check the destination');
  expect(toasts()).toHaveLength(1);
  await act(async () =>
    screen.update(
      <>
        <ToastHost />
        <ToastMessage message="Check the destination" kind="warning" />
      </>,
    ),
  );
  expect(toasts()).toHaveLength(1);
  expect(text()).toContain('Check the destination');
});

it('translates a visible known message after language changes and preserves unknown server details', async () => {
  await render(
    <>
      <ToastHost />
      <ToastMessage message="Could not save. Please try again." />
    </>,
  );
  expect(text()).toContain('Could not save. Please try again.');
  await act(async () => {
    await i18n.changeLanguage('bn');
  });
  expect(text()).toContain('সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।');
  expect(closeButton().props.accessibilityLabel).toBe('বার্তা বন্ধ করুন');
  await act(async () => {
    showToast('Request ABC-123 failed');
  });
  expect(text()).toContain('Request ABC-123 failed');
});

it('does not revive an unchanged message after dismissal or ordinary rerenders', async () => {
  await render(
    <>
      <ToastHost />
      <ToastMessage message="Try again" />
    </>,
  );
  await act(async () => closeButton().props.onPress());
  await act(async () =>
    screen.update(
      <>
        <ToastHost />
        <ToastMessage message="Try again" />
        <Text>Draft changed</Text>
      </>,
    ),
  );
  expect(toasts()).toHaveLength(0);
  await act(async () =>
    screen.update(
      <>
        <ToastHost />
        <ToastMessage message="" />
      </>,
    ),
  );
  await act(async () =>
    screen.update(
      <>
        <ToastHost />
        <ToastMessage message="Try again" />
      </>,
    ),
  );
  expect(toasts()).toHaveLength(1);
});

it.each([
  ['Field', Field, colors.danger],
  ['Input', Input, '#A3203E'],
] as const)(
  'marks invalid %s controls red and removes their error styling when corrected',
  async (_name, Control, danger) => {
    await render(
      <Control
        label="Name"
        value="A"
        onChangeText={jest.fn()}
        error="Please enter your name."
      />,
    );
    const input = () => screen.root.findByType(TextInput);
    expect(input().props['aria-invalid']).toBe(true);
    expect(StyleSheet.flatten(input().props.style).borderColor).toBe(danger);
    expect(input().props.accessibilityHint).toBe('Please enter your name.');
    expect(text()).toContain('Please enter your name.');
    await act(async () =>
      screen.update(
        <Control label="Name" value="Ayesha" onChangeText={jest.fn()} />,
      ),
    );
    expect(input().props['aria-invalid']).toBe(false);
    expect(StyleSheet.flatten(input().props.style).borderColor).not.toBe(
      danger,
    );
    expect(text()).not.toContain('Please enter your name.');
  },
);

it.each([
  ['Select', Select, colors.danger],
  ['Choice', Choice, '#A3203E'],
] as const)(
  'marks invalid %s pickers red and clears the accessible error after selection',
  async (_name, Control, danger) => {
    const common = {
      label: 'Destination',
      value: '',
      options: [{ value: 'mirpur', label: 'Mirpur' }],
      onChange: jest.fn(),
    };
    await render(
      <Control
        {...common}
        error="Select a destination with a configured fare."
      />,
    );
    const picker = () => screen.root.findByType(Picker);
    expect(picker().props['aria-invalid']).toBe(true);
    expect(picker().props.accessibilityHint).toBe(
      'Select a destination with a configured fare.',
    );
    expect(
      screen.root
        .findAllByType(View)
        .some(
          node => StyleSheet.flatten(node.props.style)?.borderColor === danger,
        ),
    ).toBe(true);
    await act(async () =>
      screen.update(<Control {...common} value="mirpur" />),
    );
    expect(picker().props['aria-invalid']).toBe(false);
    expect(picker().props.accessibilityHint).toBeUndefined();
    expect(
      screen.root
        .findAllByType(View)
        .some(
          node => StyleSheet.flatten(node.props.style)?.borderColor === danger,
        ),
    ).toBe(false);
  },
);

it.each([
  ['shared', useAction],
  ['admin', useAdminAction],
] as const)(
  'keeps independent %s field errors recoverable without submitting invalid values',
  async (_name, useFeedback) => {
    let action!: ReturnType<typeof useAction>;
    const save = jest.fn(async () => {});
    function Harness() {
      action = useFeedback();
      return (
        <>
          <ToastHost />
          <Notice text={action.error} kind="error" />
        </>
      );
    }
    await render(<Harness />);
    await act(async () =>
      action.run(async () => {
        throw new ValidationError({
          studentName: 'Please enter your name.',
          dropoffStopId: 'Select a destination with a configured fare.',
        });
      }),
    );
    expect(save).not.toHaveBeenCalled();
    expect(action.busy).toBe(false);
    expect(action.fieldErrors).toEqual({
      studentName: 'Please enter your name.',
      dropoffStopId: 'Select a destination with a configured fare.',
    });
    expect(toasts()).toHaveLength(1);
    await act(async () => action.clearFieldError('studentName'));
    expect(action.fieldErrors).toEqual({
      dropoffStopId: 'Select a destination with a configured fare.',
    });
    await act(async () => action.run(save));
    expect(save).toHaveBeenCalledTimes(1);
    expect(action.fieldErrors).toEqual({});
    expect(action.error).toBe('');
    await act(async () =>
      action.reportError(new Error('Connection unavailable')),
    );
    expect(action.fieldErrors).toEqual({});
    expect(text()).toContain('Connection unavailable');
    await act(async () => action.clearFeedback());
    expect(action.error).toBe('');
    expect(action.fieldErrors).toEqual({});
  },
);

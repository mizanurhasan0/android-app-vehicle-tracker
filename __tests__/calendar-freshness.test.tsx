import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { AppState } from 'react-native';
import { useDhakaDate } from '../src/hooks/useDhakaDate';

let screen: TestRenderer.ReactTestRenderer;
let date: string;
function Calendar() {
  date = useDhakaDate();
  return null;
}
beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate'] });
  jest.setSystemTime(new Date('2026-09-30T17:59:59Z'));
  Object.defineProperty(AppState, 'currentState', {
    configurable: true,
    writable: true,
    value: 'active',
  });
});
afterEach(async () => {
  await act(async () => screen?.unmount());
  jest.useRealTimers();
  jest.restoreAllMocks();
});
it('advances at Dhaka midnight without API or prop changes, including the month boundary', async () => {
  await act(async () => {
    screen = TestRenderer.create(<Calendar />);
  });
  expect(date).toBe('2026-09-30');
  await act(async () => {
    jest.advanceTimersByTime(1000);
  });
  expect(date).toBe('2026-10-01');
  await act(async () => {
    jest.advanceTimersByTime(86_400_000);
  });
  expect(date).toBe('2026-10-02');
  await act(async () => screen.unmount());
  expect(jest.getTimerCount()).toBe(0);
});

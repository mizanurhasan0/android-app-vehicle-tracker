import { useRef, useState } from 'react';
import { dismissToast, showToast } from '../components/Toast';
import { FieldErrors, getFieldErrors } from '../utils/validation';
export function useAction(defaultMessage = 'Saved successfully.') {
  const lock = useRef(false);
  const reportedToast = useRef<number | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  function clearFieldError(key: string) {
    setFieldErrors(current => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  }
  function clearFeedback() {
    if (reportedToast.current !== undefined)
      dismissToast(reportedToast.current);
    reportedToast.current = undefined;
    setError('');
    setSuccess('');
    setFieldErrors({});
  }
  function reportError(problem: unknown) {
    const message =
      problem instanceof Error ? problem.message : 'Please try again.';
    setFieldErrors(getFieldErrors(problem));
    setError(message);
    reportedToast.current = showToast(message, 'error');
  }
  async function run(work: () => Promise<unknown>, message = defaultMessage) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    clearFeedback();
    try {
      await work();
      setSuccess(message);
      if (message) showToast(message, 'success');
    } catch (problem) {
      reportError(problem);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return {
    busy,
    error,
    success,
    run,
    setError,
    fieldErrors,
    setFieldErrors,
    clearFieldError,
    clearFeedback,
    reportError,
  };
}

import { useRef, useState } from 'react';
export function useAction() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  async function run(
    work: () => Promise<unknown>,
    message = 'Saved successfully.',
  ) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await work();
      setSuccess(message);
    } catch (problem) {
      setError(
        problem instanceof Error ? problem.message : 'Please try again.',
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return { busy, error, success, run };
}

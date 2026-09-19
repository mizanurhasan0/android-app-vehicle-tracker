import { useCallback, useMemo, useRef } from 'react';

/** Invalidate old work during auth render, before passive unmount cleanup runs. */
export function useCredentialScope(baseUrl: string, token?: string) {
  const identity = useMemo(() => ({ baseUrl, token }), [baseUrl, token]);
  const current = useRef(identity);
  current.current = identity;
  return useCallback(() => current.current === identity, [identity]);
}

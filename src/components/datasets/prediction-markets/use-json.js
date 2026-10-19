'use client';

import { useCallback, useEffect, useState } from 'react';

/**
 * Fetch JSON from one of the page's own /api routes. `url` null means idle.
 * Returns { data, error, loading, retry }; retry refetches this URL only, so
 * each card's Retry button touches nothing else on the page. A previous
 * response stays visible while the next one loads (no flash between filters).
 */
export function useJson(url, { headers } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(url) });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!url) {
      setState({ data: null, error: null, loading: false });
      return undefined;
    }
    const ctl = new AbortController();
    setState((s) => ({ data: s.data, error: null, loading: true }));
    (async () => {
      try {
        const h = typeof headers === 'function' ? await headers() : headers;
        const res = await fetch(url, {
          signal: ctl.signal,
          credentials: 'same-origin',
          headers: h || undefined,
        });
        const body = await res.json().catch(() => null);
        if (ctl.signal.aborted) return;
        if (!res.ok) {
          setState({ data: null, error: { status: res.status, body }, loading: false });
          return;
        }
        setState({ data: body, error: null, loading: false });
      } catch {
        if (!ctl.signal.aborted) setState({ data: null, error: { status: 0 }, loading: false });
      }
    })();
    return () => ctl.abort();
    // headers is a stable module-level function where used
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, nonce]);

  const retry = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, retry };
}

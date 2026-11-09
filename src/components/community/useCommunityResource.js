'use client';

/**
 * One section's data on the Community page: { data, error, loading, reload }.
 * Each card loads and fails on its own, so one broken section never blanks
 * the page. Refetches when the window regains focus (no realtime this pass).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export function useCommunityResource(url, { enabled = true, refetchOnFocus = true } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: Boolean(enabled && url) });
  const seq = useRef(0);

  const load = useCallback(
    async (quiet = false) => {
      if (!enabled || !url) return;
      const id = ++seq.current;
      if (!quiet) setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await fetch(url, { credentials: 'include' });
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || "Couldn't load this section.");
        if (id === seq.current) setState({ data: body, error: null, loading: false });
      } catch (e) {
        if (id === seq.current && !quiet)
          setState({ data: null, error: e.message, loading: false });
      }
    },
    [url, enabled],
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!refetchOnFocus || !enabled) return undefined;
    const onFocus = () => {
      if (document.visibilityState === 'visible') load(true);
    };
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, [load, refetchOnFocus, enabled]);

  return {
    ...state,
    reload: () => load(),
    setData: (fn) => setState((s) => ({ ...s, data: fn(s.data) })),
  };
}

/** JSON request helper for the optimistic writes; throws with the API's message. */
export async function sendJson(url, { method = 'POST', body } = {}) {
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something did not save. Try again.');
  return data;
}

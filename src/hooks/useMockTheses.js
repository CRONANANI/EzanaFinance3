'use client';

/**
 * useMockTheses (Mock Trading, Nov 14 2026): the signed-in user's investment
 * theses from /api/mock-theses, with create, edit, activate and delete.
 * Activation is optimistic and rolled back on error (a 409 refetches, since
 * another tab changed the list). Every mutation resolves { ok, error? } so
 * the page can toast it; validation is repeated on the server.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

async function send(url, method, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    credentials: 'include',
    cache: 'no-store',
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

export function useMockTheses({ enabled = true } = {}) {
  const [state, setState] = useState({ status: 'loading', theses: [], activeId: null });
  const stateRef = useRef(state);
  stateRef.current = state;

  const apply = useCallback((json) => {
    setState({
      status: 'ready',
      theses: Array.isArray(json?.theses) ? json.theses : [],
      activeId: json?.activeId || null,
    });
  }, []);

  const reload = useCallback(async () => {
    if (!enabled) {
      setState({ status: 'ready', theses: [], activeId: null });
      return;
    }
    setState((s) => ({ ...s, status: s.theses.length ? 'ready' : 'loading' }));
    try {
      const r = await send('/api/mock-theses', 'GET');
      if (!r.ok) throw new Error(r.json?.error || 'Could not load your theses.');
      apply(r.json);
    } catch (e) {
      setState((s) => ({ ...s, status: 'error', error: e.message }));
    }
  }, [enabled, apply]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const mutate = useCallback(
    async (url, method, body) => {
      try {
        const r = await send(url, method, body);
        if (!r.ok) {
          if (r.status === 409 || r.status === 404) void reload();
          return { ok: false, error: r.json?.error || 'That did not work. Try again.' };
        }
        apply(r.json);
        return { ok: true, thesis: r.json?.thesis || null };
      } catch {
        return { ok: false, error: 'Network error. Try again.' };
      }
    },
    [apply, reload],
  );

  const create = useCallback((values) => mutate('/api/mock-theses', 'POST', values), [mutate]);
  const update = useCallback(
    (id, values) => mutate(`/api/mock-theses/${encodeURIComponent(id)}`, 'PATCH', values),
    [mutate],
  );
  const remove = useCallback(
    (id) => mutate(`/api/mock-theses/${encodeURIComponent(id)}`, 'DELETE'),
    [mutate],
  );

  /* Optimistic: the tab switches at once and switches back if the server says no. */
  const activate = useCallback(
    async (id) => {
      const prev = stateRef.current.activeId;
      if (prev === id) return { ok: true };
      setState((s) => ({
        ...s,
        activeId: id,
        theses: s.theses.map((t) => ({ ...t, is_active: t.id === id })),
      }));
      const r = await mutate(`/api/mock-theses/${encodeURIComponent(id)}`, 'PATCH', {
        activate: true,
      });
      if (!r.ok)
        setState((s) => ({
          ...s,
          activeId: prev,
          theses: s.theses.map((t) => ({ ...t, is_active: t.id === prev })),
        }));
      return r;
    },
    [mutate],
  );

  const active = state.theses.find((t) => t.id === state.activeId) || null;
  return { ...state, active, reload, create, update, remove, activate };
}

export default useMockTheses;

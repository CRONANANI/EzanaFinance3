'use client';

/**
 * "Why I'm watching" notes for the active list (Market Monitor 2.0).
 * One request per list; a note is keyed by asset (type:ticker), not by list.
 * `authedFetch` is the session fetch from useWatchlists.
 *
 *   byKey                { 'stock:AAPL': note }
 *   noteFor(item)        the note for an item, or null
 *   save(note)           create or replace; resolves { ok, note?, error?, field? }
 *   remove({type,ticker}) delete; resolves { ok, error? }
 *
 * A failure here never blocks the page: status becomes 'error' and byKey stays empty.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export const noteKey = (i) => `${i.type}:${String(i.ticker).toUpperCase()}`;

export function useWatchlistNotes(authedFetch, listId) {
  const [state, setState] = useState({ status: 'idle', byKey: {} });
  const fetcher = useRef(authedFetch);
  fetcher.current = authedFetch;

  useEffect(() => {
    if (!listId) {
      setState({ status: 'idle', byKey: {} });
      return undefined;
    }
    let cancelled = false;
    setState((s) => ({ ...s, status: 'loading' }));
    fetcher
      .current(`/api/watchlists/notes?listId=${encodeURIComponent(listId)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        if (cancelled) return;
        setState({
          status: 'ready',
          byKey: Object.fromEntries((d.notes || []).map((n) => [noteKey(n), n])),
        });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error', byKey: {} });
      });
    return () => {
      cancelled = true;
    };
  }, [listId]);

  const save = useCallback(async (note) => {
    try {
      const res = await fetcher.current('/api/watchlists/notes', {
        method: 'PUT',
        body: JSON.stringify(note),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok)
        return { ok: false, error: body?.error || 'Could not save the note.', field: body?.field };
      setState((s) => ({ ...s, byKey: { ...s.byKey, [noteKey(body.note)]: body.note } }));
      return { ok: true, note: body.note };
    } catch (e) {
      return { ok: false, error: e?.message || 'Could not save the note.' };
    }
  }, []);

  const remove = useCallback(async ({ type, ticker }) => {
    try {
      const res = await fetcher.current(
        `/api/watchlists/notes?type=${encodeURIComponent(type)}&ticker=${encodeURIComponent(ticker)}`,
        { method: 'DELETE' },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { ok: false, error: body?.error || 'Could not delete the note.' };
      }
      setState((s) => {
        const next = { ...s.byKey };
        delete next[noteKey({ type, ticker })];
        return { ...s, byKey: next };
      });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e?.message || 'Could not delete the note.' };
    }
  }, []);

  const noteFor = useCallback(
    (item) => (item ? state.byKey[noteKey(item)] || null : null),
    [state],
  );

  return { ...state, noteFor, save, remove };
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase-browser';

/**
 * Fetches and mutates the authenticated user's watchlists from the server.
 *
 * Returns:
 *   watchlists: [{ id, label, stocks: [...] }, ...]
 *   loading: true while the initial fetch is in flight
 *   error: most recent error message, or null
 *   addItem(listId, { type, ticker, name, sector, metadata }): adds an item to a list
 *   removeItem(listId, { type, ticker }): removes an item from a list
 *   createList(label): creates a new list, returns the new list's id
 *   renameList(listId, label): renames a list
 *   deleteList(listId): deletes a list and all its items
 *   refresh(): force a full re-fetch
 *   toggleStar(listId, { type, ticker }, starred): star or unstar an item
 *   moveItem(fromListId, toListId, { type, ticker }): move an item, keeping its star and provenance
 *   authedFetch(url, options): fetch with the session token (smart watchlist API)
 */
/* One request for every mounted instance. The dashboard layout (big-move
   alerts) and the Watchlist page both use this hook, which used to mean two
   identical GET /api/watchlists on entry. A load within the window reuses the
   promise already in flight or just settled. Mutations do not use it. */
const SHARED_WINDOW_MS = 4000;
let sharedLoad = { userId: null, at: 0, promise: null };

function loadWatchlistsOnce(userId, load, { force = false } = {}) {
  const fresh =
    sharedLoad.promise &&
    sharedLoad.userId === userId &&
    Date.now() - sharedLoad.at < SHARED_WINDOW_MS;
  if (fresh && !force) return sharedLoad.promise;
  const promise = load();
  sharedLoad = { userId, at: Date.now(), promise };
  promise.catch(() => {
    if (sharedLoad.promise === promise) sharedLoad = { userId: null, at: 0, promise: null };
  });
  return promise;
}

export function useWatchlists() {
  const { user, isAuthenticated } = useAuth();
  const [watchlists, setWatchlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const authedFetch = useCallback(async (url, options = {}) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) throw new Error('Not authenticated');
    return fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        Authorization: `Bearer ${token}`,
      },
    });
  }, []);

  /**
   * Read a JSON error body and bubble the server's message up verbatim.
   * Falls back to `HTTP <status>` if the body isn't JSON or has no error text
   * so we never strip detail silently.
   */
  const readServerError = async (res) => {
    try {
      const body = await res.clone().json();
      const msg = body?.error || body?.detail || body?.message;
      if (msg) {
        const err = new Error(msg);
        if (body?.code) err.code = body.code;
        err.status = res.status;
        return err;
      }
    } catch {
      /* fall through to text */
    }
    try {
      const text = await res.text();
      if (text) {
        const err = new Error(text.slice(0, 300));
        err.status = res.status;
        return err;
      }
    } catch {
      /* fall through */
    }
    const err = new Error(`HTTP ${res.status}`);
    err.status = res.status;
    return err;
  };

  const refresh = useCallback(
    async ({ force = false } = {}) => {
      if (!isAuthenticated || !user) {
        setWatchlists([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await loadWatchlistsOnce(
          user.id,
          async () => {
            const res = await authedFetch('/api/watchlists');
            if (!res.ok) throw await readServerError(res);
            return res.json();
          },
          { force },
        );
        setWatchlists(Array.isArray(data?.watchlists) ? data.watchlists : []);
      } catch (e) {
        console.error('[useWatchlists] refresh error:', e?.message);
        setError(e?.message || 'Failed to load watchlists');
        setWatchlists([]);
      } finally {
        setLoading(false);
      }
    },
    [authedFetch, isAuthenticated, user],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = useCallback(
    async (listId, item) => {
      if (!listId || !item?.ticker) return { ok: false, reason: 'invalid' };

      // Optimistic update: insert into local state immediately
      const optimisticItem = {
        id: `optimistic-${Date.now()}`,
        type: item.type || 'stock',
        ticker: item.ticker,
        name: item.name || item.ticker,
        sector: item.sector || '',
        metadata: item.metadata || {},
        createdAt: new Date().toISOString(),
        starredAt: item.restore?.starred ? new Date().toISOString() : null,
        addedBy: item.restore?.addedBy || 'user',
        addedReason: item.restore?.addedReason || null,
        price: 0,
        change: 0,
        changePct: 0,
        marketCap: null,
        volume: '–',
      };
      setWatchlists((prev) =>
        prev.map((list) => {
          if (list.id !== listId) return list;
          // Skip if already present (idempotent)
          if (
            list.stocks.some(
              (s) => s.ticker === optimisticItem.ticker && s.type === optimisticItem.type,
            )
          ) {
            return list;
          }
          return { ...list, stocks: [...list.stocks, optimisticItem] };
        }),
      );

      try {
        const res = await authedFetch(`/api/watchlists/${listId}/items`, {
          method: 'POST',
          body: JSON.stringify({
            type: item.type || 'stock',
            ticker: item.ticker,
            name: item.name,
            sector: item.sector,
            metadata: item.metadata,
            ...(item.restore ? { restore: item.restore } : {}),
          }),
        });
        if (!res.ok) throw await readServerError(res);
        const data = await res.json();

        // Replace the optimistic entry with the real one from the server
        setWatchlists((prev) =>
          prev.map((list) => {
            if (list.id !== listId) return list;
            return {
              ...list,
              stocks: list.stocks.map((s) => (s.id === optimisticItem.id ? data.item : s)),
            };
          }),
        );
        return { ok: true };
      } catch (e) {
        console.error('[useWatchlists] addItem error:', e?.message);
        // Roll back the optimistic update
        setWatchlists((prev) =>
          prev.map((list) => {
            if (list.id !== listId) return list;
            return {
              ...list,
              stocks: list.stocks.filter((s) => s.id !== optimisticItem.id),
            };
          }),
        );
        setError(e?.message || 'Failed to add item');
        return { ok: false, reason: e?.message };
      }
    },
    [authedFetch],
  );

  const removeItem = useCallback(
    async (listId, { type = 'stock', ticker }) => {
      if (!listId || !ticker) return { ok: false, reason: 'invalid' };

      // Optimistic remove
      const prevState = watchlists;
      setWatchlists((prev) =>
        prev.map((list) => {
          if (list.id !== listId) return list;
          return {
            ...list,
            stocks: list.stocks.filter((s) => !(s.ticker === ticker && s.type === type)),
          };
        }),
      );

      try {
        const url = `/api/watchlists/${listId}/items?ticker=${encodeURIComponent(
          ticker,
        )}&type=${encodeURIComponent(type)}`;
        const res = await authedFetch(url, { method: 'DELETE' });
        if (!res.ok) throw await readServerError(res);
        const data = await res.json().catch(() => ({}));
        /* `removed` is the row as it was (star, smart provenance), for Undo. */
        return { ok: true, removed: data?.removed || null };
      } catch (e) {
        console.error('[useWatchlists] removeItem error:', e?.message);
        // Roll back
        setWatchlists(prevState);
        setError(e?.message || 'Failed to remove item');
        return { ok: false, reason: e?.message };
      }
    },
    [authedFetch, watchlists],
  );

  const createList = useCallback(
    async (label) => {
      if (!label?.trim()) return { ok: false, reason: 'invalid' };
      try {
        const res = await authedFetch('/api/watchlists', {
          method: 'POST',
          body: JSON.stringify({ label: label.trim() }),
        });
        if (!res.ok) throw await readServerError(res);
        const data = await res.json();
        const newList = data.watchlist;
        if (!newList) throw new Error('No list returned');
        setWatchlists((prev) => [...prev, { ...newList, stocks: [] }]);
        return { ok: true, listId: newList.id };
      } catch (e) {
        console.error('[useWatchlists] createList error:', e?.message);
        setError(e?.message || 'Failed to create list');
        return { ok: false, reason: e?.message, status: e?.status };
      }
    },
    [authedFetch],
  );

  const renameList = useCallback(
    async (listId, label) => {
      if (!listId || !label?.trim()) return { ok: false, reason: 'invalid' };
      const prevState = watchlists;
      setWatchlists((prev) =>
        prev.map((l) => (l.id === listId ? { ...l, label: label.trim() } : l)),
      );
      try {
        const res = await authedFetch(`/api/watchlists/${listId}`, {
          method: 'PATCH',
          body: JSON.stringify({ label: label.trim() }),
        });
        if (!res.ok) throw await readServerError(res);
        return { ok: true };
      } catch (e) {
        console.error('[useWatchlists] renameList error:', e?.message);
        setWatchlists(prevState);
        setError(e?.message || 'Failed to rename');
        return { ok: false, reason: e?.message };
      }
    },
    [authedFetch, watchlists],
  );

  const deleteList = useCallback(
    async (listId) => {
      if (!listId) return { ok: false, reason: 'invalid' };
      const prevState = watchlists;
      setWatchlists((prev) => prev.filter((l) => l.id !== listId));
      try {
        const res = await authedFetch(`/api/watchlists/${listId}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw await readServerError(res);
        return { ok: true };
      } catch (e) {
        console.error('[useWatchlists] deleteList error:', e?.message);
        setWatchlists(prevState);
        setError(e?.message || 'Failed to delete list');
        return { ok: false, reason: e?.message };
      }
    },
    [authedFetch, watchlists],
  );

  /** Star or unstar an item (Nov 2026). Optimistic; rolls back on failure. */
  const toggleStar = useCallback(
    async (listId, { type, ticker }, starred) => {
      if (!listId || !ticker || !type) return { ok: false, reason: 'invalid' };
      const prevState = watchlists;
      const stamp = starred ? new Date().toISOString() : null;
      setWatchlists((prev) =>
        prev.map((l) =>
          l.id !== listId
            ? l
            : {
                ...l,
                stocks: (l.stocks || []).map((s) =>
                  s.ticker === ticker && s.type === type ? { ...s, starredAt: stamp } : s,
                ),
              },
        ),
      );
      try {
        const res = await authedFetch(`/api/watchlists/${listId}/items`, {
          method: 'PATCH',
          body: JSON.stringify({ type, ticker, starred }),
        });
        if (!res.ok) throw await readServerError(res);
        return { ok: true };
      } catch (e) {
        console.error('[useWatchlists] toggleStar error:', e?.message);
        setWatchlists(prevState);
        return { ok: false, reason: e?.message };
      }
    },
    [authedFetch, watchlists],
  );

  /**
   * Move an item to another list in one server call. The row itself moves, so
   * its star, its smart provenance and its added date go with it. Optimistic;
   * rolls back on failure (409 when the target already has the item).
   */
  const moveItem = useCallback(
    async (fromListId, toListId, { type, ticker }) => {
      if (!fromListId || !toListId || !type || !ticker || fromListId === toListId)
        return { ok: false, reason: 'invalid' };
      const prevState = watchlists;
      const same = (s) => s.ticker === ticker && s.type === type;
      const moving = prevState.find((l) => l.id === fromListId)?.stocks?.find(same);
      if (!moving) return { ok: false, reason: 'Item not found.' };
      if (prevState.find((l) => l.id === toListId)?.stocks?.some(same))
        return { ok: false, reason: 'That list already has this item.', status: 409 };
      setWatchlists((prev) =>
        prev.map((l) => {
          if (l.id === fromListId)
            return { ...l, stocks: (l.stocks || []).filter((s) => !same(s)) };
          if (l.id === toListId) return { ...l, stocks: [...(l.stocks || []), moving] };
          return l;
        }),
      );
      try {
        const res = await authedFetch(`/api/watchlists/${fromListId}/items/move`, {
          method: 'POST',
          body: JSON.stringify({ type, ticker, toListId }),
        });
        if (!res.ok) throw await readServerError(res);
        return { ok: true };
      } catch (e) {
        console.error('[useWatchlists] moveItem error:', e?.message);
        setWatchlists(prevState);
        return { ok: false, reason: e?.message, status: e?.status };
      }
    },
    [authedFetch, watchlists],
  );

  return {
    watchlists,
    loading,
    error,
    addItem,
    removeItem,
    moveItem,
    createList,
    renameList,
    deleteList,
    refresh,
    toggleStar,
    /* Authenticated fetch for sibling endpoints (smart watchlists). */
    authedFetch,
  };
}

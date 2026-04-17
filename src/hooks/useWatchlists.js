'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

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
 */
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

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setWatchlists([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await authedFetch('/api/watchlists');
      if (!res.ok) throw await readServerError(res);
      const data = await res.json();
      setWatchlists(Array.isArray(data?.watchlists) ? data.watchlists : []);
    } catch (e) {
      console.error('[useWatchlists] refresh error:', e?.message);
      setError(e?.message || 'Failed to load watchlists');
      setWatchlists([]);
    } finally {
      setLoading(false);
    }
  }, [authedFetch, isAuthenticated, user]);

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
        price: 0,
        change: 0,
        changePct: 0,
        marketCap: '—',
        volume: '—',
      };
      setWatchlists((prev) =>
        prev.map((list) => {
          if (list.id !== listId) return list;
          // Skip if already present (idempotent)
          if (list.stocks.some((s) => s.ticker === optimisticItem.ticker && s.type === optimisticItem.type)) {
            return list;
          }
          return { ...list, stocks: [...list.stocks, optimisticItem] };
        })
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
              stocks: list.stocks.map((s) =>
                s.id === optimisticItem.id ? data.item : s
              ),
            };
          })
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
          })
        );
        setError(e?.message || 'Failed to add item');
        return { ok: false, reason: e?.message };
      }
    },
    [authedFetch]
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
            stocks: list.stocks.filter(
              (s) => !(s.ticker === ticker && s.type === type)
            ),
          };
        })
      );

      try {
        const url = `/api/watchlists/${listId}/items?ticker=${encodeURIComponent(
          ticker
        )}&type=${encodeURIComponent(type)}`;
        const res = await authedFetch(url, { method: 'DELETE' });
        if (!res.ok) throw await readServerError(res);
        return { ok: true };
      } catch (e) {
        console.error('[useWatchlists] removeItem error:', e?.message);
        // Roll back
        setWatchlists(prevState);
        setError(e?.message || 'Failed to remove item');
        return { ok: false, reason: e?.message };
      }
    },
    [authedFetch, watchlists]
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
    [authedFetch]
  );

  const renameList = useCallback(
    async (listId, label) => {
      if (!listId || !label?.trim()) return { ok: false, reason: 'invalid' };
      const prevState = watchlists;
      setWatchlists((prev) =>
        prev.map((l) => (l.id === listId ? { ...l, label: label.trim() } : l))
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
    [authedFetch, watchlists]
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
    [authedFetch, watchlists]
  );

  return {
    watchlists,
    loading,
    error,
    addItem,
    removeItem,
    createList,
    renameList,
    deleteList,
    refresh,
  };
}

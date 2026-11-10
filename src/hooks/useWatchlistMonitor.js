'use client';

/**
 * Data hooks for the Watchlist Market Monitor (Nov 2026). All read existing
 * routes; nothing here is sample data.
 *   useQuotes(symbols)          /api/market/batch-quotes, every 60s while visible
 *   useSparklines(symbols)      /api/market-data/stock-candles (1M daily closes)
 *   usePoliticians(ids)         /api/watchlist/politicians (members + latest trades)
 *   useInstitutions(ticker)     /api/watchlist/institutions (latest 13F holders)
 *   useWatchlistAlerts()        user_notifications of type 'watchlist'
 *   useSmartWatchlists(fetcher) /api/watchlists/smart (rules + latest auto-adds)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { useAuth } from '@/components/AuthProvider';

const keyOf = (list) => [...new Set((list || []).filter(Boolean))].sort().join(',');

export function useQuotes(symbols) {
  const key = keyOf(symbols);
  const [state, setState] = useState({ quotes: {}, loading: false, updatedAt: null });
  useEffect(() => {
    if (!key) {
      setState({ quotes: {}, loading: false, updatedAt: null });
      return undefined;
    }
    let cancelled = false;
    const load = () => {
      setState((s) => ({ ...s, loading: Object.keys(s.quotes).length === 0 }));
      fetch(`/api/market/batch-quotes?symbols=${encodeURIComponent(key)}`, {
        credentials: 'include',
      })
        .then((r) => (r.ok ? r.json() : { quotes: {} }))
        .then((d) => {
          if (cancelled) return;
          const quotes = {};
          for (const [sym, q] of Object.entries(d.quotes || {})) {
            const price = Number(q?.price);
            const pct = Number(q?.changePercent ?? q?.changesPercentage);
            quotes[sym.toUpperCase()] = {
              price: Number.isFinite(price) && price > 0 ? price : null,
              changePct: Number.isFinite(pct) ? pct : null,
            };
          }
          setState({ quotes, loading: false, updatedAt: Date.now() });
        })
        .catch(() => {
          if (!cancelled) setState((s) => ({ ...s, loading: false }));
        });
    };
    load();
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [key]);
  return state;
}

/* Sparklines change slowly: one module-level cache per page session. */
const SPARK_CACHE = new Map();

export function useSparklines(symbols) {
  const key = keyOf(symbols);
  const [map, setMap] = useState({});
  useEffect(() => {
    if (!key) return undefined;
    let cancelled = false;
    const list = key.split(',');
    const fromCache = {};
    for (const s of list) if (SPARK_CACHE.has(s)) fromCache[s] = SPARK_CACHE.get(s);
    setMap(fromCache);
    const todo = list.filter((s) => !SPARK_CACHE.has(s));
    let i = 0;
    const worker = async () => {
      while (i < todo.length && !cancelled) {
        const sym = todo[i++];
        try {
          // eslint-disable-next-line no-await-in-loop
          const r = await fetch(
            `/api/market-data/stock-candles?symbol=${encodeURIComponent(sym)}&range=1M`,
            {
              credentials: 'include',
            },
          );
          // eslint-disable-next-line no-await-in-loop
          const d = r.ok ? await r.json() : { candles: [] };
          const closes = (d.candles || [])
            .map((c) => Number(c.price ?? c.close))
            .filter((v) => Number.isFinite(v));
          SPARK_CACHE.set(sym, closes.slice(-24));
        } catch {
          SPARK_CACHE.set(sym, []);
        }
        if (!cancelled) setMap((m) => ({ ...m, [sym]: SPARK_CACHE.get(sym) }));
      }
    };
    Promise.all([worker(), worker(), worker(), worker()]);
    return () => {
      cancelled = true;
    };
  }, [key]);
  return map;
}

export function usePoliticians(ids) {
  const key = keyOf(ids);
  const [state, setState] = useState({ byId: {}, loading: false });
  useEffect(() => {
    if (!key) {
      setState({ byId: {}, loading: false });
      return undefined;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    fetch(`/api/watchlist/politicians?ids=${encodeURIComponent(key)}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { politicians: [] }))
      .then((d) => {
        if (cancelled) return;
        setState({
          byId: Object.fromEntries((d.politicians || []).map((p) => [p.id, p])),
          loading: false,
        });
      })
      .catch(() => {
        if (!cancelled) setState({ byId: {}, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, [key]);
  return state;
}

export function useInstitutions(ticker) {
  const [state, setState] = useState({ status: 'idle', holders: [], total: 0, period: null });
  useEffect(() => {
    if (!ticker) {
      setState({ status: 'idle', holders: [], total: 0, period: null });
      return undefined;
    }
    let cancelled = false;
    setState((s) => ({ ...s, status: 'loading' }));
    fetch(`/api/watchlist/institutions?ticker=${encodeURIComponent(ticker)}`, {
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        if (!d) setState({ status: 'error', holders: [], total: 0, period: null });
        else
          setState({
            status: 'ready',
            holders: d.holders || [],
            total: d.total || 0,
            period: d.period,
          });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error', holders: [], total: 0, period: null });
      });
    return () => {
      cancelled = true;
    };
  }, [ticker]);
  return state;
}

export function useWatchlistAlerts(limit = 3) {
  const { user } = useAuth();
  const [state, setState] = useState({ status: 'loading', items: [] });
  const load = useCallback(async () => {
    if (!user?.id) {
      setState({ status: 'ready', items: [] });
      return;
    }
    const { data, error } = await supabase
      .from('user_notifications')
      .select('id, title, content, created_at, read')
      .eq('user_id', user.id)
      .eq('type', 'watchlist')
      .order('created_at', { ascending: false })
      .limit(limit);
    setState({ status: error ? 'error' : 'ready', items: data || [] });
  }, [user?.id, limit]);
  useEffect(() => {
    load();
  }, [load]);
  return { ...state, reload: load };
}

/**
 * Smart watchlists: rules, recent auto-adds, and the actions. `authedFetch`
 * is the session fetch from useWatchlists (writes need the bearer token).
 */
export function useSmartWatchlists(authedFetch) {
  const [state, setState] = useState({ status: 'loading', rules: [], events: [], error: null });
  const fetcherRef = useRef(authedFetch);
  fetcherRef.current = authedFetch;

  const call = useCallback(async (url, options = {}) => {
    const f = fetcherRef.current || fetch;
    const res = await f(url, { credentials: 'include', ...options });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
    return body;
  }, []);

  const reload = useCallback(async () => {
    try {
      const d = await call('/api/watchlists/smart');
      setState({ status: 'ready', rules: d.rules || [], events: d.events || [], error: null });
    } catch (e) {
      setState((s) => ({ ...s, status: 'error', error: e.message }));
    }
  }, [call]);

  useEffect(() => {
    reload();
  }, [reload]);

  const actions = useMemo(
    () => ({
      create: (label, rule) =>
        call('/api/watchlists/smart', { method: 'POST', body: JSON.stringify({ label, rule }) }),
      update: (id, patch) =>
        call(`/api/watchlists/smart/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
      remove: (id) => call(`/api/watchlists/smart/${id}`, { method: 'DELETE' }),
      runNow: (id) => call(`/api/watchlists/smart/${id}/run`, { method: 'POST' }),
      preview: (rule) =>
        call('/api/watchlists/smart/preview', { method: 'POST', body: JSON.stringify({ rule }) }),
    }),
    [call],
  );

  return { ...state, reload, ...actions };
}

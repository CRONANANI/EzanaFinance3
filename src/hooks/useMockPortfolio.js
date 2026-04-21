'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

/**
 * useMockPortfolio — Supabase-backed mock ("paper") portfolio.
 *
 * Design note / bug fix (stale-data flash):
 *   Previous versions of this hook rehydrated `portfolio` state from
 *   `localStorage` synchronously on mount, so every page that used the
 *   hook briefly rendered the user's OLD portfolio (pre-reset /
 *   pre-trade positions) before the authoritative server response
 *   arrived. On Home / Dashboard that manifested as "wrong current
 *   value, stale holdings" for a beat after login / nav.
 *
 *   The server is now the single source of truth for portfolio data.
 *   We keep a module-level in-memory cache so moving between pages
 *   within the same SPA session doesn't re-fetch from scratch, but
 *   nothing is persisted to localStorage, IndexedDB, or anywhere else
 *   on disk. On every hard reload we go back to the server. Any
 *   legacy `ezana_mock_portfolio_v1*` keys from prior versions are
 *   purged once on first mount.
 */

const STARTING_CASH = 100_000;
const DEBOUNCE_MS = 800;
const LEGACY_LS_PREFIX = 'ezana_mock_portfolio_v1';

/* ─────────────────────────────────────────────────────────────────
   MODULE-LEVEL IN-MEMORY CACHE
   Lives for the lifetime of the JS module (i.e. one tab session).
   Hard reload wipes it. Never touches disk.
───────────────────────────────────────────────────────────────── */

/** @type {Map<string, { portfolio: any, updatedAt: number }>} */
const memoryStore = new Map();
/** @type {Set<(userId: string) => void>} */
const subscribers = new Set();

function publish(userId, portfolio) {
  memoryStore.set(userId, { portfolio, updatedAt: Date.now() });
  subscribers.forEach((fn) => {
    try { fn(userId); } catch { /* ignore */ }
  });
}

function clearMemoryFor(userId) {
  memoryStore.delete(userId);
  subscribers.forEach((fn) => {
    try { fn(userId); } catch { /* ignore */ }
  });
}

/**
 * One-time purge of any legacy portfolio data persisted to localStorage
 * by prior versions of this hook. Runs at most once per tab.
 *
 * Doing this here (rather than in the app root) guarantees it runs on
 * every page that previously consumed the portfolio hook, covering any
 * user who still has bad persisted state.
 */
let legacyPurgeDone = false;
function purgeLegacyLocalStorage() {
  if (legacyPurgeDone) return;
  legacyPurgeDone = true;
  if (typeof window === 'undefined') return;
  try {
    const toDelete = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      // Matches the legacy unscoped key AND every per-user scoped key.
      if (k === LEGACY_LS_PREFIX || k.startsWith(`${LEGACY_LS_PREFIX}:`)) {
        toDelete.push(k);
      }
    }
    toDelete.forEach((k) => localStorage.removeItem(k));
    if (toDelete.length > 0) {
      // eslint-disable-next-line no-console
      console.log(`[useMockPortfolio] purged ${toDelete.length} legacy localStorage key(s)`);
    }
  } catch { /* ignore */ }
}

/* ─────────────────────────────────────────────────────────────────
   STATIC METADATA
───────────────────────────────────────────────────────────────── */

const TICKER_SECTOR = {
  AAPL: 'Technology', MSFT: 'Technology', NVDA: 'Technology', GOOGL: 'Technology',
  META: 'Technology', AMZN: 'Technology', TSLA: 'Technology', AMD: 'Technology',
  AVGO: 'Technology', QCOM: 'Technology', INTC: 'Technology', CRM: 'Technology',
  ADBE: 'Technology', ORCL: 'Technology', HPQ: 'Technology', IBM: 'Technology',
  JNJ: 'Healthcare', PFE: 'Healthcare', UNH: 'Healthcare', ABBV: 'Healthcare',
  MRK: 'Healthcare', LLY: 'Healthcare', TMO: 'Healthcare',
  JPM: 'Finance', BAC: 'Finance', GS: 'Finance', MS: 'Finance',
  V: 'Finance', MA: 'Finance', AXP: 'Finance',
  LMT: 'Defense', RTX: 'Defense', NOC: 'Defense', BA: 'Defense',
  XOM: 'Energy', CVX: 'Energy', COP: 'Energy',
  WMT: 'Consumer', HD: 'Consumer', MCD: 'Consumer', TGT: 'Consumer',
  SPY: 'ETF', QQQ: 'ETF', IVV: 'ETF', VTI: 'ETF',
  BTCUSD: 'Crypto', ETHUSD: 'Crypto', SOLUSD: 'Crypto',
  GCUSD: 'Commodity', SIUSD: 'Commodity', CLUSD: 'Commodity',
};

const SECTOR_COLORS = {
  Technology: '#3b82f6', Healthcare: '#10b981', Finance: '#a78bfa',
  Defense: '#f59e0b', Energy: '#f97316', Consumer: '#ec4899',
  ETF: '#06b6d4', Crypto: '#fbbf24', Commodity: '#84cc16', Other: '#6b7280',
};

function withMeta(p) {
  if (!p || typeof p !== 'object') return p;
  return { ...p, _meta: { ...(p._meta || {}), updatedAt: Date.now() } };
}

/* ─────────────────────────────────────────────────────────────────
   SERVER I/O
───────────────────────────────────────────────────────────────── */

async function getAccessToken() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

async function apiSave(portfolio) {
  const token = await getAccessToken();
  if (!token) {
    // eslint-disable-next-line no-console
    console.error('[useMockPortfolio] no access token — cannot save');
    return false;
  }
  try {
    const res = await fetch('/api/mock-portfolio', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ portfolio }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      // eslint-disable-next-line no-console
      console.error('[useMockPortfolio] save failed', res.status, text);
      return false;
    }
    return true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[useMockPortfolio] save error:', e?.message);
    return false;
  }
}

async function apiLoad() {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const res = await fetch('/api/mock-portfolio', {
      headers: { 'Authorization': `Bearer ${token}` },
      // Portfolio data is user-specific and changes with every trade —
      // never serve from an HTTP cache.
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/* ─────────────────────────────────────────────────────────────────
   HOOK
───────────────────────────────────────────────────────────────── */

export function useMockPortfolio() {
  const { user } = useAuth();

  // Seed synchronously from the in-memory cache when this hook is
  // being mounted on a page the user already navigated through in
  // this session. This is the ONLY place we accept a non-server value
  // as the initial state, and it's scoped per userId + wiped on reload.
  const [portfolio, setPortfolioState] = useState(null);
  const [serverLoaded, setServerLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [liveQuotes, setLiveQuotes] = useState({});
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const intervalRef = useRef(null);
  const debounceRef = useRef(null);
  const pendingRef = useRef(null);

  const flushSave = useCallback(async () => {
    if (!user?.id || !pendingRef.current) return;
    const payload = pendingRef.current;
    pendingRef.current = null;
    setSyncing(true);
    await apiSave(payload);
    setSyncing(false);
  }, [user?.id]);

  const scheduleSave = useCallback((p) => {
    pendingRef.current = p;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      flushSave();
    }, DEBOUNCE_MS);
  }, [flushSave]);

  const setPortfolio = useCallback((update, options = {}) => {
    const { skipSync = false } = options;
    setPortfolioState((prev) => {
      const base = prev ?? { cash: STARTING_CASH, positions: {}, history: [], startingCash: STARTING_CASH };
      const raw = typeof update === 'function' ? update(base) : update;
      if (raw == null) {
        if (user?.id) clearMemoryFor(user.id);
        return raw;
      }
      const next = withMeta(raw);
      // Publish to the in-memory cache so any other mounted instance
      // of this hook (e.g. on a different dashboard page) picks up
      // the change without having to wait for the server round-trip.
      if (user?.id) publish(user.id, next);
      if (!skipSync && user?.id) {
        // Fire-and-forget immediate save, plus a debounced backup in
        // case the user clicks through a bunch of trades quickly.
        apiSave(next);
        scheduleSave(next);
      }
      return next;
    });
  }, [scheduleSave, user?.id]);

  // Flush any pending debounced save on tab close / hide so the
  // server has the freshest state before the next page load runs.
  useEffect(() => {
    if (!user?.id) return undefined;
    const flush = () => {
      if (!pendingRef.current) return;
      const p = pendingRef.current;
      pendingRef.current = null;
      if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
      apiSave(p).catch(() => {});
    };
    const onVis = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [user?.id]);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  // Cross-instance sync: when another mounted instance of this hook
  // publishes new state for the same user, pick it up here.
  useEffect(() => {
    if (!user?.id) return undefined;
    const fn = (changedId) => {
      if (changedId !== user.id) return;
      const cached = memoryStore.get(user.id);
      setPortfolioState(cached?.portfolio ?? null);
    };
    subscribers.add(fn);
    return () => { subscribers.delete(fn); };
  }, [user?.id]);

  // Hydration: ALWAYS fetch from the server on mount (per user).
  // If the in-memory cache has data for this user from an earlier
  // page in the session, we render that while the fetch is in-flight
  // so there's no visible "flash to empty" on SPA navigation.
  useEffect(() => {
    purgeLegacyLocalStorage();

    if (!user?.id) {
      setPortfolioState(null);
      setServerLoaded(true);
      setIsLoading(false);
      return undefined;
    }

    const cached = memoryStore.get(user.id);
    if (cached) {
      // In-memory only — produced by the current tab's own actions
      // earlier in this session. Safe to render immediately.
      setPortfolioState(cached.portfolio);
    } else {
      setPortfolioState(null);
    }

    setIsLoading(true);
    setServerLoaded(false);

    let cancelled = false;
    (async () => {
      try {
        const data = await apiLoad();
        if (cancelled) return;

        const serverP = data?.portfolio;
        if (serverP && typeof serverP === 'object' && Object.keys(serverP).length > 0) {
          setPortfolioState(serverP);
          memoryStore.set(user.id, {
            portfolio: serverP,
            updatedAt: data?.updated_at ? new Date(data.updated_at).getTime() : Date.now(),
          });
        } else {
          // Server says this user has no portfolio yet. Clear any
          // in-memory cache so subsequent mounts don't resurrect it.
          setPortfolioState(null);
          memoryStore.delete(user.id);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[useMockPortfolio] hydration error:', err);
      } finally {
        if (!cancelled) {
          setServerLoaded(true);
          setIsLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id]);

  const fetchPrices = useCallback(async (positions) => {
    const symbols = Object.keys(positions || {});
    if (!symbols.length) return;
    setQuotesLoading(true);
    try {
      const results = await Promise.allSettled(
        symbols.map((sym) =>
          fetch(`/api/fmp/quote?symbol=${encodeURIComponent(sym)}`)
            .then((r) => (r.ok ? r.json() : null)).catch(() => null),
        ),
      );
      const quotes = {};
      symbols.forEach((sym, i) => {
        const d = results[i].status === 'fulfilled' ? results[i].value : null;
        if (d?.price != null) {
          quotes[sym] = {
            price: Number(d.price),
            change: Number(d.change ?? 0),
            changePercent: Number(d.changesPercentage ?? d.changePercentage ?? 0),
          };
        }
      });
      setLiveQuotes(quotes);
    } catch { /* ignore */ }
    finally { setQuotesLoading(false); }
  }, []);

  useEffect(() => {
    if (!portfolio?.positions) return undefined;
    fetchPrices(portfolio.positions);
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => fetchPrices(portfolio.positions), 60_000);
    return () => clearInterval(intervalRef.current);
  }, [portfolio?.positions, fetchPrices]);

  const hasMockPortfolio = serverLoaded && portfolio != null;
  const positions = portfolio?.positions ?? {};
  const history = portfolio?.history ?? [];
  const cash = portfolio?.cash ?? STARTING_CASH;

  const enrichedPositions = Object.values(positions).map((pos) => {
    const q = liveQuotes[pos.symbol];
    const currentPrice = q?.price ?? pos.currentPrice ?? pos.avgCost;
    const posValue = currentPrice * pos.qty;
    const pnl = (currentPrice - pos.avgCost) * pos.qty;
    const pnlPct = pos.avgCost ? (currentPrice / pos.avgCost - 1) * 100 : 0;
    return {
      ...pos, currentPrice, posValue, pnl, pnlPct,
      dayChange: q ? (q.change ?? 0) * pos.qty : 0,
      dayChangePct: q?.changePercent ?? 0,
      sector: TICKER_SECTOR[pos.symbol] ?? 'Other',
    };
  }).sort((a, b) => b.posValue - a.posValue);

  const totalPositionValue = enrichedPositions.reduce((s, p) => s + p.posValue, 0);
  const totalValue = cash + totalPositionValue;
  const effectiveStart = portfolio?.startingCash ?? STARTING_CASH;
  const totalPnl = totalValue - effectiveStart;
  const totalPnlPct = effectiveStart > 0 ? (totalValue / effectiveStart - 1) * 100 : 0;

  const sectorMap = {};
  for (const pos of enrichedPositions) sectorMap[pos.sector] = (sectorMap[pos.sector] ?? 0) + pos.posValue;
  const sectorTotal = Object.values(sectorMap).reduce((a, b) => a + b, 0) || 1;
  const sectorData = Object.entries(sectorMap)
    .map(([name, value]) => ({ name, value, pct: Math.round((value / sectorTotal) * 100), color: SECTOR_COLORS[name] ?? '#6b7280' }))
    .sort((a, b) => b.value - a.value);

  const PROFIT_COLORS = [
    '#10b981',
    '#3b82f6',
    '#a78bfa',
    '#fbbf24',
    '#f97316',
    '#ec4899',
    '#06b6d4',
    '#84cc16',
  ];

  const profitablePositions = enrichedPositions
    .filter((p) => (p.pnl ?? 0) > 0)
    .sort((a, b) => b.pnl - a.pnl);

  const profitTotal = profitablePositions.reduce((s, p) => s + p.pnl, 0) || 1;

  const profitBreakdown = profitablePositions.map((p, i) => ({
    label: p.symbol,
    value: p.pnl,
    pct: Math.round((p.pnl / profitTotal) * 100),
    color: PROFIT_COLORS[i % PROFIT_COLORS.length],
  }));

  const recentTransactions = history.slice(0, 8).map((h) => ({
    company: h.symbol, ticker: h.symbol,
    date: new Date(h.ts).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
    amount: h.total, positive: h.side === 'buy', txId: `#${h.id.toString().slice(-9)}`,
  }));

  return {
    hasMockPortfolio, portfolio, setPortfolio, syncing,
    isLoading,
    enrichedPositions, cash, totalValue, totalPositionValue,
    totalPnl, totalPnlPct, sectorData, profitBreakdown,
    recentTransactions, liveQuotes, quotesLoading, STARTING_CASH,
    effectiveStartingCash: effectiveStart,
  };
}

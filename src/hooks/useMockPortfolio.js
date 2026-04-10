'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

const STARTING_CASH = 100_000;
const DEBOUNCE_MS = 800;
const LS_KEY = 'ezana_mock_portfolio_v1';

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

function loadLocal() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveLocal(p) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(LS_KEY, JSON.stringify(p)); } catch { /* quota */ }
}

function withMeta(p) {
  if (!p || typeof p !== 'object') return p;
  return { ...p, _meta: { ...(p._meta || {}), updatedAt: Date.now() } };
}

/**
 * Write portfolio directly to Supabase from the browser client.
 * Uses the browser's own session — no server cookie needed.
 * RLS policy (auth.uid() = user_id) handles security.
 */
async function saveToSupabase(userId, portfolio) {
  const { error } = await supabase
    .from('mock_portfolios')
    .upsert(
      { user_id: userId, portfolio, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  if (error) {
    console.error('[useMockPortfolio] Supabase write error:', error.message);
  }
  return !error;
}

/**
 * Read portfolio directly from Supabase via the browser client.
 */
async function loadFromSupabase(userId) {
  const { data, error } = await supabase
    .from('mock_portfolios')
    .select('portfolio, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) {
    console.error('[useMockPortfolio] Supabase read error:', error.message);
    return null;
  }
  return data ?? null;
}

export function useMockPortfolio() {
  const { user } = useAuth();
  const [portfolio, setPortfolioState] = useState(null);
  const [serverLoaded, setServerLoaded] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [liveQuotes, setLiveQuotes] = useState({});
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const intervalRef = useRef(null);
  const debounceRef = useRef(null);
  const pendingRef = useRef(null);

  useEffect(() => { setStorageReady(true); }, []);

  /** Flush pending write to Supabase immediately */
  const flushToSupabase = useCallback(async () => {
    if (!user?.id || !pendingRef.current) return;
    const payload = pendingRef.current;
    pendingRef.current = null;
    setSyncing(true);
    await saveToSupabase(user.id, payload);
    setSyncing(false);
  }, [user?.id]);

  /** Debounced Supabase write — coalesces rapid trades */
  const scheduleWrite = useCallback((portfolio) => {
    pendingRef.current = portfolio;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      flushToSupabase();
    }, DEBOUNCE_MS);
  }, [flushToSupabase]);

  const setPortfolio = useCallback((update, options = {}) => {
    const { skipSync = false } = options;
    setPortfolioState((prev) => {
      const base = prev ?? { cash: STARTING_CASH, positions: {}, history: [] };
      const raw = typeof update === 'function' ? update(base) : update;
      if (raw == null) return raw;
      const next = withMeta(raw);
      saveLocal(next);
      if (!skipSync && user?.id) {
        // Write immediately AND debounce — belt and suspenders
        saveToSupabase(user.id, next);   // immediate, fire-and-forget
        scheduleWrite(next);              // debounced backup
      }
      return next;
    });
  }, [scheduleWrite, user?.id]);

  // Flush on tab close / hide
  useEffect(() => {
    if (!user?.id) return;
    const flush = () => {
      if (!pendingRef.current) return;
      const p = pendingRef.current;
      pendingRef.current = null;
      if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
      // Best-effort synchronous-ish write on unload
      saveToSupabase(user.id, p).catch(() => {});
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

  // Hydrate: load from Supabase on login, localStorage for instant boot
  useEffect(() => {
    if (!storageReady) return;

    if (!user?.id) {
      const local = loadLocal();
      if (local) setPortfolioState(local);
      setServerLoaded(true);
      return;
    }

    // Show local immediately while Supabase loads
    const bootLocal = loadLocal();
    if (bootLocal) setPortfolioState(bootLocal);

    let cancelled = false;
    (async () => {
      try {
        const row = await loadFromSupabase(user.id);
        if (cancelled) return;

        if (row?.portfolio && typeof row.portfolio === 'object') {
          const serverT = row.updated_at ? new Date(row.updated_at).getTime() : 0;
          const localT = bootLocal?._meta?.updatedAt ?? 0;

          if (!bootLocal || serverT >= localT) {
            // Server is newer — use it
            setPortfolioState(row.portfolio);
            saveLocal(row.portfolio);
          } else {
            // Local is newer — push it up
            setPortfolioState(bootLocal);
            await saveToSupabase(user.id, bootLocal);
          }
        } else if (bootLocal) {
          // Nothing in Supabase yet — push local up
          setPortfolioState(bootLocal);
          await saveToSupabase(user.id, bootLocal);
        }
      } catch (err) {
        console.error('[useMockPortfolio] hydration error:', err);
      } finally {
        if (!cancelled) setServerLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [storageReady, user?.id]);

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
  const totalPnl = totalValue - STARTING_CASH;
  const totalPnlPct = (totalValue / STARTING_CASH - 1) * 100;

  const sectorMap = {};
  for (const pos of enrichedPositions) sectorMap[pos.sector] = (sectorMap[pos.sector] ?? 0) + pos.posValue;
  const sectorTotal = Object.values(sectorMap).reduce((a, b) => a + b, 0) || 1;
  const sectorData = Object.entries(sectorMap)
    .map(([name, value]) => ({ name, value, pct: Math.round((value / sectorTotal) * 100), color: SECTOR_COLORS[name] ?? '#6b7280' }))
    .sort((a, b) => b.value - a.value);

  const typeMap = {};
  for (const pos of enrichedPositions) {
    const t = pos.type ?? 'Stock';
    typeMap[t] = (typeMap[t] ?? 0) + Math.max(0, pos.pnl);
  }
  const typeTotal = Object.values(typeMap).reduce((a, b) => a + b, 0) || 1;
  const TYPE_COLORS = { Stock: '#10b981', Crypto: '#fbbf24', Commodity: '#f97316', ETF: '#3b82f6', Other: '#a78bfa' };
  const profitBreakdown = Object.entries(typeMap).map(([label, value]) => ({
    label, value, pct: Math.round((value / typeTotal) * 100), color: TYPE_COLORS[label] ?? '#6b7280',
  }));

  const recentTransactions = history.slice(0, 8).map((h) => ({
    company: h.symbol, ticker: h.symbol,
    date: new Date(h.ts).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
    amount: h.total, positive: h.side === 'buy', txId: `#${h.id.toString().slice(-9)}`,
  }));

  return {
    hasMockPortfolio, portfolio, setPortfolio, syncing,
    enrichedPositions, cash, totalValue, totalPositionValue,
    totalPnl, totalPnlPct, sectorData, profitBreakdown,
    recentTransactions, liveQuotes, quotesLoading, STARTING_CASH,
  };
}

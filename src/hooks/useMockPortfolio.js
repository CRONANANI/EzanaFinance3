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

/** Get the current access token from the Supabase browser client */
async function getAccessToken() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

/** Save portfolio to server — sends access token in Authorization header */
async function apiSave(portfolio) {
  const token = await getAccessToken();
  if (!token) {
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
      console.error('[useMockPortfolio] save failed', res.status, text);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[useMockPortfolio] save error:', e?.message);
    return false;
  }
}

/** Load portfolio from server — sends access token in Authorization header */
async function apiLoad() {
  const token = await getAccessToken();
  if (!token) return null;
  try {
    const res = await fetch('/api/mock-portfolio', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
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
      const base = prev ?? { cash: STARTING_CASH, positions: {}, history: [] };
      const raw = typeof update === 'function' ? update(base) : update;
      if (raw == null) return raw;
      const next = withMeta(raw);
      saveLocal(next);
      if (!skipSync && user?.id) {
        apiSave(next);       // immediate — fire and forget
        scheduleSave(next);  // debounce backup
      }
      return next;
    });
  }, [scheduleSave, user?.id]);

  // Flush on tab close / hide
  useEffect(() => {
    if (!user?.id) return;
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

  // Hydrate on login: show local immediately, then load from server
  useEffect(() => {
    if (!storageReady) return;

    if (!user?.id) {
      const local = loadLocal();
      if (local) setPortfolioState(local);
      setServerLoaded(true);
      return;
    }

    // Show local cache immediately (no flash)
    const bootLocal = loadLocal();
    if (bootLocal) setPortfolioState(bootLocal);

    let cancelled = false;
    (async () => {
      try {
        const data = await apiLoad();
        if (cancelled) return;

        const serverP = data?.portfolio;
        const serverT = data?.updated_at ? new Date(data.updated_at).getTime() : 0;
        const localT = bootLocal?._meta?.updatedAt ?? 0;

        if (serverP && typeof serverP === 'object' && Object.keys(serverP).length > 0) {
          if (!bootLocal || serverT >= localT) {
            setPortfolioState(serverP);
            saveLocal(serverP);
          } else {
            // Local is newer — push it up
            setPortfolioState(bootLocal);
            apiSave(bootLocal);
          }
        } else if (bootLocal) {
          // Nothing on server — push local up
          setPortfolioState(bootLocal);
          apiSave(bootLocal);
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
    enrichedPositions, cash, totalValue, totalPositionValue,
    totalPnl, totalPnlPct, sectorData, profitBreakdown,
    recentTransactions, liveQuotes, quotesLoading, STARTING_CASH,
  };
}

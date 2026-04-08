'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';

const STARTING_CASH = 100_000;
const POST_DEBOUNCE_MS = 800;
const LS_KEY = 'ezana_mock_portfolio_v1';

const TICKER_SECTOR = {
  AAPL: 'Technology',
  MSFT: 'Technology',
  NVDA: 'Technology',
  GOOGL: 'Technology',
  META: 'Technology',
  AMZN: 'Technology',
  TSLA: 'Technology',
  AMD: 'Technology',
  AVGO: 'Technology',
  QCOM: 'Technology',
  INTC: 'Technology',
  CRM: 'Technology',
  ADBE: 'Technology',
  ORCL: 'Technology',
  HPQ: 'Technology',
  IBM: 'Technology',
  JNJ: 'Healthcare',
  PFE: 'Healthcare',
  UNH: 'Healthcare',
  ABBV: 'Healthcare',
  MRK: 'Healthcare',
  LLY: 'Healthcare',
  TMO: 'Healthcare',
  JPM: 'Finance',
  BAC: 'Finance',
  GS: 'Finance',
  MS: 'Finance',
  V: 'Finance',
  MA: 'Finance',
  AXP: 'Finance',
  LMT: 'Defense',
  RTX: 'Defense',
  NOC: 'Defense',
  BA: 'Defense',
  XOM: 'Energy',
  CVX: 'Energy',
  COP: 'Energy',
  WMT: 'Consumer',
  HD: 'Consumer',
  MCD: 'Consumer',
  TGT: 'Consumer',
  SPY: 'ETF',
  QQQ: 'ETF',
  IVV: 'ETF',
  VTI: 'ETF',
  BTCUSD: 'Crypto',
  ETHUSD: 'Crypto',
  SOLUSD: 'Crypto',
  GCUSD: 'Commodity',
  SIUSD: 'Commodity',
  CLUSD: 'Commodity',
};

const SECTOR_COLORS = {
  Technology: '#3b82f6',
  Healthcare: '#10b981',
  Finance: '#a78bfa',
  Defense: '#f59e0b',
  Energy: '#f97316',
  Consumer: '#ec4899',
  ETF: '#06b6d4',
  Crypto: '#fbbf24',
  Commodity: '#84cc16',
  Other: '#6b7280',
};

function loadLocal() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveLocal(portfolio) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(portfolio));
  } catch {
    /* quota */
  }
}

function withMeta(portfolio) {
  if (!portfolio || typeof portfolio !== 'object') return portfolio;
  return {
    ...portfolio,
    _meta: {
      ...(portfolio._meta || {}),
      updatedAt: Date.now(),
    },
  };
}

/**
 * Mock portfolio — FMP quotes; persisted in localStorage + Supabase (`mock_portfolios`) when logged in.
 * Server fetch runs only when authenticated; POST skipped without user (local data retained).
 */
export function useMockPortfolio() {
  const { user } = useAuth();
  const [portfolio, setPortfolioState] = useState(null);
  const [serverLoaded, setServerLoaded] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [liveQuotes, setLiveQuotes] = useState({});
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const intervalRef = useRef(null);
  const postTimerRef = useRef(null);
  const postPayloadRef = useRef(null);

  useEffect(() => {
    setStorageReady(true);
  }, []);

  const flushPost = useCallback(async () => {
    if (!user?.id) return;
    const payload = postPayloadRef.current;
    postPayloadRef.current = null;
    if (!payload) return;
    setSyncing(true);
    try {
      await fetch('/api/mock-portfolio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolio: payload }),
      });
    } catch {
      /* network — retry on next change */
    } finally {
      setSyncing(false);
    }
  }, [user?.id]);

  const schedulePost = useCallback(
    (next) => {
      postPayloadRef.current = next;
      if (postTimerRef.current) clearTimeout(postTimerRef.current);
      postTimerRef.current = setTimeout(() => {
        postTimerRef.current = null;
        flushPost();
      }, POST_DEBOUNCE_MS);
    },
    [flushPost],
  );

  const setPortfolio = useCallback(
    (update, options = {}) => {
      const { skipSync = false } = options;
      setPortfolioState((prev) => {
        const base = prev ?? {
          cash: STARTING_CASH,
          positions: {},
          history: [],
        };
        const raw = typeof update === 'function' ? update(base) : update;
        if (raw == null) return raw;
        const next = withMeta(raw);
        saveLocal(next);
        if (!skipSync) {
          schedulePost(next);
        }
        return next;
      });
    },
    [schedulePost],
  );

  useEffect(() => {
    return () => {
      if (postTimerRef.current) clearTimeout(postTimerRef.current);
    };
  }, []);

  /** Hydrate from localStorage immediately; merge with server when `user.id` is present */
  useEffect(() => {
    if (!storageReady) return;
    if (!user?.id) {
      const localOnly = loadLocal();
      if (localOnly && typeof localOnly === 'object') {
        setPortfolioState(localOnly);
      }
      setServerLoaded(true);
      return;
    }
    const bootLocal = loadLocal();
    if (bootLocal && typeof bootLocal === 'object') {
      setPortfolioState(bootLocal);
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/mock-portfolio');
        if (!res.ok || cancelled) {
          if (!cancelled) setServerLoaded(true);
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        const serverP = data?.portfolio;
        const serverT = data?.updated_at ? new Date(data.updated_at).getTime() : 0;
        const curLocal = loadLocal();
        const localT = curLocal?._meta?.updatedAt ?? 0;

        if (serverP && typeof serverP === 'object') {
          if (!curLocal || serverT >= localT) {
            setPortfolioState(serverP);
            saveLocal(serverP);
          } else {
            setPortfolioState(curLocal);
            schedulePost(curLocal);
          }
        } else if (curLocal) {
          setPortfolioState(curLocal);
          schedulePost(curLocal);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setServerLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [storageReady, user?.id, schedulePost]);

  const fetchPrices = useCallback(async (positions) => {
    const symbols = Object.keys(positions || {});
    if (!symbols.length) return;
    setQuotesLoading(true);
    try {
      const results = await Promise.allSettled(
        symbols.map((sym) =>
          fetch(`/api/fmp/quote?symbol=${encodeURIComponent(sym)}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null),
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
    } catch {
      /* ignore */
    } finally {
      setQuotesLoading(false);
    }
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

  const enrichedPositions = Object.values(positions)
    .map((pos) => {
      const q = liveQuotes[pos.symbol];
      const currentPrice = q?.price ?? pos.currentPrice ?? pos.avgCost;
      const posValue = currentPrice * pos.qty;
      const pnl = (currentPrice - pos.avgCost) * pos.qty;
      const pnlPct = pos.avgCost ? (currentPrice / pos.avgCost - 1) * 100 : 0;
      const dayChange = q ? (q.change ?? 0) * pos.qty : 0;
      const dayChangePct = q?.changePercent ?? 0;
      return {
        ...pos,
        currentPrice,
        posValue,
        pnl,
        pnlPct,
        dayChange,
        dayChangePct,
        sector: TICKER_SECTOR[pos.symbol] ?? 'Other',
      };
    })
    .sort((a, b) => b.posValue - a.posValue);

  const totalPositionValue = enrichedPositions.reduce((s, p) => s + p.posValue, 0);
  const totalValue = cash + totalPositionValue;
  const totalPnl = totalValue - STARTING_CASH;
  const totalPnlPct = (totalValue / STARTING_CASH - 1) * 100;

  const sectorMap = {};
  for (const pos of enrichedPositions) {
    const s = pos.sector;
    sectorMap[s] = (sectorMap[s] ?? 0) + pos.posValue;
  }
  const sectorTotal = Object.values(sectorMap).reduce((a, b) => a + b, 0) || 1;
  const sectorData = Object.entries(sectorMap)
    .map(([name, value]) => ({
      name,
      value,
      pct: Math.round((value / sectorTotal) * 100),
      color: SECTOR_COLORS[name] ?? '#6b7280',
    }))
    .sort((a, b) => b.value - a.value);

  const typeMap = {};
  for (const pos of enrichedPositions) {
    const t = pos.type ?? 'Stock';
    typeMap[t] = (typeMap[t] ?? 0) + Math.max(0, pos.pnl);
  }
  const typeTotal = Object.values(typeMap).reduce((a, b) => a + b, 0) || 1;
  const TYPE_COLORS = {
    Stock: '#10b981',
    Crypto: '#fbbf24',
    Commodity: '#f97316',
    ETF: '#3b82f6',
    Other: '#a78bfa',
  };
  const profitBreakdown = Object.entries(typeMap).map(([label, value]) => ({
    label,
    value,
    pct: Math.round((value / typeTotal) * 100),
    color: TYPE_COLORS[label] ?? '#6b7280',
  }));

  const recentTransactions = history.slice(0, 8).map((h) => ({
    company: h.symbol,
    ticker: h.symbol,
    date: new Date(h.ts).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }),
    amount: h.total,
    positive: h.side === 'buy',
    txId: `#${h.id.toString().slice(-9)}`,
  }));

  return {
    hasMockPortfolio,
    portfolio,
    setPortfolio,
    syncing,
    enrichedPositions,
    cash,
    totalValue,
    totalPositionValue,
    totalPnl,
    totalPnlPct,
    sectorData,
    profitBreakdown,
    recentTransactions,
    liveQuotes,
    quotesLoading,
    STARTING_CASH,
  };
}

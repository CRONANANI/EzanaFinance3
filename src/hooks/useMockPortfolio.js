'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const STORAGE_KEY = 'ezana_mock_portfolio';
const STARTING_CASH = 100_000;

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

function readPortfolio() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Live mock portfolio data with FMP-refreshed prices.
 * Re-fetches prices every 60s when positions exist.
 */
export function useMockPortfolio() {
  const [portfolio, setPortfolio] = useState(null);
  const [storageReady, setStorageReady] = useState(false);
  const [liveQuotes, setLiveQuotes] = useState({});
  const [quotesLoading, setQuotesLoading] = useState(false);
  const intervalRef = useRef(null);

  const syncFromStorage = useCallback(() => {
    setPortfolio(readPortfolio());
  }, []);

  useEffect(() => {
    syncFromStorage();
    setStorageReady(true);
  }, [syncFromStorage]);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === STORAGE_KEY) {
        try {
          setPortfolio(e.newValue ? JSON.parse(e.newValue) : null);
        } catch {
          setPortfolio(null);
        }
      }
    };
    const onFocus = () => syncFromStorage();
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
    };
  }, [syncFromStorage]);

  const fetchPrices = useCallback(async (positions) => {
    const symbols = Object.keys(positions || {});
    if (!symbols.length) return;
    setQuotesLoading(true);
    try {
      const results = await Promise.allSettled(
        symbols.map((sym) =>
          fetch(`/api/fmp/quote?symbol=${encodeURIComponent(sym)}`)
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
        )
      );
      const quotes = {};
      symbols.forEach((sym, i) => {
        const d = results[i].status === 'fulfilled' ? results[i].value : null;
        if (d?.price != null) {
          quotes[sym] = {
            price: Number(d.price),
            change: Number(d.change ?? 0),
            changePercent: Number(
              d.changesPercentage ?? d.changePercentage ?? 0
            ),
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

  const hasMockPortfolio = storageReady && portfolio != null;

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

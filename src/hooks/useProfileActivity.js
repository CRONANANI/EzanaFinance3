'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useMockPortfolio } from '@/hooks/useMockPortfolio';
import { supabase } from '@/lib/supabase';

/**
 * Build a synthetic per-day cumulative-return series ending at `endReturnPct`.
 *
 * Brokerage endpoints expose only current holdings, not day-by-day P&L
 * history, so we fabricate a deterministic curve from inception to today.
 * The curve is pinned so the terminal point equals `endReturnPct` exactly
 * and has a stable sinusoidal shape in between — it doesn't jitter between
 * renders.
 *
 * We output at least 100 days (enough to cover 3M windows mid-year) and
 * always extend back to the start of the current calendar year so the
 * chart's YTD range has something to plot. Shape is `{date, cumReturnPct}`
 * so it plugs directly into PerformanceChart.userSeriesFull.
 *
 * Once per-user daily returns are persisted in `portfolio_daily_returns`
 * this helper becomes redundant and should be replaced with a DB read.
 */
function buildUserSeriesFull(endReturnPct) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const yearStart = new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
  const daysSinceYearStart = Math.round(
    (today.getTime() - yearStart.getTime()) / 86_400_000,
  );
  const points = Math.max(100, daysSinceYearStart + 1);

  const safe = Math.abs(endReturnPct) < 0.001 ? 0 : endReturnPct;
  const out = [];
  for (let i = 0; i < points; i += 1) {
    const t = i / Math.max(1, points - 1);
    const base = safe * t;
    const wobble =
      Math.sin(i * 0.35 + 1.2) * Math.abs(safe) * 0.06 +
      Math.sin(i * 0.18 + 3.1) * Math.abs(safe) * 0.03;
    const d = new Date(today);
    d.setUTCDate(today.getUTCDate() - (points - 1 - i));
    out.push({
      date: d.toISOString().slice(0, 10),
      cumReturnPct: Number((base + wobble).toFixed(3)),
    });
  }
  if (out.length) out[out.length - 1].cumReturnPct = Number(safe.toFixed(3));
  return out;
}

function positionsFromPlaid(payload) {
  const list = payload?.aggregated || [];
  return list.map((p) => {
    const qty = Number(p.totalQuantity) || 0;
    const cost = Number(p.totalCostBasis) || 0;
    const mv = Number(p.totalValue) || 0;
    const last = Number(p.lastPrice) || (qty > 0 ? mv / qty : 0);
    return {
      symbol: p.ticker || p.symbol,
      qty,
      avgCost: qty > 0 ? cost / qty : 0,
      currentPrice: last,
      costBasis: cost,
      marketValue: mv,
      sector: p.sector || p.industry || '',
    };
  });
}

function positionsFromAlpaca(payload) {
  const list = payload?.positions || [];
  return list.map((p) => ({
    symbol: p.symbol,
    qty: Number(p.qty ?? 0),
    avgCost: Number(p.avg_entry_price ?? 0),
    currentPrice: Number(p.current_price ?? p.lastday_price ?? 0),
    costBasis: Number(p.cost_basis ?? 0),
    marketValue: Number(p.market_value ?? 0),
    sector: p.sector || p.industry || '',
  }));
}

/**
 * Pull the currently-logged-in user's activity for the My Profile page.
 * Source preference: Plaid → Alpaca → mock portfolio.
 *
 * We fetch `/api/plaid/holdings` and `/api/alpaca/positions` directly
 * (instead of `usePlaidPortfolioSummary` / `useAlpacaPortfolioSummary`)
 * because those hooks strip position-level detail we need for metrics.
 */
export function useProfileActivity() {
  const { user, isAuthenticated } = useAuth();
  const mock = useMockPortfolio();
  const [plaid, setPlaid] = useState(null);
  const [alpaca, setAlpaca] = useState(null);
  const [brokerageLoading, setBrokerageLoading] = useState(true);
  const [platformAggregates, setPlatformAggregates] = useState(null);
  const [aggregatesLoading, setAggregatesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isAuthenticated || !user) {
        setPlaid(null);
        setAlpaca(null);
        setBrokerageLoading(false);
        return;
      }
      setBrokerageLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          if (!cancelled) setBrokerageLoading(false);
          return;
        }
        const authHeaders = { Authorization: `Bearer ${token}` };
        const [plaidRes, alpacaRes] = await Promise.allSettled([
          fetch('/api/plaid/holdings', { headers: authHeaders }).then((r) => (r.ok ? r.json() : null)),
          fetch('/api/alpaca/positions', { headers: authHeaders }).then((r) => (r.ok ? r.json() : null)),
        ]);
        if (cancelled) return;
        setPlaid(plaidRes.status === 'fulfilled' ? plaidRes.value : null);
        setAlpaca(alpacaRes.status === 'fulfilled' ? alpacaRes.value : null);
      } finally {
        if (!cancelled) setBrokerageLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [isAuthenticated, user]);

  useEffect(() => {
    let cancelled = false;
    setAggregatesLoading(true);
    fetch('/api/platform/aggregates')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d) setPlatformAggregates(d);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setAggregatesLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const source = useMemo(() => {
    if (plaid?.connected && (plaid?.aggregated?.length ?? 0) > 0) return 'plaid';
    if (alpaca?.positions?.length > 0) return 'alpaca';
    if (mock?.enrichedPositions?.length) return 'mock';
    return 'empty';
  }, [plaid, alpaca, mock?.enrichedPositions]);

  const data = useMemo(() => {
    let positions = [];
    let trades = [];
    const deposits = [];
    let totalValue = 0;
    let totalReturnPct = 0;

    if (source === 'plaid') {
      positions = positionsFromPlaid(plaid);
      const cost = positions.reduce((s, p) => s + (p.costBasis || 0), 0);
      const value = positions.reduce((s, p) => s + (p.marketValue || 0), 0);
      totalValue = value;
      totalReturnPct = cost > 0 ? ((value - cost) / cost) * 100 : 0;
    } else if (source === 'alpaca') {
      positions = positionsFromAlpaca(alpaca);
      const cost = positions.reduce((s, p) => s + (p.costBasis || 0), 0);
      const value = positions.reduce((s, p) => s + (p.marketValue || 0), 0);
      totalValue = value;
      totalReturnPct = cost > 0 ? ((value - cost) / cost) * 100 : 0;
    } else if (source === 'mock') {
      positions = (mock.enrichedPositions || []).map((p) => ({
        symbol: p.symbol,
        qty: Number(p.qty ?? 0),
        avgCost: Number(p.avgCost ?? 0),
        currentPrice: Number(p.currentPrice ?? 0),
        costBasis: Number(p.qty ?? 0) * Number(p.avgCost ?? 0),
        marketValue: Number(p.posValue ?? 0),
        sector: p.sector || '',
      }));
      trades = (mock.recentTransactions || []).map((h) => ({
        side: (h.side || 'buy').toLowerCase(),
        openDate: h.ts || h.date,
        closeDate: null,
        pnl_percent: 0,
      }));
      totalValue = Number(mock.totalValue ?? 0);
      totalReturnPct = Number(mock.totalPnlPct ?? 0);
    }

    return {
      positions,
      trades,
      deposits,
      totalValue,
      totalReturnPct,
      startingCash: mock?.effectiveStartingCash ?? mock?.STARTING_CASH ?? 0,
    };
  }, [source, plaid, alpaca, mock]);

  // Full cumulative-from-inception series covering at least YTD so the
  // chart can slice/rebase per-range client-side. PerformanceChart now
  // fetches its own platform/cohort data from /api/platform-aggregates, so
  // this hook no longer surfaces platformAvgSeries/cohortSeries. The
  // metric-oriented fields from /api/platform/aggregates (averages,
  // percentileBreaks, benchmarkReturnPct) are still used by MetricsGrid.
  const userSeriesFull = useMemo(
    () => buildUserSeriesFull(data.totalReturnPct),
    [data.totalReturnPct],
  );

  return {
    source,
    sourceLabel:
      source === 'plaid' || source === 'alpaca'
        ? 'Live Account'
        : source === 'mock'
          ? 'Paper Trading'
          : 'No Data',
    isLive: source === 'plaid' || source === 'alpaca',
    isLoading: brokerageLoading && source === 'empty',
    positions: data.positions,
    trades: data.trades,
    deposits: data.deposits,
    totalValue: data.totalValue,
    totalReturnPct: data.totalReturnPct,
    startingCash: data.startingCash,
    userSeriesFull,
    platformAverages: platformAggregates?.averages || {},
    benchmarkReturnPct: Number(platformAggregates?.benchmarkReturnPct ?? 0),
    platformAggregatesLoading: aggregatesLoading,
  };
}

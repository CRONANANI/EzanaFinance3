'use client';

/**
 * Home dashboard (Nov 2026 redesign, DASHBOARD_REDESIGN_HANDOFF.md).
 *
 * Data sources are unchanged: the mock portfolio (useMockPortfolio), linked
 * accounts (usePlaidPortfolioSummary + /api/plaid/holdings + batch quotes),
 * watchlists (useWatchlists) and the value series (usePortfolioValueSeries).
 * They are folded into one snapshot by buildDashboardData, which every card
 * reads, so no number disagrees with itself. Every card holds its size while
 * loading, so the page never shifts when data arrives.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { usePlaidPortfolioSummary } from '@/hooks/usePlaidPortfolioSummary';
import { usePortfolioValueSeries } from '@/hooks/usePortfolioValueSeries';
import { useMockPortfolio } from '@/hooks/useMockPortfolio';
import { useWatchlists } from '@/hooks/useWatchlists';
import { supabase } from '@/lib/supabase-browser';
import { BeginnerSpotlight } from '@/components/beginner/BeginnerSpotlight';
import s from '@/app/(dashboard)/home-dashboard/dashboard.module.css';
import {
  buildDashboardData,
  fmtLongDate,
  greetingFor,
  rangeChange,
  seriesRows,
} from '@/lib/dashboard/derive';
import {
  Greeting,
  HoldingsCard,
  KpiStrip,
  PortfolioSnapshot,
  ProfitsCard,
  SectorCard,
  TransactionsCard,
  WatchlistCard,
} from './sections';

const num = (v) => (v == null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);

function firstNameOf(user) {
  const m = user?.user_metadata || {};
  return m.first_name || m.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'investor';
}

/** Linked-account holdings with cost basis, priced from live quotes. */
function useLinkedHoldings(user, enabled) {
  const [state, setState] = useState({ data: null, error: null, loading: false });
  const load = useCallback(async () => {
    if (!user || !enabled) return;
    setState((st) => ({ ...st, loading: true, error: null }));
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('Not signed in');
      const res = await fetch('/api/plaid/holdings', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState({ data: await res.json(), error: null, loading: false });
    } catch (e) {
      setState({ data: null, error: e, loading: false });
    }
  }, [user, enabled]);
  useEffect(() => {
    load();
  }, [load]);
  return { ...state, reload: load };
}

/** Quotes for tickers that are not in the mock portfolio, refreshed each minute. */
function useQuotes(tickers) {
  const [quotes, setQuotes] = useState({});
  const key = [...new Set(tickers.filter(Boolean))].sort().join(',');
  useEffect(() => {
    if (!key) return undefined;
    let cancelled = false;
    const load = () =>
      fetch(`/api/market/batch-quotes?symbols=${encodeURIComponent(key)}`)
        .then((r) => (r.ok ? r.json() : {}))
        .then((d) => !cancelled && setQuotes(d.quotes || {}))
        .catch(() => {});
    load();
    const id = setInterval(load, 60000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [key]);
  return quotes;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const mock = useMockPortfolio();
  const plaid = usePlaidPortfolioSummary();
  const wl = useWatchlists();

  const [range, setRange] = useState('1M');
  const [custom, setCustom] = useState(null);
  const series = usePortfolioValueSeries(range === 'CUSTOM' ? 'ALL' : range);

  // Time of day and the date are read after mount, so server and client agree.
  const [now, setNow] = useState(null);
  useEffect(() => setNow(new Date()), []);

  const useMock = mock.hasMockPortfolio;
  const linked = !useMock && plaid.connected;
  const mode = useMock ? 'mock' : linked ? 'linked' : 'none';
  const loading = mock.isLoading || plaid.isLoading;

  const linkedHoldings = useLinkedHoldings(user, linked);

  const [watchId, setWatchId] = useState(null);
  const lists = useMemo(() => wl.watchlists || [], [wl.watchlists]);
  useEffect(() => {
    if (lists.length && !lists.some((l) => l.id === watchId)) setWatchId(lists[0].id);
  }, [lists, watchId]);
  const activeList = lists.find((l) => l.id === watchId) || lists[0] || null;

  const quoteTickers = useMemo(
    () => [
      ...(activeList?.stocks || []).map((x) => x.ticker),
      ...(linkedHoldings.data?.aggregated || []).map((h) => h.ticker),
    ],
    [activeList, linkedHoldings.data],
  );
  const quotes = useQuotes(quoteTickers);

  const data = useMemo(() => {
    let holdings = [];
    let cash = null;
    let startingValue = null;
    let totalPnl = null;
    let totalReturnPct = null;
    let fallbackValue = null;
    let transactions = [];

    if (useMock) {
      holdings = mock.enrichedPositions.map((p) => {
        const hasQuote = !!mock.liveQuotes?.[p.symbol];
        return {
          ticker: p.symbol,
          company: p.name && p.name !== p.symbol ? p.name : '',
          value: p.posValue,
          quantity: p.qty,
          price: p.currentPrice,
          dayChangeAbs: hasQuote ? p.dayChange : null,
          dayChangePct: hasQuote ? p.dayChangePct : null,
          unrealizedPnl: p.pnl,
          unrealizedPnlPct: p.pnlPct,
          sector: p.sector || 'Other',
        };
      });
      cash = mock.cash;
      startingValue = mock.effectiveStartingCash;
      transactions = (mock.portfolio?.history || []).map((h) => ({
        id: h.id,
        ticker: h.symbol,
        side: h.side,
        total: num(h.total),
        ts: h.ts,
      }));
    } else if (linked) {
      holdings = (linkedHoldings.data?.aggregated || [])
        .filter((h) => h.ticker)
        .map((h) => {
          const q = quotes[h.ticker];
          const qty = num(h.totalQuantity) || 0;
          const qp = num(q?.price);
          const price = qp ?? num(h.lastPrice) ?? (qty ? num(h.totalValue) / qty : null);
          const value = qp != null && qty ? qp * qty : (num(h.totalValue) ?? 0);
          const basis = num(h.totalCostBasis);
          return {
            ticker: h.ticker,
            company: h.name && h.name !== h.ticker ? h.name : '',
            value,
            quantity: qty,
            price,
            dayChangeAbs: q && qty ? num(q.change) * qty : null,
            dayChangePct: q ? num(q.changePercent) : null,
            unrealizedPnl: basis > 0 ? value - basis : null,
            unrealizedPnlPct: basis > 0 ? ((value - basis) / basis) * 100 : null,
            sector: h.sector || h.type || 'Other',
          };
        });
      totalPnl = num(plaid.summary?.totalGainLoss);
      totalReturnPct = num(plaid.summary?.totalGainLossPercent);
      fallbackValue = num(plaid.summary?.totalValue);
    }

    const watchlist = (activeList?.stocks || []).map((x) => {
      const q = quotes[x.ticker];
      return {
        ticker: x.ticker,
        company: x.name && x.name !== x.ticker ? x.name : '',
        price: num(q?.price) ?? (num(x.price) || null),
        dayChangePct: q ? num(q.changePercent) : num(x.changePct ?? x.change),
      };
    });

    return buildDashboardData({
      holdings,
      cash,
      startingValue,
      totalPnl,
      totalReturnPct,
      fallbackValue,
      watchlist,
      transactions,
    });
  }, [
    useMock,
    linked,
    mock.enrichedPositions,
    mock.liveQuotes,
    mock.cash,
    mock.effectiveStartingCash,
    mock.portfolio?.history,
    linkedHoldings.data,
    plaid.summary,
    activeList,
    quotes,
  ]);

  const rows = useMemo(
    () =>
      seriesRows(
        range === 'CUSTOM' ? series.points : series.dataForCurrentRange || series.points,
        data.totals.currentValue,
        range === 'CUSTOM' ? custom : null,
      ),
    [range, custom, series.points, series.dataForCurrentRange, data.totals.currentValue],
  );
  const change = rangeChange(rows);
  const holdingsLoading = loading || (linked && linkedHoldings.loading && !linkedHoldings.data);

  return (
    <div className="ez-canvas">
      <div className={s.page}>
        <Greeting
          firstName={firstNameOf(user)}
          greeting={now ? greetingFor(now) : null}
          longDate={now ? fmtLongDate(now) : ''}
          data={data}
          mode={mode}
          loading={loading}
        />
        <KpiStrip data={data} loading={holdingsLoading} />
        <PortfolioSnapshot
          data={data}
          loading={holdingsLoading}
          range={range}
          onRange={(r) => {
            setRange(r);
            setCustom(null);
          }}
          custom={custom}
          onCustom={(r) => {
            setCustom(r);
            setRange('CUSTOM');
          }}
          rows={mode === 'none' ? [] : rows}
          change={mode === 'none' ? null : change}
          seriesLoading={series.isLoading}
          seriesError={series.error}
          onRetry={series.reload}
          mode={mode}
        />
        <div className={s.row2}>
          <HoldingsCard
            data={data}
            loading={holdingsLoading}
            error={linked && linkedHoldings.error && !linkedHoldings.data}
            onRetry={linkedHoldings.reload}
            range={range}
            onRange={(r) => {
              setRange(r);
              setCustom(null);
            }}
            mode={mode}
          />
          <WatchlistCard
            lists={lists}
            selectedId={activeList?.id}
            onSelect={setWatchId}
            rows={data.watchlist}
            loading={wl.loading && !lists.length}
            error={wl.error && !lists.length}
            onRetry={wl.refresh}
          />
        </div>
        <div className={s.row3}>
          <ProfitsCard data={data} loading={holdingsLoading} />
          <SectorCard data={data} loading={holdingsLoading} />
          <TransactionsCard data={data} loading={loading} mode={mode} />
        </div>
      </div>

      <BeginnerSpotlight
        pageKey="home-dashboard"
        steps={[
          {
            targetSelector: '[data-tour="db-snapshot"]',
            message: 'Your portfolio snapshot: value, change and history for the range you pick.',
            position: 'bottom',
          },
          {
            targetSelector: '[data-tour="db-sectors"]',
            message: 'Sector distribution shows how your money is spread across the market.',
            position: 'top',
          },
        ]}
      />
    </div>
  );
}

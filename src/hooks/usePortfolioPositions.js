'use client';

/**
 * The signed-in user's positions in one shape, for the home page's
 * "Top performers" heat map (Nov 2026):
 *   { ticker, name, value, totalPct, dayPct }
 *
 * Source follows the My Portfolio figure on /home: the mock portfolio when
 * the user has one, else linked brokerage holdings (/api/plaid/holdings,
 * priced and given a day move from /api/market/batch-quotes).
 *
 *   const { status, positions } = usePortfolioPositions({ mock, linked, user });
 *   status: 'loading' | 'ready' | 'empty' | 'error'
 */
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';

const num = (v) => (v == null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);

export function usePortfolioPositions({ mock, linked, user }) {
  const useMock = !!mock?.hasMockPortfolio;
  const [linkedState, setLinkedState] = useState({ status: 'idle', rows: [] });

  useEffect(() => {
    if (useMock || !linked || !user) {
      setLinkedState({ status: 'idle', rows: [] });
      return undefined;
    }
    let cancelled = false;
    setLinkedState((s) => ({ ...s, status: 'loading' }));
    (async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) throw new Error('Not signed in');
        const res = await fetch('/api/plaid/holdings', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const agg = (data?.aggregated || []).filter((h) => h.ticker);
        const symbols = [...new Set(agg.map((h) => h.ticker))].join(',');
        const quotes = symbols
          ? await fetch(`/api/market/batch-quotes?symbols=${encodeURIComponent(symbols)}`)
              .then((r) => (r.ok ? r.json() : {}))
              .then((d) => d.quotes || {})
              .catch(() => ({}))
          : {};
        const rows = agg.map((h) => {
          const q = quotes[h.ticker];
          const qty = num(h.totalQuantity) || 0;
          const price = num(q?.price);
          const value = price != null && qty ? price * qty : (num(h.totalValue) ?? 0);
          const basis = num(h.totalCostBasis);
          return {
            ticker: h.ticker,
            name: h.name && h.name !== h.ticker ? h.name : '',
            value,
            totalPct: basis > 0 ? ((value - basis) / basis) * 100 : null,
            dayPct: q ? num(q.changePercent) : null,
          };
        });
        if (!cancelled) setLinkedState({ status: 'ready', rows });
      } catch {
        if (!cancelled) setLinkedState({ status: 'error', rows: [] });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [useMock, linked, user]);

  const mockRows = useMemo(
    () =>
      useMock
        ? (mock.enrichedPositions || []).map((p) => {
            const hasQuote = !!mock.liveQuotes?.[p.symbol];
            return {
              ticker: p.symbol,
              name: p.name && p.name !== p.symbol ? p.name : '',
              value: num(p.posValue),
              totalPct: num(p.pnlPct),
              dayPct: hasQuote ? num(p.dayChangePct) : null,
            };
          })
        : [],
    [useMock, mock?.enrichedPositions, mock?.liveQuotes],
  );

  if (useMock) {
    if (mock.isLoading) return { status: 'loading', positions: [] };
    return { status: mockRows.length ? 'ready' : 'empty', positions: mockRows };
  }
  if (!linked) return { status: 'empty', positions: [] };
  if (linkedState.status === 'idle' || linkedState.status === 'loading')
    return { status: 'loading', positions: [] };
  if (linkedState.status === 'error') return { status: 'error', positions: [] };
  return { status: linkedState.rows.length ? 'ready' : 'empty', positions: linkedState.rows };
}

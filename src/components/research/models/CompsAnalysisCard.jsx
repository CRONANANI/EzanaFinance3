'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { ModelVariableStrip } from '@/components/research/models/ModelVariableStrip';

const MULTIPLE_COLS = [
  { key: 'pe', label: 'P/E', fmt: (v) => v?.toFixed(1) ?? '—' },
  { key: 'evRevenue', label: 'EV/Rev', fmt: (v) => v?.toFixed(1) ?? '—' },
  { key: 'evEbitda', label: 'EV/EBITDA', fmt: (v) => v?.toFixed(1) ?? '—' },
  { key: 'pb', label: 'P/B', fmt: (v) => v?.toFixed(1) ?? '—' },
  { key: 'divYield', label: 'Div Yield', fmt: (v) => (v != null ? `${v.toFixed(1)}%` : '—') },
  { key: 'grossMargin', label: 'Gross Mgn', fmt: (v) => (v != null ? `${v.toFixed(1)}%` : '—') },
  { key: 'revenueGrowth', label: 'Rev Growth', fmt: (v) => (v != null ? `${v.toFixed(1)}%` : '—') },
];

function posColor(pos) {
  if (pos === 'discount') return 'text-green-600 dark:text-green-400';
  if (pos === 'premium') return 'text-red-500 dark:text-red-400';
  return 'text-muted-foreground';
}

function verdictConfig(v) {
  return (
    {
      undervalued: {
        icon: TrendingUp,
        bg: 'bg-green-500/15',
        text: 'text-green-700 dark:text-green-400',
        label: 'Undervalued',
      },
      overvalued: {
        icon: TrendingDown,
        bg: 'bg-red-500/15',
        text: 'text-red-700 dark:text-red-400',
        label: 'Overvalued',
      },
      fairly_valued: {
        icon: Minus,
        bg: 'bg-amber-500/15',
        text: 'text-amber-700 dark:text-amber-400',
        label: 'Fairly Valued',
      },
      insufficient_data: {
        icon: Minus,
        bg: 'bg-muted',
        text: 'text-muted-foreground',
        label: 'Insufficient Data',
      },
    }[v] || { icon: Minus, bg: 'bg-muted', text: 'text-muted-foreground', label: v }
  );
}

export function CompsAnalysisCard({ symbol, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/comps/${encodeURIComponent(symbol)}`, { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) {
        setError(json.error || `Request failed (${res.status})`);
        return;
      }
      setData(json);
    } catch (e) {
      setError(e?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <section className="rounded-xl border border-amber-500/40 bg-card p-5 space-y-4">
        <div className="h-8 w-56 rounded bg-muted/40 animate-pulse" />
        <div className="h-16 rounded bg-muted/40 animate-pulse" />
        <div className="h-64 rounded bg-muted/40 animate-pulse" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-xl border border-border bg-card p-5 text-center space-y-2">
        <div className="flex justify-end">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-2.5 py-1 text-[11px] font-medium hover:bg-muted/50"
            >
              Close
            </button>
          )}
        </div>
        <p className="text-sm font-medium text-foreground">Comparable analysis unavailable</p>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">{error}</p>
        <button
          type="button"
          onClick={load}
          className="mt-2 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted/50"
        >
          Retry
        </button>
      </section>
    );
  }

  if (!data) return null;

  const { target, peers, peerStats, positions, valuation, verdict } = data;
  const vc = verdictConfig(verdict.verdict);
  const VIcon = vc.icon;

  const stripVars = [
    { label: 'Price', value: target.price != null ? `$${target.price.toFixed(2)}` : '—' },
    { label: 'Mkt Cap', value: target.marketCapFormatted || '—' },
    { label: 'P/E', value: target.pe?.toFixed(1) ?? '—' },
    { label: 'EV/EBITDA', value: target.evEbitda?.toFixed(1) ?? '—' },
    { label: 'Peers', value: `${peers.length}` },
    {
      label: 'vs. Peers',
      value:
        valuation.premiumDiscount != null
          ? `${valuation.premiumDiscount > 0 ? '+' : ''}${valuation.premiumDiscount.toFixed(1)}%`
          : '—',
    },
  ];

  return (
    <section className="rounded-xl border border-amber-500/40 bg-card p-5 space-y-4 ring-1 ring-amber-500/20">
      <header className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 shrink-0 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              Comparable Company Analysis
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              Peer benchmarking · {symbol} · {target.sector || 'N/A'} · {peers.length} peers
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${vc.bg}`}>
            <VIcon className={`h-4 w-4 ${vc.text}`} />
            <div className="text-right">
              <div className={`text-xs font-semibold ${vc.text}`}>{vc.label}</div>
              <div className="text-[10px] text-muted-foreground">vs. peer median</div>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border bg-muted/40 px-2.5 py-1.5 text-[11px] font-medium hover:bg-muted/60"
            >
              Close
            </button>
          )}
        </div>
      </header>

      <ModelVariableStrip variables={stripVars} />

      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-3 py-2 font-semibold text-foreground sticky left-0 bg-muted/30 min-w-[120px]">
                Company
              </th>
              <th className="px-2 py-2 font-medium text-muted-foreground text-right">Mkt Cap</th>
              {MULTIPLE_COLS.map((c) => (
                <th key={c.key} className="px-2 py-2 font-medium text-muted-foreground text-right">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-amber-500/30 bg-amber-500/5">
              <td className="px-3 py-2 font-semibold text-amber-700 dark:text-amber-400 sticky left-0 bg-amber-500/5">
                {target.symbol}
                <span className="text-[10px] text-muted-foreground ml-1 font-normal">Target</span>
              </td>
              <td className="px-2 py-2 text-right font-mono text-foreground">
                {target.marketCapFormatted}
              </td>
              {MULTIPLE_COLS.map((c) => {
                const pos = positions[c.key]?.position;
                return (
                  <td key={c.key} className={`px-2 py-2 text-right font-mono ${posColor(pos)}`}>
                    {c.fmt(target[c.key])}
                  </td>
                );
              })}
            </tr>

            {peers.map((p) => (
              <tr key={p.symbol} className="border-b border-border/50 hover:bg-muted/20">
                <td className="px-3 py-2 font-medium text-foreground sticky left-0 bg-card">
                  <span>{p.symbol}</span>
                  <span className="text-[10px] text-muted-foreground ml-1 block truncate max-w-[100px]">
                    {p.name}
                  </span>
                </td>
                <td className="px-2 py-2 text-right font-mono text-muted-foreground">
                  {p.marketCapFormatted}
                </td>
                {MULTIPLE_COLS.map((c) => (
                  <td key={c.key} className="px-2 py-2 text-right font-mono text-muted-foreground">
                    {c.fmt(p[c.key])}
                  </td>
                ))}
              </tr>
            ))}

            <tr className="border-t-2 border-border bg-muted/20">
              <td className="px-3 py-2 font-semibold text-foreground sticky left-0 bg-muted/20">
                Peer Median
              </td>
              <td className="px-2 py-2" />
              {MULTIPLE_COLS.map((c) => (
                <td
                  key={c.key}
                  className="px-2 py-2 text-right font-mono font-semibold text-foreground"
                >
                  {c.fmt(peerStats[c.key]?.median)}
                </td>
              ))}
            </tr>
            <tr className="bg-muted/10">
              <td className="px-3 py-1.5 text-[10px] text-muted-foreground sticky left-0 bg-muted/10">
                25th – 75th pctl
              </td>
              <td className="px-2 py-1.5" />
              {MULTIPLE_COLS.map((c) => {
                const s = peerStats[c.key];
                return (
                  <td
                    key={c.key}
                    className="px-2 py-1.5 text-right text-[10px] font-mono text-muted-foreground"
                  >
                    {s?.p25 != null ? `${c.fmt(s.p25)} – ${c.fmt(s.p75)}` : '—'}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {valuation.methods.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <h4 className="text-xs font-semibold text-foreground">
            Implied Valuation (Peer-Median Multiples)
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {valuation.methods.map((m) => {
              const diff = target.price
                ? ((m.impliedPrice - target.price) / target.price) * 100
                : 0;
              const isUp = diff > 0;
              return (
                <div
                  key={m.method}
                  className="rounded-md border border-border bg-muted/20 p-3 text-center space-y-1"
                >
                  <div className="text-[10px] text-muted-foreground">{m.method}</div>
                  <div className="text-sm font-semibold font-mono text-foreground">
                    ${m.impliedPrice.toFixed(2)}
                  </div>
                  <div
                    className={`text-[10px] font-medium flex items-center justify-center gap-0.5 ${isUp ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}
                  >
                    {isUp ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {isUp ? '+' : ''}
                    {diff.toFixed(1)}% vs current
                  </div>
                </div>
              );
            })}
          </div>
          {valuation.avgImpliedPrice && (
            <div className="text-center pt-2 border-t border-border">
              <span className="text-xs text-muted-foreground">Average implied price: </span>
              <span className="text-sm font-semibold font-mono text-foreground">
                ${valuation.avgImpliedPrice.toFixed(2)}
              </span>
              <span className="text-xs text-muted-foreground ml-2">
                ({valuation.premiumDiscount > 0 ? '+' : ''}
                {valuation.premiumDiscount?.toFixed(1)}%{' '}
                {valuation.premiumDiscount > 0 ? 'premium' : 'discount'} to current)
              </span>
            </div>
          )}
        </div>
      )}

      <div className="rounded-md border border-border bg-muted/30 p-3 flex gap-2 text-[11px] text-muted-foreground leading-relaxed">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <div>
          <strong className="text-foreground">How this works:</strong> Peers are selected by
          FMP&apos;s peer-matching algorithm (sector, size, business model). Multiples are TTM
          (trailing twelve months). Implied valuation applies peer-median multiples to {symbol}
          &apos;s financials. Premium/discount reflects where {symbol} trades vs. the peer median —
          a discount may indicate undervaluation or justified by lower growth/margins. This is one
          framework among many.
        </div>
      </div>
    </section>
  );
}

export default CompsAnalysisCard;

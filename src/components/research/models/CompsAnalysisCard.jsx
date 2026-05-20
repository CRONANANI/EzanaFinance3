'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
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
  if (pos === 'discount') return 'text-green-700 dark:text-green-400';
  if (pos === 'premium') return 'text-red-600 dark:text-red-400';
  return 'text-gray-500 dark:text-gray-400';
}

function verdictConfig(v) {
  return (
    {
      undervalued: {
        icon: TrendingUp,
        bg: 'bg-green-50 dark:bg-green-500/15',
        text: 'text-green-700 dark:text-green-400',
        label: 'Undervalued',
      },
      overvalued: {
        icon: TrendingDown,
        bg: 'bg-red-50 dark:bg-red-500/15',
        text: 'text-red-700 dark:text-red-400',
        label: 'Overvalued',
      },
      fairly_valued: {
        icon: Minus,
        bg: 'bg-amber-50 dark:bg-amber-500/15',
        text: 'text-amber-700 dark:text-amber-400',
        label: 'Fairly Valued',
      },
      insufficient_data: {
        icon: Minus,
        bg: 'bg-gray-100 dark:bg-gray-800',
        text: 'text-gray-500 dark:text-gray-400',
        label: 'Insufficient Data',
      },
    }[v] || {
      icon: Minus,
      bg: 'bg-gray-100 dark:bg-gray-800',
      text: 'text-gray-500 dark:text-gray-400',
      label: v,
    }
  );
}

function computeRankScore(p) {
  let score = 0;
  let count = 0;
  if (p.grossMargin != null) {
    score += p.grossMargin;
    count++;
  }
  if (p.revenueGrowth != null) {
    score += p.revenueGrowth;
    count++;
  }
  if (p.divYield != null) {
    score += p.divYield * 2;
    count++;
  }
  if (p.pe != null && p.pe > 0) {
    score += 100 / p.pe;
    count++;
  }
  if (p.evEbitda != null && p.evEbitda > 0) {
    score += 50 / p.evEbitda;
    count++;
  }
  if (p.evRevenue != null && p.evRevenue > 0) {
    score += 20 / p.evRevenue;
    count++;
  }
  if (p.marketCap != null) {
    score += Math.log10(Math.max(p.marketCap, 1)) * 0.5;
    count++;
  }
  return count > 0 ? score / count : 0;
}

function SortIcon({ sortKey, activeKey, direction }) {
  if (sortKey !== activeKey) return <ChevronsUpDown className="h-3 w-3 opacity-30" />;
  if (direction === 'asc') return <ChevronUp className="h-3 w-3" />;
  return <ChevronDown className="h-3 w-3" />;
}

export function CompsAnalysisCard({ symbol, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('desc');

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

  const handleSort = (key) => {
    if (sortKey === key) {
      if (sortDir === 'desc') setSortDir('asc');
      else {
        setSortKey(null);
        setSortDir('desc');
      }
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const sortedPeers = useMemo(() => {
    if (!data?.peers) return [];
    if (!sortKey) return data.peers;
    const peers = [...data.peers];
    peers.sort((a, b) => {
      let va;
      let vb;
      if (sortKey === 'ranking') {
        va = computeRankScore(a);
        vb = computeRankScore(b);
      } else if (sortKey === 'marketCap') {
        va = a.marketCap ?? 0;
        vb = b.marketCap ?? 0;
      } else {
        va = a[sortKey] ?? -Infinity;
        vb = b[sortKey] ?? -Infinity;
      }
      if (va === -Infinity && vb === -Infinity) return 0;
      if (va === -Infinity) return 1;
      if (vb === -Infinity) return -1;
      return sortDir === 'asc' ? va - vb : vb - va;
    });
    return peers;
  }, [data?.peers, sortKey, sortDir]);

  if (loading) {
    return (
      <section className="rounded-xl border border-amber-500/40 bg-white dark:bg-[#0d1117] p-5 space-y-4">
        <div className="h-8 w-56 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
        <div className="h-16 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
        <div className="h-64 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0d1117] p-5 text-center space-y-2">
        <div className="flex justify-end">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 dark:border-gray-700 px-2.5 py-1 text-[11px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Close
            </button>
          )}
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          Comparable analysis unavailable
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto">{error}</p>
        <button
          type="button"
          onClick={load}
          className="mt-2 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Retry
        </button>
      </section>
    );
  }

  if (!data) return null;

  const { target, peerStats, positions, valuation, verdict } = data;
  const peers = sortedPeers;
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

  const thBase = 'px-2 py-2 font-medium text-right cursor-pointer select-none transition-colors';
  const thHover = 'hover:text-amber-700 dark:hover:text-amber-400';
  const thInactive = 'text-gray-500 dark:text-gray-400';
  const thActive = 'text-amber-700 dark:text-amber-400';

  return (
    <section className="rounded-xl border border-amber-500/40 bg-white dark:bg-[#0d1117] p-5 space-y-4 ring-1 ring-amber-500/20">
      <header className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 shrink-0 rounded-lg bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 flex items-center justify-center">
            <BarChart3 className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-400">
              Comparable Company Analysis
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              Peer benchmarking · {symbol} · {target.sector || 'N/A'} · {peers.length} peers
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${vc.bg}`}>
            <VIcon className={`h-4 w-4 ${vc.text}`} />
            <div className="text-right">
              <div className={`text-xs font-semibold ${vc.text}`}>{vc.label}</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400">vs. peer median</div>
            </div>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40 px-2.5 py-1.5 text-[11px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800/60"
            >
              Close
            </button>
          )}
        </div>
      </header>

      <ModelVariableStrip variables={stripVars} />

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0d1117] overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#161b22]">
              <th
                className={`text-left px-3 py-2 font-semibold sticky left-0 bg-gray-50 dark:bg-[#161b22] min-w-[120px] cursor-pointer select-none ${thHover} ${sortKey === 'ranking' ? thActive : 'text-gray-900 dark:text-white'}`}
                onClick={() => handleSort('ranking')}
              >
                <span className="flex items-center gap-1">
                  Company Ranking
                  <SortIcon sortKey="ranking" activeKey={sortKey} direction={sortDir} />
                </span>
              </th>
              <th
                className={`${thBase} ${thHover} ${sortKey === 'marketCap' ? thActive : thInactive}`}
                onClick={() => handleSort('marketCap')}
              >
                <span className="flex items-center justify-end gap-1">
                  Mkt Cap
                  <SortIcon sortKey="marketCap" activeKey={sortKey} direction={sortDir} />
                </span>
              </th>
              {MULTIPLE_COLS.map((c) => (
                <th
                  key={c.key}
                  className={`${thBase} ${thHover} ${sortKey === c.key ? thActive : thInactive}`}
                  onClick={() => handleSort(c.key)}
                >
                  <span className="flex items-center justify-end gap-1">
                    {c.label}
                    <SortIcon sortKey={c.key} activeKey={sortKey} direction={sortDir} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/5">
              <td className="px-3 py-2 font-semibold text-amber-800 dark:text-amber-400 sticky left-0 bg-amber-50 dark:bg-amber-500/5">
                {target.symbol}
                <span className="text-[10px] text-gray-500 dark:text-gray-400 ml-1 font-normal">
                  Target
                </span>
              </td>
              <td className="px-2 py-2 text-right font-mono text-gray-900 dark:text-white">
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

            {peers.map((p, idx) => (
              <tr
                key={p.symbol}
                className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-[#161b22]"
              >
                <td className="px-3 py-2 font-medium text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-[#0d1117]">
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 mr-1.5 font-mono">
                    {idx + 1}.
                  </span>
                  <span>{p.symbol}</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-1 block truncate max-w-[100px]">
                    {p.name}
                  </span>
                </td>
                <td className="px-2 py-2 text-right font-mono text-gray-600 dark:text-gray-400">
                  {p.marketCapFormatted}
                </td>
                {MULTIPLE_COLS.map((c) => (
                  <td
                    key={c.key}
                    className="px-2 py-2 text-right font-mono text-gray-600 dark:text-gray-400"
                  >
                    {c.fmt(p[c.key])}
                  </td>
                ))}
              </tr>
            ))}

            <tr className="border-t-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#161b22]">
              <td className="px-3 py-2 font-semibold text-gray-900 dark:text-white sticky left-0 bg-gray-50 dark:bg-[#161b22]">
                Peer Median
              </td>
              <td className="px-2 py-2" />
              {MULTIPLE_COLS.map((c) => (
                <td
                  key={c.key}
                  className="px-2 py-2 text-right font-mono font-semibold text-gray-900 dark:text-white"
                >
                  {c.fmt(peerStats[c.key]?.median)}
                </td>
              ))}
            </tr>
            <tr className="bg-gray-50/50 dark:bg-[#161b22]/50">
              <td className="px-3 py-1.5 text-[10px] text-gray-400 dark:text-gray-500 sticky left-0 bg-gray-50/50 dark:bg-[#161b22]/50">
                25th – 75th pctl
              </td>
              <td className="px-2 py-1.5" />
              {MULTIPLE_COLS.map((c) => {
                const s = peerStats[c.key];
                return (
                  <td
                    key={c.key}
                    className="px-2 py-1.5 text-right text-[10px] font-mono text-gray-400 dark:text-gray-500"
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
        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-[#0d1117] p-4 space-y-3">
          <h4 className="text-xs font-semibold text-gray-900 dark:text-white">
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
                  className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#161b22] p-3 text-center space-y-1"
                >
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">{m.method}</div>
                  <div className="text-sm font-semibold font-mono text-gray-900 dark:text-white">
                    ${m.impliedPrice.toFixed(2)}
                  </div>
                  <div
                    className={`text-[10px] font-medium flex items-center justify-center gap-0.5 ${isUp ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
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
            <div className="text-center pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Average implied price:{' '}
              </span>
              <span className="text-sm font-semibold font-mono text-gray-900 dark:text-white">
                ${valuation.avgImpliedPrice.toFixed(2)}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                ({valuation.premiumDiscount > 0 ? '+' : ''}
                {valuation.premiumDiscount?.toFixed(1)}%{' '}
                {valuation.premiumDiscount > 0 ? 'premium' : 'discount'} to current)
              </span>
            </div>
          )}
        </div>
      )}

      <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#161b22] p-3 flex gap-2 text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <div>
          <strong className="text-gray-900 dark:text-white">How this works:</strong> Peers are
          selected by FMP&apos;s peer-matching algorithm (sector, size, business model). Multiples
          are TTM (trailing twelve months). Implied valuation applies peer-median multiples to{' '}
          {symbol}
          &apos;s financials. Click any column header to sort peers. Company Ranking sorts by a
          composite score based on margins, growth, and valuation efficiency.
        </div>
      </div>
    </section>
  );
}

export default CompsAnalysisCard;

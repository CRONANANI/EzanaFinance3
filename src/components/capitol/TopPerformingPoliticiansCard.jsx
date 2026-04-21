'use client';

/**
 * Top Performing Politicians card for the Inside the Capitol page.
 *
 * Data source: /api/politicians/top-performers, which reads from the
 * precomputed `politician_annual_performance` table. The weekly cron
 * refreshes the current + previous year; a manual backfill populates
 * 2016–present.
 *
 * IMPORTANT — methodology disclosure:
 *   These numbers are *estimated* return on disclosed trades, not actual
 *   portfolio return. Congressional disclosures report amounts only as
 *   ranges and don't match buys to specific sells, so we compute an
 *   honest best-estimate using midpoint position size + historical prices
 *   from transaction date to the earlier of a same-year sell or year end.
 *   The Info button exposes this directly in the UI — do not remove it.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = (() => {
  const years = [];
  for (let y = CURRENT_YEAR; y >= 2016; y--) years.push(String(y));
  years.push('all');
  return years;
})();

const PARTY_COLORS = {
  R: '#ef4444',
  D: '#3b82f6',
  I: '#a855f7',
};

function slugify(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function shortName(fullName) {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 2) return fullName;
  return `${parts[0][0]}. ${parts[parts.length - 1]}`;
}

function formatCurrency(n) {
  const num = Number(n) || 0;
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}k`;
  return `${sign}$${Math.round(abs)}`;
}

export function TopPerformingPoliticiansCard({ onOpenPolitician }) {
  const [year, setYear] = useState(String(CURRENT_YEAR));
  const [showMethodology, setShowMethodology] = useState(false);
  const [performers, setPerformers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    fetch(`/api/politicians/top-performers?year=${year}&limit=10`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d?.error) throw new Error(d.error);
        setPerformers(Array.isArray(d?.performers) ? d.performers : []);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [year]);

  const chartData = useMemo(
    () =>
      performers.map((p) => ({
        name: shortName(p.politician_name),
        fullName: p.politician_name,
        pnl: Math.round(Number(p.estimated_pnl) || 0),
        party: p.party,
        chamber: p.chamber,
        trades: p.num_trades,
        biggestWinner: p.biggest_winner_symbol,
        returnPct:
          p.estimated_return_pct != null
            ? Number(p.estimated_return_pct)
            : null,
      })),
    [performers]
  );

  const yearLabel = year === 'all' ? 'All-time (2016–present)' : year;
  const maxPnl = chartData.reduce((m, r) => Math.max(m, r.pnl), 0);

  return (
    <section className="itc-top-perf" data-capitol-card>
      <header className="itc-top-perf-hdr">
        <div className="itc-top-perf-hdr-main">
          <h3 className="itc-top-perf-title">Top Performing Politicians</h3>
          <p className="itc-top-perf-sub">
            Estimated return on disclosed trades · {yearLabel}
          </p>
        </div>

        <div className="itc-top-perf-controls">
          <label className="itc-top-perf-year-lbl" htmlFor="itc-top-perf-year">
            Year
          </label>
          <select
            id="itc-top-perf-year"
            className="itc-top-perf-year"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y === 'all' ? 'All-time' : y}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="itc-top-perf-info-btn"
            aria-label="About this data"
            aria-pressed={showMethodology}
            onClick={() => setShowMethodology((v) => !v)}
          >
            <i className="bi bi-info-circle" />
          </button>
        </div>
      </header>

      {showMethodology && (
        <div className="itc-top-perf-method" role="note">
          <strong>How this is calculated:</strong> We estimate position size
          using the midpoint of each disclosed amount range, pull entry/exit
          prices from historical market data, and match buys to sells where
          possible within the same calendar year. Unmatched buys are priced
          to year-end. These are <em>estimates</em> — congressional
          disclosures report amounts only as ranges and don&apos;t include
          cost-basis tracking, so actual returns may differ. This metric
          reflects disclosed trades only, not total portfolio return.
        </div>
      )}

      {isLoading ? (
        <div className="itc-top-perf-state">Loading performance data…</div>
      ) : error ? (
        <div className="itc-top-perf-state">Could not load performance data.</div>
      ) : chartData.length === 0 ? (
        <div className="itc-top-perf-state">
          No disclosed-trade data available for {yearLabel} yet.
          <div className="itc-top-perf-state-hint">
            Historical years populate after the initial backfill runs.
          </div>
        </div>
      ) : (
        <div className="itc-top-perf-body">
          <div className="itc-top-perf-chart">
            <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 28)}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: 'var(--text-secondary, #8b949e)' }}
                  tickFormatter={(v) => formatCurrency(v)}
                  domain={[0, maxPnl > 0 ? 'auto' : 1]}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: 'var(--text-primary, #f0f6fc)' }}
                  width={90}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(16,185,129,0.06)' }}
                  contentStyle={{
                    background: 'rgba(17, 24, 39, 0.95)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: 8,
                    fontSize: 12,
                    color: '#f0f6fc',
                  }}
                  formatter={(v) => [formatCurrency(v), 'Estimated P&L']}
                  labelFormatter={(label, payload) =>
                    payload?.[0]?.payload?.fullName ?? label
                  }
                />
                <Bar dataKey="pnl" radius={[0, 4, 4, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        entry.pnl < 0
                          ? '#6b7280'
                          : PARTY_COLORS[entry.party] || '#10b981'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <ol className="itc-top-perf-list">
            {chartData.map((p, i) => {
              const pol = performers[i];
              const slug = slugify(pol?.politician_name);
              const pnlClass = p.pnl >= 0 ? 'pos' : 'neg';
              const partyLabel = p.party === 'D' ? 'Democrat' : p.party === 'R' ? 'Republican' : p.party === 'I' ? 'Independent' : null;

              return (
                <li key={pol?.politician_id ?? p.fullName} className="itc-top-perf-row">
                  <span className="itc-top-perf-rank">{i + 1}</span>
                  <div className="itc-top-perf-id">
                    {slug ? (
                      <Link
                        href={`/inside-the-capitol/${slug}`}
                        className="itc-top-perf-name"
                        onClick={() => onOpenPolitician?.()}
                      >
                        {p.fullName}
                      </Link>
                    ) : (
                      <span className="itc-top-perf-name">{p.fullName}</span>
                    )}
                    <span className="itc-top-perf-meta">
                      {p.chamber === 'senate' ? 'Senate' : 'House'}
                      {partyLabel ? ` · ${partyLabel}` : ''} · {p.trades} trades
                      {p.biggestWinner ? ` · top: $${p.biggestWinner}` : ''}
                    </span>
                  </div>
                  <div className={`itc-top-perf-pnl ${pnlClass}`}>
                    {p.pnl >= 0 ? '+' : ''}{formatCurrency(p.pnl)}
                    {Number.isFinite(p.returnPct) && (
                      <span className="itc-top-perf-pct">
                        {p.returnPct >= 0 ? '+' : ''}{p.returnPct.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      <footer className="itc-top-perf-foot">
        Source: FMP congressional disclosures · Historical prices via FMP ·
        Methodology: estimated P&amp;L on disclosed trades only.
      </footer>
    </section>
  );
}

export default TopPerformingPoliticiansCard;

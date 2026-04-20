'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import './performance-chart.css';

/**
 * Performance vs. Platform card on the My Profile page.
 *
 * Data flow:
 *   - The user's full cumulative-from-inception daily series comes in via
 *     `userSeriesFull` ([{date, cumReturnPct}]). We slice & rebase it to the
 *     selected window client-side so the "You" line shows window-local
 *     cumulative return (directly comparable to the platform lines below).
 *   - The platform typical (p50) and top-25% (p75) lines come from
 *     `/api/platform-aggregates?window=...` — precomputed nightly from the
 *     cross-sectional distribution of every user's window-local return.
 *     No per-request aggregation happens.
 *
 * Time ranges: 1W | 1M | 3M | YTD. Default 1M. (1Y and All were removed
 * because the platform sample isn't deep enough to produce meaningful
 * multi-year distributions yet.)
 *
 * Back-compat: callers that still pass the legacy `userSeries` prop
 * ([{date, user}]) keep rendering — we treat it as userSeriesFull with the
 * `user` field renamed.
 *
 * @param {{
 *   userSeriesFull?: Array<{ date: string, cumReturnPct: number }>,
 *   userSeries?: Array<{ date: string, user: number }>,
 * }} props
 */
export function PerformanceChart({
  userSeriesFull = null,
  userSeries = null,
}) {
  const [range, setRange] = useState('1M');
  const [platformResp, setPlatformResp] = useState(null);
  const [platformLoading, setPlatformLoading] = useState(true);

  // Normalize whichever shape the caller gave us into {date, cumReturnPct}.
  const normalizedFull = useMemo(() => {
    if (Array.isArray(userSeriesFull) && userSeriesFull.length) {
      return userSeriesFull;
    }
    if (Array.isArray(userSeries) && userSeries.length) {
      return userSeries.map((p) => ({
        date: p.date,
        cumReturnPct: Number(p.user) || 0,
      }));
    }
    return [];
  }, [userSeriesFull, userSeries]);

  // Fetch platform aggregates whenever the range changes. Uses plain fetch
  // (no SWR dep) — the response is `Cache-Control: public, max-age=300` so
  // repeated range toggles hit the browser cache cheaply.
  useEffect(() => {
    let cancelled = false;
    setPlatformLoading(true);
    fetch(`/api/platform-aggregates?window=${encodeURIComponent(range)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled) setPlatformResp(d);
      })
      .catch(() => {
        if (!cancelled) setPlatformResp(null);
      })
      .finally(() => {
        if (!cancelled) setPlatformLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  // Window-local user series (rebased to the selected range's starting point).
  const userWindowSeries = useMemo(
    () => computeWindowLocalSeries(normalizedFull, range),
    [normalizedFull, range],
  );

  // Merge user + platform + cohort on date.
  const merged = useMemo(() => {
    const byDate = new Map();
    for (const u of userWindowSeries) {
      byDate.set(u.date, { date: u.date, user: u.ret });
    }
    for (const p of platformResp?.points ?? []) {
      const row = byDate.get(p.date) ?? { date: p.date };
      row.platform = p.platform;
      row.cohort = p.cohort;
      byDate.set(p.date, row);
    }
    return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [userWindowSeries, platformResp]);

  const points = platformResp?.points ?? [];
  const sampleSize = points.length ? points[points.length - 1].sampleSize : undefined;

  const hasPlatform = merged.some((r) => typeof r.platform === 'number');
  const hasCohort = merged.some((r) => typeof r.cohort === 'number');

  return (
    <div className="pc-card">
      <div className="pc-head">
        <div>
          <h2 className="pc-title">Performance vs. Platform</h2>
          <p className="pc-subtitle">
            Your cumulative return vs. the typical user and top 25%
            {typeof sampleSize === 'number' && sampleSize > 0
              ? ` · based on ${sampleSize.toLocaleString()} investors`
              : ''}
          </p>
        </div>
        <div className="pc-range" role="tablist" aria-label="Select time range">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={range === r}
              className={`pc-range-btn ${range === r ? 'on' : ''}`}
              onClick={() => setRange(r)}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="pc-chart-wrap">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={merged} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--chart-grid, rgba(107,114,128,0.18))"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'var(--text-muted, #8b949e)' }}
              tickLine={false}
              axisLine={false}
              minTickGap={24}
            />
            <YAxis
              tickFormatter={(v) => `${Number(v).toFixed(0)}%`}
              tick={{ fontSize: 10, fill: 'var(--text-muted, #8b949e)' }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(16,185,129,0.25)' }} />
            <Legend
              wrapperStyle={{ fontSize: 11, color: 'var(--text-muted, #8b949e)', paddingTop: 6 }}
              iconType="plainline"
            />
            <Line
              type="monotone"
              dataKey="user"
              name="You"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
            {hasPlatform && (
              <Line
                type="monotone"
                dataKey="platform"
                name="Platform typical"
                stroke="var(--text-muted, #8b949e)"
                strokeWidth={1.75}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            )}
            {hasCohort && (
              <Line
                type="monotone"
                dataKey="cohort"
                name="Top 25%"
                stroke="#3b82f6"
                strokeWidth={1.75}
                strokeDasharray="5 4"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {platformLoading && !hasPlatform && (
        <p className="pc-note">Loading platform data…</p>
      )}
      {!platformLoading && !hasPlatform && (
        <p className="pc-note">
          Platform comparison not yet available — check back once nightly
          aggregates have run.
        </p>
      )}
      {typeof sampleSize === 'number' && sampleSize > 0 && sampleSize < 30 && (
        <p className="pc-warn">
          Platform comparison is preliminary — based on {sampleSize} active
          investor{sampleSize === 1 ? '' : 's'}. Results will stabilize as
          more users join.
        </p>
      )}
    </div>
  );
}

const RANGES = ['1W', '1M', '3M', 'YTD'];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="pc-tooltip">
      <div className="pc-tooltip-date">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="pc-tooltip-row">
          <span className="pc-tooltip-dot" style={{ background: p.color }} />
          <span className="pc-tooltip-name">{p.name}</span>
          <span className="pc-tooltip-val">
            {p.value == null
              ? '—'
              : `${Number(p.value) >= 0 ? '+' : ''}${Number(p.value).toFixed(2)}%`}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * Slice `full` down to the requested window and rebase every point so the
 * series shows window-local cumulative return (starting at 0 on the window
 * start). The rebasing formula matches the server-side aggregation:
 *     r_local = (1 + c_end/100) / (1 + c_start/100) - 1
 *
 * @param {Array<{ date: string, cumReturnPct: number }>} full
 * @param {'1W' | '1M' | '3M' | 'YTD'} range
 * @returns {Array<{ date: string, ret: number }>}
 */
function computeWindowLocalSeries(full, range) {
  if (!full || full.length === 0) return [];

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const windowStart = (() => {
    if (range === 'YTD') {
      return new Date(Date.UTC(today.getUTCFullYear(), 0, 1));
    }
    const days = range === '1W' ? 7 : range === '1M' ? 30 : 90;
    const d = new Date(today.getTime());
    d.setUTCDate(d.getUTCDate() - days);
    return d;
  })();
  const fromIso = windowStart.toISOString().slice(0, 10);

  const sorted = [...full].sort((a, b) => a.date.localeCompare(b.date));
  const anchor = sorted.find((r) => r.date >= fromIso) ?? sorted[0];
  const anchorCum = Number(anchor.cumReturnPct) || 0;

  return sorted
    .filter((r) => r.date >= fromIso)
    .map((r) => ({
      date: r.date,
      ret: ((1 + Number(r.cumReturnPct) / 100) / (1 + anchorCum / 100) - 1) * 100,
    }));
}

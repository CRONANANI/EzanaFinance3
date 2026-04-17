'use client';

import { useMemo, useState } from 'react';
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

const RANGES = ['1W', '1M', '3M', '1Y', 'All'];

const RANGE_POINTS = {
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '1Y': 252,
  All: 252,
};

function sliceSeries(series, max) {
  if (!Array.isArray(series) || series.length === 0) return [];
  if (series.length <= max) return series;
  return series.slice(series.length - max);
}

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
            {p.value == null ? '—' : `${Number(p.value).toFixed(2)}%`}
          </span>
        </div>
      ))}
    </div>
  );
}

export function PerformanceChart({
  userSeries = [],
  platformAvgSeries = null,
  cohortSeries = null,
}) {
  const [range, setRange] = useState('1M');

  const merged = useMemo(() => {
    const max = RANGE_POINTS[range] ?? 30;
    const u = sliceSeries(userSeries, max);
    const byDate = new Map();
    for (const p of u) byDate.set(p.date, { date: p.date, user: p.user });

    if (Array.isArray(platformAvgSeries) && platformAvgSeries.length) {
      const plat = sliceSeries(platformAvgSeries, max);
      plat.forEach((p, i) => {
        const key = p.date || u[i]?.date || `d${i}`;
        const row = byDate.get(key) || { date: key };
        row.platform = p.platform;
        byDate.set(key, row);
      });
    }
    if (Array.isArray(cohortSeries) && cohortSeries.length) {
      const co = sliceSeries(cohortSeries, max);
      co.forEach((p, i) => {
        const key = p.date || u[i]?.date || `d${i}`;
        const row = byDate.get(key) || { date: key };
        row.cohort = p.cohort;
        byDate.set(key, row);
      });
    }
    return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  }, [userSeries, platformAvgSeries, cohortSeries, range]);

  const hasPlatform = merged.some((r) => typeof r.platform === 'number');
  const hasCohort = merged.some((r) => typeof r.cohort === 'number');

  return (
    <div className="pc-card">
      <div className="pc-head">
        <div>
          <h2 className="pc-title">Performance vs. Platform</h2>
          <p className="pc-subtitle">Cumulative return compared to the platform average</p>
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
              isAnimationActive={false}
            />
            {hasPlatform && (
              <Line
                type="monotone"
                dataKey="platform"
                name="Platform avg"
                stroke="var(--text-muted, #8b949e)"
                strokeWidth={1.75}
                dot={false}
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
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {!hasPlatform && (
        <p className="pc-note">
          Peer comparison is being calculated — check back soon.
        </p>
      )}
    </div>
  );
}

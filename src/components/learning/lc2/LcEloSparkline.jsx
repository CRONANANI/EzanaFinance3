'use client';

import { useEffect, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

/**
 * Learning ELO chart. Replaces the hand-drawn sparkline with the same
 * recharts recipe the home page uses for the portfolio chart, so the two
 * surfaces read as one system.
 *
 * Filename kept as LcEloSparkline.jsx to avoid churn in the import graph;
 * the export is LcEloChart because that is what it now is.
 */
function Lc3ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="lc3-chart-tip">
      <div className="lc3-chart-tip-l">{p.label}</div>
      <div className="lc3-chart-tip-v">{p.rating} ELO</div>
    </div>
  );
}

export function LcEloChart({ data }) {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  const series = Array.isArray(data) && data.length >= 2 ? data : [];
  if (series.length === 0) {
    return <p className="lc3-empty">Not enough rating history to chart yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={series}>
        <defs>
          <linearGradient id="lc3EloFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--lc3-green)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--lc3-green)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--lc3-chart-grid)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: 'var(--lc3-text-label)', fontSize: 11 }}
          axisLine={{ stroke: 'var(--lc3-border-rule)' }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: 'var(--lc3-text-label)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={44}
          domain={['dataMin - 15', 'dataMax + 15']}
        />
        <Tooltip content={<Lc3ChartTooltip />} />
        <Area
          type="monotone"
          dataKey="rating"
          stroke="var(--lc3-green)"
          strokeWidth={2}
          fill="url(#lc3EloFill)"
          isAnimationActive={!reduced}
          animationDuration={400}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default LcEloChart;

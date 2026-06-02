'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import './landing-portfolio-chart.css';

const END_VALUE = 127843.52;

function generateSeries(startValue, pointCount, daysBack) {
  const points = [];
  const now = Date.now();
  const step = (daysBack * 24 * 60 * 60 * 1000) / (pointCount - 1);
  for (let i = 0; i < pointCount; i++) {
    const t = i / (pointCount - 1);
    const noise = Math.sin(i * 1.7) * 0.015 + Math.cos(i * 0.9) * 0.01;
    const value = startValue + (END_VALUE - startValue) * t * (1 + noise * (1 - t));
    points.push({
      at: new Date(now - daysBack * 24 * 60 * 60 * 1000 + i * step).toISOString(),
      value: Math.round(value * 100) / 100,
    });
  }
  points[points.length - 1].value = END_VALUE;
  return points;
}

const LANDING_SERIES = {
  '1D': generateSeries(127200, 24, 1),
  '1W': generateSeries(124996.21, 28, 7),
  '1M': generateSeries(122500, 30, 30),
  '1Y': generateSeries(108000, 52, 365),
};

function formatUSD(v) {
  if (!Number.isFinite(v)) return '$0';
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

function formatDateLabel(iso, range) {
  const d = new Date(iso);
  if (range === '1D') {
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }
  if (range === '1W' || range === '1M') {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="lpc-tooltip">
      <div className="lpc-tooltip-date lf-mono">
        {new Date(p.at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </div>
      <div className="lpc-tooltip-value lf-mono">{formatUSD(p.value)}</div>
    </div>
  );
}

export default function LandingPortfolioChart({ range = '1W' }) {
  const rawPoints = LANDING_SERIES[range] || LANDING_SERIES['1W'];

  const chartData = useMemo(
    () =>
      rawPoints.map((p) => ({
        ...p,
        label: formatDateLabel(p.at, range),
      })),
    [rawPoints, range],
  );

  const stats = useMemo(() => {
    if (chartData.length < 2) return null;
    const start = chartData[0].value;
    const end = chartData[chartData.length - 1].value;
    const change = end - start;
    const changePct = start > 0 ? (change / start) * 100 : 0;
    return { isPositive: change >= 0 };
  }, [chartData]);

  const lineColor = stats?.isPositive === false ? '#ef4444' : '#10b981';
  const gradientId = stats?.isPositive === false ? 'lpc-gradient-down' : 'lpc-gradient-up';

  return (
    <div className="lpc-chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="lpc-gradient-up" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="lpc-gradient-down" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{
              className: 'lpc-axis-tick lf-mono',
              fontSize: 10,
              fontFamily: 'var(--font-mono, monospace)',
            }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={40}
          />
          <YAxis
            tick={{
              className: 'lpc-axis-tick lf-mono',
              fontSize: 10,
              fontFamily: 'var(--font-mono, monospace)',
            }}
            axisLine={false}
            tickLine={false}
            width={44}
            tickFormatter={(v) => formatUSD(v)}
            domain={['auto', 'auto']}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ stroke: 'rgba(16,185,129,0.3)', strokeDasharray: '3 3' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={lineColor}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            isAnimationActive={
              typeof window !== 'undefined' &&
              !window.matchMedia('(prefers-reduced-motion: reduce)').matches
            }
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { NumberText } from './NumberText';
import { page, brand, shape, density, type as typeTokens } from './profile-design-tokens';
import './perf-chart.css';

const RANGES = ['1W', '1M', '3M', 'YTD'];

function PerfTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const fmt = (v) => (v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`);
  return (
    <div className="perf-tooltip">
      <div className="perf-tooltip-date">
        {new Date(row.at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </div>
      <div className="perf-tooltip-row">
        <span className="perf-dot you" />
        You <b>{fmt(row.you)}</b>
      </div>
      <div className="perf-tooltip-row">
        <span className="perf-dot median" />
        Median {fmt(row.median)}
      </div>
      <div className="perf-tooltip-row">
        <span className="perf-dot top25" />
        Top 25% {fmt(row.top25)}
      </div>
    </div>
  );
}

export function PerfChart({ performance, range, onRangeChange, isLive = false, sourceLabel }) {
  const { you = [], median = [], top25 = [], dates = [] } = performance || {};

  const chartData = useMemo(
    () =>
      (dates || []).map((iso, i) => ({
        at: iso,
        label: new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        you: you[i] ?? null,
        median: median[i] ?? null,
        top25: top25[i] ?? null,
      })),
    [dates, you, median, top25],
  );

  const lastYou = you.length > 0 ? you[you.length - 1] : 0;
  const lastMedian = median.length > 0 ? median[median.length - 1] : 0;
  const lastTop25 = top25.length > 0 ? top25[top25.length - 1] : 0;

  const youUp = lastYou >= 0;
  const youColor = youUp ? '#10b981' : '#ef4444';
  const youGradientId = youUp ? 'perf-grad-up' : 'perf-grad-down';

  const badgeLabel = isLive ? 'LIVE' : sourceLabel || 'PAPER';
  const hasEnoughData = chartData.length >= 2;

  return (
    <div
      style={{
        background: page.surface,
        border: `1px solid ${page.border}`,
        borderRadius: shape.radius.card,
        boxShadow: shape.shadow.card,
        padding: density.cardPaddingY,
        fontFamily: typeTokens.sans,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 12,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: '-0.1px',
              color: page.ink,
            }}
          >
            Performance vs. Platform
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: page.inkMuted }}>
            Your cumulative return vs. typical user and top 25%
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              background: brand.soft,
              color: brand.dark,
              border: `1px solid ${brand.ring}`,
              borderRadius: shape.radius.pill,
              padding: '2px 8px',
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: 0.4,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: brand.base }} />
            {badgeLabel}
          </span>
          <div className="perf-range-pills">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                className={`perf-range-pill ${r === range ? 'is-active' : ''}`}
                onClick={() => onRangeChange(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {hasEnoughData ? (
        <div className="perf-chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="perf-grad-up" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="perf-grad-down" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{
                  className: 'perf-axis-tick',
                  fontSize: 10,
                  fontFamily: 'var(--font-mono, monospace)',
                }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
                minTickGap={50}
              />
              <YAxis
                tick={{
                  className: 'perf-axis-tick',
                  fontSize: 10,
                  fontFamily: 'var(--font-mono, monospace)',
                }}
                axisLine={false}
                tickLine={false}
                width={44}
                tickFormatter={(v) => `${v.toFixed(1)}%`}
                domain={['auto', 'auto']}
              />
              <Tooltip
                content={<PerfTooltip />}
                cursor={{ stroke: 'rgba(16,185,129,0.3)', strokeDasharray: '3 3' }}
              />
              <Line
                type="monotone"
                dataKey="top25"
                stroke="var(--text-faint, #94a3b8)"
                strokeWidth={1.5}
                strokeDasharray="4 3"
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="median"
                stroke="var(--text-ghost, #cbd5e1)"
                strokeWidth={1.5}
                dot={false}
                connectNulls
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="you"
                stroke={youColor}
                strokeWidth={2.5}
                fill={`url(#${youGradientId})`}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="perf-empty">Not enough history yet to chart performance.</div>
      )}

      <div style={{ display: 'flex', gap: 16, marginTop: 6, fontSize: 11 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: page.inkSoft }}>
          <span style={{ width: 12, height: 2, background: youColor, borderRadius: 1 }} />
          You{' '}
          <NumberText size={11} weight={600}>
            {lastYou >= 0 ? '+' : ''}
            {lastYou.toFixed(2)}%
          </NumberText>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: page.inkSoft }}>
          <span
            style={{
              width: 12,
              height: 2,
              background: 'var(--text-ghost, #cbd5e1)',
              borderRadius: 1,
            }}
          />
          Median{' '}
          <NumberText size={11} weight={500} color={page.inkSoft}>
            {lastMedian >= 0 ? '+' : ''}
            {lastMedian.toFixed(2)}%
          </NumberText>
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: page.inkSoft }}>
          <span
            style={{
              width: 12,
              height: 2,
              borderRadius: 1,
              backgroundImage:
                'linear-gradient(90deg, var(--text-faint, #94a3b8) 50%, transparent 50%)',
              backgroundSize: '4px 2px',
            }}
          />
          Top 25%{' '}
          <NumberText size={11} weight={500} color={page.inkSoft}>
            {lastTop25 >= 0 ? '+' : ''}
            {lastTop25.toFixed(2)}%
          </NumberText>
        </span>
      </div>
    </div>
  );
}

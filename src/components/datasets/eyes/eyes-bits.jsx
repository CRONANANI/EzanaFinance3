'use client';

/**
 * Shared pieces for the four Eyes Above dataset pages: formatters, a
 * sparkline, a recharts line chart wired to CHART, and the detail fetch hook.
 * Styling stays page-scoped: every component takes the page's class prefix
 * (scm, cre, pat, ntl) and adds no CSS of its own.
 */
import { useEffect, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART } from '@/lib/chart-theme';
import { shortDate } from '@/lib/titans/format';

export const DASH = '–';

export function fmtNum(v, digits = 1) {
  const n = Number(v);
  if (v == null || !Number.isFinite(n)) return null;
  return n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

/** Large values compact (12.3K, 4.5M), small ones with `digits`. */
export function fmtCompact(v, digits = 1) {
  const n = Number(v);
  if (v == null || !Number.isFinite(n)) return null;
  const a = Math.abs(n);
  if (a >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (a >= 1e4) return `${(n / 1e3).toFixed(1)}K`;
  return fmtNum(n, digits);
}

export function fmtSigned(v, digits = 1, suffix = '%') {
  const n = Number(v);
  if (v == null || !Number.isFinite(n)) return null;
  return `${n > 0 ? '+' : ''}${n.toFixed(digits)}${suffix}`;
}

export const fmtDate = (iso) => shortDate(iso);

/** '2026-08-01' -> 'Aug 2026'. */
export function fmtMonth(iso) {
  const m = /^(\d{4})-(\d{2})/.exec(String(iso || ''));
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, 1)).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** Percent change, or null when either side is missing or the base is zero. */
export function pctChange(now, then) {
  if (now == null || then == null || !Number.isFinite(now) || !Number.isFinite(then) || !then)
    return null;
  return (100 * (now - then)) / Math.abs(then);
}

/** 'pos' | 'neg' | '' for a signed value. */
export const tone = (v) => (v == null ? '' : v > 0 ? 'pos' : v < 0 ? 'neg' : '');

/** A trailing moving average over `key`, written to `out`. */
export function movingAverage(rows, key, n, out) {
  let sum = 0;
  let count = 0;
  const win = [];
  return rows.map((r) => {
    const v = r[key];
    win.push(v);
    if (v != null) {
      sum += v;
      count += 1;
    }
    if (win.length > n) {
      const drop = win.shift();
      if (drop != null) {
        sum -= drop;
        count -= 1;
      }
    }
    return { ...r, [out]: win.length === n && count ? sum / count : null };
  });
}

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** A small trend line in currentColor; decorative next to the printed numbers. */
export function Sparkline({ values, className, width = 120, height = 32 }) {
  const pts = values.filter((v) => v != null && Number.isFinite(v));
  if (pts.length < 2) return null;
  const lo = Math.min(...pts);
  const hi = Math.max(...pts);
  const span = hi - lo || 1;
  const step = width / (pts.length - 1);
  const d = pts
    .map(
      (v, i) =>
        `${(i * step).toFixed(1)},${(height - 2 - ((v - lo) / span) * (height - 4)).toFixed(1)}`,
    )
    .join(' ');
  return (
    <svg
      className={className}
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <polyline
        points={d}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

const TOOLTIP_STYLE = {
  background: 'var(--bg-primary)',
  border: '1px solid var(--border-primary)',
  borderRadius: 'var(--radius-md)',
  fontSize: 12,
  fontFamily: 'var(--font-mono)',
};

/**
 * A line chart over `data`. `lines`: [{ key, label, stroke?, width?, dashed? }].
 * The first line is the primary series (CHART.primaryStroke).
 */
export function SeriesChart({
  data,
  xKey = 'date',
  lines,
  height = 260,
  yFmt = (v) => fmtCompact(v),
  xFmt = fmtMonth,
  tipLabel = fmtDate,
  zeroLine = false,
  label,
}) {
  if (!data?.length) return null;
  return (
    <div style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 24, left: 4, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray={CHART.gridDash}
            stroke={CHART.gridStroke}
            vertical={false}
          />
          <XAxis
            dataKey={xKey}
            tick={CHART.tick}
            axisLine={CHART.xAxisLine}
            tickLine={false}
            tickFormatter={xFmt}
            minTickGap={48}
          />
          <YAxis
            tick={CHART.tick}
            axisLine={false}
            tickLine={false}
            width={56}
            tickFormatter={yFmt}
            domain={['auto', 'auto']}
          />
          {zeroLine ? (
            <ReferenceLine y={0} stroke="var(--text-faint)" strokeDasharray="4 4" />
          ) : null}
          <Tooltip
            formatter={(v, name) => [v == null ? DASH : yFmt(v), name]}
            labelFormatter={tipLabel}
            contentStyle={TOOLTIP_STYLE}
          />
          {lines.map((l, i) => (
            <Line
              key={l.key}
              type="linear"
              dataKey={l.key}
              name={l.label}
              stroke={l.stroke || (i === 0 ? CHART.primaryStroke : 'var(--text-muted)')}
              strokeWidth={
                l.width || (i === 0 ? CHART.primaryStrokeWidth : CHART.secondaryStrokeWidth)
              }
              strokeDasharray={l.dashed ? '4 3' : undefined}
              dot={false}
              connectNulls
              isAnimationActive={!reduced()}
              animationDuration={CHART.animationDuration}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Fetches /api/eyes/detail for one item; { status, data }. */
export function useEyesDetail(kind, id) {
  const [state, setState] = useState({ status: id ? 'loading' : 'idle', data: null });
  useEffect(() => {
    if (!id) {
      setState({ status: 'idle', data: null });
      return undefined;
    }
    const ctrl = new AbortController();
    setState({ status: 'loading', data: null });
    fetch(`/api/eyes/detail?kind=${kind}&id=${encodeURIComponent(id)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => setState({ status: d?.ok ? 'ready' : 'error', data: d?.data || null }))
      .catch(() => !ctrl.signal.aborted && setState({ status: 'error', data: null }));
    return () => ctrl.abort();
  }, [kind, id]);
  return state;
}

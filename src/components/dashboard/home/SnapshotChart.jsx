'use client';

/**
 * Portfolio snapshot area chart: accent line over a vertical gradient,
 * horizontal gridlines only, compact money on a right-hand axis, about six
 * dates along the bottom, and a crosshair tooltip with the value and the
 * change since the start of the range.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import s from '@/app/(dashboard)/home-dashboard/dashboard.module.css';
import { CHART } from '@/lib/chart-theme';
import {
  fmtAxisDate,
  fmtCompactMoney,
  fmtMoney,
  fmtSignedMoney,
  fmtSignedPct,
  fmtTooltipDate,
  niceTicks,
  pickTickIndices,
} from '@/lib/dashboard/derive';
import { ErrorState, Signed } from './primitives';

function ChartTooltip({ active, payload, rows, range }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const start = rows[0]?.value;
  const abs = row.value - start;
  const pct = start > 0 ? (abs / start) * 100 : 0;
  return (
    <div className={s.tooltip}>
      <div>{fmtTooltipDate(row.at, range)}</div>
      <strong>{fmtMoney(row.value)}</strong>
      <Signed value={abs}>
        {fmtSignedMoney(abs)} ({fmtSignedPct(pct)})
      </Signed>{' '}
      <span className={s.muted}>since start</span>
    </div>
  );
}

export function SnapshotChart({ rows, range, loading, error, onRetry }) {
  const gid = `dbSnap${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  // Fewer date labels on narrow charts so they never crowd.
  const ref = useRef(null);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => setNarrow(e.contentRect.width < 480));
    ro.observe(el);
    return () => ro.disconnect();
  }, [rows.length]);
  const { yTicks, xTicks, summary } = useMemo(() => {
    if (!rows.length) return { yTicks: [], xTicks: [], summary: '' };
    const vals = rows.map((r) => r.value);
    const ticks = niceTicks(Math.min(...vals), Math.max(...vals), 5);
    const first = rows[0];
    const last = rows[rows.length - 1];
    return {
      yTicks: ticks,
      xTicks: pickTickIndices(rows.length, narrow ? 4 : 6),
      summary: `Portfolio value, ${fmtTooltipDate(first.at, range)} to ${fmtTooltipDate(
        last.at,
        range,
      )}, from ${fmtCompactMoney(first.value)} to ${fmtCompactMoney(last.value)}`,
    };
  }, [rows, range, narrow]);

  if (loading && !rows.length) {
    return (
      <figure className={s.chart}>
        <div className={s.skel} style={{ height: '100%' }} aria-busy="true" aria-label="Loading" />
      </figure>
    );
  }
  if (error && !rows.length) {
    return (
      <figure className={s.chart}>
        <ErrorState message="Couldn't load your portfolio history." onRetry={onRetry} />
      </figure>
    );
  }
  if (!rows.length) {
    return (
      <figure className={s.chart}>
        <div className={s.chartState}>
          <i className="bi bi-graph-up" aria-hidden="true" />
          <span>No history for this range yet.</span>
        </div>
      </figure>
    );
  }

  const n = rows.length;
  return (
    <figure className={s.chart} role="img" aria-label={summary} ref={ref}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={rows} margin={{ top: 8, right: 0, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--emerald)" stopOpacity={0.45} />
              <stop offset="100%" stopColor="var(--emerald)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="color-mix(in srgb, var(--text-primary) 7%, transparent)"
          />
          <XAxis
            dataKey="i"
            type="number"
            domain={[0, Math.max(1, n - 1)]}
            ticks={xTicks}
            interval={0}
            tickFormatter={(i) => fmtAxisDate(rows[i]?.at, range)}
            tick={{ ...CHART.tick, fontFamily: 'var(--font-mono)' }}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            padding={{ left: 12, right: 12 }}
          />
          <YAxis
            orientation="right"
            domain={[yTicks[0], yTicks[yTicks.length - 1]]}
            ticks={yTicks}
            tickFormatter={(v) => fmtCompactMoney(v)}
            tick={{ ...CHART.tick, fontFamily: 'var(--font-mono)' }}
            tickLine={false}
            axisLine={false}
            width={64}
          />
          <Tooltip
            content={<ChartTooltip rows={rows} range={range} />}
            cursor={{ stroke: 'var(--text-muted)', strokeDasharray: '3 3' }}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="var(--emerald)"
            strokeWidth={2.5}
            fill={`url(#${gid})`}
            activeDot={{
              r: 4,
              fill: 'var(--emerald)',
              stroke: 'var(--bg-primary)',
              strokeWidth: 2,
            }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </figure>
  );
}

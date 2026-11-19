'use client';

import { useId } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EchoFigureShell } from './EchoFigureShell';

const PALETTE = [
  'var(--echo-chart-green)',
  'var(--echo-chart-blue)',
  'var(--echo-chart-orange)',
  'var(--echo-chart-purple)',
];

/**
 * Glowing line chart (Nov 2026). Smooth "bump" lines with a soft glow in each
 * line's own colour, no dots, a quiet horizontal grid, and a tooltip that
 * lists every series at the hovered x.
 *
 * Two data shapes (the same as trajectory and multi-axis blocks use):
 *   series: [{ key, label, color?, dash?, data: [{ x, y }] }]
 *   or categories: ['H1 24', ...] + series: [{ label, values: [..], unit? }]
 */
export function EchoGlowLine({
  figureLabel,
  kicker,
  hint,
  source,
  series = [],
  categories,
  yLabel,
  unit = '',
  xFormat,
  annotations = [],
}) {
  const gid = `echo-glow-${useId().replace(/:/g, '')}`;

  const keyed = series.map((s, i) => ({
    ...s,
    key: s.key || `s${i}`,
    color: s.color || PALETTE[i % PALETTE.length],
  }));
  let rows;
  if (Array.isArray(categories) && categories.length) {
    rows = categories.map((c, i) => {
      const r = { x: c };
      keyed.forEach((s) => {
        r[s.key] = Array.isArray(s.values) ? s.values[i] : null;
      });
      return r;
    });
  } else {
    const xs = [...new Set(keyed.flatMap((s) => (s.data || []).map((p) => p.x)))].sort(
      (a, b) => a - b,
    );
    rows = xs.map((x) => {
      const r = { x };
      keyed.forEach((s) => {
        const hit = (s.data || []).find((p) => p.x === x);
        r[s.key] = hit ? hit.y : null;
      });
      return r;
    });
  }
  const fmt = (v, s) =>
    v == null ? 'N/A' : `${Number(v).toLocaleString('en-US')}${s?.unit ?? unit ?? ''}`;

  return (
    <EchoFigureShell figureLabel={figureLabel} kicker={kicker} hint={hint} source={source}>
      <div className="echo-glow">
        <div className="echo-glow-legend">
          {keyed.map((s) => (
            <span key={s.key} className="echo-glow-key">
              <span
                className={`echo-glow-swatch${s.dash ? ' is-dash' : ''}`}
                style={{ background: s.color }}
                aria-hidden="true"
              />
              {s.label}
            </span>
          ))}
        </div>
        <div className="echo-glow-plot">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <LineChart
              data={rows}
              margin={{ top: annotations.length ? 40 : 12, right: 24, bottom: 4, left: 4 }}
            >
              <defs>
                <filter id={gid} x="-20%" y="-40%" width="140%" height="180%">
                  <feGaussianBlur stdDeviation="6" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.1} />
              <XAxis
                dataKey="x"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                tickFormatter={xFormat ? (v) => xFormat(v) : undefined}
              />
              <YAxis
                domain={['auto', 'auto']}
                tickLine={false}
                axisLine={false}
                width={44}
                tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                label={
                  yLabel
                    ? {
                        value: yLabel,
                        angle: -90,
                        position: 'insideLeft',
                        fill: 'var(--text-muted)',
                        fontSize: 11,
                      }
                    : undefined
                }
              />
              <Tooltip
                cursor={{ stroke: 'currentColor', strokeOpacity: 0.2 }}
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <div className="echo-glow-tip">
                      <div className="echo-glow-tip-x">{xFormat ? xFormat(label) : label}</div>
                      {payload.map((p) => {
                        const s = keyed.find((k) => k.key === p.dataKey);
                        return (
                          <div key={p.dataKey} className="echo-glow-tip-row">
                            <span
                              className="echo-glow-swatch"
                              style={{ background: s?.color }}
                              aria-hidden="true"
                            />
                            <span className="echo-glow-tip-name">{s?.label}</span>
                            <span className="echo-glow-tip-val">{fmt(p.value, s)}</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : null
                }
              />
              {/* Annotations (carried over from trajectory figures): a marked
                  point with its label and sub line above it. */}
              {annotations.map((a, i) => (
                <ReferenceDot
                  key={`a${i}`}
                  x={a.x}
                  y={a.y}
                  r={3.5}
                  fill="var(--text-primary)"
                  stroke="none"
                  label={({ viewBox }) => (
                    <g className="echo-glow-anno">
                      <text
                        x={viewBox.x}
                        y={viewBox.y - 22}
                        textAnchor="middle"
                        className="echo-glow-anno-label"
                      >
                        {a.label}
                      </text>
                      {a.sub ? (
                        <text
                          x={viewBox.x}
                          y={viewBox.y - 9}
                          textAnchor="middle"
                          className="echo-glow-anno-sub"
                        >
                          {a.sub}
                        </text>
                      ) : null}
                    </g>
                  )}
                />
              ))}
              {keyed.map((s) => (
                <Line
                  key={s.key}
                  dataKey={s.key}
                  name={s.label}
                  type="bump"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeDasharray={s.dash ? '5 4' : undefined}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                  connectNulls
                  filter={s.dash ? undefined : `url(#${gid})`}
                  /* No draw-in: Recharts keeps a half-drawn dash pattern if
                     the container resizes mid-animation (the figure reveals
                     on scroll), leaving lines cut short. */
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </EchoFigureShell>
  );
}

export default EchoGlowLine;

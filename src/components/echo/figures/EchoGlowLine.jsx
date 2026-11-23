'use client';

import { useEffect, useId, useRef, useState } from 'react';
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
  /* Plot width (for anchoring edge labels) and dips (labelled below). */
  const plotRef = useRef(null);
  const [plotW, setPlotW] = useState(0);
  useEffect(() => {
    const el = plotRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([e]) => setPlotW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const textW = (t, per) => String(t || '').length * per;
  const isDip = (a) => {
    const i = rows.findIndex((r) => r.x === a.x);
    if (i <= 0 || i >= rows.length - 1) return false;
    const vals = (r) => keyed.map((k) => r[k.key]).filter((v) => typeof v === 'number');
    const here = a.y;
    const prev = Math.min(...vals(rows[i - 1]));
    const next = Math.min(...vals(rows[i + 1]));
    return here <= prev && here <= next;
  };
  /* An edge point whose line climbs away from it (first point rising, last
     point falling to it) is labelled below, clear of the line. */
  const climbsAway = (a) => {
    const i = rows.findIndex((r) => r.x === a.x);
    const v = (r) => Math.max(...keyed.map((k) => r[k.key]).filter((x) => typeof x === 'number'));
    if (i === 0 && rows.length > 1) return v(rows[1]) > a.y;
    if (i === rows.length - 1 && rows.length > 1) return v(rows[i - 1]) > a.y;
    return false;
  };
  /* Room under the lowest point for a label drawn below it: without it a
     dip near the bottom of the range puts its label on the x-axis dates
     (seen on phones, Nov 23rd, 2026). Only applied when some annotation is
     drawn below; every other chart keeps the automatic domain. */
  const allVals = rows.flatMap((r) =>
    keyed.map((k) => r[k.key]).filter((v) => typeof v === 'number'),
  );
  const anyBelow = annotations.some((a) => isDip(a) || climbsAway(a));
  const yLow =
    anyBelow && allVals.length
      ? Math.min(...allVals) - (Math.max(...allVals) - Math.min(...allVals)) * 0.28
      : 'auto';
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
        <div className="echo-glow-plot" ref={plotRef}>
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
                domain={[yLow, 'auto']}
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
              {/* Annotations (carried over from trajectory figures): a marked
                  point with its label and sub line. Drawn after the lines so
                  no line crosses the text; anchored inward near the plot
                  edges so nothing clips; a dip is labelled below its point. */}
              {annotations.map((a, i) => {
                const below = isDip(a) || climbsAway(a);
                return (
                  <ReferenceDot
                    key={`a${i}`}
                    x={a.x}
                    y={a.y}
                    r={3.5}
                    fill="var(--text-primary)"
                    stroke="var(--echo-canvas, var(--bg-primary))"
                    strokeWidth={1.5}
                    label={({ viewBox }) => {
                      const w = Math.max(textW(a.label, 7.2), a.sub ? textW(a.sub, 6.2) : 0);
                      const room = plotW || 9999;
                      const anchor =
                        viewBox.x - w / 2 < 52
                          ? 'start'
                          : viewBox.x + w / 2 > room - 8
                            ? 'end'
                            : 'middle';
                      const dx = anchor === 'start' ? 2 : anchor === 'end' ? 6 : 0;
                      const y1 = below ? viewBox.y + 18 : viewBox.y - (a.sub ? 22 : 10);
                      const y2 = below ? viewBox.y + 31 : viewBox.y - 9;
                      return (
                        <g className="echo-glow-anno">
                          <text
                            x={viewBox.x + dx}
                            y={y1}
                            textAnchor={anchor}
                            className="echo-glow-anno-label"
                          >
                            {a.label}
                          </text>
                          {a.sub ? (
                            <text
                              x={viewBox.x + dx}
                              y={y2}
                              textAnchor={anchor}
                              className="echo-glow-anno-sub"
                            >
                              {a.sub}
                            </text>
                          ) : null}
                        </g>
                      );
                    }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </EchoFigureShell>
  );
}

export default EchoGlowLine;

'use client';

import { useState } from 'react';
import { EchoFigureShell } from './EchoFigureShell';
import { textWidth, thinStep, truncate } from './fit';

/*
 * EchoMultiAxis — block type `multi-axis`.
 *
 * A color-linked multi-axis combo chart: one BAR series plus up to two LINE
 * series, each plotted against its own independent y-axis (max three series /
 * three axes total). Every axis's tick labels are painted in its series color
 * (the "color-linked axes" convention), so the eye can trace a curve to the
 * scale that governs it without a legend.
 *
 *   - series[0]  -> LEFT axis            (bar,  --echo-chart-blue)
 *   - series[1]  -> RIGHT axis (outer)   (line, --echo-chart-green)
 *   - series[2]  -> RIGHT axis (inner)   (line, --echo-chart-orange)
 *
 * A shared hover readout (driven by invisible full-height hit rects, one per
 * x category) reports every series' value at the hovered x with its unit and a
 * color swatch. Deterministic render only — no Math.random / Date in render.
 */

const W = 770;
const H = 440;
const PLOT = { l: 66, r: 596, t: 112, b: 388 };

// Fixed color slots — bar, line 1, line 2 (per house spec).
const SLOT_COLORS = [
  'var(--echo-chart-blue)',
  'var(--echo-chart-green)',
  'var(--echo-chart-orange)',
];

const MONO = { fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' };
const SERIF = { fontFamily: 'var(--font-serif)' };

function fmt(v) {
  const a = Math.abs(v);
  if (a >= 100) return String(Math.round(v));
  if (a >= 10) return String(Math.round(v * 10) / 10);
  return String(Math.round(v * 100) / 100);
}

// Independent domain per series. Bars anchor at zero (or below, if negative);
// lines get a little headroom above and below the data.
function domainFor(s) {
  const vals = s.values ?? [];
  let lo = vals.length ? Math.min(...vals) : 0;
  let hi = vals.length ? Math.max(...vals) : 1;
  if (s.kind === 'bar') lo = Math.min(0, lo);
  if (lo === hi) hi = lo + 1;
  if (s.kind !== 'bar') {
    const pad = (hi - lo) * 0.08;
    lo -= pad;
    hi += pad;
  }
  return { lo, hi };
}

function ticksFor(dom) {
  const out = [];
  const N = 4;
  for (let i = 0; i <= N; i += 1) out.push(dom.lo + (dom.hi - dom.lo) * (i / N));
  return out;
}

export function EchoMultiAxis({ figureLabel, kicker, hint, source, categories = [], series = [] }) {
  const [hover, setHover] = useState(null);

  // Only the first three series are rendered; extras are ignored.
  const shown = series.slice(0, 3);
  const n = categories.length;
  const bandW = n > 0 ? (PLOT.r - PLOT.l) / n : PLOT.r - PLOT.l;
  const barW = Math.min(bandW * 0.5, 46);
  const center = (i) => PLOT.l + bandW * (i + 0.5);

  const activeIdx = hover ?? (n > 0 ? n - 1 : 0);

  // Precompute per-series geometry (color slot, domain, scale fn).
  const meta = shown.map((s, si) => {
    const dom = domainFor(s);
    const sy = (v) => PLOT.b - ((v - dom.lo) / (dom.hi - dom.lo)) * (PLOT.b - PLOT.t);
    return { s, color: SLOT_COLORS[si] ?? SLOT_COLORS[0], dom, sy, si };
  });

  /* Category labels: only every k-th is drawn when they would touch; the
     active one is always drawn so the hover readout has its anchor. */
  const catStep = thinStep(categories, bandW, 15);
  /* Right-hand axis titles stack above the plot and are kept inside the
     frame; two titles on one line used to run into each other and off the
     right edge. */
  const rightTitleW = W - (PLOT.r + 6) - 6;
  const titleFor = (m) => `${m.s.label}${m.s.unit ? ` (${m.s.unit})` : ''}`;
  const leftTitleW = PLOT.r - (PLOT.l - 44) - 8;

  const barMeta = meta.filter((m) => m.s.kind === 'bar');
  const lineMeta = meta.filter((m) => m.s.kind !== 'bar');
  const leftMeta = meta[0];
  const axis2Meta = meta[1];
  const axis3Meta = meta[2];

  return (
    <EchoFigureShell figureLabel={figureLabel} kicker={kicker} hint={hint} source={source}>
      <svg
        className="echo-multiaxis-svg"
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={figureLabel}
        onMouseLeave={() => setHover(null)}
      >
        {/* Horizontal grid keyed to the LEFT (bar) axis. */}
        {leftMeta &&
          ticksFor(leftMeta.dom).map((v) => (
            <line
              key={`grid-${v}`}
              x1={PLOT.l}
              y1={leftMeta.sy(v)}
              x2={PLOT.r}
              y2={leftMeta.sy(v)}
              stroke="var(--echo-chart-grid)"
              opacity="0.5"
            />
          ))}

        {/* Plot frame edges. */}
        <line x1={PLOT.l} y1={PLOT.t} x2={PLOT.l} y2={PLOT.b} stroke="var(--border-secondary)" />
        <line x1={PLOT.l} y1={PLOT.b} x2={PLOT.r} y2={PLOT.b} stroke="var(--border-secondary)" />

        {/* LEFT axis (bar series) — color-linked tick labels. */}
        {leftMeta &&
          ticksFor(leftMeta.dom).map((v) => (
            <text
              key={`ay1-${v}`}
              x={PLOT.l - 10}
              y={leftMeta.sy(v) + 5}
              textAnchor="end"
              style={MONO}
              fontSize="15"
              fill={leftMeta.color}
            >
              {fmt(v)}
            </text>
          ))}
        {leftMeta && (
          <text x={PLOT.l - 44} y={PLOT.t - 13} style={SERIF} fontSize="15" fill={leftMeta.color}>
            {truncate(titleFor(leftMeta), leftTitleW, 15, { mono: false })}
          </text>
        )}

        {/* RIGHT axis 2 (outer) — 2nd series. */}
        {axis2Meta && (
          <>
            <line
              x1={PLOT.r}
              y1={PLOT.t}
              x2={PLOT.r}
              y2={PLOT.b}
              stroke="var(--border-secondary)"
            />
            {ticksFor(axis2Meta.dom).map((v) => (
              <text
                key={`ay2-${v}`}
                x={PLOT.r + 10}
                y={axis2Meta.sy(v) + 5}
                textAnchor="start"
                style={MONO}
                fontSize="15"
                fill={axis2Meta.color}
              >
                {fmt(v)}
              </text>
            ))}
            <text
              x={PLOT.r + 6}
              y={PLOT.t - (axis3Meta ? 31 : 13)}
              style={SERIF}
              fontSize="15"
              fill={axis2Meta.color}
            >
              {truncate(titleFor(axis2Meta), rightTitleW, 15, { mono: false })}
            </text>
          </>
        )}

        {/* RIGHT axis 3 (inner offset) — 3rd series. Tick labels can be hidden
            on narrow viewports via the .efig-maxis-axis3 CSS rule; the values
            still surface in the hover readout. */}
        {axis3Meta && (
          <g className="efig-maxis-axis3">
            {ticksFor(axis3Meta.dom).map((v) => (
              <text
                key={`ay3-${v}`}
                x={PLOT.r + 64}
                y={axis3Meta.sy(v) + 5}
                textAnchor="start"
                style={MONO}
                fontSize="15"
                fill={axis3Meta.color}
              >
                {fmt(v)}
              </text>
            ))}
            <text x={PLOT.r + 6} y={PLOT.t - 13} style={SERIF} fontSize="15" fill={axis3Meta.color}>
              {truncate(titleFor(axis3Meta), rightTitleW, 15, { mono: false })}
            </text>
          </g>
        )}

        {/* X category labels + vertical guide at the active column. */}
        {categories.map((c, i) =>
          i % catStep !== 0 && i !== activeIdx && i !== n - 1 ? null : (
            <text
              key={`xc-${c}`}
              x={center(i)}
              y={PLOT.b + 22}
              textAnchor="middle"
              style={MONO}
              fontSize="15"
              fill={i === activeIdx ? 'var(--text-muted)' : 'var(--text-faint)'}
            >
              {c}
            </text>
          ),
        )}
        {n > 0 && (
          <line
            x1={center(activeIdx)}
            y1={PLOT.t}
            x2={center(activeIdx)}
            y2={PLOT.b}
            stroke="var(--echo-chart-annotation)"
            strokeWidth="1"
            strokeDasharray="3 3"
            opacity="0.7"
          />
        )}

        {/* BAR series (drawn behind the lines). Each bar grows on reveal. */}
        {barMeta.map((m) =>
          (m.s.values ?? []).map((v, i) => {
            const yTop = m.sy(v);
            const yBase = m.sy(Math.max(m.dom.lo, 0));
            const y = Math.min(yTop, yBase);
            const h = Math.max(0, Math.abs(yBase - yTop));
            return (
              <rect
                key={`bar-${categories[i] ?? i}`}
                className="efig-maxis-bar"
                x={center(i) - barW / 2}
                y={y}
                width={barW}
                height={h}
                rx="2"
                fill={m.color}
                opacity={i === activeIdx ? 0.95 : 0.7}
                style={{ transitionDelay: `${i * 55}ms` }}
              />
            );
          }),
        )}

        {/* LINE series — draw in via stroke-dashoffset (pathLength normalized). */}
        {lineMeta.map((m) => {
          const d = (m.s.values ?? [])
            .map((v, i) => `${i ? 'L' : 'M'} ${center(i)} ${m.sy(v)}`)
            .join(' ');
          return (
            <g key={`line-${m.s.label}`}>
              <path
                className="efig-maxis-line"
                d={d}
                fill="none"
                stroke={m.color}
                strokeWidth="2.25"
                strokeLinejoin="round"
                strokeLinecap="round"
                pathLength="1"
                style={m.s.dash ? { strokeDasharray: '0.02 0.017' } : undefined}
              />
              {(m.s.values ?? []).map((v, i) => (
                <circle
                  key={`dot-${m.s.label}-${categories[i] ?? i}`}
                  className="efig-maxis-dot"
                  cx={center(i)}
                  cy={m.sy(v)}
                  r={i === activeIdx ? 4.5 : 3}
                  fill="var(--bg-tertiary)"
                  stroke={m.color}
                  strokeWidth="1.6"
                />
              ))}
            </g>
          );
        })}

        {/* Invisible per-category hit targets for the shared hover readout. */}
        {categories.map((c, i) => (
          <rect
            key={`hit-${c}`}
            x={PLOT.l + bandW * i}
            y={PLOT.t}
            width={bandW}
            height={PLOT.b - PLOT.t}
            fill="transparent"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHover(i)}
          />
        ))}

        {/* Shared hover readout — every series' value at the active x. */}
        <g>
          <rect
            x={PLOT.l + 4}
            y={14}
            width={286}
            height={24 + meta.length * 15}
            rx="6"
            fill="var(--bg-tertiary)"
            stroke="var(--border-secondary)"
          />
          <text x={PLOT.l + 16} y={31} style={SERIF} fontSize="15" fill="var(--text-muted)">
            {categories[activeIdx] ?? '—'}
          </text>
          {meta.map((m, ri) => {
            const rowY = 46 + ri * 15;
            const val = (m.s.values ?? [])[activeIdx];
            return (
              <g key={`ro-${m.s.label}`}>
                <rect x={PLOT.l + 16} y={rowY - 9} width={10} height={10} rx="2" fill={m.color} />
                <text x={PLOT.l + 32} y={rowY} style={SERIF} fontSize="13" fill="var(--text-muted)">
                  {m.s.label}
                </text>
                <text
                  x={PLOT.l + 282}
                  y={rowY}
                  textAnchor="end"
                  style={MONO}
                  fontSize="15"
                  fill="var(--text-primary)"
                >
                  {val === undefined ? '—' : `${fmt(val)}${m.s.unit ? ` ${m.s.unit}` : ''}`}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </EchoFigureShell>
  );
}

export default EchoMultiAxis;

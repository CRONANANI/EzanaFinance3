'use client';

import { useMemo } from 'react';
import { EchoFigureShell } from './EchoFigureShell';

const W = 640;
const H = 420;
const CX = 250;
const CY = 210;
const INNER_R = 58;
const OUTER_R = 190;

const DEFAULT_PALETTE = [
  '--echo-chart-green',
  '--echo-chart-blue',
  '--echo-chart-purple',
  '--echo-chart-orange',
  '--echo-chart-red',
];

/** Wrap a token or pass through an already-formed CSS color/var() string. */
function tokenColor(token) {
  if (typeof token !== 'string') return 'var(--text-muted)';
  return token.startsWith('var(') || token.startsWith('#') ? token : `var(${token})`;
}

/** Point on a circle, angle measured clockwise from 12 o'clock (top), in degrees. */
function polar(cx, cy, r, deg) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
}

/** SVG arc path from startDeg to endDeg (clockwise) at radius r. */
function arcPath(cx, cy, r, startDeg, endDeg) {
  const a = polar(cx, cy, r, startDeg);
  const b = polar(cx, cy, r, endDeg);
  const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

export function EchoRadialStack({
  figureLabel,
  kicker,
  hint,
  source,
  categories = [],
  segmentPalette,
  maxAngle = 270,
}) {
  const palette =
    Array.isArray(segmentPalette) && segmentPalette.length ? segmentPalette : DEFAULT_PALETTE;

  const model = useMemo(() => {
    const cats = (Array.isArray(categories) ? categories : [])
      .filter((c) => c && Array.isArray(c.segments))
      .slice(0, 8)
      .map((c) => {
        const segments = c.segments
          .map((s) => ({ label: String(s.label ?? ''), value: Math.max(0, Number(s.value) || 0) }))
          .slice(0, 5);
        const total = segments.reduce((sum, s) => sum + s.value, 0);
        return { label: String(c.label ?? ''), segments, total };
      });

    // Legend: union of segment labels in first-appearance order.
    const labelOrder = [];
    cats.forEach((c) =>
      c.segments.forEach((s) => {
        if (!labelOrder.includes(s.label)) labelOrder.push(s.label);
      }),
    );
    const colorFor = (label) => tokenColor(palette[labelOrder.indexOf(label) % palette.length]);

    const maxTotal = Math.max(1, ...cats.map((c) => c.total));
    const sweepCap = Math.max(30, Math.min(270, Number(maxAngle) || 270));

    const n = cats.length || 1;
    const band = (OUTER_R - INNER_R) / Math.max(1, cats.length);
    const strokeW = Math.max(6, band * 0.62);

    const rings = cats.map((c, ci) => {
      const rc = INNER_R + (ci + 0.5) * band;
      const sweep = (c.total / maxTotal) * sweepCap; // total angular length of this bar
      const active = c.segments.filter((s) => s.value > 0);
      const numSeg = active.length;
      const gap = numSeg > 1 ? Math.min(2.2, (sweep * 0.3) / numSeg) : 0;
      const gapTotal = gap * Math.max(0, numSeg - 1);
      const avail = Math.max(0, sweep - gapTotal);

      let cursor = 0; // running angle from the top (0deg) start
      const arcs = [];
      c.segments.forEach((s) => {
        if (s.value <= 0) return;
        const span = c.total > 0 ? (s.value / c.total) * avail : 0;
        const startDeg = cursor;
        const endDeg = cursor + span;
        arcs.push({
          label: s.label,
          value: s.value,
          d: arcPath(CX, CY, rc, startDeg, endDeg),
          color: colorFor(s.label),
        });
        cursor = endDeg + gap;
      });

      return {
        label: c.label,
        total: c.total,
        rc,
        sweep,
        strokeW,
        arcs,
        endPt: polar(CX, CY, rc + strokeW / 2 + 13, Math.max(sweep, 1)),
        labelPt: { x: CX - strokeW / 2 - 8, y: CY - rc },
      };
    });

    return { rings, labelOrder, colorFor, n, strokeW };
  }, [categories, palette, maxAngle]);

  const { rings, labelOrder, colorFor } = model;

  return (
    <EchoFigureShell figureLabel={figureLabel} kicker={kicker} hint={hint} source={source}>
      <svg
        className="echo-radial-svg"
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 'auto' }}
        role="img"
        aria-label={figureLabel}
      >
        {/* Donut bounds — faint guide circles. */}
        <circle
          cx={CX}
          cy={CY}
          r={INNER_R}
          fill="none"
          stroke="var(--echo-chart-grid)"
          strokeWidth="1"
          opacity="0.6"
        />
        <circle
          cx={CX}
          cy={CY}
          r={OUTER_R}
          fill="none"
          stroke="var(--echo-chart-grid)"
          strokeWidth="1"
          opacity="0.35"
        />

        {rings.map((ring, ci) => (
          <g key={`${ring.label}-${ci}`}>
            {/* Track under each bar so short bars still read as a ring row. */}
            <path
              d={arcPath(CX, CY, ring.rc, 0, Math.max(1, ring.sweep))}
              fill="none"
              stroke="var(--bg-tertiary)"
              strokeWidth={ring.strokeW}
              strokeLinecap="round"
            />
            {ring.arcs.map((arc, si) => (
              <path
                key={`${arc.label}-${si}`}
                className="efig-radial-arc"
                style={{ transitionDelay: `${ci * 0.08}s` }}
                pathLength={1}
                d={arc.d}
                fill="none"
                stroke={arc.color}
                strokeWidth={ring.strokeW}
                strokeLinecap="round"
              />
            ))}
            {/* Category label at the bar start (top), stacked to the left. */}
            <text
              x={ring.labelPt.x}
              y={ring.labelPt.y + 5}
              textAnchor="end"
              className="echo-fig-mono efig-radial-catlabel"
              fontSize="16"
              fill="var(--text-muted)"
            >
              {ring.label}
            </text>
            {/* Running total riding the bar end. */}
            {ring.total > 0 && (
              <text
                x={ring.endPt.x}
                y={ring.endPt.y + 5}
                textAnchor="middle"
                className="echo-fig-mono efig-radial-value"
                fontSize="15"
                fill="var(--text-faint)"
              >
                {ring.total}
              </text>
            )}
          </g>
        ))}
      </svg>

      <div className="efig-radial-legend">
        {labelOrder.map((label) => (
          <span key={label} className="efig-radial-legend-item">
            <span className="efig-radial-legend-swatch" style={{ background: colorFor(label) }} />
            {label}
          </span>
        ))}
      </div>
    </EchoFigureShell>
  );
}

export default EchoRadialStack;

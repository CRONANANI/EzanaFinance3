'use client';

import { useMemo } from 'react';
import { EchoFigureShell } from './EchoFigureShell';

const W = 640;
const H = 440;
const CX = 300;
const CY = 232;
const R_MAX = 150;
const HOLE = 0.2; // 20% donut hole
const LABEL_R = R_MAX + 22; // leader/label ring outside max radius

const SLICE_FILLS = [
  'var(--echo-chart-green)',
  'var(--echo-chart-blue)',
  'var(--echo-chart-purple)',
  'var(--echo-chart-orange)',
  'var(--echo-chart-red)',
];

const TAU = Math.PI * 2;

/** Deterministic numeric formatter (no locale surprises), trims to <=2 dp. */
function fmt(n) {
  if (!Number.isFinite(n)) return '0';
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : String(r);
}

/** Point on a circle centered at (CX,CY). Angle measured clockwise from top. */
function polar(radius, angle) {
  return {
    x: CX + radius * Math.sin(angle),
    y: CY - radius * Math.cos(angle),
  };
}

/**
 * Donut-sector path: outer arc (a0 -> a1) at `rOuter`, then inner arc
 * (a1 -> a0) at `rInner`. `large` set when the sweep exceeds half a turn.
 */
function sectorPath(a0, a1, rOuter, rInner) {
  const large = a1 - a0 > Math.PI ? 1 : 0;
  const o0 = polar(rOuter, a0);
  const o1 = polar(rOuter, a1);
  const i1 = polar(rInner, a1);
  const i0 = polar(rInner, a0);
  return [
    `M ${o0.x.toFixed(3)} ${o0.y.toFixed(3)}`,
    `A ${rOuter} ${rOuter} 0 ${large} 1 ${o1.x.toFixed(3)} ${o1.y.toFixed(3)}`,
    `L ${i1.x.toFixed(3)} ${i1.y.toFixed(3)}`,
    `A ${rInner} ${rInner} 0 ${large} 0 ${i0.x.toFixed(3)} ${i0.y.toFixed(3)}`,
    'Z',
  ].join(' ');
}

/** Full-ring path (single 100% slice) — two half arcs so the ring closes. */
function ringPath(rOuter, rInner) {
  const oTop = polar(rOuter, 0);
  const oBot = polar(rOuter, Math.PI);
  const iTop = polar(rInner, 0);
  const iBot = polar(rInner, Math.PI);
  return [
    `M ${oTop.x.toFixed(3)} ${oTop.y.toFixed(3)}`,
    `A ${rOuter} ${rOuter} 0 1 1 ${oBot.x.toFixed(3)} ${oBot.y.toFixed(3)}`,
    `A ${rOuter} ${rOuter} 0 1 1 ${oTop.x.toFixed(3)} ${oTop.y.toFixed(3)}`,
    `M ${iTop.x.toFixed(3)} ${iTop.y.toFixed(3)}`,
    `A ${rInner} ${rInner} 0 1 0 ${iBot.x.toFixed(3)} ${iBot.y.toFixed(3)}`,
    `A ${rInner} ${rInner} 0 1 0 ${iTop.x.toFixed(3)} ${iTop.y.toFixed(3)}`,
    'Z',
  ].join(' ');
}

export function EchoVariablePie({
  figureLabel,
  kicker,
  hint,
  source,
  slices = [],
  yLabel = 'share',
  zLabel = 'magnitude',
  minRadiusPct = 45,
}) {
  const model = useMemo(() => {
    const clean = slices.filter((s) => s && Number.isFinite(s.y) && s.y > 0);
    if (clean.length === 0) return { arcs: [], single: false };

    // Sort ascending by z so the radius progression reads outward.
    const sorted = [...clean].sort((a, b) => (a.z ?? 0) - (b.z ?? 0));

    const totalY = sorted.reduce((sum, s) => sum + s.y, 0);
    const zVals = sorted.map((s) => (Number.isFinite(s.z) ? s.z : 0));
    const zMin = Math.min(...zVals);
    const zMax = Math.max(...zVals);
    const zSpan = zMax - zMin;

    const floorPct = Math.min(Math.max(minRadiusPct, 10), 95) / 100;
    const rFloor = R_MAX * floorPct;
    const rInner = R_MAX * HOLE;

    // z -> outer radius in [rFloor, R_MAX]. Degenerate span => all at R_MAX.
    const radiusFor = (z) =>
      zSpan === 0 ? R_MAX : rFloor + ((z - zMin) / zSpan) * (R_MAX - rFloor);

    const single = sorted.length === 1;
    let cursor = 0;
    const arcs = sorted.map((s, i) => {
      const frac = s.y / totalY;
      const a0 = cursor;
      const a1 = cursor + frac * TAU;
      cursor = a1;
      const mid = (a0 + a1) / 2;
      const rOuter = radiusFor(zVals[i]);
      const labelPt = polar(LABEL_R, mid);
      const anchor = labelPt.x > CX + 6 ? 'start' : labelPt.x < CX - 6 ? 'end' : 'middle';
      const leaderInner = polar(rOuter, mid);
      const leaderOuter = polar(LABEL_R - 4, mid);
      return {
        key: `${s.label}-${i}`,
        label: s.label,
        y: s.y,
        z: zVals[i],
        pct: frac * 100,
        fill: SLICE_FILLS[i % SLICE_FILLS.length],
        d: single ? ringPath(rOuter, rInner) : sectorPath(a0, a1, rOuter, rInner),
        labelPt,
        anchor,
        leaderInner,
        leaderOuter,
      };
    });
    return { arcs, single };
  }, [slices, minRadiusPct]);

  const { arcs } = model;

  return (
    <EchoFigureShell figureLabel={figureLabel} kicker={kicker} hint={hint} source={source}>
      <svg
        className="echo-vpie-svg"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={figureLabel}
        style={{ width: '100%', height: 'auto', display: 'block' }}
      >
        {/* Donut hole outline for grounding */}
        <circle
          cx={CX}
          cy={CY}
          r={R_MAX * HOLE}
          fill="none"
          stroke="var(--border-secondary)"
          strokeWidth="1"
          opacity="0.6"
        />

        {arcs.map((a, i) => (
          <g key={a.key} className="efig-vpie-slice" style={{ transitionDelay: `${i * 0.06}s` }}>
            {/* Leader line from arc face out to the label ring */}
            <line
              x1={a.leaderInner.x}
              y1={a.leaderInner.y}
              x2={a.leaderOuter.x}
              y2={a.leaderOuter.y}
              stroke="var(--echo-chart-annotation)"
              strokeWidth="0.75"
              strokeDasharray="2 2"
            />
            {/* The variable-radius donut slice. A 2px gap stroke of --bg-tertiary
               reads as rounded separation between neighbouring slices. */}
            <path
              d={a.d}
              fill={a.fill}
              stroke="var(--bg-tertiary)"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <text
              x={a.labelPt.x}
              y={a.labelPt.y - 6}
              textAnchor={a.anchor}
              fontSize="16"
              fontFamily="var(--font-serif)"
              fill="var(--text-primary)"
            >
              {a.label}
            </text>
            <text
              x={a.labelPt.x}
              y={a.labelPt.y + 13}
              textAnchor={a.anchor}
              className="echo-fig-mono"
              fontSize="15"
              fill="var(--text-muted)"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {`${yLabel} ${fmt(a.y)} (${fmt(a.pct)}%) · ${zLabel} ${fmt(a.z)}`}
            </text>
          </g>
        ))}

        {/* Encoding caption */}
        <text
          x={CX}
          y={H - 16}
          textAnchor="middle"
          className="echo-fig-mono"
          fontSize="15"
          fill="var(--text-faint)"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {`angle = ${yLabel} · radius = ${zLabel}`}
        </text>
      </svg>
    </EchoFigureShell>
  );
}

export default EchoVariablePie;

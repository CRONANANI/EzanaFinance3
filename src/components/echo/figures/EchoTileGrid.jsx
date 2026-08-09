'use client';

import { useMemo } from 'react';
import { EchoFigureShell } from './EchoFigureShell';

/**
 * EchoTileGrid — block type `tile-grid`.
 *
 * A tilemap / equal-weight cartogram: every unit (e.g. a country) is drawn as
 * ONE equal-size tile at a manually supplied {x, y} integer grid coordinate, so
 * a tiny country carries the same visual weight as a large one. Each tile is
 * filled by a DISCRETE color class derived from its `value` against ascending
 * `classes` thresholds, using a fixed sequential token ramp (see RAMP).
 *
 * Fully deterministic: no Math.random / Date — geometry and cascade delays are
 * pure functions of the supplied grid coordinates.
 */

// Sequential class → token ramp (lightest first). Class index k uses RAMP[k],
// clamped to the last entry when there are more classes than ramp stops.
const RAMP = [
  '--emerald-bg-subtle',
  '--echo-chart-green',
  '--echo-chart-blue',
  '--echo-chart-purple',
  '--echo-chart-orange',
  '--echo-chart-red',
];

const SQRT3 = Math.sqrt(3);
const SIZE = 46; // hex circumradius in viewBox units (drives all spacing)
const GAP = 5; // seam between tiles, in viewBox units
const PAD = 30; // outer padding around the tile extent

// Which discrete class a value falls in: first index whose upTo it does not
// exceed; values above every threshold land in the final (highest) class.
function classifyValue(value, classes) {
  for (let k = 0; k < classes.length; k += 1) {
    if (value <= classes[k].upTo) return k;
  }
  return classes.length - 1;
}

function classToken(k) {
  return RAMP[Math.min(k, RAMP.length - 1)];
}

// Flat-top hexagon: six points at 0°,60°,…,300° around the center.
function hexPoints(cx, cy, size) {
  const pts = [];
  for (let i = 0; i < 6; i += 1) {
    const a = (Math.PI / 180) * (60 * i);
    pts.push(`${(cx + size * Math.cos(a)).toFixed(2)},${(cy + size * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}

export function EchoTileGrid({
  figureLabel,
  kicker,
  hint,
  source,
  tiles = [],
  classes = [],
  shape = 'hex',
}) {
  const model = useMemo(() => {
    const isHex = shape !== 'square';
    // Square side chosen to match hex height so both shapes tile similarly.
    const side = SQRT3 * SIZE;
    const rawWidth = isHex ? SIZE : side; // half-extent helpers below
    const halfW = isHex ? SIZE : side / 2;
    const halfH = isHex ? (SQRT3 / 2) * SIZE : side / 2;

    // Raw (un-offset) center for a grid coordinate.
    const rawCenter = (x, y) => {
      if (isHex) {
        const parity = ((x % 2) + 2) % 2; // stable for negative x
        return {
          cx: SIZE * 1.5 * x,
          cy: SIZE * SQRT3 * (y + (parity === 1 ? 0.5 : 0)),
        };
      }
      return {
        cx: x * (side + GAP),
        cy: y * (side + GAP),
      };
    };

    const raw = tiles.map((t) => ({ tile: t, ...rawCenter(t.x, t.y) }));
    const minCx = Math.min(...raw.map((r) => r.cx));
    const minCy = Math.min(...raw.map((r) => r.cy));
    const sums = tiles.map((t) => t.x + t.y);
    const minSum = sums.length ? Math.min(...sums) : 0;

    const placed = raw.map((r) => {
      const cx = r.cx - minCx + halfW + PAD;
      const cy = r.cy - minCy + halfH + PAD;
      const k = classifyValue(r.tile.value, classes);
      const cascade = (r.tile.x + r.tile.y - minSum) * 45; // ms, ≥ 0
      return { ...r, cx, cy, k, cascade, isHex, side };
    });

    const maxCx = Math.max(...placed.map((p) => p.cx));
    const maxCy = Math.max(...placed.map((p) => p.cy));
    const vbW = maxCx + halfW + PAD;
    const vbH = maxCy + halfH + PAD;

    // Per-class counts for the legend and the narrated aria-label.
    const counts = classes.map(() => 0);
    placed.forEach((p) => {
      counts[p.k] += 1;
    });
    const topIdx = classes.length - 1;
    const topLabel = classes.length ? classes[topIdx].label : '—';
    const aria = `Tile grid of ${tiles.length} units across ${classes.length} value classes; ${counts[topIdx] || 0} units in the highest class (${topLabel}).`;

    return { placed, vbW, vbH, counts, aria, rawWidth };
  }, [tiles, classes, shape]);

  const { placed, vbW, vbH, counts, aria } = model;

  return (
    <EchoFigureShell figureLabel={figureLabel} kicker={kicker} hint={hint} source={source}>
      <svg
        className="echo-tilegrid-svg"
        viewBox={`0 0 ${vbW.toFixed(1)} ${vbH.toFixed(1)}`}
        role="img"
        aria-label={aria}
        style={{ width: '100%' }}
      >
        {placed.map((p) => {
          const fill = `var(${classToken(p.k)})`;
          const style = { transitionDelay: `${p.cascade}ms` };
          const half = p.isHex ? SIZE : p.side / 2;
          return (
            <g key={`${p.tile.code}-${p.tile.x}-${p.tile.y}`} className="efig-tile" style={style}>
              <title>{`${p.tile.label}: ${p.tile.value}`}</title>
              {p.isHex ? (
                <polygon
                  className="efig-tile-shape"
                  points={hexPoints(p.cx, p.cy, SIZE)}
                  fill={fill}
                  stroke="var(--bg-primary)"
                  strokeWidth="2"
                />
              ) : (
                <rect
                  className="efig-tile-shape"
                  x={(p.cx - half).toFixed(2)}
                  y={(p.cy - half).toFixed(2)}
                  width={p.side.toFixed(2)}
                  height={p.side.toFixed(2)}
                  rx="6"
                  fill={fill}
                  stroke="var(--bg-primary)"
                  strokeWidth="2"
                />
              )}
              <text
                className="efig-tile-code"
                x={p.cx.toFixed(2)}
                y={(p.cy + 6).toFixed(2)}
                textAnchor="middle"
                fontSize="18"
                fill="var(--text-primary)"
              >
                {p.tile.code}
              </text>
            </g>
          );
        })}
      </svg>

      <ul className="efig-tile-legend" aria-hidden="true">
        {classes.map((c, k) => (
          <li key={c.label} className="efig-tile-legend-item">
            <span className="efig-tile-swatch" style={{ background: `var(${classToken(k)})` }} />
            <span className="efig-tile-legend-label">{c.label}</span>
            <span className="efig-tile-legend-count">{counts[k] || 0}</span>
          </li>
        ))}
      </ul>
    </EchoFigureShell>
  );
}

export default EchoTileGrid;

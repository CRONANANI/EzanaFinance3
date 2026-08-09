'use client';

import { useMemo } from 'react';
import { EchoFigureShell } from './EchoFigureShell';

/**
 * EchoMarketTreemap — block type `market-treemap`.
 *
 * A squarified, two-level treemap. Groups tile the full canvas by their total
 * leaf size; within each group rect the leaves tile by their own size. Leaf
 * AREA encodes magnitude (leaf.size); leaf FILL encodes performance (leaf.perf,
 * a signed percent) on a diverging red→neutral→green scale, clamped to ±10%.
 *
 * Determinism: the entire layout is a pure function of `groups` (no random, no
 * clock). `squarify` is the standard Bruls/Huizing/van Wijk algorithm — process
 * children sorted descending by value, greedily grow a row along the shorter
 * side while the worst aspect ratio improves, then commit the row. Because each
 * committed row consumes exactly its thickness from the remaining rect and its
 * children fill that strip exactly (child area = value · area/total), the tiles
 * partition the rect with no overlap and no overflow.
 *
 * Diverging perf → token/opacity buckets (perf clamped to ±10):
 *   perf ≤ -6            strong-neg   --echo-chart-red    fillOpacity 0.85
 *   -6 <  perf ≤ -1.5    mild-neg     --echo-chart-red    fillOpacity 0.45
 *   -1.5 < perf < 1.5    ~flat        --bg-tertiary       fillOpacity 1
 *   1.5 ≤ perf <  6      mild-pos     --echo-chart-green  fillOpacity 0.45
 *   perf ≥  6            strong-pos   --echo-chart-green  fillOpacity 0.85
 */

const VB_W = 800;
const VB_H = 520;
const ROOT = { x: 6, y: 6, w: VB_W - 12, h: VB_H - 12 };
const GROUP_GAP = 4; // inset around each group's inner content
const HEADER_H = 26; // group header band height when it fits
const TEXT_FLOOR = 15; // SVG <text> font-size floor, in viewBox units

// --- Diverging performance scale: bucket a signed percent to token + opacity ---
function perfFill(rawPerf) {
  const perf = Math.max(-10, Math.min(10, Number(rawPerf) || 0));
  if (perf <= -6) return { fill: 'var(--echo-chart-red)', fillOpacity: 0.85 };
  if (perf <= -1.5) return { fill: 'var(--echo-chart-red)', fillOpacity: 0.45 };
  if (perf < 1.5) return { fill: 'var(--bg-tertiary)', fillOpacity: 1 };
  if (perf < 6) return { fill: 'var(--echo-chart-green)', fillOpacity: 0.45 };
  return { fill: 'var(--echo-chart-green)', fillOpacity: 0.85 };
}

// Worst aspect ratio in a row laid along `side` (Bruls et al.).
function worstRatio(row, side) {
  if (row.length === 0) return Infinity;
  let sum = 0;
  let mx = -Infinity;
  let mn = Infinity;
  for (const a of row) {
    sum += a;
    if (a > mx) mx = a;
    if (a < mn) mn = a;
  }
  if (sum <= 0 || side <= 0) return Infinity;
  const s2 = side * side;
  const sum2 = sum * sum;
  return Math.max((s2 * mx) / sum2, sum2 / (s2 * mn));
}

/**
 * Squarified treemap. `children` each carry a numeric `value`; returns each
 * child augmented with { x, y, w, h } tiling `rect` exactly. Pure/deterministic.
 */
function squarify(children, rect) {
  const positive = children.filter((c) => Number(c.value) > 0);
  const total = positive.reduce((s, c) => s + Number(c.value), 0);
  if (total <= 0 || rect.w <= 0 || rect.h <= 0) {
    return children.map((c) => ({ ...c, x: rect.x, y: rect.y, w: 0, h: 0 }));
  }
  const scale = (rect.w * rect.h) / total;
  const items = positive
    .map((c) => ({ ...c, area: Number(c.value) * scale }))
    .sort((a, b) => b.area - a.area || String(a.label).localeCompare(String(b.label)));

  const out = [];
  let { x, y, w, h } = rect;
  let i = 0;
  while (i < items.length && w > 0 && h > 0) {
    const side = Math.min(w, h);
    const row = [];
    const areas = [];
    // Greedily grow the row while the worst aspect ratio does not get worse.
    while (i < items.length) {
      const trial = areas.concat(items[i].area);
      if (areas.length === 0 || worstRatio(trial, side) <= worstRatio(areas, side)) {
        row.push(items[i]);
        areas.push(items[i].area);
        i += 1;
      } else {
        break;
      }
    }
    const rowSum = areas.reduce((s, a) => s + a, 0);
    const thickness = rowSum / side; // depth consumed from the long side
    if (w >= h) {
      // Row is a vertical strip of width `thickness`, children stacked down.
      let cy = y;
      for (const it of row) {
        const ih = thickness > 0 ? it.area / thickness : 0;
        out.push({ ...it, x, y: cy, w: thickness, h: ih });
        cy += ih;
      }
      x += thickness;
      w -= thickness;
    } else {
      // Row is a horizontal strip of height `thickness`, children across.
      let cx = x;
      for (const it of row) {
        const iw = thickness > 0 ? it.area / thickness : 0;
        out.push({ ...it, x: cx, y, w: iw, h: thickness });
        cx += iw;
      }
      y += thickness;
      h -= thickness;
    }
  }
  return out;
}

const isNumericLabel = (v) => typeof v === 'string' && /^[+\-$]?[\d,.]+%?$/.test(v.trim());
const fmtPerf = (p) => `${p >= 0 ? '+' : ''}${p}%`;

function buildLayout(groups) {
  const safe = Array.isArray(groups) ? groups : [];
  const withTotals = safe.map((g, gi) => {
    const leaves = Array.isArray(g.leaves) ? g.leaves : [];
    const value = leaves.reduce((s, l) => s + Math.max(0, Number(l.size) || 0), 0);
    return { ...g, key: `${g.label}-${gi}`, leaves, value };
  });

  const groupRects = squarify(withTotals, ROOT);
  let leafIndex = 0;
  const laidGroups = groupRects.map((gr) => {
    const inner = {
      x: gr.x + GROUP_GAP,
      y: gr.y + GROUP_GAP,
      w: Math.max(0, gr.w - GROUP_GAP * 2),
      h: Math.max(0, gr.h - GROUP_GAP * 2),
    };
    const showHeader = inner.h >= HEADER_H + 24 && inner.w >= 64;
    const leafRect = showHeader
      ? { x: inner.x, y: inner.y + HEADER_H, w: inner.w, h: inner.h - HEADER_H }
      : inner;
    const leaves = squarify(
      gr.leaves.map((l) => ({ ...l, value: Math.max(0, Number(l.size) || 0) })),
      leafRect,
    ).map((l) => ({ ...l, revealIndex: (leafIndex += 1) - 1 }));
    return { ...gr, inner, showHeader, leaves };
  });

  return laidGroups;
}

export function EchoMarketTreemap({ figureLabel, kicker, hint, source, groups = [] }) {
  const layout = useMemo(() => buildLayout(groups), [groups]);

  return (
    <EchoFigureShell figureLabel={figureLabel} kicker={kicker} hint={hint} source={source}>
      <svg
        className="echo-treemap-svg"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        width="100%"
        role="img"
        aria-label={figureLabel}
      >
        {layout.map((g) => (
          <g key={g.key}>
            {/* group frame */}
            <rect
              x={g.x + 1}
              y={g.y + 1}
              width={Math.max(0, g.w - 2)}
              height={Math.max(0, g.h - 2)}
              fill="none"
              stroke="var(--border-primary)"
              strokeWidth="1"
            />

            {g.showHeader && (
              <text
                x={g.inner.x + 2}
                y={g.inner.y + 17}
                fontSize="16"
                fontWeight="700"
                fill="var(--text-muted)"
                style={{
                  fontFamily: 'var(--font-serif)',
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                {String(g.label).toUpperCase()}
              </text>
            )}

            {g.leaves.map((leaf, li) => {
              const { fill, fillOpacity } = perfFill(leaf.perf);
              const short = Math.min(leaf.w, leaf.h);
              const fs = Math.min(30, Math.max(TEXT_FLOOR, Math.floor(short * 0.24)));
              // Only label tiles that can actually seat two ≥15-unit lines.
              const fits = fs >= TEXT_FLOOR && leaf.w >= fs * 3 && leaf.h >= fs * 2.4;
              const labelIsNum = isNumericLabel(leaf.label);
              return (
                <g
                  key={`${g.key}-${leaf.label}-${li}`}
                  className="efig-tm-leaf"
                  style={{ transitionDelay: `${leaf.revealIndex * 45}ms` }}
                >
                  <rect
                    x={leaf.x + 1}
                    y={leaf.y + 1}
                    width={Math.max(0, leaf.w - 2)}
                    height={Math.max(0, leaf.h - 2)}
                    fill={fill}
                    fillOpacity={fillOpacity}
                    stroke="var(--border-secondary)"
                    strokeWidth="1"
                  >
                    <title>
                      {`${leaf.label} · size ${leaf.size} · ${fmtPerf(
                        Math.max(-10, Math.min(10, Number(leaf.perf) || 0)),
                      )}`}
                    </title>
                  </rect>

                  {fits && (
                    <text
                      x={leaf.x + 8}
                      y={leaf.y + fs + 6}
                      fontSize={fs}
                      fill="var(--text-primary)"
                      className={labelIsNum ? 'echo-fig-mono' : undefined}
                      style={labelIsNum ? undefined : { fontFamily: 'var(--font-serif)' }}
                    >
                      {leaf.label}
                    </text>
                  )}
                  {fits && (
                    <text
                      x={leaf.x + 8}
                      y={leaf.y + fs * 2 + 8}
                      fontSize={Math.max(TEXT_FLOOR, Math.round(fs * 0.82))}
                      fill="var(--text-muted)"
                      className="echo-fig-mono"
                    >
                      {leaf.size}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        ))}
      </svg>
    </EchoFigureShell>
  );
}

export default EchoMarketTreemap;

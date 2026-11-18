'use client';

import { useMemo } from 'react';
import { EchoFigureShell } from './EchoFigureShell';
import { figTickLabeller, useFigPhone } from './fit';

const W = 680;
const H = 460;
const PAD = { l: 66, r: 40, t: 96, b: 58 };
const MAX_R = 46;
const MIN_R = 6;
/* Label geometry for collision checks: 15-unit mono text, ~0.6em a glyph. */
const LABEL_FS = 15;
const CHAR_W = LABEL_FS * 0.6;
const LABEL_H = 17;

const rectsOverlap = (a, b, gap = 3) =>
  a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;

/* Does a label box overlap a circle (with a little air)? */
function hitsCircle(r, c, gap = 2) {
  const nx = Math.max(r.x, Math.min(c.cx, r.x + r.w));
  const ny = Math.max(r.y, Math.min(c.cy, r.y + r.h));
  const dx = c.cx - nx;
  const dy = c.cy - ny;
  return dx * dx + dy * dy < (c.r + gap) * (c.r + gap);
}

/* Shortest distance from a point to a segment. */
function segDist(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

/* Does a segment pass through a box (sampled; boxes are a few glyphs)? */
function segHitsRect(l, q, gap = 2) {
  for (let k = 0; k <= 24; k += 1) {
    const t = k / 24;
    const x = l.x1 + (l.x2 - l.x1) * t;
    const y = l.y1 + (l.y2 - l.y1) * t;
    if (x > q.x - gap && x < q.x + q.w + gap && y > q.y - gap && y < q.y + q.h + gap) return true;
  }
  return false;
}

/* The leader from a bubble to its label box: from the bubble's edge to the
   nearest point of the box. */
function leaderFor(b, r) {
  const tx = Math.max(r.x, Math.min(b.cx, r.x + r.w));
  const ty = Math.max(r.y, Math.min(b.cy, r.y + r.h));
  const ang = Math.atan2(ty - b.cy, tx - b.cx);
  return { x1: b.cx + Math.cos(ang) * b.r, y1: b.cy + Math.sin(ang) * b.r, x2: tx, y2: ty };
}

/**
 * Places every label where it overlaps no other label and no other bubble,
 * inside the plot (Nov 18 2026: a tight cluster of bubbles used to stack
 * its names on top of one another). Largest bubbles are placed first. Each
 * label tries the spots touching its bubble (above, below, right, left),
 * then spots further out in widening rings; a label set away from its
 * bubble gets a leader line. Deterministic for a given set of points.
 */
function layoutLabels(bubbles, bounds) {
  const placed = [];
  const order = [...bubbles].sort((a, b) => b.r - a.r || (a.label < b.label ? -1 : 1));
  const out = new Map();
  for (const b of order) {
    const w = b.label.length * CHAR_W + 4;
    const h = LABEL_H;
    const near = [
      { x: b.cx - w / 2, y: b.cy - b.r - 6 - h },
      { x: b.cx - w / 2, y: b.cy + b.r + 4 },
      { x: b.cx + b.r + 6, y: b.cy - h / 2 },
      { x: b.cx - b.r - 6 - w, y: b.cy - h / 2 },
    ].map((r) => ({ ...r, w, h, leader: false }));
    const far = [];
    for (let ring = 1; ring <= 16; ring += 1) {
      const d = b.r + 10 + ring * 16;
      for (const [ux, uy] of [
        [1, 0],
        [1, -0.5],
        [1, 0.5],
        [1, -1],
        [1, 1],
        [0, -1],
        [0, 1],
        [-1, 0],
        [-1, -0.5],
        [-1, 0.5],
        [-1, -1],
        [-1, 1],
      ]) {
        const ax = b.cx + ux * d;
        const ay = b.cy + uy * d;
        far.push({
          x: ux > 0 ? ax : ux < 0 ? ax - w : ax - w / 2,
          y: ay - h / 2,
          w,
          h,
          leader: true,
        });
      }
    }
    const inside = (r) =>
      r.x >= bounds.l && r.x + r.w <= bounds.r && r.y >= bounds.t && r.y + r.h <= bounds.b;
    const free = (r) =>
      inside(r) &&
      !placed.some((q) => rectsOverlap(r, q)) &&
      !bubbles.some((o) => o !== b && hitsCircle(r, o)) &&
      !(r.leader && hitsCircle(r, b)) &&
      /* A leader may not run through another bubble or another label. */
      !(
        r.leader &&
        (() => {
          const l = leaderFor(b, r);
          return (
            bubbles.some((o) => o !== b && segDist(o.cx, o.cy, l.x1, l.y1, l.x2, l.y2) < o.r + 1) ||
            placed.some((q) => segHitsRect(l, q))
          );
        })()
      );
    /* Boxed in on every side: let the leader cross a bubble rather than
       let two names overlap. */
    const roomy = (r) =>
      inside(r) &&
      !placed.some((q) => rectsOverlap(r, q)) &&
      !bubbles.some((o) => o !== b && hitsCircle(r, o)) &&
      !hitsCircle(r, b);
    const pick = near.find(free) || far.find(free) || far.find(roomy) || near[0];
    placed.push(pick);
    out.set(b.key, pick);
  }
  return out;
}

/**
 * Three-variable scatter ("bubble-field" block). X and Y position each point;
 * the bubble AREA (radius on a sqrt scale) encodes a third value `z`. Robust
 * to 4-20 points. Fully deterministic — reveal ordering is derived from each
 * bubble's z-rank so the largest bubbles settle first.
 */
export function EchoBubbleField({
  figureLabel,
  kicker,
  hint,
  source,
  points = [],
  xLabel = 'x',
  yLabel = 'y',
  zLabel = 'z',
  xThreshold,
  yThreshold,
  zoneLabel,
}) {
  const model = useMemo(() => {
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    const zs = points.map((p) => p.z);

    const rawXMin = Math.min(...xs);
    const rawXMax = Math.max(...xs);
    const rawYMin = Math.min(...ys);
    const rawYMax = Math.max(...ys);
    const maxZ = Math.max(...zs, 1);

    const xSpan = rawXMax - rawXMin || 1;
    const ySpan = rawYMax - rawYMin || 1;
    const xPad = xSpan * 0.08;
    const yPad = ySpan * 0.08;

    const x0 = rawXMin - xPad;
    const x1 = rawXMax + xPad;
    const y0 = rawYMin - yPad;
    const y1 = rawYMax + yPad;

    const sx = (v) => PAD.l + ((v - x0) / (x1 - x0)) * (W - PAD.l - PAD.r);
    const sy = (v) => H - PAD.b - ((v - y0) / (y1 - y0)) * (H - PAD.t - PAD.b);
    const sr = (v) => Math.max(MIN_R, Math.sqrt(Math.max(v, 0) / maxZ) * MAX_R);

    // Reveal order: largest z-rank (rank 0) reveals first. Deterministic tie
    // break on label so equal-z bubbles keep a stable order.
    const ranked = points
      .map((p, i) => ({ p, i }))
      .sort((a, b) => b.p.z - a.p.z || (a.p.label < b.p.label ? -1 : 1));
    const rankByIndex = new Map();
    ranked.forEach((entry, rank) => rankByIndex.set(entry.i, rank));

    const ticks = (lo, hi) => {
      const mid = (lo + hi) / 2;
      const round = (v) => Math.round(v * 100) / 100;
      return [round(lo), round(mid), round(hi)];
    };

    const bubbles = points.map((p, i) => ({
      key: i,
      label: p.label,
      cx: sx(p.x),
      cy: sy(p.y),
      r: sr(p.z),
    }));
    const labels = layoutLabels(bubbles, {
      l: PAD.l + 2,
      r: W - PAD.r + 30,
      t: PAD.t - 10,
      b: H - PAD.b - 2,
    });

    return {
      labels,
      x0,
      x1,
      y0,
      y1,
      sx,
      sy,
      sr,
      rankByIndex,
      count: points.length,
      xTicks: ticks(x0, x1),
      yTicks: ticks(y0, y1),
    };
  }, [points]);

  const { sx, sy, sr, rankByIndex, count, xTicks, yTicks, x0, x1, y0, y1, labels } = model;
  const phone = useFigPhone();
  const xTick = figTickLabeller(xTicks, phone);
  const yTick = figTickLabeller(yTicks, phone);

  const plotLeft = PAD.l;
  const plotRight = W - PAD.r;
  const plotTop = PAD.t;
  const plotBottom = H - PAD.b;

  const hasX = typeof xThreshold === 'number';
  const hasY = typeof yThreshold === 'number';

  // Zone band: quadrant beyond both thresholds when both exist, otherwise the
  // half-plane above yThreshold (fallback: right of xThreshold).
  let zoneRect = null;
  if (zoneLabel) {
    if (hasX && hasY) {
      zoneRect = {
        x: sx(xThreshold),
        y: plotTop,
        w: plotRight - sx(xThreshold),
        h: sy(yThreshold) - plotTop,
      };
    } else if (hasY) {
      zoneRect = { x: plotLeft, y: plotTop, w: plotRight - plotLeft, h: sy(yThreshold) - plotTop };
    } else if (hasX) {
      zoneRect = {
        x: sx(xThreshold),
        y: plotTop,
        w: plotRight - sx(xThreshold),
        h: plotBottom - plotTop,
      };
    }
  }

  return (
    <EchoFigureShell figureLabel={figureLabel} kicker={kicker} hint={hint} source={source}>
      <svg
        className="echo-bubble-svg"
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={figureLabel}
      >
        {/* zone band */}
        {zoneRect && zoneRect.w > 0 && zoneRect.h > 0 && (
          <g>
            <rect
              x={zoneRect.x}
              y={zoneRect.y}
              width={zoneRect.w}
              height={zoneRect.h}
              fill="var(--emerald-bg-subtle)"
            />
            {/* Named on the zone's top edge, outside the band where the
                bubbles sit, so the name never lands on a bubble's label. */}
            <text
              x={zoneRect.x + zoneRect.w - 8}
              y={zoneRect.y - 6}
              textAnchor="end"
              className="echo-fig-mono"
              fontSize="15"
              fill="var(--text-faint)"
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {zoneLabel}
            </text>
          </g>
        )}

        {/* horizontal gridlines + y ticks */}
        {yTicks.map((v) => (
          <g key={`y-${v}`}>
            <line
              x1={plotLeft}
              y1={sy(v)}
              x2={plotRight}
              y2={sy(v)}
              stroke="var(--echo-chart-grid)"
              opacity="0.5"
            />
            <text
              x={plotLeft - 10}
              y={sy(v) + 5}
              textAnchor="end"
              className="echo-fig-mono"
              fontSize="15"
              fill="var(--text-muted)"
              style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
            >
              {yTick(v)}
            </text>
          </g>
        ))}

        {/* vertical gridlines + x ticks */}
        {xTicks.map((v) => (
          <g key={`x-${v}`}>
            <line
              x1={sx(v)}
              y1={plotTop}
              x2={sx(v)}
              y2={plotBottom}
              stroke="var(--echo-chart-grid)"
              opacity="0.35"
            />
            <text
              x={sx(v)}
              y={plotBottom + 22}
              textAnchor="middle"
              className="echo-fig-mono"
              fontSize="15"
              fill="var(--text-muted)"
              style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
            >
              {xTick(v)}
            </text>
          </g>
        ))}

        {/* axis frame */}
        <line
          x1={plotLeft}
          y1={plotTop}
          x2={plotLeft}
          y2={plotBottom}
          stroke="var(--echo-chart-grid)"
        />
        <line
          x1={plotLeft}
          y1={plotBottom}
          x2={plotRight}
          y2={plotBottom}
          stroke="var(--echo-chart-grid)"
        />

        {/* threshold lines */}
        {hasX && xThreshold >= x0 && xThreshold <= x1 && (
          <line
            x1={sx(xThreshold)}
            y1={plotTop}
            x2={sx(xThreshold)}
            y2={plotBottom}
            stroke="var(--echo-chart-annotation)"
            strokeWidth="1.25"
            strokeDasharray="6 4"
          />
        )}
        {hasY && yThreshold >= y0 && yThreshold <= y1 && (
          <line
            x1={plotLeft}
            y1={sy(yThreshold)}
            x2={plotRight}
            y2={sy(yThreshold)}
            stroke="var(--echo-chart-annotation)"
            strokeWidth="1.25"
            strokeDasharray="6 4"
          />
        )}

        {/* bubbles */}
        {points.map((p, i) => {
          const rank = rankByIndex.get(i) ?? i;
          const r = sr(p.z);
          const cx = sx(p.x);
          const cy = sy(p.y);
          const delay = `${rank * 60}ms`;
          const box = labels.get(i);
          const lx = box.x + box.w / 2;
          const ly = box.y + box.h - 4;
          /* Leader from the bubble's edge to the nearest side of its label. */
          const leader = box.leader ? leaderFor({ cx, cy, r }, box) : null;
          return (
            <g key={`${p.label}-${i}`}>
              <circle
                className="efig-bubble-dot"
                cx={cx}
                cy={cy}
                r={r}
                fill="var(--echo-chart-blue)"
                fillOpacity="0.5"
                stroke="var(--echo-chart-blue)"
                strokeWidth="1.4"
                style={{ transitionDelay: delay }}
              />
              {leader ? (
                <line
                  className="efig-bubble-label"
                  x1={leader.x1}
                  y1={leader.y1}
                  x2={leader.x2}
                  y2={leader.y2}
                  stroke="var(--echo-chart-annotation)"
                  strokeWidth="1"
                  style={{ transitionDelay: delay }}
                />
              ) : null}
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                className="echo-fig-mono efig-bubble-label"
                fontSize={LABEL_FS}
                fill="var(--text-secondary)"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontVariantNumeric: 'tabular-nums',
                  transitionDelay: delay,
                }}
              >
                {p.label}
              </text>
            </g>
          );
        })}

        {/* axis titles */}
        <text
          x={(plotLeft + plotRight) / 2}
          y={H - 16}
          textAnchor="middle"
          fontSize="16"
          fill="var(--text-faint)"
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          {xLabel}
        </text>
        <text
          x={22}
          y={(plotTop + plotBottom) / 2}
          textAnchor="middle"
          fontSize="16"
          fill="var(--text-faint)"
          transform={`rotate(-90 22 ${(plotTop + plotBottom) / 2})`}
          style={{ fontFamily: 'var(--font-serif)' }}
        >
          {yLabel}
        </text>

        {/* caption / legend: three encodings on three short lines (one long
            line ran past a 680-wide frame), the count on its own at the right. */}
        {[`x = ${xLabel}`, `y = ${yLabel}`, `size = ${zLabel}`].map((line, i) => (
          <text
            key={line}
            x={plotLeft}
            y={PAD.t - 68 + i * 16}
            fontSize="13"
            fill="var(--text-faint)"
            style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
          >
            {line}
          </text>
        ))}
        <text
          x={plotRight}
          y={PAD.t - 68}
          textAnchor="end"
          fontSize="13"
          fill="var(--text-faint)"
          style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
        >
          {`n = ${count}`}
        </text>
      </svg>
    </EchoFigureShell>
  );
}

export default EchoBubbleField;

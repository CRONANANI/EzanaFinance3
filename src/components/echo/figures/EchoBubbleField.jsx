'use client';

import { useMemo } from 'react';
import { EchoFigureShell } from './EchoFigureShell';

const W = 680;
const H = 460;
const PAD = { l: 66, r: 40, t: 96, b: 58 };
const MAX_R = 46;
const MIN_R = 6;

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

    return {
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

  const { sx, sy, sr, rankByIndex, count, xTicks, yTicks, x0, x1, y0, y1 } = model;

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
            <text
              x={zoneRect.x + zoneRect.w - 8}
              y={zoneRect.y + 20}
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
              {v}
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
              {v}
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
          const labelBelow = cy - r - 6 < plotTop + 4;
          const ly = labelBelow ? cy + r + 16 : cy - r - 7;
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
              <text
                x={cx}
                y={ly}
                textAnchor="middle"
                className="echo-fig-mono efig-bubble-label"
                fontSize="15"
                fill="var(--text-muted)"
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

        {/* caption / legend */}
        <text
          x={plotLeft}
          y={PAD.t - 60}
          fontSize="15"
          fill="var(--text-faint)"
          style={{ fontFamily: 'var(--font-mono)', fontVariantNumeric: 'tabular-nums' }}
        >
          {`x = ${xLabel} · y = ${yLabel} · size = ${zLabel}`}
        </text>
        <text
          x={plotRight}
          y={PAD.t - 60}
          textAnchor="end"
          fontSize="15"
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

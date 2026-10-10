'use client';

import { useMemo } from 'react';
import { EchoFigureShell } from './EchoFigureShell';
import { clampLabel, labelSpan, packRows, textWidth } from './fit';

const W = 1120;
const H = 480;
/* Top padding grows with the number of annotation rows (see annoLayout). */
const PAD = { l: 76, r: 40, t: 108, b: 44 };
const ANNO_ROW = 40; // label (16) + sub (15) + breathing room
const ANNO_BASE = 64; // y-axis label + one clear row above the plot

export function EchoTrajectory({
  figureLabel,
  kicker,
  hint,
  source,
  series = [],
  annotations = [],
  yLabel,
  yMax,
  xMin,
  xMax,
  xTicks,
}) {
  const allPts = series.flatMap((s) => s.data);
  const x0 = xMin ?? Math.min(...allPts.map((p) => p.x));
  const x1 = xMax ?? Math.max(...allPts.map((p) => p.x));
  const y1 = yMax ?? Math.max(...allPts.map((p) => p.y)) * 1.1;

  const sx = (v) => PAD.l + ((v - x0) / (x1 - x0)) * (W - PAD.l - PAD.r);

  /* Annotations live in a band above the plot. Each gets a row so none
     overlaps horizontally (packRows), its text is kept inside the frame
     (clampLabel), and the plot's top edge moves down to make room for
     however many rows that takes. The y-axis label is reserved on the
     bottom row so no annotation lands on it. */
  const anno = useMemo(() => {
    const items = annotations.map((a) => {
      const ax = sx(a.x);
      const w = Math.max(textWidth(a.label, 16), textWidth(a.sub || '', 15));
      const { x, anchor } = clampLabel(ax, w, 0, W, 'middle', 6);
      return { ...a, ax, w, x, anchor, span: labelSpan(x, w, anchor) };
    });
    /* The y-axis label owns the left of the bottom row: it is packed first
       (its span starts far left) so every annotation is placed around it. */
    const reserved = yLabel ? [[-1e6, PAD.l - 44 + textWidth(yLabel, 16)]] : [];
    const rows = packRows([...reserved, ...items.map((i) => i.span)], { gap: 14, maxRows: 4 });
    const itemRows = rows.slice(reserved.length);
    const rowCount = Math.max(1, ...rows) + 1;
    return { items: items.map((it, i) => ({ ...it, row: itemRows[i] })), rowCount };
  }, [annotations, yLabel]); // eslint-disable-line react-hooks/exhaustive-deps

  const plotTop = Math.max(PAD.t, ANNO_BASE + anno.rowCount * ANNO_ROW);
  const sy = (v) => H - PAD.b - (v / y1) * (H - plotTop - PAD.b);
  /* Row r's label baseline; row 0 is the lowest, just above the plot. */
  const rowY = (r) => plotTop - 22 - r * ANNO_ROW;

  /* Five or six gridlines whatever the scale: step is 1, 2, 2.5 or 5 × a
     power of ten. (A fixed step of 10 drew 120 ticks on a 1,200 axis.) */
  const gridY = useMemo(() => {
    const raw = y1 / 5;
    const mag = 10 ** Math.floor(Math.log10(Math.max(raw, 1e-9)));
    const norm = raw / mag;
    const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
    const out = [];
    for (let v = 0; v <= y1 + 1e-9; v += step) out.push(Number(v.toFixed(6)));
    return out;
  }, [y1]);

  return (
    <EchoFigureShell figureLabel={figureLabel} kicker={kicker} hint={hint} source={source}>
      <svg className="echo-fig-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={figureLabel}>
        {gridY.map((v) => (
          <g key={v}>
            <line
              x1={PAD.l}
              y1={sy(v)}
              x2={W - PAD.r}
              y2={sy(v)}
              stroke="var(--echo-chart-grid)"
              opacity="0.5"
            />
            <text
              x={PAD.l - 10}
              y={sy(v) + 4}
              textAnchor="end"
              className="echo-fig-mono"
              fontSize="16"
              fill="var(--text-muted)"
            >
              {v}
            </text>
          </g>
        ))}
        {yLabel && (
          <text
            x={PAD.l - 44}
            y={plotTop - 14}
            className="echo-fig-mono"
            fontSize="16"
            fill="var(--text-muted)"
          >
            {yLabel}
          </text>
        )}
        {/* Optional xTicks: [{ x, label }] for sub-year axes (month labels on a
            decimal-year scale). Default: start, midpoint and end values. */}
        {(xTicks ?? [x0, Math.round((x0 + x1) / 2), x1].map((v) => ({ x: v, label: v }))).map(
          (t) => (
            <text
              key={t.x}
              x={sx(t.x)}
              y={H - PAD.b + 22}
              textAnchor="middle"
              className="echo-fig-mono"
              fontSize="16"
              fill="var(--text-muted)"
            >
              {t.label}
            </text>
          ),
        )}

        {series.map((s) => {
          const d = s.data.map((p, i) => `${i ? 'L' : 'M'} ${sx(p.x)} ${sy(p.y)}`).join(' ');
          return (
            <g key={s.key}>
              <path
                d={d}
                fill="none"
                stroke={s.color}
                strokeWidth="2"
                strokeDasharray={s.dashed ? '5 4' : undefined}
              />
              {s.data.map((p) => (
                <circle
                  key={p.x}
                  cx={sx(p.x)}
                  cy={sy(p.y)}
                  r="4"
                  fill="var(--bg-primary)"
                  stroke={s.color}
                  strokeWidth="1.6"
                />
              ))}
              {(() => {
                /* Series name beside its last point; when that would run
                   off the right edge, above the point, right-aligned. */
                const lx = sx(s.data.at(-1).x);
                const ly = sy(s.data.at(-1).y);
                const w = textWidth(s.label, 16);
                const fits = lx + 8 + w <= W - 6;
                return (
                  <text
                    x={fits ? lx + 8 : Math.min(lx, W - 6)}
                    y={fits ? ly + 4 : ly - 12}
                    textAnchor={fits ? 'start' : 'end'}
                    className="echo-fig-mono"
                    fontSize="16"
                    fontWeight="700"
                    fill={s.color}
                  >
                    {s.label}
                  </text>
                );
              })()}
            </g>
          );
        })}

        {anno.items.map((a) => {
          const { ax } = a;
          const ay = sy(a.y);
          const ly = rowY(a.row) - 17;
          return (
            <g key={a.label}>
              <line
                x1={ax}
                y1={ay - 8}
                x2={ax}
                y2={ly + 20}
                stroke="var(--echo-chart-annotation)"
                strokeWidth="0.75"
                strokeDasharray="2 2"
              />
              <path d={`M ${ax} ${ay} l -4 -5 l 4 -5 l 4 5 Z`} fill="var(--echo-chart-orange)" />
              <text
                x={a.x}
                y={ly}
                textAnchor={a.anchor}
                className="echo-fig-mono"
                fontWeight="700"
                fontSize="16"
                fill="var(--text-primary)"
              >
                {a.label}
              </text>
              <text
                x={a.x}
                y={ly + 17}
                textAnchor={a.anchor}
                className="echo-fig-mono"
                fontSize="15"
                fill="var(--text-muted)"
              >
                {a.sub}
              </text>
            </g>
          );
        })}
      </svg>
    </EchoFigureShell>
  );
}

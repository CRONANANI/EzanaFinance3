'use client';

import { useMemo } from 'react';
import { EchoFigureShell } from './EchoFigureShell';

const W = 1120;
const H = 480;
const PAD = { l: 76, r: 40, t: 108, b: 44 };

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
}) {
  const allPts = series.flatMap((s) => s.data);
  const x0 = xMin ?? Math.min(...allPts.map((p) => p.x));
  const x1 = xMax ?? Math.max(...allPts.map((p) => p.x));
  const y1 = yMax ?? Math.max(...allPts.map((p) => p.y)) * 1.1;

  const sx = (v) => PAD.l + ((v - x0) / (x1 - x0)) * (W - PAD.l - PAD.r);
  const sy = (v) => H - PAD.b - (v / y1) * (H - PAD.t - PAD.b);

  const gridY = useMemo(() => {
    const step = y1 > 40 ? 10 : 5;
    const out = [];
    for (let v = 0; v <= y1; v += step) out.push(v);
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
            y={PAD.t - 14}
            className="echo-fig-mono"
            fontSize="16"
            fill="var(--text-muted)"
          >
            {yLabel}
          </text>
        )}
        {[x0, Math.round((x0 + x1) / 2), x1].map((v) => (
          <text
            key={v}
            x={sx(v)}
            y={H - PAD.b + 22}
            textAnchor="middle"
            className="echo-fig-mono"
            fontSize="16"
            fill="var(--text-muted)"
          >
            {v}
          </text>
        ))}

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
              <text
                x={sx(s.data.at(-1).x) + 8}
                y={sy(s.data.at(-1).y) + 4}
                className="echo-fig-mono"
                fontSize="16"
                fontWeight="700"
                fill={s.color}
              >
                {s.label}
              </text>
            </g>
          );
        })}

        {annotations.map((a, i) => {
          const ax = sx(a.x);
          const ay = sy(a.y);
          const ly = PAD.t - 50 + (i % 3) * 32;
          return (
            <g key={a.label}>
              <line
                x1={ax}
                y1={ay - 8}
                x2={ax}
                y2={ly + 14}
                stroke="var(--echo-chart-annotation)"
                strokeWidth="0.75"
                strokeDasharray="2 2"
              />
              <path d={`M ${ax} ${ay} l -4 -5 l 4 -5 l 4 5 Z`} fill="var(--echo-chart-orange)" />
              <text
                x={ax}
                y={ly}
                textAnchor="middle"
                className="echo-fig-mono"
                fontWeight="700"
                fontSize="16"
                fill="var(--text-primary)"
              >
                {a.label}
              </text>
              <text
                x={ax}
                y={ly + 17}
                textAnchor="middle"
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

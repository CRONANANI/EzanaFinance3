'use client';

import { useMemo, useState } from 'react';
import { EchoFigureShell } from './EchoFigureShell';

const W = 1120;
const H = 620;
const PAD = { l: 24, r: 24, t: 112, b: 40 };
const LANE_H = 66;

export function EchoWallTimeline({
  figureLabel,
  kicker,
  hint,
  source,
  startYear,
  endYear,
  windows = [],
  plaques = [],
}) {
  const [selected, setSelected] = useState(null);
  const x = useMemo(() => {
    const span = endYear - startYear;
    return (yr) => PAD.l + ((yr - startYear) / span) * (W - PAD.l - PAD.r);
  }, [startYear, endYear]);

  const decades = useMemo(() => {
    const out = [];
    const step = endYear - startYear > 200 ? 50 : 10;
    for (let yr = Math.ceil(startYear / step) * step; yr <= endYear; yr += step) out.push(yr);
    return out;
  }, [startYear, endYear]);

  return (
    <EchoFigureShell figureLabel={figureLabel} kicker={kicker} hint={hint} source={source}>
      <svg className="echo-fig-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={figureLabel}>
        {/* shaded windows + window labels */}
        {windows.map((w, i) => (
          <g key={w.id}>
            <rect
              x={x(w.from)}
              y={PAD.t - 24}
              width={x(w.to) - x(w.from)}
              height={H - PAD.t - PAD.b + 24}
              fill={w.color}
              opacity="0.10"
            />
            <text
              x={x(w.from) + 6}
              y={PAD.t - 34 - (i % 3) * 16}
              className="echo-fig-mono"
              fontSize="16"
              letterSpacing="1.5"
              fill="var(--text-muted)"
            >
              {`W${i + 1} · ${w.label.toUpperCase()}`}
            </text>
            <line
              x1={x(w.from)}
              y1={PAD.t - 30 - (i % 3) * 16}
              x2={x(w.from)}
              y2={PAD.t - 20}
              stroke="var(--border-secondary)"
              strokeWidth="1"
            />
          </g>
        ))}

        {/* axis */}
        <line
          x1={PAD.l}
          y1={H - PAD.b}
          x2={W - PAD.r}
          y2={H - PAD.b}
          stroke="var(--border-secondary)"
        />
        {decades.map((yr) => (
          <g key={yr}>
            <line
              x1={x(yr)}
              y1={H - PAD.b}
              x2={x(yr)}
              y2={H - PAD.b + 5}
              stroke="var(--border-secondary)"
            />
            <text
              x={x(yr)}
              y={H - PAD.b + 20}
              textAnchor="middle"
              className="echo-fig-mono"
              fontSize="16"
              fill="var(--text-muted)"
            >
              {yr}
            </text>
          </g>
        ))}

        {/* plaques */}
        {plaques.map((p, i) => {
          const px = x(p.year);
          const py = PAD.t + (p.lane ?? i % 6) * LANE_H;
          const wdt = Math.min(300, 24 + p.label.length * 9.6);
          const flip = px + wdt > W - PAD.r;
          const bx = flip ? px - wdt : px;
          const active = selected === i;
          return (
            <g
              key={`${p.year}-${p.label}`}
              style={{ cursor: 'pointer' }}
              onClick={() => setSelected(active ? null : i)}
            >
              <line
                x1={px}
                y1={py + 44}
                x2={px}
                y2={H - PAD.b}
                stroke="var(--echo-chart-annotation)"
                strokeDasharray="2 3"
              />
              <rect
                x={bx}
                y={py}
                width={wdt}
                height={44}
                fill="var(--bg-primary)"
                stroke={active ? 'var(--emerald)' : 'var(--border-primary)'}
                strokeWidth={active ? 1.5 : 1}
              />
              <rect x={bx} y={py} width={3} height={44} fill="var(--echo-chart-blue)" />
              <text
                x={bx + 10}
                y={py + 18}
                className="echo-fig-mono"
                fontWeight="700"
                fontSize="16.5"
                fill="var(--text-primary)"
              >
                {p.year}
              </text>
              <text
                x={bx + 10}
                y={py + 35}
                className="echo-fig-mono"
                fontSize="15"
                fill="var(--text-muted)"
              >
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>
      {selected != null && plaques[selected] && (
        <div className="echo-fig-detail">
          <strong>
            {plaques[selected].year} · {plaques[selected].label}
          </strong>{' '}
          — {plaques[selected].detail}
        </div>
      )}
    </EchoFigureShell>
  );
}

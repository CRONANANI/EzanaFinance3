'use client';

import { useMemo, useState } from 'react';
import { EchoFigureShell } from './EchoFigureShell';

const W = 1120;
const ROW_H = 34;
const GROUP_GAP = 42;
const PAD = { l: 220, r: 230, t: 34, b: 40 };

const OUTCOME_COLOR = {
  continuing: 'var(--emerald)', // emerald = alive/continuing, per branding guide
  dissolved: 'var(--echo-chart-red)',
  transformed: 'var(--echo-chart-orange)',
  handover: 'var(--text-muted)',
};

export function EchoLifelines({
  figureLabel,
  kicker,
  hint,
  source,
  startYear,
  endYear,
  groups = [],
}) {
  const [selected, setSelected] = useState(null);
  const x = useMemo(() => {
    const span = endYear - startYear;
    return (yr) =>
      PAD.l +
      ((Math.min(Math.max(yr, startYear), endYear) - startYear) / span) * (W - PAD.l - PAD.r);
  }, [startYear, endYear]);

  const layout = useMemo(() => {
    let y = PAD.t;
    return groups.map((g) => {
      const gy = y;
      y += 22;
      const rows = g.rows.map((r) => {
        const ry = y;
        y += ROW_H;
        return { ...r, y: ry };
      });
      y += GROUP_GAP;
      return { label: g.label, y: gy, rows };
    });
  }, [groups]);

  const H = (layout.at(-1)?.rows.at(-1)?.y ?? 200) + PAD.b + ROW_H;
  const ticks = useMemo(() => {
    const out = [];
    for (let yr = Math.ceil(startYear / 100) * 100; yr <= endYear; yr += 100) out.push(yr);
    return out;
  }, [startYear, endYear]);

  return (
    <EchoFigureShell figureLabel={figureLabel} kicker={kicker} hint={hint} source={source}>
      <svg className="echo-fig-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={figureLabel}>
        {ticks.map((yr) => (
          <g key={yr}>
            <line
              x1={x(yr)}
              y1={PAD.t}
              x2={x(yr)}
              y2={H - PAD.b}
              stroke="var(--echo-chart-grid)"
              strokeDasharray="2 4"
              opacity="0.6"
            />
            <text
              x={x(yr)}
              y={H - PAD.b + 18}
              textAnchor="middle"
              className="echo-fig-mono"
              fontSize="16"
              fill="var(--text-muted)"
            >
              {yr}
            </text>
          </g>
        ))}
        {layout.map((g) => (
          <g key={g.label}>
            <text
              x={16}
              y={g.y + 12}
              className="echo-fig-mono"
              fontSize="16"
              letterSpacing="1.5"
              fill="var(--text-muted)"
            >
              {g.label.toUpperCase()}
            </text>
            {g.rows.map((r, ri) => {
              const color = OUTCOME_COLOR[r.outcome?.type] || 'var(--text-muted)';
              const xEnd = x(r.to ?? endYear);
              const active = selected === `${g.label}:${ri}`;
              return (
                <g
                  key={r.name}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelected(active ? null : `${g.label}:${ri}`)}
                >
                  <text
                    x={PAD.l - 12}
                    y={r.y + 4}
                    textAnchor="end"
                    className="echo-fig-mono"
                    fontSize="16.5"
                    fill={active ? 'var(--emerald)' : 'var(--text-primary)'}
                  >
                    {r.name}
                  </text>
                  <rect
                    x={x(r.from) - 5}
                    y={r.y - 5}
                    width="10"
                    height="10"
                    fill="none"
                    stroke={color}
                    strokeWidth="1.4"
                  />
                  <line
                    x1={x(r.from) + 5}
                    y1={r.y}
                    x2={xEnd}
                    y2={r.y}
                    stroke={color}
                    strokeWidth={active ? 2.4 : 1.6}
                  />
                  {r.outcome?.type === 'continuing' ? (
                    <path
                      d={`M ${xEnd} ${r.y - 4} L ${xEnd + 8} ${r.y} L ${xEnd} ${r.y + 4} Z`}
                      fill={color}
                    />
                  ) : r.outcome?.type === 'dissolved' ? (
                    <g stroke={color} strokeWidth="1.6">
                      <line x1={xEnd - 4} y1={r.y - 4} x2={xEnd + 4} y2={r.y + 4} />
                      <line x1={xEnd - 4} y1={r.y + 4} x2={xEnd + 4} y2={r.y - 4} />
                    </g>
                  ) : (
                    <circle
                      cx={xEnd}
                      cy={r.y}
                      r="4.5"
                      fill="none"
                      stroke={color}
                      strokeWidth="1.6"
                    />
                  )}
                  {r.outcome?.label && (
                    <text
                      x={xEnd + 14}
                      y={r.y + 4}
                      className="echo-fig-mono"
                      fontSize="15"
                      fill="var(--text-muted)"
                    >
                      → {r.outcome.label}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        ))}
      </svg>
      {selected != null &&
        (() => {
          const [gl, ri] = selected.split(':');
          const row = layout.find((g) => g.label === gl)?.rows[Number(ri)];
          if (!row?.record) return null;
          return (
            <div className="echo-fig-detail">
              <strong>
                {row.name} · {row.from}–{row.to ?? 'present'}
              </strong>{' '}
              — {row.record}
            </div>
          );
        })()}
    </EchoFigureShell>
  );
}

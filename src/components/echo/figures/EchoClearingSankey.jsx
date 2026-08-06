'use client';

import { useMemo, useState } from 'react';
import { EchoFigureShell } from './EchoFigureShell';

/**
 * F4 · clearing-sankey — an editorial Sankey (no d3). Source nodes stacked in
 * labeled generation groups on the left flow to destination nodes on the right;
 * ribbon thickness ∝ disclosed value (2px minimum for undisclosed / survival
 * flows). Top-2 flows by value carry an inline label + a blue tint; neutral
 * flows are muted; dissolved-tone flows are red. Click a ribbon for its record.
 */

const W = 1120;
const SRC_X = 180;
const DST_X = 940;
const BAR_W = 4;
const ROW = 38;
const GROUP_GAP = 30;
const GROUP_HEAD = 20;
const PAD_T = 20;
const MAX_RIBBON = 30;

const TONE = {
  primary: { stroke: 'var(--echo-chart-blue)', op: 0.25 },
  neutral: { stroke: 'var(--text-muted)', op: 0.18 },
  dissolved: { stroke: 'var(--echo-chart-red)', op: 0.25 },
};

export function EchoClearingSankey({
  figureLabel,
  kicker,
  hint,
  source,
  sourceGroups = [],
  destinations = [],
  flows = [],
}) {
  const [selected, setSelected] = useState(null);

  const { srcPos, dstPos, height } = useMemo(() => {
    const sp = {};
    let y = PAD_T + GROUP_HEAD;
    sourceGroups.forEach((g, gi) => {
      g._y = y - GROUP_HEAD + 10;
      g.nodes.forEach((n) => {
        sp[n.id] = y + ROW / 2;
        y += ROW;
      });
      if (gi < sourceGroups.length - 1) y += GROUP_GAP + GROUP_HEAD;
    });
    const srcEnd = y;

    const dp = {};
    let dy = PAD_T + GROUP_HEAD;
    const dstStep = Math.max(ROW + 10, 46);
    destinations.forEach((d) => {
      dp[d.id] = dy + ROW / 2;
      dy += dstStep;
    });
    return { srcPos: sp, dstPos: dp, height: Math.max(srcEnd, dy) + PAD_T };
  }, [sourceGroups, destinations]);

  const maxValue = Math.max(1, ...flows.map((f) => f.value || 0));
  const topTwo = [...flows]
    .map((f, i) => ({ i, v: f.value || 0 }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 2)
    .map((x) => x.i);

  const thickness = (v) => (v ? Math.max(2, (v / maxValue) * MAX_RIBBON) : 2);

  return (
    <EchoFigureShell figureLabel={figureLabel} kicker={kicker} hint={hint} source={source}>
      <div style={{ overflowX: 'auto' }}>
        <svg
          className="echo-fig-svg"
          viewBox={`0 0 ${W} ${height}`}
          role="img"
          aria-label={figureLabel}
        >
          {/* ribbons (drawn first, under the nodes) */}
          {flows.map((f, i) => {
            const sy = srcPos[f.from];
            const dy = dstPos[f.to];
            if (sy == null || dy == null) return null;
            const tone = TONE[f.tone] || TONE.neutral;
            const x0 = SRC_X + BAR_W;
            const x1 = DST_X;
            const mx = (x0 + x1) / 2;
            const active = selected === i;
            const isMajor = topTwo.includes(i);
            return (
              <g
                key={`f-${i}`}
                style={{ cursor: f.record ? 'pointer' : 'default' }}
                onClick={() => f.record && setSelected(active ? null : i)}
              >
                <path
                  d={`M ${x0} ${sy} C ${mx} ${sy}, ${mx} ${dy}, ${x1} ${dy}`}
                  fill="none"
                  stroke={active ? 'var(--emerald)' : tone.stroke}
                  strokeWidth={thickness(f.value)}
                  strokeOpacity={active ? 0.55 : tone.op}
                  strokeLinecap="round"
                />
                {isMajor && f.label && (
                  <text
                    x={mx}
                    y={(sy + dy) / 2 - 5}
                    textAnchor="middle"
                    className="echo-fig-mono"
                    fontSize="15"
                    fontWeight="700"
                    fill="var(--text-muted)"
                  >
                    {f.label}
                  </text>
                )}
              </g>
            );
          })}

          {/* source groups + nodes */}
          {sourceGroups.map((g) => (
            <g key={g.label}>
              <text
                x={SRC_X + BAR_W}
                y={g._y}
                textAnchor="end"
                className="echo-fig-mono"
                fontSize="15"
                letterSpacing="0.8"
                fill="var(--text-faint)"
              >
                {String(g.label).toUpperCase()}
              </text>
              {g.nodes.map((n) => (
                <g key={n.id}>
                  <rect
                    x={SRC_X}
                    y={srcPos[n.id] - 11}
                    width={BAR_W}
                    height="22"
                    fill="var(--echo-chart-blue)"
                  />
                  <text
                    x={SRC_X - 8}
                    y={srcPos[n.id] - 1}
                    textAnchor="end"
                    className="echo-fig-mono"
                    fontSize="16.5"
                    fill="var(--text-primary)"
                  >
                    {n.name}
                  </text>
                  {n.display && (
                    <text
                      x={SRC_X - 8}
                      y={srcPos[n.id] + 11}
                      textAnchor="end"
                      className="echo-fig-mono"
                      fontSize="15"
                      fill="var(--text-muted)"
                    >
                      {n.display}
                    </text>
                  )}
                </g>
              ))}
            </g>
          ))}

          {/* destinations */}
          {destinations.map((d) => (
            <g key={d.id}>
              <rect
                x={DST_X}
                y={dstPos[d.id] - 13}
                width={BAR_W}
                height="26"
                fill="var(--text-muted)"
              />
              <text
                x={DST_X + 10}
                y={dstPos[d.id] - 1}
                className="echo-fig-mono"
                fontSize="16.5"
                fontWeight="700"
                fill="var(--text-primary)"
              >
                {d.name}
              </text>
              {d.sub && (
                <text
                  x={DST_X + 10}
                  y={dstPos[d.id] + 11}
                  className="echo-fig-mono"
                  fontSize="15"
                  fill="var(--text-muted)"
                >
                  {d.sub}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
      <p className="echo-fig-hint" style={{ marginTop: 10, marginBottom: 0 }}>
        RIBBON WIDTH = DISCLOSED DEAL VALUE · MINIMUM WIDTH = SURVIVAL / UNDISCLOSED · ≈ = ESTIMATED
      </p>
      {selected != null && flows[selected]?.record && (
        <div className="echo-fig-detail">
          <strong>{flows[selected].label || 'Flow'}</strong> — {flows[selected].record}
        </div>
      )}
    </EchoFigureShell>
  );
}

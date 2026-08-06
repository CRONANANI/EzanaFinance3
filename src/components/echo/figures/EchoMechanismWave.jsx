'use client';

import { EchoFigureShell } from './EchoFigureShell';

/**
 * F2 · mechanism-wave — a pure schematic (no data axis). One continuous wave
 * flows left→right through N numbered phases, amplitude growing toward the
 * crisis phase (the second-to-last) and damping into the final phase. A dashed
 * amplification envelope arcs over the top; a dashed feedback-loop arc returns
 * from the last phase to the first with an arrowhead. Schematic only — no
 * interactivity, no detail bar.
 */

const W = 1120;
const H = 460;
const MID = 210;
const PAD = { l: 48, r: 48 };

export function EchoMechanismWave({
  figureLabel,
  kicker,
  hint,
  source,
  phases = [],
  loopCaption,
  envelopeLabel,
}) {
  const N = phases.length;
  if (!N) return null;
  const usable = W - PAD.l - PAD.r;
  const phaseW = usable / N;
  const bx = (i) => PAD.l + phaseW * i;
  const cx = (i) => PAD.l + phaseW * (i + 0.5);
  const peak = Math.max(0, N - 2);
  const peakAmp = 28 + peak * 22;
  const amp = (i) => (i === N - 1 ? Math.max(26, peakAmp * 0.4) : 28 + i * 22);
  const dir = (i) => (i % 2 === 0 ? 1 : -1); // +1 = hump up (negative y)
  const humpY = (i) => MID - dir(i) * amp(i);

  // amplification envelope: dashed arc rising from the first hump to the peak phase
  const envelope = `M ${bx(0) + 8} ${MID - amp(0)} Q ${cx(Math.floor(peak / 2))} ${
    MID - peakAmp - 46
  } ${cx(peak)} ${MID - amp(peak) - 12}`;
  // feedback loop: dashed arc from the last phase back to the first, arrowhead at the first
  const loop = `M ${cx(N - 1)} ${MID + 34} Q ${W / 2} ${H - 10} ${cx(0) + 8} ${MID + 34}`;

  return (
    <EchoFigureShell figureLabel={figureLabel} kicker={kicker} hint={hint} source={source}>
      <svg className="echo-fig-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={figureLabel}>
        {loopCaption && (
          <text
            x={W / 2}
            y={24}
            textAnchor="middle"
            className="echo-fig-mono"
            fontSize="10"
            letterSpacing="1"
            fill="var(--text-faint)"
          >
            {loopCaption}
          </text>
        )}

        {/* baseline */}
        <line x1={PAD.l} y1={MID} x2={W - PAD.r} y2={MID} stroke="var(--border-secondary)" />

        {/* amplification envelope */}
        <path
          d={envelope}
          fill="none"
          stroke="var(--echo-chart-annotation)"
          strokeDasharray="4 4"
        />
        {envelopeLabel && (
          <text
            x={cx(peak)}
            y={MID - amp(peak) - 20}
            textAnchor="middle"
            className="echo-fig-mono"
            fontSize="9.5"
            fill="var(--text-muted)"
          >
            {envelopeLabel}
          </text>
        )}

        {/* one stroked half-wave per phase */}
        {phases.map((p, i) => {
          const x0 = bx(i);
          const x1 = bx(i + 1);
          const cy = MID - dir(i) * amp(i) * 1.333;
          const d = `M ${x0} ${MID} C ${x0 + phaseW * 0.25} ${cy} ${x1 - phaseW * 0.25} ${cy} ${x1} ${MID}`;
          return <path key={`w-${p.n}`} d={d} fill="none" stroke={p.color} strokeWidth="3" />;
        })}

        {/* boundary diamonds */}
        {Array.from({ length: N + 1 }, (_, i) => (
          <path
            key={`d-${i}`}
            d={`M ${bx(i)} ${MID - 5} L ${bx(i) + 5} ${MID} L ${bx(i)} ${MID + 5} L ${bx(i) - 5} ${MID} Z`}
            fill="var(--bg-primary)"
            stroke="var(--border-secondary)"
            strokeWidth="1.2"
          />
        ))}

        {/* extremum markers + phase labels + connectors */}
        {phases.map((p, i) => {
          const labelY = 296 + i * 20;
          return (
            <g key={`p-${p.n}`}>
              <circle
                cx={cx(i)}
                cy={humpY(i)}
                r="3.4"
                fill="var(--bg-primary)"
                stroke={p.color}
                strokeWidth="1.6"
              />
              <line
                x1={cx(i)}
                y1={MID + 6}
                x2={cx(i)}
                y2={labelY - 9}
                stroke="var(--echo-chart-annotation)"
                strokeDasharray="2 3"
              />
              <text
                x={cx(i)}
                y={labelY}
                textAnchor="middle"
                className="echo-fig-mono"
                fontSize="10"
                letterSpacing="0.5"
                fill="var(--text-muted)"
              >
                {`${p.n} · ${String(p.label).toUpperCase()}`}
              </text>
            </g>
          );
        })}

        {/* feedback loop arc + arrowhead into phase 1 */}
        <path d={loop} fill="none" stroke="var(--echo-chart-annotation)" strokeDasharray="5 4" />
        <path
          d={`M ${cx(0) + 8} ${MID + 34} l 9 -4 l -1 8 Z`}
          fill="var(--echo-chart-annotation)"
        />
      </svg>
    </EchoFigureShell>
  );
}

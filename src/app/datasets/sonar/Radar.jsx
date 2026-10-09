'use client';

/**
 * The sonar. Every mark encodes something true:
 *   blip         a dimension, in taxonomy order
 *   halo ping    a live dimension (its datasets are receiving records)
 *   flow dots    records moving down a live spoke into Ezana Sonar
 *   dashed blip  a roadmap dimension: no ping, no dots, no count
 * There are no node-to-node lines.
 *
 * The SVG is decorative to assistive tech (aria-hidden). The real controls are
 * <button>s laid over the blip coordinates, and a visually hidden list names
 * every dimension and its state. Server-rendered with the rest of the page;
 * hydration adds selection and the flow-dot motion. The sweep and pings are
 * CSS and stop under prefers-reduced-motion, where the sweep rests as a
 * static wedge.
 */
import { useEffect, useState } from 'react';
import { RADAR, sweepPath } from './derive';
import { useSonarSelection } from './SonarSelection';

const { width: W, height: H, cx: CX, cy: CY, rings: RINGS } = RADAR;
const SWEEP = sweepPath();

function useMotionAllowed() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setOk(!mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return ok;
}

function stateText(b) {
  return b.live ? `${b.liveCount} live, pinging` : 'roadmap, silent';
}

export default function Radar({ blips, pinging, silent }) {
  const { selected, select } = useSonarSelection();
  const motion = useMotionAllowed();

  return (
    <div className="dso-radar">
      <div className="dso-radar-stage">
        <svg
          className="dso-radar-svg"
          viewBox={`0 0 ${W} ${H}`}
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <linearGradient id="dso-sweep-fill" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" className="dso-stop-clear" />
              <stop offset="100%" className="dso-stop-sweep" />
            </linearGradient>
            <radialGradient id="dso-core-glow">
              <stop offset="0%" className="dso-stop-glow" />
              <stop offset="100%" className="dso-stop-clear" />
            </radialGradient>
          </defs>

          {/* range rings, cross hairs, diagonals */}
          {RINGS.map((r) => (
            <circle key={r} className="dso-ring" cx={CX} cy={CY} r={r} />
          ))}
          <line className="dso-axis" x1={CX - RINGS[3]} y1={CY} x2={CX + RINGS[3]} y2={CY} />
          <line className="dso-axis" x1={CX} y1={CY - RINGS[3]} x2={CX} y2={CY + RINGS[3]} />
          <line
            className="dso-axis dso-axis--diag"
            x1={CX - RINGS[3] * 0.7071}
            y1={CY - RINGS[3] * 0.7071}
            x2={CX + RINGS[3] * 0.7071}
            y2={CY + RINGS[3] * 0.7071}
          />
          <line
            className="dso-axis dso-axis--diag"
            x1={CX + RINGS[3] * 0.7071}
            y1={CY - RINGS[3] * 0.7071}
            x2={CX - RINGS[3] * 0.7071}
            y2={CY + RINGS[3] * 0.7071}
          />
          <text className="dso-range" x={CX + RINGS[3] + 6} y={CY - 4}>
            0.25s
          </text>

          {/* the sweep: one group, rotated by CSS */}
          <g className="dso-sweep">
            <path d={SWEEP} fill="url(#dso-sweep-fill)" />
            <line
              className="dso-sweep-edge"
              x1={CX}
              y1={CY}
              x2={CX + RINGS[3] * Math.sin((66 * Math.PI) / 180)}
              y2={CY - RINGS[3] * Math.cos((66 * Math.PI) / 180)}
            />
          </g>

          {/* spokes and flow dots */}
          {blips.map((b) => (
            <g key={`s-${b.id}`} style={{ '--dso-c': b.color }}>
              <path
                id={`dso-spoke-${b.id}`}
                className={`dso-spoke${b.live ? '' : ' dso-spoke--road'}`}
                d={b.spoke}
              />
              {b.dots.map((d, i) => (
                <circle
                  key={i}
                  className="dso-flow"
                  r="1.8"
                  cx={motion ? 0 : d.x}
                  cy={motion ? 0 : d.y}
                >
                  {motion ? (
                    <animateMotion dur="3s" repeatCount="indefinite" begin={`${-i * 1.5}s`}>
                      <mpath href={`#dso-spoke-${b.id}`} />
                    </animateMotion>
                  ) : null}
                </circle>
              ))}
            </g>
          ))}

          {/* the core */}
          <circle cx={CX} cy={CY} r="58" fill="url(#dso-core-glow)" />
          <circle className="dso-core-ring" cx={CX} cy={CY} r="42" />
          <circle className="dso-core" cx={CX} cy={CY} r="34" />
          <text className="dso-core-t1" x={CX} y={CY - 2} textAnchor="middle">
            EZANA
          </text>
          <text className="dso-core-t2" x={CX} y={CY + 12} textAnchor="middle">
            SONAR
          </text>

          {/* blips */}
          {blips.map((b, i) => {
            const isSel = b.id === selected;
            return (
              <g
                key={b.id}
                className={`dso-blip${b.live ? ' is-live' : ' is-road'}${isSel ? ' is-selected' : ''}`}
                style={{ '--dso-c': b.color, '--dso-i': i }}
              >
                {b.live ? (
                  <>
                    <circle className="dso-halo dso-halo--outer" cx={b.x} cy={b.y} r="24" />
                    <circle className="dso-halo dso-halo--inner" cx={b.x} cy={b.y} r="15" />
                  </>
                ) : null}
                {isSel ? <circle className="dso-blip-sel" cx={b.x} cy={b.y} r="11" /> : null}
                <circle
                  className="dso-blip-dot"
                  cx={b.x}
                  cy={b.y}
                  r={b.live ? (isSel ? 8 : 7) : isSel ? 7 : 6}
                />
                <text
                  className="dso-blip-name"
                  x={b.labelPos.x}
                  y={b.labelPos.y}
                  textAnchor={b.labelPos.anchor}
                >
                  {b.name}
                </text>
                <text
                  className={`dso-blip-sub${b.live ? '' : ' is-road'}`}
                  x={b.labelPos.x}
                  y={b.labelPos.y + 12}
                  textAnchor={b.labelPos.anchor}
                >
                  {b.live ? `${b.liveCount} LIVE · PINGING` : 'ROADMAP · SILENT'}
                </text>
              </g>
            );
          })}
        </svg>

        {/* the real controls, over the blips */}
        {blips.map((b) => (
          <button
            key={b.id}
            type="button"
            className="dso-blip-btn"
            style={{ left: `${b.leftPct}%`, top: `${b.topPct}%` }}
            aria-pressed={b.id === selected}
            aria-label={`${b.label}, ${b.live ? `${b.liveCount} live datasets` : 'on the roadmap'}, select`}
            onClick={() => select(b.id, 'radar')}
          />
        ))}
      </div>

      <ul className="dso-sr">
        {blips.map((b) => (
          <li key={b.id}>
            {b.label}: {stateText(b)}
            {b.id === selected ? ' (selected)' : ''}
          </li>
        ))}
        <li>
          {pinging} datasets pinging, {silent} silent until live.
        </li>
      </ul>
    </div>
  );
}

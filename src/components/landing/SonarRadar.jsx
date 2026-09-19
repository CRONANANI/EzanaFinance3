/**
 * SonarRadar — the visual core of the Sonar landing band.
 *
 * Adapted FROM src/components/landing/PersonalizationRadar.jsx, which stays
 * untouched. What carries over is the orbital mechanism: a viewBox-based radial
 * system around a single centre, concentric rings, `ang(i)` distributing N nodes
 * around the circle clockwise from twelve o'clock, the anchor-by-side label rule,
 * and the hub treatment — here the hub becomes the ping point.
 *
 * What changes: the seven taxonomy dimensions become the eight Sonar datasets,
 * the theme tokens become the band's scoped `--snr-*` palette, and the ambient
 * weight-drift animation becomes the handoff's choreography — a rotating wedge,
 * node blips as the sweep passes, and route lines drawing toward the briefing
 * card — keyed as percentages of one 15s master timeline.
 *
 * PersonalizationRadar seeds its motion with per-dimension pseudo-random
 * frequencies and phases, which would make SSR and client markup differ. Nothing
 * here is pseudo-random: every offset is a fixed percentage or a fixed delay, so
 * the two renders are byte identical.
 *
 * Motion lives in sonar-band.css rather than framer-motion; see the radar block
 * there for why.
 */

'use client';

const CX = 280,
  CY = 240,
  R_NODE = 150,
  RMAX = 195;

const N = 8;

/* Same formula as PersonalizationRadar: clockwise from twelve o'clock in
   360/N steps. At N=8 it reproduces the handoff's eight node angles exactly. */
function ang(i) {
  return ((-90 + (i * 360) / N) * Math.PI) / 180;
}

function nodeAt(i) {
  const a = ang(i);
  return {
    cx: Math.round((CX + R_NODE * Math.cos(a)) * 100) / 100,
    cy: Math.round((CY + R_NODE * Math.sin(a)) * 100) / 100,
    /* PersonalizationRadar's anchor rule, unchanged: middle at top and bottom,
       start on the right, end on the left. */
    anchor: Math.abs(Math.cos(a)) < 0.25 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end',
  };
}

/* Label offsets and route curves are design-authored in 04-reference.html — the
   curves are hand-drawn beziers, not derivable from the radial system — so they
   travel with each node rather than being recomputed. */
const NODES = [
  { label: 'ECHO', dx: 0, dy: -22, d: 'M280 90Q470 96 556 240', faint: false },
  { label: 'CONGRESS', dx: 18, dy: -4, d: 'M386 134Q492 140 556 240', faint: false },
  { label: 'CONTRACTS', dx: 18, dy: 4, d: 'M430 240Q500 240 556 240', faint: false },
  { label: 'MARKETS', dx: 18, dy: 8, d: 'M386 346Q492 340 556 240', faint: false },
  { label: 'SEC', dx: 0, dy: 26, d: 'M280 390Q470 384 556 240', faint: false },
  { label: '13F', dx: -18, dy: 8, d: 'M174 346Q320 430 556 240', faint: true },
  { label: 'LOBBYING', dx: -18, dy: 4, d: 'M130 240Q300 150 556 240', faint: true },
  { label: 'WEB', dx: -18, dy: -4, d: 'M174 134Q330 60 556 240', faint: true },
].map((n, i) => ({ ...n, ...nodeAt(i), k: i }));

/* One eighth of one 3.75s turn. Kept in step with the 3.125%-per-node latch in
   the stylesheet: change the turn count and both have to move together or the
   blips stop landing under the wedge. */
const STEP_S = 0.47;
const delay = (k) => `${Math.round(k * STEP_S * 100) / 100}s`;

const WAVE_DELAYS = ['0s', '1.3s', '2.6s'];
const WAVE_STROKES = ['rgba(110,231,183,0.5)', 'rgba(110,231,183,0.34)', 'rgba(110,231,183,0.24)'];

export function SonarRadar() {
  return (
    <svg
      className="snr-radar"
      width="470"
      height="403"
      viewBox="0 0 560 480"
      fill="none"
      role="img"
      aria-label="A sonar radar waking on the ping, sweeping eight datasets and routing each match into the briefing"
    >
      <defs>
        <radialGradient
          id="snrWedge"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform={`translate(${CX} ${CY}) scale(${RMAX})`}
        >
          <stop offset="0" stopColor="#6ee7b7" stopOpacity="0.42" />
          <stop offset="1" stopColor="#6ee7b7" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g aria-hidden="true">
        {/* Concentric rings, the r=150 node ring keyed brighter. */}
        <circle cx={CX} cy={CY} r="60" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <circle cx={CX} cy={CY} r="105" stroke="rgba(255,255,255,0.13)" strokeWidth="1" />
        <circle cx={CX} cy={CY} r={R_NODE} stroke="rgba(167,243,208,0.26)" strokeWidth="1" />
        <circle
          cx={CX}
          cy={CY}
          r={RMAX}
          stroke="rgba(255,255,255,0.11)"
          strokeWidth="1"
          strokeDasharray="2 7"
        />
        <path
          d={`M${CX - RMAX} ${CY}h${RMAX * 2}M${CX} ${CY - RMAX}v${RMAX * 2}`}
          stroke="rgba(255,255,255,0.09)"
          strokeWidth="1"
        />

        {/* Ring waves: delayed transients, invisible at both ends of the loop. */}
        {WAVE_DELAYS.map((d, i) => (
          <circle
            key={d}
            className="snr-wave snr-anim-wave"
            cx={CX}
            cy={CY}
            r={RMAX}
            fill="none"
            stroke={WAVE_STROKES[i]}
            strokeWidth="1.5"
            style={{ animationDelay: d }}
          />
        ))}

        {/* The 62-degree wedge, rotated about the centre in view-box space. */}
        <g className="snr-sweep snr-anim-sweep">
          <path
            d={`M${CX} ${CY}L${CX} ${CY - RMAX}A${RMAX} ${RMAX} 0 0 1 452.2 148.4Z`}
            fill="url(#snrWedge)"
          />
          <path
            d={`M${CX} ${CY}L452.2 148.4`}
            stroke="#a7f3d0"
            strokeWidth="1.4"
            strokeOpacity="0.85"
          />
        </g>

        {/* Route lines, each drawing toward the briefing card at (556,240). */}
        <g stroke="#6ee7b7" strokeWidth="1" fill="none" strokeLinecap="round" strokeDasharray="320">
          {NODES.map((n) => (
            <path
              key={n.label}
              className="snr-route snr-anim-route"
              d={n.d}
              style={{ opacity: n.faint ? 0.32 : 0.55, animationDelay: delay(n.k) }}
            />
          ))}
        </g>

        {/* The eight dataset nodes. Each latches lit as the wedge passes it. */}
        <g
          style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: '12px',
            letterSpacing: '0.16em',
          }}
          fill="#d1fae5"
        >
          {NODES.map((n) => (
            <g key={n.label} className={`snr-node snr-anim-lit${n.k}`}>
              <circle
                className="snr-halo snr-anim-halo"
                cx={n.cx}
                cy={n.cy}
                r="11"
                fill="#6ee7b7"
                style={{ animationDelay: delay(n.k) }}
              />
              <circle cx={n.cx} cy={n.cy} r="5.5" fill="#ffffff" />
              <text x={n.cx + n.dx} y={n.cy + n.dy} textAnchor={n.anchor}>
                {n.label}
              </text>
            </g>
          ))}
        </g>

        {/* The hub, carried over from PersonalizationRadar as the ping point. */}
        <g className="snr-core snr-anim-core">
          <circle cx={CX} cy={CY} r="7" fill="#ffffff" />
          <circle
            cx={CX}
            cy={CY}
            r="15"
            stroke="#ffffff"
            strokeOpacity="0.45"
            strokeWidth="1"
            fill="none"
          />
        </g>
        <text
          x={CX}
          y={CY + 34}
          textAnchor="middle"
          fill="#a7f3d0"
          style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: '11px',
            letterSpacing: '0.2em',
          }}
        >
          PING
        </text>
      </g>
    </svg>
  );
}

export default SonarRadar;

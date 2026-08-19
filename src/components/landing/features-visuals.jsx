'use client';

/**
 * Six bespoke, self-animating mini data-visualizations for the "Why Ezana"
 * features section — one per card, each pinned to the bottom of its card face.
 *
 * ⚠️ UNIFORMITY IS THE PRIMARY REQUIREMENT: every visual renders into the SAME
 * shared frame — viewBox `0 0 ${VIZ_W} ${VIZ_H}` — with no per-card size override,
 * so all six read as identical in size/weight. Content that is intrinsically
 * narrow (the dial, the avatars) is centered within the 224-wide frame.
 *
 * A single `tick` (incremented every 2000ms on the section) drives all six;
 * frames are derived deterministically from `tick` (sin/seeded) so SSR and the
 * first client render match. Animated children carry stable keys + a `.fv-t`
 * class so CSS transitions animate BETWEEN frames (glide/breathe/flip) rather
 * than snap. When `reduced` is true the resting frame renders and nothing moves.
 *
 * Figures are illustrative ambient motion — decorative, not factual claims.
 * Fonts come from tokens (CSS `.feature-viz text`); hex here is only the
 * specific viz linework the handoff names.
 */

export const VIZ_W = 224;
export const VIZ_H = 64;

// Handoff palette (viz linework only).
const EM = '#10b981';
const EM2 = '#34d399';
const EM3 = '#6ee7b7';
const EM4 = '#a7f3d0';
const EMD = '#059669';
const BLUE = '#3b82f6';
const RED = '#ef4444';
const HAIR = 'rgba(148,163,184,0.28)';
const HAIR2 = 'rgba(148,163,184,0.45)';

/** deterministic pseudo-random in [0,1) from an integer seed (no Math.random). */
function seeded(n) {
  const x = Math.sin(n * 12.9898 + 4.1) * 43758.5453;
  return x - Math.floor(x);
}

function Frame({ label, children }) {
  return (
    <svg
      className="feature-viz-svg"
      viewBox={`0 0 ${VIZ_W} ${VIZ_H}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label}
    >
      {children}
    </svg>
  );
}

/* 1 ── Congressional Trading: live ranked member leaderboard ─────────────── */
function CongressViz({ tick }) {
  const members = [
    { id: 'a', party: BLUE },
    { id: 'b', party: RED },
    { id: 'c', party: BLUE },
    { id: 'd', party: RED },
  ];
  const rowH = 13;
  const top = 6;
  const barX = 44;
  const barMax = 150;
  const ranked = members
    .map((m, i) => ({ ...m, v: 0.25 + 0.72 * seeded(tick * 4 + i) }))
    .sort((p, q) => q.v - p.v);
  return (
    <Frame label="Live ranked congressional trader leaderboard">
      {ranked.map((m, slot) => {
        const y = top + slot * rowH;
        return (
          <g key={m.id} className="fv-t" style={{ transform: `translateY(${y}px)` }}>
            <text x="6" y="9" className="fv-num" fontSize="8">
              {slot + 1}
            </text>
            <circle cx="24" cy="6" r="4.5" fill={m.party} opacity="0.9" />
            <rect x={barX - 6} y="4" width={barMax + 6} height="4" rx="2" fill={HAIR} />
            <rect
              key={`bar-${m.id}`}
              className={`fv-t fv-bar${slot === 0 ? ' fv-pulse' : ''}`}
              x={barX}
              y="4"
              width={barMax}
              height="4"
              rx="2"
              fill={slot === 0 ? EM : EM3}
              style={{ transform: `scaleX(${m.v.toFixed(3)})` }}
            />
          </g>
        );
      })}
    </Frame>
  );
}

/* 2 ── Portfolio Analytics: concentric allocation dial (centered) ────────── */
/* Three concentric rings, one per allocation lens, matching the multi-dimension
   radial pattern used elsewhere in the product. Each ring shares the same
   stroke weight and a uniform 6px radius step, and all three start at 12
   o'clock (the -90deg rotation). The percentages are fixed so the single
   center number stays stable; the motion in this visual is the rotating tick
   dial, which is tick-driven and therefore frozen under reduced motion.
   Chart tokens are echo-scoped and unavailable on the landing route, so each
   falls back to the platform equivalent. */
const DIAL_RINGS = [
  { r: 22, seg: 0.65, stroke: 'var(--emerald)' },
  { r: 16, seg: 0.42, stroke: 'var(--echo-chart-blue, var(--blue))' },
  { r: 10, seg: 0.78, stroke: 'var(--echo-chart-purple, var(--purple))' },
];
const DIAL_PRIMARY = DIAL_RINGS[0].seg;

function PortfolioViz({ tick }) {
  const cx = 112;
  const cy = 32;
  const ticks = Array.from({ length: 24 }, (_, i) => i);
  return (
    <Frame label="Concentric portfolio allocation dial">
      {/* rotating tick dial */}
      <g
        className="fv-t"
        style={{ transform: `rotate(${tick * 15}deg)`, transformOrigin: `${cx}px ${cy}px` }}
      >
        {ticks.map((i) => {
          const a = (i / 24) * 2 * Math.PI;
          const r1 = 29;
          const r2 = i % 6 === 0 ? 25.5 : 27;
          return (
            <line
              key={i}
              x1={cx + r1 * Math.cos(a)}
              y1={cy + r1 * Math.sin(a)}
              x2={cx + r2 * Math.cos(a)}
              y2={cy + r2 * Math.sin(a)}
              stroke={i % 6 === 0 ? HAIR2 : HAIR}
              strokeWidth="1"
            />
          );
        })}
      </g>
      {DIAL_RINGS.map((ring) => {
        const circ = 2 * Math.PI * ring.r;
        return (
          <g key={ring.r}>
            <circle cx={cx} cy={cy} r={ring.r} fill="none" stroke={HAIR} strokeWidth="3.5" />
            <circle
              className="fv-t fv-ring"
              cx={cx}
              cy={cy}
              r={ring.r}
              fill="none"
              strokeWidth="3.5"
              strokeLinecap="round"
              style={{
                stroke: ring.stroke,
                strokeDasharray: `${(circ * ring.seg).toFixed(1)} ${circ}`,
              }}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          </g>
        );
      })}
      {/* One number only: three stacked percentages would clutter a 64px frame.
          Sized to clear the innermost ring's bore. */}
      <text x={cx} y={cy + 2.4} textAnchor="middle" className="fv-num fv-em" fontSize="8">
        {Math.round(DIAL_PRIMARY * 100)}%
      </text>
    </Frame>
  );
}

/* 3 ── Market Intelligence: live market heat grid (9×4) ──────────────────── */
function IntelligenceViz({ tick }) {
  const cols = 9;
  const rows = 4;
  const cw = 20;
  const ch = 12;
  const gap = 3;
  const gridW = cols * cw + (cols - 1) * gap;
  const x0 = (VIZ_W - gridW) / 2;
  const y0 = 4;
  const blink = tick % (cols * rows);
  return (
    <Frame label="Live market heat grid">
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((__, c) => {
          const idx = r * cols + c;
          const v = seeded(tick + idx * 1.7);
          const up = v > 0.5;
          const mag = Math.abs(v - 0.5) * 2; // 0..1
          const fill = up
            ? mag > 0.6
              ? EM
              : mag > 0.3
                ? EM3
                : EM4
            : mag > 0.6
              ? RED
              : mag > 0.3
                ? '#f87171'
                : '#fecaca';
          return (
            <rect
              key={`${r}-${c}`}
              className={`fv-t fv-cell${idx === blink ? ' fv-blink' : ''}`}
              x={x0 + c * (cw + gap)}
              y={y0 + r * (ch + gap)}
              width={cw}
              height={ch}
              rx="3"
              fill={fill}
            />
          );
        }),
      )}
    </Frame>
  );
}

/* 4 ── Real-time Alerts: threshold-cross trigger ─────────────────────────── */
function AlertsViz({ tick }) {
  const thY = 26;
  const crossX = 150;
  const b = 0.5 + 0.5 * Math.sin(tick * 1.1);
  // price line rises through the threshold; tail breathes with b
  const pts = [
    [8, 50],
    [40, 46 - b * 3],
    [72, 44],
    [104, 38 - b * 4],
    [130, 30],
    [crossX, 18],
    [200, 12 - b * 3],
  ];
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]} ${p[1].toFixed(1)}`).join(' ');
  return (
    <Frame label="Real-time alert threshold crossing">
      {/* threshold */}
      <line
        x1="8"
        y1={thY}
        x2="216"
        y2={thY}
        stroke={EM}
        strokeWidth="1"
        strokeDasharray="4 3"
        opacity="0.7"
      />
      {/* price line */}
      <path className="fv-t" d={d} fill="none" stroke={EM2} strokeWidth="2" strokeLinecap="round" />
      {/* continuous pulse burst at the crossing */}
      <circle className="fv-burst fv-burst-1" cx={crossX} cy="18" r="3" fill="none" stroke={EM} />
      <circle className="fv-burst fv-burst-2" cx={crossX} cy="18" r="3" fill="none" stroke={EM} />
      <circle cx={crossX} cy="18" r="2.6" fill={EM} />
      {/* triggered badge */}
      <g transform={`translate(${crossX + 8} 8)`}>
        <circle cx="5" cy="5" r="5.5" fill={EMD} />
        <text x="5" y="8" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="700">
          !
        </text>
      </g>
    </Frame>
  );
}

/* 5 ── Community Insights: radar scan of the user's friend network ────────── */
/* The USER sits at the center; their network rides three concentric rings. A
   sweep rotates once per RADAR_PERIOD; a node that ACTED on the news lights
   emerald with a brief pulse and a connecting line as the sweep passes it
   (delay = angle / 360 * period). Everything is a fixed constant, so which
   nodes light is deterministic; the sweep is pure CSS; reduced motion freezes
   the sweep with the acted nodes statically lit (features-visuals.css). */
const RADAR_CX = 112;
const RADAR_CY = 24;
const RADAR_RINGS = [7, 13, 19];
/* [ring radius, angle degrees clockwise from 12 o'clock, acted] */
const RADAR_NODES = [
  [13, 20, true],
  [19, 70, false],
  [7, 120, true],
  [19, 160, false],
  [13, 205, true],
  [19, 245, false],
  [7, 290, false],
  [13, 330, true],
];
const RADAR_PERIOD = 6; // seconds per full sweep

function CommunityViz({ tick }) {
  const pct = 58 + Math.round(seeded(tick) * 34);
  return (
    <Frame label="Radar scan of your network surfacing who acted on the news">
      {RADAR_RINGS.map((r) => (
        <circle key={r} cx={RADAR_CX} cy={RADAR_CY} r={r} className="fv-radar-ring" />
      ))}
      {/* rotating sweep sector */}
      <g className="fv-radar-sweep" style={{ transformOrigin: `${RADAR_CX}px ${RADAR_CY}px` }}>
        <path
          d={`M ${RADAR_CX} ${RADAR_CY} L ${RADAR_CX} ${RADAR_CY - 21} A 21 21 0 0 1 ${(
            RADAR_CX +
            21 * Math.sin(Math.PI / 4)
          ).toFixed(2)} ${(RADAR_CY - 21 * Math.cos(Math.PI / 4)).toFixed(2)} Z`}
          className="fv-radar-wedge"
        />
      </g>
      {RADAR_NODES.map(([r, deg, acted], i) => {
        const a = (deg * Math.PI) / 180;
        const x = (RADAR_CX + r * Math.sin(a)).toFixed(2);
        const y = (RADAR_CY - r * Math.cos(a)).toFixed(2);
        const delay = `${((deg / 360) * RADAR_PERIOD).toFixed(2)}s`;
        return (
          <g key={i}>
            {acted && (
              <line
                x1={RADAR_CX}
                y1={RADAR_CY}
                x2={x}
                y2={y}
                className="fv-radar-link"
                style={{ animationDelay: delay }}
              />
            )}
            <circle
              cx={x}
              cy={y}
              r={acted ? 2.6 : 2}
              className={acted ? 'fv-radar-node fv-radar-node--acted' : 'fv-radar-node'}
              style={acted ? { animationDelay: delay } : undefined}
            />
          </g>
        );
      })}
      {/* the user, at the center of their network */}
      <circle cx={RADAR_CX} cy={RADAR_CY} r="3.4" className="fv-radar-user" />
      <text x={VIZ_W / 2} y="56" textAnchor="middle" className="fv-num fv-em" fontSize="9.5">
        {pct}% of your circle acted on this
      </text>
    </Frame>
  );
}

/* 6 ── Alternative Analytics: ticker regression scatter ──────────────────── */
function AltViz({ tick }) {
  const ax = 20;
  const ay = 54; // axis origin
  const tickers = [
    { t: 'XOM', bx: 0.18, by: 0.28 },
    { t: 'AAPL', bx: 0.36, by: 0.44 },
    { t: 'TSLA', bx: 0.52, by: 0.5 },
    { t: 'AVGO', bx: 0.68, by: 0.66 },
    { t: 'NVDA', bx: 0.86, by: 0.82 },
  ];
  const plotW = 184;
  const plotH = 44;
  const r = (0.78 + 0.06 * Math.sin(tick * 0.8)).toFixed(2);
  return (
    <Frame label="Alternative-data ticker regression scatter">
      {/* axes */}
      <line x1={ax} y1="8" x2={ax} y2={ay} stroke={HAIR2} strokeWidth="1" />
      <line x1={ax} y1={ay} x2={ax + plotW} y2={ay} stroke={HAIR2} strokeWidth="1" />
      {/* best-fit line */}
      <line
        x1={ax + 6}
        y1={ay - 0.2 * plotH}
        x2={ax + plotW - 6}
        y2={ay - 0.9 * plotH}
        stroke={EM}
        strokeWidth="1"
        strokeDasharray="4 3"
        opacity="0.75"
      />
      {tickers.map((p, i) => {
        const drift = (seeded(tick + i * 2.3) - 0.5) * 6; // px of vertical drift
        const px = ax + p.bx * plotW;
        const py = ay - p.by * plotH;
        const hot = p.t === 'NVDA';
        return (
          <g key={p.t} className="fv-t" style={{ transform: `translateY(${drift.toFixed(2)}px)` }}>
            <circle
              cx={px}
              cy={py}
              r={hot ? 3.8 : 2.8}
              fill={hot ? EM : EM3}
              opacity={hot ? 1 : 0.85}
            />
          </g>
        );
      })}
      <text x={ax + plotW} y="12" textAnchor="end" className="fv-num" fontSize="8">
        r = {r}
      </text>
    </Frame>
  );
}

const VISUALS = {
  congress: CongressViz,
  portfolio: PortfolioViz,
  intelligence: IntelligenceViz,
  alerts: AlertsViz,
  community: CommunityViz,
  alt: AltViz,
};

/** Renders one card's visual. `reduced` pins tick at 0 (handled by the parent). */
export function FeatureVisual({ cardKey, tick = 0 }) {
  const Viz = VISUALS[cardKey];
  return Viz ? <Viz tick={tick} /> : null;
}

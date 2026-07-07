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
export const VIZ_H = 72;

// Handoff palette (viz linework only).
const EM = '#10b981';
const EM2 = '#34d399';
const EM3 = '#6ee7b7';
const EM4 = '#a7f3d0';
const EMD = '#059669';
const BLUE = '#3b82f6';
const RED = '#ef4444';
const MUTE = '#94a3b8';
const HAIR = 'rgba(148,163,184,0.18)';
const HAIR2 = 'rgba(148,163,184,0.30)';

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
            <text x="6" y="9" className="fv-num" fill={MUTE} fontSize="8">
              {slot + 1}
            </text>
            <circle cx="24" cy="6" r="4.5" fill={m.party} opacity="0.9" />
            <rect x={barX - 6} y="4.5" width={barMax + 6} height="3" rx="1.5" fill={HAIR} />
            <rect
              key={`bar-${m.id}`}
              className={`fv-t fv-bar${slot === 0 ? ' fv-pulse' : ''}`}
              x={barX}
              y="4.5"
              width={barMax}
              height="3"
              rx="1.5"
              fill={slot === 0 ? EM : EM3}
              style={{ transform: `scaleX(${m.v.toFixed(3)})` }}
            />
          </g>
        );
      })}
      <text x="6" y="70" className="fv-cap" fill={MUTE} fontSize="6.5">
        TOP TRADERS · 90D
      </text>
    </Frame>
  );
}

/* 2 ── Portfolio Analytics: concentric allocation dial (centered) ────────── */
function PortfolioViz({ tick }) {
  const cx = 112;
  const cy = 34;
  const rOuter = 22;
  const rInner = 14;
  const circO = 2 * Math.PI * rOuter;
  const circI = 2 * Math.PI * rInner;
  const b = 0.5 + 0.5 * Math.sin(tick * 0.9); // breathe 0..1
  const outerSeg = 0.62 + 0.16 * b;
  const innerSeg = 0.4 + 0.18 * (1 - b);
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
      {/* outer allocation ring */}
      <circle cx={cx} cy={cy} r={rOuter} fill="none" stroke={HAIR} strokeWidth="4" />
      <circle
        className="fv-t fv-ring"
        cx={cx}
        cy={cy}
        r={rOuter}
        fill="none"
        stroke={EM}
        strokeWidth="4"
        strokeLinecap="round"
        style={{ strokeDasharray: `${(circO * outerSeg).toFixed(1)} ${circO}` }}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      {/* inner sector ring */}
      <circle cx={cx} cy={cy} r={rInner} fill="none" stroke={HAIR} strokeWidth="3.5" />
      <circle
        className="fv-t fv-ring"
        cx={cx}
        cy={cy}
        r={rInner}
        fill="none"
        stroke={EM2}
        strokeWidth="3.5"
        strokeLinecap="round"
        style={{ strokeDasharray: `${(circI * innerSeg).toFixed(1)} ${circI}` }}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
      <text x={cx} y={cy + 2.5} textAnchor="middle" className="fv-num" fill={EM3} fontSize="8">
        {Math.round(outerSeg * 100)}%
      </text>
      <text x={cx} y="70" textAnchor="middle" className="fv-cap" fill={MUTE} fontSize="6.5">
        ALLOCATION · SECTOR
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
              rx="2.5"
              fill={fill}
              opacity={0.5 + mag * 0.5}
            />
          );
        }),
      )}
      <text x={x0} y="70" className="fv-cap" fill={MUTE} fontSize="6.5">
        MARKET HEAT · LIVE
      </text>
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
      <text x="8" y={thY - 4} className="fv-cap" fill={EM3} fontSize="6.5">
        ALERT THRESHOLD
      </text>
      {/* price line */}
      <path
        className="fv-t"
        d={d}
        fill="none"
        stroke={EM2}
        strokeWidth="1.6"
        strokeLinecap="round"
      />
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
      <text x="8" y="70" className="fv-cap" fill={MUTE} fontSize="6.5">
        THRESHOLD · TRIGGERED
      </text>
    </Frame>
  );
}

/* 5 ── Community Insights: community consensus ───────────────────────────── */
function CommunityViz({ tick }) {
  const n = 5;
  const step = 30;
  const startX = (VIZ_W - (n - 1) * step) / 2 - 8;
  const active = tick % n;
  const pct = 58 + Math.round(seeded(tick) * 34);
  return (
    <Frame label="Community consensus signal">
      {Array.from({ length: n }).map((_, i) => {
        const isActive = i === active;
        return (
          <g key={i} transform={`translate(${startX + i * step} 6)`} opacity={isActive ? 1 : 0.55}>
            {/* head + shoulders glyph */}
            <circle cx="10" cy="9" r="5.5" fill={isActive ? EM : HAIR2} />
            <path
              d="M1 26 a9 9 0 0 1 18 0 z"
              fill={isActive ? EM2 : HAIR}
              stroke="#0a0e13"
              strokeWidth="1"
            />
          </g>
        );
      })}
      {/* walker highlight ring glides across */}
      <g className="fv-t" style={{ transform: `translateX(${startX + active * step}px)` }}>
        <circle cx="10" cy="15" r="15" fill="none" stroke={EM3} strokeWidth="1" opacity="0.5" />
      </g>
      <text x={VIZ_W / 2} y="52" textAnchor="middle" className="fv-num" fill={EM3} fontSize="8.5">
        {pct}% of your circle acted on this
      </text>
      <text x={VIZ_W / 2} y="66" textAnchor="middle" className="fv-cap" fill={MUTE} fontSize="6.5">
        CONSENSUS SIGNAL
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
              r={hot ? 3.4 : 2.4}
              fill={hot ? EM : EM3}
              opacity={hot ? 1 : 0.85}
            />
            {hot && (
              <text x={px + 5} y={py + 3} className="fv-cap" fill={EM3} fontSize="6.5">
                {p.t}
              </text>
            )}
          </g>
        );
      })}
      <text x={ax + plotW} y="12" textAnchor="end" className="fv-num" fill={MUTE} fontSize="7">
        r = {r}
      </text>
      <text x={ax} y="70" className="fv-cap" fill={MUTE} fontSize="6.5">
        ALT-SIGNAL × PRICE
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

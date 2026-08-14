'use client';

import './hero-dimension-visuals.css';

/**
 * Hero iMac visuals: seven bespoke frames, one per dataset dimension,
 * DISTINCT from dimension-visuals.jsx (Portfolio Intelligence section).
 * Every frame carries a social layer (copiers, leaderboards, community)
 * so the desktop reads "social investing on serious data" at a glance.
 *
 * Contract:
 *  - Shared 320x176 viewBox, no per-frame size overrides.
 *  - Discrete frames derive deterministically from integer `tick` via a
 *    seeded sin (no Math.random); continuous loops are pure CSS and are
 *    disabled under prefers-reduced-motion in the companion stylesheet.
 *  - Accent inherits from --dv-accent (set by the parent card from the
 *    taxonomy color token). No hardcoded brand hex.
 *  - Decorative only: the parent stack is aria-hidden.
 */

const W = 320;
const H = 176;

function seeded(n) {
  const x = Math.sin(n * 12.9898 + 4.1) * 43758.5453;
  return x - Math.floor(x);
}

function Frame({ label, children }) {
  return (
    <svg
      className="hdv-svg"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label}
    >
      {children}
    </svg>
  );
}

/* 1 ── Capitol Watch: most-copied congressional trades leaderboard ───────── */
const CAP_ROWS = [
  { id: 'k1', tk: 'NVDA', copiers: '2.1K', base: 78 },
  { id: 'k2', tk: 'LMT', copiers: '1.4K', base: 60 },
  { id: 'k3', tk: 'XOM', copiers: '890', base: 44 },
  { id: 'k4', tk: 'PFE', copiers: '512', base: 30 },
];

function CapitolLeaderViz({ tick }) {
  return (
    <Frame label="Most copied congressional trades, live leaderboard">
      <text x="0" y="14" className="hdv-mono hdv-kicker">
        MOST COPIED · CAPITOL TRADES
      </text>
      {CAP_ROWS.map((r, i) => {
        const w = r.base + Math.round(18 * seeded(tick * 3 + i * 7));
        const y = 28 + i * 32;
        return (
          <g key={r.id} className="hdv-t" style={{ transform: `translateY(${y}px)` }}>
            <rect x="0" y="0" width="320" height="24" rx="6" className="hdv-rowbg" />
            <text x="10" y="16" className="hdv-mono hdv-strong">
              {r.tk}
            </text>
            <rect x="58" y="7" width={w * 2} height="10" rx="5" className="hdv-t hdv-bar" />
            <text x="252" y="16" className="hdv-mono hdv-dim">
              {r.copiers} copying
            </text>
          </g>
        );
      })}
      <text x="0" y="172" className="hdv-mono hdv-foot">
        HOUSE + SENATE DISCLOSURES · UPDATED DAILY
      </text>
    </Frame>
  );
}

/* 2 ── Titans Shadow: 13F block wall with a cycling whale-move ring ──────── */
const TITAN_BLOCKS = [
  { id: 'b1', x: 0, y: 26, w: 118, h: 62, tk: 'AAPL' },
  { id: 'b2', x: 124, y: 26, w: 88, h: 62, tk: 'MSFT' },
  { id: 'b3', x: 218, y: 26, w: 102, h: 62, tk: 'NVDA' },
  { id: 'b4', x: 0, y: 94, w: 76, h: 54, tk: 'BRK.B' },
  { id: 'b5', x: 82, y: 94, w: 130, h: 54, tk: 'AMZN' },
  { id: 'b6', x: 218, y: 94, w: 102, h: 54, tk: 'META' },
];

function TitansWallViz({ tick }) {
  const hot = tick % TITAN_BLOCKS.length;
  return (
    <Frame label="Institutional 13F holdings wall with the latest whale move highlighted">
      <text x="0" y="14" className="hdv-mono hdv-kicker">
        13F HOLDINGS WALL · Q2
      </text>
      {TITAN_BLOCKS.map((b, i) => (
        <g key={b.id}>
          <rect
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h}
            rx="7"
            className={`hdv-t hdv-block${i === hot ? ' is-hot' : ''}`}
          />
          <text x={b.x + 10} y={b.y + 20} className="hdv-mono hdv-strong">
            {b.tk}
          </text>
          <text x={b.x + 10} y={b.y + 34} className="hdv-mono hdv-dim">
            {i === hot ? 'whale move' : `${8 + Math.round(6 * seeded(i * 11 + 3))}% wt`}
          </text>
        </g>
      ))}
      <text x="0" y="168" className="hdv-mono hdv-foot">
        24K INVESTORS TRACK THESE FILINGS ON EZANA
      </text>
    </Frame>
  );
}

/* 3 ── Eyes Above: satellite occupancy grid filling by pass ──────────────── */
function EyesGridViz({ tick }) {
  const cols = 16;
  const rows = 6;
  const cells = [];
  let filled = 0;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const on = seeded(r * 31 + c * 7 + tick) > 0.42;
      if (on) filled += 1;
      cells.push({ key: `e${r}-${c}`, x: 6 + c * 19, y: 32 + r * 18, on });
    }
  }
  const pct = Math.round((filled / (cols * rows)) * 100);
  return (
    <Frame label="Satellite parking lot occupancy grid updating each pass">
      <text x="0" y="14" className="hdv-mono hdv-kicker">
        SATELLITE PASS · RETAIL LOT OCCUPANCY
      </text>
      {cells.map((c) => (
        <rect
          key={c.key}
          x={c.x}
          y={c.y}
          width="13"
          height="12"
          rx="3"
          className={`hdv-t hdv-cell${c.on ? ' is-on' : ''}`}
        />
      ))}
      <text x="0" y="164" className="hdv-mono hdv-strong">
        {pct}% occupied
      </text>
      <text x="96" y="164" className="hdv-mono hdv-dim">
        · 1.8K watching this signal
      </text>
    </Frame>
  );
}

/* 4 ── Consumer Whispers: sentiment tape + trending chips ────────────────── */
const WHISPER_CHIPS = [
  { id: 'w1', tag: '#earnings', n: '4.2K' },
  { id: 'w2', tag: '#retail', n: '2.9K' },
  { id: 'w3', tag: '#ai-capex', n: '2.1K' },
];

function WhispersTapeViz({ tick }) {
  const pts = Array.from({ length: 12 }, (_, i) => {
    const y = 118 - 44 * seeded(i * 5 + Math.floor(tick / 2) * 3);
    return `${8 + i * 28},${y.toFixed(1)}`;
  }).join(' ');
  return (
    <Frame label="Consumer sentiment line with trending community topics">
      <text x="0" y="14" className="hdv-mono hdv-kicker">
        COMMUNITY SENTIMENT · 24H
      </text>
      <polyline points={pts} className="hdv-t hdv-line" />
      {WHISPER_CHIPS.map((c, i) => (
        <g key={c.id} transform={`translate(${8 + i * 108}, 132)`}>
          <rect x="0" y="0" width="100" height="24" rx="12" className="hdv-chip" />
          <text x="10" y="16" className="hdv-mono hdv-strong">
            {c.tag}
          </text>
          <text x="66" y="16" className="hdv-mono hdv-dim">
            {c.n}
          </text>
        </g>
      ))}
    </Frame>
  );
}

/* 5 ── The Hive: copy-network graph around a central YOU node ────────────── */
function HiveNetworkViz({ tick }) {
  const cx = 160;
  const cy = 92;
  const nodes = Array.from({ length: 7 }, (_, i) => {
    const a = (i / 7) * Math.PI * 2;
    const r = 58 + 10 * seeded(i * 13 + 2);
    return { key: `h${i}`, x: cx + r * Math.cos(a), y: cy + r * 0.72 * Math.sin(a) };
  });
  const hot = tick % nodes.length;
  return (
    <Frame label="Copy network: investors linked to your portfolio">
      <text x="0" y="14" className="hdv-mono hdv-kicker">
        YOUR COPY NETWORK
      </text>
      {nodes.map((n, i) => (
        <line
          key={`l${n.key}`}
          x1={cx}
          y1={cy}
          x2={n.x}
          y2={n.y}
          className={`hdv-t hdv-edge${i === hot ? ' is-hot' : ''}`}
        />
      ))}
      {nodes.map((n, i) => (
        <circle
          key={n.key}
          cx={n.x}
          cy={n.y}
          r={i === hot ? 9 : 7}
          className={`hdv-t hdv-node${i === hot ? ' is-hot' : ''}`}
        />
      ))}
      <circle cx={cx} cy={cy} r="15" className="hdv-node-you" />
      <text x={cx} y={cy + 3.5} textAnchor="middle" className="hdv-mono hdv-you">
        YOU
      </text>
      <text x="0" y="170" className="hdv-mono hdv-foot">
        {128 + (tick % 9)} INVESTORS COPY YOU · 3 YOU COPY
      </text>
    </Frame>
  );
}

/* 6 ── Global Empire Lighthouse: trade arcs on a mini dotted band ────────── */
function LighthouseArcsViz() {
  return (
    <Frame label="Global capital flows animating between regions">
      <text x="0" y="14" className="hdv-mono hdv-kicker">
        GLOBAL FLOWS · LIVE
      </text>
      <line x1="0" y1="120" x2="320" y2="120" className="hdv-baseline" />
      {[
        { id: 'a1', d: 'M 28 120 Q 92 40 168 120', label: 'US → EU' },
        { id: 'a2', d: 'M 120 120 Q 196 26 268 120', label: 'EU → APAC' },
        { id: 'a3', d: 'M 52 120 Q 168 -6 296 120', label: 'US → APAC' },
      ].map((a) => (
        <path key={a.id} d={a.d} className="hdv-arc" />
      ))}
      {[28, 120, 168, 268, 296, 52].map((x) => (
        <circle key={`p${x}`} cx={x} cy="120" r="4" className="hdv-port" />
      ))}
      <text x="0" y="150" className="hdv-mono hdv-dim">
        US → EU $2.4B · EU → APAC $1.1B · US → APAC $3.7B
      </text>
      <text x="0" y="170" className="hdv-mono hdv-foot">
        SHARED BY 940 MEMBERS THIS WEEK
      </text>
    </Frame>
  );
}

/* 7 ── Regulatory Winds: rule pipeline advancing across stages ───────────── */
const REG_STAGES = ['PROPOSED', 'COMMENT', 'FINAL'];
const REG_ITEMS = [
  { id: 'r1', name: 'AI disclosure rule' },
  { id: 'r2', name: 'Crypto custody' },
  { id: 'r3', name: 'T+0 settlement' },
];

function RegulatoryPipelineViz({ tick }) {
  return (
    <Frame label="Regulatory pipeline: rules advancing from proposed to final">
      <text x="0" y="14" className="hdv-mono hdv-kicker">
        REGULATORY PIPELINE
      </text>
      {REG_STAGES.map((s, i) => (
        <g key={s}>
          <text x={8 + i * 108} y="34" className="hdv-mono hdv-dim">
            {s}
          </text>
          <rect x={4 + i * 108} y="40" width="100" height="112" rx="8" className="hdv-lane" />
        </g>
      ))}
      {REG_ITEMS.map((it, i) => {
        const stage = (tick + i) % 3;
        const y = 48 + i * 34;
        return (
          <g
            key={it.id}
            className="hdv-t"
            style={{ transform: `translate(${8 + stage * 108}px, ${y}px)` }}
          >
            <rect x="0" y="0" width="92" height="26" rx="6" className="hdv-cardlet" />
            <text x="8" y="17" className="hdv-mono hdv-strong hdv-small">
              {it.name}
            </text>
          </g>
        );
      })}
      <text x="0" y="170" className="hdv-mono hdv-foot">
        612 MEMBERS FOLLOW THIS DOCKET
      </text>
    </Frame>
  );
}

const VISUALS = {
  capitol: CapitolLeaderViz,
  titans: TitansWallViz,
  eyes: EyesGridViz,
  whispers: WhispersTapeViz,
  hive: HiveNetworkViz,
  lighthouse: LighthouseArcsViz,
  regulatory: RegulatoryPipelineViz,
};

export function HeroDimensionVisual({ dimensionId, tick = 0 }) {
  const Viz = VISUALS[dimensionId];
  if (!Viz) return null;
  return <Viz tick={tick} />;
}

export default HeroDimensionVisual;

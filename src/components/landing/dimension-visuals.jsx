'use client';

/**
 * Seven bespoke, self-animating visuals — one per dataset dimension — for the
 * pinned Seven-Dimensions section. Companion to DimensionScrollSection.jsx.
 *
 * Same contract as features-visuals.jsx, scaled up:
 *   · Every visual renders into ONE shared frame (viewBox 0 0 320 176) with no
 *     per-card size override, so all seven read identical in weight.
 *   · Four are driven by a shared integer `tick` (bumped every 2000ms by the
 *     section, ONLY while that card is the active one). Frames derive
 *     deterministically from `tick` via a seeded sin — no Math.random — so SSR
 *     and first client render match exactly.
 *   · Three (Eyes Above, Global Empire Lighthouse, Regulatory Winds) run on
 *     continuous CSS/SMIL loops instead, because a sweep / orbit / drift reads
 *     wrong when it steps.
 *   · Animated children carry stable keys and the `.dv-t` class so CSS
 *     transitions animate BETWEEN frames rather than snap.
 *   · When `reduced` is true the resting frame renders and nothing moves.
 *   · The accent colour is inherited: the card sets `--dv-accent` from the
 *     taxonomy's `color` token and the linework uses `currentColor` /
 *     var(--dv-accent). No hardcoded brand hex.
 *
 * Figures are illustrative ambient motion — decorative, not factual claims.
 */

export const DV_W = 320;
export const DV_H = 176;

/** deterministic pseudo-random in [0,1) from an integer seed (no Math.random). */
function seeded(n) {
  const x = Math.sin(n * 12.9898 + 4.1) * 43758.5453;
  return x - Math.floor(x);
}

function Frame({ label, children }) {
  return (
    <svg
      className="dv-svg"
      viewBox={`0 0 ${DV_W} ${DV_H}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label}
    >
      {children}
    </svg>
  );
}

/* 1 ── Capitol Watch: rolling congressional disclosure feed ───────────────── */
const TRADES = [
  { id: 'c1', tk: 'NVDA', side: 'BUY', amt: '$250K–500K', dem: true },
  { id: 'c2', tk: 'LMT', side: 'BUY', amt: '$100K–250K', dem: false },
  { id: 'c3', tk: 'PFE', side: 'SELL', amt: '$50K–100K', dem: true },
  { id: 'c4', tk: 'XOM', side: 'BUY', amt: '$15K–50K', dem: false },
  { id: 'c5', tk: 'MSFT', side: 'SELL', amt: '$500K–1M', dem: true },
  { id: 'c6', tk: 'RTX', side: 'BUY', amt: '$100K–250K', dem: false },
];

function CapitolViz({ tick }) {
  const rowH = 30;
  const lag = 22 + Math.round(58 * seeded(tick * 5 + 2));
  return (
    <Frame label="Congressional disclosures streaming in, newest first">
      {TRADES.map((tr, i) => {
        const slot = (((i - tick) % TRADES.length) + TRADES.length) % TRADES.length;
        const shown = slot < 4;
        return (
          <g
            key={tr.id}
            className="dv-t"
            style={{ transform: `translateY(${6 + slot * rowH}px)`, opacity: shown ? 1 : 0 }}
          >
            <rect x="0" y="0" width="320" height="25" rx="6" className="dv-rowbg" />
            <circle cx="14" cy="12.5" r="3.5" className={tr.dem ? 'dv-party-d' : 'dv-party-r'} />
            <text x="28" y="16" className="dv-mono dv-strong">
              {tr.tk}
            </text>
            <rect
              x="76"
              y="5.5"
              width="34"
              height="14"
              rx="7"
              className={tr.side === 'BUY' ? 'dv-pill-buy' : 'dv-pill-sell'}
            />
            <text
              x="93"
              y="15.5"
              textAnchor="middle"
              className={tr.side === 'BUY' ? 'dv-pilltext-buy' : 'dv-pilltext-sell'}
            >
              {tr.side}
            </text>
            <text x="312" y="16" textAnchor="end" className="dv-mono dv-dim">
              {tr.amt}
            </text>
          </g>
        );
      })}
      <text x="0" y="158" className="dv-mono dv-dim dv-xs">
        AVG FILING LAG
      </text>
      <rect x="0" y="164" width="320" height="5" rx="2.5" className="dv-track" />
      <rect x="0" y="164" width={lag * 3.2} height="5" rx="2.5" className="dv-fill dv-t" />
      <text x="312" y="158" textAnchor="end" className="dv-mono dv-accent dv-xs">
        {lag}d
      </text>
    </Frame>
  );
}

/* 2 ── Titans Shadow: 13F position deltas diverging from a centre axis ────── */
const FUNDS = ['BRIDGEWATER', 'RENAISSANCE', 'CITADEL', 'BLACKROCK', 'TIGER GLOBAL'];

function TitansViz({ tick }) {
  const cx = 200;
  const maxW = 110;
  return (
    <Frame label="Institutional 13F position changes by fund">
      <line x1={cx} y1="10" x2={cx} y2="150" className="dv-axis" />
      {FUNDS.map((f, i) => {
        const d = seeded(tick * 3 + i * 7) * 2 - 1;
        const w = Math.max(4, Math.abs(d) * maxW);
        const x = d >= 0 ? cx : cx - w;
        const y = 16 + i * 27;
        return (
          <g key={f}>
            <text x="0" y={y + 11} className="dv-mono dv-dim dv-xs">
              {f}
            </text>
            <rect
              className={`dv-t ${d >= 0 ? 'dv-bar-pos' : 'dv-bar-neg'}`}
              x={x}
              y={y}
              width={w}
              height="14"
              rx="3"
            />
          </g>
        );
      })}
      <text x="0" y="168" className="dv-mono dv-dim dv-xs">
        SEC EDGAR · 13F-HR · Δ QoQ
      </text>
    </Frame>
  );
}

/* 3 ── Eyes Above: continuous radar sweep over ground targets ─────────────── */
const BLIPS = [
  [62, 52],
  [104, 34],
  [128, 78],
  [70, 104],
  [40, 82],
  [116, 118],
  [88, 66],
];

function EyesViz() {
  return (
    <Frame label="Geospatial sweep detecting ground activity">
      <g transform="translate(160 12)">
        <g transform="translate(-80 0)">
          {[26, 44, 62, 76].map((r) => (
            <circle key={r} cx="80" cy="76" r={r} className="dv-ring" />
          ))}
          <line x1="4" y1="76" x2="156" y2="76" className="dv-ring" />
          <line x1="80" y1="0" x2="80" y2="152" className="dv-ring" />
          <g className="dv-sweep">
            <path d="M 80 76 L 80 0 A 76 76 0 0 1 134 22 Z" className="dv-sweep-wedge" />
          </g>
          {BLIPS.map(([x, y], i) => (
            <circle
              key={`${x}-${y}`}
              cx={x}
              cy={y}
              r="3"
              className="dv-blip"
              style={{ animationDelay: `${(i * 0.62).toFixed(2)}s` }}
            />
          ))}
        </g>
      </g>
      <text x="0" y="16" className="dv-mono dv-dim dv-xs">
        LOT OCCUPANCY
      </text>
      <text x="0" y="34" className="dv-mono dv-accent">
        +14.2%
      </text>
      <text x="0" y="58" className="dv-mono dv-dim dv-xs">
        RAIL THROUGHPUT
      </text>
      <text x="0" y="76" className="dv-mono dv-accent">
        +3.8%
      </text>
      <text x="0" y="168" className="dv-mono dv-dim dv-xs">
        7 SITES SCANNED
      </text>
    </Frame>
  );
}

/* 4 ── Consumer Whispers: search-interest histogram + moving cursor ───────── */
const KEYWORDS = [
  '"used ev prices"',
  '"grocery delivery"',
  '"resale sneakers"',
  '"budget airline"',
];

function WhispersViz({ tick }) {
  const n = 26;
  const bw = 9;
  const gap = 3.2;
  const cursor = 8 + ((tick * 4) % n) * (bw + gap);
  return (
    <Frame label="Search interest by week with a moving read cursor">
      <text x="0" y="14" className="dv-mono dv-dim dv-xs">
        SEARCH INTEREST · 26W
      </text>
      <text x="320" y="14" textAnchor="end" className="dv-mono dv-accent dv-xs">
        {KEYWORDS[tick % KEYWORDS.length]}
      </text>
      {Array.from({ length: n }, (_, i) => {
        const h = 12 + Math.round(84 * seeded(tick * 2 + i * 3));
        const x = 8 + i * (bw + gap);
        return (
          <rect
            key={i}
            className="dv-t dv-hbar"
            x={x}
            y={130 - h}
            width={bw}
            height={h}
            rx="2"
            style={{ opacity: 0.35 + 0.65 * (i / n) }}
          />
        );
      })}
      <line x1="0" y1="132" x2="320" y2="132" className="dv-axis" />
      <line className="dv-t dv-cursor" x1={cursor + bw / 2} y1="24" x2={cursor + bw / 2} y2="140" />
      <text x="0" y="160" className="dv-mono dv-dim dv-xs">
        CARD SPEND Δ30D
      </text>
      <text x="320" y="160" textAnchor="end" className="dv-mono dv-accent dv-xs">
        +{(4 + 5 * seeded(tick * 9)).toFixed(1)}%
      </text>
    </Frame>
  );
}

/* 5 ── The Hive: prediction-market odds with a converging crowd ───────────── */
function HiveViz({ tick }) {
  const yes = 0.32 + 0.42 * seeded(tick * 7 + 1);
  const split = Math.round(yes * 300);
  return (
    <Frame label="Prediction market consensus with the crowd converging">
      <text x="10" y="18" className="dv-mono dv-dim dv-xs">
        YES
      </text>
      <text x="310" y="18" textAnchor="end" className="dv-mono dv-dim dv-xs">
        NO
      </text>
      <rect x="10" y="26" width="300" height="16" rx="8" className="dv-track" />
      <rect className="dv-t dv-odds-yes" x="10" y="26" width={split} height="16" rx="8" />
      <text className="dv-t dv-mono dv-accent" x="10" y="62">
        {Math.round(yes * 100)}%
      </text>
      <text x="310" y="62" textAnchor="end" className="dv-mono dv-dim">
        {100 - Math.round(yes * 100)}%
      </text>

      {Array.from({ length: 18 }, (_, i) => {
        const isYes = seeded(tick * 11 + i * 5) < yes;
        const jitter = seeded(tick * 13 + i * 3);
        const x = (isYes ? 34 : 196) + jitter * 88;
        const y = 90 + seeded(tick * 17 + i * 2) * 52;
        return (
          <circle
            key={i}
            className={`dv-t ${isYes ? 'dv-swarm-yes' : 'dv-swarm-no'}`}
            r="3.4"
            style={{ transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)` }}
          />
        );
      })}
      <text x="0" y="170" className="dv-mono dv-dim dv-xs">
        REAL-MONEY CONSENSUS · 24H VOL $1.4M
      </text>
    </Frame>
  );
}

/* 6 ── Global Empire Lighthouse: rotating globe + live trade arcs ─────────── */
function LighthouseViz() {
  return (
    <Frame label="Rotating globe with trade-flow routes to regional markets">
      <g>
        <circle cx="76" cy="88" r="46" className="dv-globe" />
        <ellipse cx="76" cy="88" rx="46" ry="15" className="dv-meridian" />
        <ellipse cx="76" cy="88" rx="46" ry="31" className="dv-meridian" />
        {/* SMIL-animated rx reads as true longitude rotation */}
        <ellipse cx="76" cy="88" rx="34" ry="46" className="dv-meridian">
          <animate attributeName="rx" values="34;2;34" dur="7s" repeatCount="indefinite" />
        </ellipse>
        <ellipse cx="76" cy="88" rx="12" ry="46" className="dv-meridian">
          <animate
            attributeName="rx"
            values="12;40;12"
            dur="7s"
            begin="-2.3s"
            repeatCount="indefinite"
          />
        </ellipse>
      </g>

      <path id="dvArcA" d="M 112 62 Q 190 22 268 46" className="dv-route" fill="none" />
      <path id="dvArcB" d="M 120 92 Q 200 92 268 96" className="dv-route" fill="none" />
      <path id="dvArcC" d="M 110 118 Q 190 156 268 142" className="dv-route" fill="none" />

      <circle r="3.4" className="dv-comet">
        <animateMotion dur="3.6s" repeatCount="indefinite" path="M 112 62 Q 190 22 268 46" />
      </circle>
      <circle r="3.4" className="dv-comet">
        <animateMotion
          dur="4.4s"
          begin="0.9s"
          repeatCount="indefinite"
          path="M 120 92 Q 200 92 268 96"
        />
      </circle>
      <circle r="3.4" className="dv-comet">
        <animateMotion
          dur="5s"
          begin="1.8s"
          repeatCount="indefinite"
          path="M 110 118 Q 190 156 268 142"
        />
      </circle>

      {[
        [268, 46, 'EU'],
        [268, 96, 'APAC'],
        [268, 142, 'LATAM'],
      ].map(([x, y, label], i) => (
        <g key={label}>
          <circle cx={x} cy={y} r="4" className="dv-node" />
          <circle
            cx={x}
            cy={y}
            r="4"
            className="dv-node-ping"
            style={{ animationDelay: `${i * 0.8}s` }}
          />
          <text x={x + 10} y={y + 4} className="dv-mono dv-dim dv-xs">
            {label}
          </text>
        </g>
      ))}
      <text x="0" y="170" className="dv-mono dv-dim dv-xs">
        MACRO · TRADE · SANCTIONS
      </text>
    </Frame>
  );
}

/* 7 ── Regulatory Winds: filings blowing in, stamped with an outcome ──────── */
const RULINGS = [
  { s: 'PASSED', tone: 'pos' },
  { s: 'IN COMMITTEE', tone: 'warn' },
  { s: 'ENFORCED', tone: 'accent' },
  { s: 'STRUCK DOWN', tone: 'neg' },
];

function RegulatoryViz({ tick }) {
  const cur = RULINGS[tick % RULINGS.length];
  return (
    <Frame label="Legislative and regulatory filings arriving with outcomes">
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={i}
          className="dv-wind"
          x1="0"
          y1={18 + i * 34}
          x2="90"
          y2={18 + i * 34}
          style={{ animationDelay: `${(i * 0.55).toFixed(2)}s` }}
        />
      ))}

      {[2, 1, 0].map((depth) => (
        <g key={depth} style={{ opacity: 1 - depth * 0.28 }}>
          <rect
            x={64 + depth * 12}
            y={30 + depth * 10}
            width="182"
            height="92"
            rx="8"
            className="dv-doc"
          />
        </g>
      ))}

      <g>
        <text x="80" y="52" className="dv-mono dv-dim dv-xs">
          H.R. 4218
        </text>
        {[64, 76, 88].map((y, i) => (
          <rect
            key={y}
            x="80"
            y={y}
            width={150 - i * 34}
            height="5"
            rx="2.5"
            className="dv-docline"
          />
        ))}
        <rect
          className={`dv-t dv-stamp dv-stamp--${cur.tone}`}
          x="80"
          y="100"
          width="112"
          height="18"
          rx="9"
        />
        <text
          className={`dv-t dv-stamptext dv-stamptext--${cur.tone}`}
          x="136"
          y="112.5"
          textAnchor="middle"
        >
          {cur.s}
        </text>
      </g>

      <text x="0" y="170" className="dv-mono dv-dim dv-xs">
        CONGRESS.GOV · FEDERAL REGISTER · SEC
      </text>
    </Frame>
  );
}

const VISUALS = {
  capitol: CapitolViz,
  titans: TitansViz,
  eyes: EyesViz,
  whispers: WhispersViz,
  hive: HiveViz,
  lighthouse: LighthouseViz,
  regulatory: RegulatoryViz,
};

/**
 * @param {string} dimensionId one of the 7 DATASET_TAXONOMY ids
 * @param {number} tick        integer frame counter (held at 0 when inactive/reduced)
 */
export function DimensionVisual({ dimensionId, tick = 0 }) {
  const Viz = VISUALS[dimensionId];
  if (!Viz) return null;
  return <Viz tick={tick} />;
}

export default DimensionVisual;

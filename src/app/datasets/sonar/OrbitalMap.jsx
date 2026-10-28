'use client';

/**
 * The Sonar stage on /datasets (Oct 28 redesign, datasets-index-handoff).
 *
 * An isometric slab with a radar screen, a dotted globe and a breathing core,
 * four decorative glass panels on leader lines, and one emerald beam from the
 * Ping field down through the core to the card bus below.
 *
 * What is real: the seven dimension dots on the outer ring. One per taxonomy
 * dimension, in taxonomy order; each is a button that selects its dimension
 * (shared SonarSelection, ?dimension=), labelled with its live count.
 *
 * What is decorative (aria-hidden, no data): the slab, rings, ticks, globe,
 * core, beam, leaders and the four panels (Markets, Policy, Companies,
 * Economy). The panels carry no values, axes or labels that imply data.
 *
 * Geometry is the handoff's 800 x 362 local box (HANDOFF.md section 3.5).
 * Every coordinate is computed once at module load from fixed constants, so
 * the server and client render identical markup.
 */
import { useSonarSelection } from './SonarSelection';
import './orbital-map.css';

const C = { x: 400, y: 170 };
const K = 0.46;
const R2 = Math.SQRT1_2;
const r1 = (n) => Math.round(n * 10) / 10;

/* A point on the slab's top plane, and a point on a ring of that plane. */
const plane = (u, v) => ({ x: C.x + (u - v) * R2, y: C.y + (u + v) * R2 * K });
const ringPt = (r, deg) => {
  const t = (deg * Math.PI) / 180;
  return plane(r * Math.cos(t), r * Math.sin(t));
};

const onPlane = (dy = 0) => `translate(${C.x} ${C.y + dy}) scale(1 ${K}) rotate(45)`;
const SIDE_LAYERS = Array.from({ length: 22 }, (_, i) => 22 - i);
const TICKS = Array.from({ length: 72 }, (_, i) => {
  const a = ringPt(134, i * 5);
  const b = ringPt(i % 6 ? 138 : 143, i * 5);
  return { x1: r1(a.x), y1: r1(a.y), x2: r1(b.x), y2: r1(b.y) };
});
const L = plane(-155, 155);
const B = plane(155, 155);
const R = plane(155, -155);
const V_BACK = plane(-128, -128);
const V_FRONT = plane(128, 128);

const MARKET_BARS = [
  [66, 33, 7],
  [70, 30, 10],
  [74, 34, 6],
  [78, 29, 11],
  [82, 32, 8],
  [86, 28, 12],
  [90, 31, 9],
  [94, 27, 13],
];
const POLICY_ROWS = [
  [2, 70, 1],
  [10, 48, 0.6],
  [18, 82, 0.8],
  [26, 58, 0.5],
  [34, 74, 0.7],
  [42, 40, 0.4],
];
const COMPANY_ROWS = [
  [3, 62, 1, 76, 18],
  [13, 50, 0.7, 64, 30],
  [23, 70, 0.85, 84, 10],
  [33, 44, 0.55, 58, 36],
];
const ECON_BARS = [
  10, 14, 8, 16, 12, 20, 15, 22, 13, 24, 18, 26, 16, 28, 21, 30, 19, 32, 24, 34, 22, 38, 27, 40,
];

function StageArt() {
  return (
    <svg className="dsi-stage__svg" viewBox="0 0 800 362" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="dsi-grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="5" cy="5" r="0.7" fill="var(--dsi-line-faint)" />
        </pattern>
        <linearGradient
          id="dsi-beam-g"
          gradientUnits="userSpaceOnUse"
          x1="400"
          y1="-30"
          x2="400"
          y2="362"
        >
          <stop offset="0" stopColor="var(--dsi-beam)" stopOpacity="0.9" />
          <stop offset="0.45" stopColor="var(--dsi-beam)" stopOpacity="1" />
          <stop offset="1" stopColor="var(--dsi-beam)" stopOpacity="0.6" />
        </linearGradient>
        <filter id="dsi-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* base plate */}
      <rect
        x="-180"
        y="-180"
        width="360"
        height="360"
        rx="26"
        transform={onPlane(38)}
        fill="var(--dsi-slab-side)"
        opacity="0.7"
      />
      <rect
        x="-180"
        y="-180"
        width="360"
        height="360"
        rx="26"
        transform={onPlane(33)}
        fill="none"
        stroke="var(--dsi-line-faint)"
      />

      {/* slab body */}
      {SIDE_LAYERS.map((dy) => (
        <rect
          key={dy}
          x="-155"
          y="-155"
          width="310"
          height="310"
          rx="24"
          transform={onPlane(dy)}
          fill="var(--dsi-slab-side)"
        />
      ))}

      {/* lit front edges */}
      <path
        d={`M${r1(L.x + 16)} ${r1(L.y + 12)} L${r1(B.x - 6)} ${r1(B.y + 10)}`}
        stroke="var(--emerald)"
        strokeWidth="2.5"
        strokeLinecap="round"
        filter="url(#dsi-glow)"
      />
      <path
        d={`M${r1(B.x + 6)} ${r1(B.y + 10)} L${r1(R.x - 16)} ${r1(R.y + 12)}`}
        stroke="var(--emerald)"
        strokeWidth="2.5"
        strokeLinecap="round"
        filter="url(#dsi-glow)"
      />

      {/* top face, screen and rings */}
      <g transform={onPlane(0)}>
        <rect
          x="-155"
          y="-155"
          width="310"
          height="310"
          rx="24"
          fill="var(--dsi-slab-top)"
          stroke="var(--dsi-slab-edge)"
          strokeWidth="1.2"
        />
        <rect
          x="-128"
          y="-128"
          width="256"
          height="256"
          rx="14"
          fill="var(--dsi-slab-screen)"
          stroke="var(--dsi-line-faint)"
        />
        <rect x="-128" y="-128" width="256" height="256" rx="14" fill="url(#dsi-grid)" />
        <path d="M-128 0H128M0 -128V128" stroke="var(--dsi-line-faint)" />
        <circle
          r="124"
          fill="none"
          stroke="var(--dsi-ring)"
          strokeWidth="2.4"
          filter="url(#dsi-glow)"
        />
        <circle r="104" fill="none" stroke="var(--dsi-line)" />
        <circle r="80" fill="none" stroke="var(--dsi-line-faint)" strokeDasharray="2 4" />
        <circle r="50" fill="none" stroke="var(--dsi-line)" />
      </g>

      <g stroke="var(--dsi-line)" strokeWidth="1">
        {TICKS.map((t, i) => (
          <line key={i} {...t} />
        ))}
      </g>

      {/* beam: Ping field, through the core, down to the bus */}
      <rect
        x="399"
        y="-14"
        width="2"
        height="376"
        fill="url(#dsi-beam-g)"
        filter="url(#dsi-glow)"
      />

      {/* panel leaders */}
      <g className="dsi-leaders" fill="none" stroke="var(--dsi-line)" strokeWidth="1">
        <path d="M260 70H290V120" />
        <path d="M162 150H225" />
        <path d="M548 74H510V120" />
        <path d="M636 176H590L575 150" />
      </g>
      <g className="dsi-leaders" fill="var(--emerald)" filter="url(#dsi-glow)">
        <circle cx="290" cy="120" r="3" />
        <circle cx="225" cy="150" r="3" />
        <circle cx="510" cy="120" r="3" />
        <circle cx="575" cy="150" r="3" />
        <circle cx="260" cy="70" r="2" />
        <circle cx="162" cy="150" r="2" />
        <circle cx="548" cy="74" r="2" />
        <circle cx="636" cy="176" r="2" />
      </g>

      {/* slab vertices */}
      <g fill="var(--dsi-slab-screen)" stroke="var(--emerald)" strokeWidth="1.5">
        <circle cx={r1(V_BACK.x)} cy={r1(V_BACK.y)} r="4" />
        <circle cx={r1(V_FRONT.x)} cy={r1(V_FRONT.y)} r="4" />
      </g>
    </svg>
  );
}

function PanelHead({ children }) {
  return (
    <div className="dsi-panel__head">
      <span>{children}</span>
      <span className="dsi-panel__dots">
        <i />
        <i />
        <i />
      </span>
    </div>
  );
}

/* Decorative texture only: no values, axes or data labels. */
function Panels() {
  return (
    <div className="dsi-panels" aria-hidden="true">
      <div className="dsi-panel" style={{ left: 140, top: 30, width: 120 }}>
        <PanelHead>Markets</PanelHead>
        <svg width="98" height="40" viewBox="0 0 98 40">
          <path
            d="M0 30 L8 26 L14 28 L22 18 L30 22 L38 14 L46 20 L54 12 L62 16 L70 8 L78 13 L86 6 L98 10 L98 40 L0 40Z"
            fill="var(--emerald)"
            opacity="0.18"
          />
          <path
            d="M0 30 L8 26 L14 28 L22 18 L30 22 L38 14 L46 20 L54 12 L62 16 L70 8 L78 13 L86 6 L98 10"
            fill="none"
            stroke="var(--emerald)"
            strokeWidth="1.2"
          />
          <g fill="var(--emerald)" opacity="0.8">
            {MARKET_BARS.map(([x, y, h]) => (
              <rect key={x} x={x} y={y} width="2" height={h} />
            ))}
          </g>
        </svg>
      </div>

      <div className="dsi-panel" style={{ left: 40, top: 116, width: 122 }}>
        <PanelHead>Policy</PanelHead>
        <svg width="100" height="44" viewBox="0 0 100 44">
          <g fill="var(--emerald)">
            {POLICY_ROWS.map(([y, w, o]) => (
              <rect key={y} x="0" y={y} width={w} height="2.5" rx="1" opacity={o} />
            ))}
          </g>
          <g fill="var(--dsi-line-faint)">
            <rect x="76" y="2" width="20" height="2.5" rx="1" />
            <rect x="88" y="18" width="10" height="2.5" rx="1" />
            <rect x="80" y="34" width="16" height="2.5" rx="1" />
          </g>
        </svg>
      </div>

      <div className="dsi-panel" style={{ left: 548, top: 36, width: 118 }}>
        <PanelHead>Companies</PanelHead>
        <svg width="96" height="40" viewBox="0 0 96 40">
          {COMPANY_ROWS.map(([y, w, o, gx, gw]) => (
            <g key={y}>
              <circle cx="3" cy={y + 1} r="2" fill="none" stroke="var(--emerald)" strokeWidth="1" />
              <rect x="10" y={y} width={w} height="2" rx="1" fill="var(--emerald)" opacity={o} />
              <rect x={gx} y={y} width={gw} height="2" rx="1" fill="var(--dsi-line-faint)" />
            </g>
          ))}
        </svg>
      </div>

      <div className="dsi-panel" style={{ left: 636, top: 140, width: 130 }}>
        <PanelHead>Economy</PanelHead>
        <svg width="108" height="42" viewBox="0 0 108 42">
          <g fill="var(--emerald)">
            {ECON_BARS.map((h, i) => (
              <rect
                key={i}
                x={r1(i * 4.5)}
                y={42 - h}
                width="2.6"
                height={h}
                opacity={(0.45 + i / 48).toFixed(2)}
              />
            ))}
          </g>
        </svg>
      </div>
    </div>
  );
}

export default function OrbitalMap({ dims, pinging, silent }) {
  const { selected, select } = useSonarSelection();
  const step = 360 / Math.max(1, dims.length);

  return (
    <div
      className="dsi-stage"
      role="group"
      aria-label={`Ezana Sonar and its ${dims.length} dimensions: ${pinging} datasets live, ${silent} on the roadmap`}
    >
      <div className="dsi-stage__inner">
        <StageArt />
        <div className="dsi-globe" aria-hidden="true" />
        <div className="dsi-core" aria-hidden="true" />
        <Panels />
        {dims.map((d, i) => {
          const p = ringPt(124, -135 + i * step);
          const on = selected === d.id;
          const total = d.items.length;
          return (
            <button
              key={d.id}
              type="button"
              className="dsi-dimdot"
              style={{ left: r1(p.x), top: r1(p.y) }}
              aria-pressed={on}
              aria-label={`${d.label}, ${d.liveCount} of ${total} datasets live`}
              onClick={() => select(on ? null : d.id, 'stage')}
            >
              <span className="dsi-dimdot__tip" aria-hidden="true">
                {d.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

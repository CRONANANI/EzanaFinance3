'use client';

/**
 * The Ezana Sonar orbital map on /datasets: the approved isometric device
 * scene (docs: ezana-sonar-orbital-map-handoff.md, Part C), ported 1:1 and
 * bound to the data this page has: the seven dimensions and their datasets.
 *
 * Geometry is the handoff's: a 1440 x 810 stage, true 2:1 isometric, ground
 * point (u, v) -> screen via matrix(0.866 0.5 -0.866 0.5 720 364), height
 * subtracts from y. Layer order follows Part A3.
 *
 * What is real on the plane (nothing is estimated or invented):
 *   ring        how much of a dimension is live: middle ring (r141) 5 or
 *               more live datasets, outer ring (r212) 1 to 4, past the tick
 *               ring (r246) none yet
 *   cube        a live dimension, sized by its live count; hollow marker when
 *               it is still on the roadmap
 *   dot         one per dataset beside its dimension: filled live, hollow soon
 *   link        hub to dimension; the selected one brightens, the rest dim
 *   plaque      SIGNAL FOUND with a dimension selected, SWEEPING without
 *   panels      A: the selected dimension's datasets. B: live coverage per
 *               dimension. C: the dimensions by ring. D: sweep totals.
 *
 * Panel text is skewed SVG at the handoff's size, so it is hidden when it
 * would render under 9px (Part A6). Nothing renders under the scene: it
 * stands on its own, and selecting a dimension lights it on the plane.
 * Dimension names are upright HTML buttons placed at
 * the projected node positions, so they stay legible and keyboard reachable.
 * The sweep rotates only while nothing is selected; never under reduced
 * motion.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSonarSelection } from './SonarSelection';
import './orbital-map.css';

const SW = 1440;
const SH = 810;
const HX = 720;
const HY = 364;
const ISO = 'matrix(0.866 0.5 -0.866 0.5 720 364)';
/* The handoff's three rings (70 / 141 / 212) stay drawn; the seven
   dimensions sit on the middle and outer rings and, for roadmap, on the
   dotted field just past the tick ring, so their labels never collide. */
const RINGS = [
  { key: 'deep', r: 141, label: 'DEEP', test: (d) => d.liveCount >= 5 },
  { key: 'live', r: 212, label: 'LIVE', test: (d) => d.liveCount >= 1 },
  { key: 'road', r: 246, label: 'ROAD', test: () => true },
];
const r1 = (n) => Math.round(n * 10) / 10;
const rad = (deg) => (deg * Math.PI) / 180;
/** Ground (u, v) at height z -> screen. */
const iso = (u, v, z = 0) => ({
  x: r1(HX + 0.866 * u - 0.866 * v),
  y: r1(HY + 0.5 * u + 0.5 * v - z),
});

/** Pure: every dimension and dataset on the plane. */
export function sceneLayout(dims) {
  const n = dims.length;
  return dims.map((d, i) => {
    const ring = RINGS.find((o) => o.test(d)) || RINGS[2];
    const deg = -90 + (i * 360) / n;
    const u = ring.r * Math.cos(rad(deg));
    const v = ring.r * Math.sin(rad(deg));
    const items = d.items || [];
    const sats = items.map((it, j) => {
      const sdeg = deg + (j - (items.length - 1) / 2) * 5;
      const sr = ring.r + (j % 2 ? 18 : -18);
      return {
        id: `${d.id}-${j}`,
        label: it.label,
        href: it.live ? it.href : null,
        live: Boolean(it.live),
        ...iso(sr * Math.cos(rad(sdeg)), sr * Math.sin(rad(sdeg))),
      };
    });
    return {
      ...d,
      ring: ring.key,
      ringLabel: ring.label,
      deg,
      ...iso(u, v),
      size: Math.min(18, 8 + d.liveCount),
      sats,
    };
  });
}

/* Isometric cube centred on (x, y) with half-width s: left and right faces, then the top. */
function Cube({ x, y, s, className }) {
  const dx = r1(s * 0.866);
  const dy = r1(s * 0.5);
  return (
    <g className={className}>
      <polygon
        className="dso-sc-cube-l"
        points={`${x - dx},${y - dy} ${x},${y} ${x},${y + s} ${x - dx},${y + s - dy}`}
      />
      <polygon
        className="dso-sc-cube-r"
        points={`${x},${y} ${x + dx},${y - dy} ${x + dx},${y + s - dy} ${x},${y + s}`}
      />
      <polygon
        className="dso-sc-cube-t"
        points={`${x},${y - s} ${x + dx},${y - dy} ${x},${y} ${x - dx},${y - dy}`}
      />
    </g>
  );
}

function useStage() {
  const ref = useRef(null);
  const [width, setWidth] = useState(1440);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

/* The visible crop of the 1440 x 810 stage: tight on desktop, with room for
   the side labels on phones. */
const CROPS = {
  wide: { x: 150, y: 40, w: 1140, h: 700 },
  narrow: { x: 40, y: 20, w: 1360, h: 740 },
};
const pctIn = (vb) => (x, y) => ({
  left: `${r1(((x - vb.x) / vb.w) * 100)}%`,
  top: `${r1(((y - vb.y) / vb.h) * 100)}%`,
});
const short = (label) => label.replace(/ &.*$/, '').toUpperCase().slice(0, 13).padEnd(13, ' ');

export default function OrbitalMap({ dims, pinging, silent }) {
  const { selected, select } = useSonarSelection();
  const reduced = useReducedMotion();
  const [stageRef, width] = useStage();
  const nodes = useMemo(() => sceneLayout(dims), [dims]);
  const [hover, setHover] = useState(null);
  const current = selected ? nodes.find((d) => d.id === selected) : null;
  /* Phones only: below this the on-plane names give way (Part A6). Between
     it and 720px the names shrink instead (compact). */
  const narrow = width < 560;
  const compact = !narrow && width < 720;
  const vb = narrow ? CROPS.narrow : CROPS.wide;
  const pct = pctIn(vb);
  const textOn =
    (width / SW) * 7.5 >= 9; /* Part A6: panel text only when it renders at 9px or more */
  const sweeping = !selected && !reduced;
  const quiet = (id) => selected && selected !== id;
  const toggle = (id) => select(selected === id ? null : id, 'radar');
  const totalDatasets = dims.reduce((n, d) => n + (d.items?.length || 0), 0);

  const panelA = current
    ? [
        ['SONAR SWEEP · ' + current.label.toUpperCase(), 1],
        [
          `${current.live ? 'DIMENSION LOCKED' : 'ON THE ROADMAP'} · ${current.items.length} DATASETS`,
          0.6,
        ],
        ...current.items.slice(0, 6).flatMap((it) => [
          ['▸ ' + it.label.toUpperCase(), 1],
          ['   ' + (it.live ? 'LIVE · CITED' : 'ROADMAP · SOON'), 0.6],
        ]),
      ]
    : [
        ['SONAR SWEEP · ALL DIMENSIONS', 1],
        ['SELECT A DIMENSION TO LOCK', 0.6],
        ...nodes.slice(0, 6).flatMap((d) => [
          ['▸ ' + d.label.toUpperCase(), 1],
          ['   ' + (d.live ? `${d.liveCount} LIVE` : 'ROADMAP'), 0.6],
        ]),
      ];

  return (
    <div
      style={{ '--sc-ar': `${vb.w} / ${vb.h}` }}
      className={`dso-sc${selected ? ' has-selection' : ''}${sweeping ? ' is-sweeping' : ''}${narrow ? ' is-narrow' : ''}${compact ? ' is-compact' : ''}${textOn ? ' has-text' : ''}`}
    >
      <div className="dso-sc-stage" ref={stageRef}>
        <svg
          className="dso-sc-scene"
          viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          role="img"
          aria-label="Isometric Sonar device: the seven dataset dimensions on emerald radar rings, with readout panels"
        >
          <defs>
            <filter id="dso-sc-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="3" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="dso-sc-glowL" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="9" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="dso-sc-fog" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="22" />
            </filter>
            <filter id="dso-sc-soft" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="14" />
            </filter>
            <pattern id="dso-sc-dots" width="7" height="7" patternUnits="userSpaceOnUse">
              <circle className="dso-sc-dot" cx="3.5" cy="3.5" r="0.9" />
            </pattern>
            <pattern id="dso-sc-dotsMap" width="7" height="7" patternUnits="userSpaceOnUse">
              <circle className="dso-sc-dot-map" cx="3.5" cy="3.5" r="1.1" />
            </pattern>
            <radialGradient id="dso-sc-vignette" cx="50%" cy="45%" r="65%">
              <stop offset="0%" className="dso-sc-vig-a" />
              <stop offset="100%" className="dso-sc-vig-b" />
            </radialGradient>
            <radialGradient id="dso-sc-core" cx="50%" cy="50%" r="50%">
              <stop offset="0%" className="dso-sc-em" stopOpacity="0.38" />
              <stop offset="60%" className="dso-sc-em" stopOpacity="0.08" />
              <stop offset="100%" className="dso-sc-em" stopOpacity="0" />
            </radialGradient>
            <linearGradient
              id="dso-sc-sweep"
              gradientUnits="userSpaceOnUse"
              x1="150"
              y1="-150"
              x2="-150"
              y2="-150"
            >
              <stop offset="0%" className="dso-sc-hi" stopOpacity="0.62" />
              <stop offset="45%" className="dso-sc-em" stopOpacity="0.28" />
              <stop offset="100%" className="dso-sc-em" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="dso-sc-slabTopG" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" className="dso-sc-slab-a" />
              <stop offset="100%" className="dso-sc-slab-b" />
            </linearGradient>
            <linearGradient id="dso-sc-recessG" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" className="dso-sc-rec-a" />
              <stop offset="100%" className="dso-sc-rec-b" />
            </linearGradient>
            <linearGradient id="dso-sc-glassG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" className="dso-sc-white" stopOpacity="0.10" />
              <stop offset="100%" className="dso-sc-white" stopOpacity="0.03" />
            </linearGradient>
            <linearGradient id="dso-sc-barG" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" className="dso-sc-em" stopOpacity="0.2" />
              <stop offset="20%" className="dso-sc-hi" />
              <stop offset="80%" className="dso-sc-hi" />
              <stop offset="100%" className="dso-sc-em" stopOpacity="0.2" />
            </linearGradient>
            <rect
              id="dso-sc-slabTop"
              x="-300"
              y="-300"
              width="600"
              height="600"
              rx="48"
              transform={ISO}
            />
            <rect
              id="dso-sc-baseTop"
              x="-350"
              y="-350"
              width="700"
              height="700"
              rx="44"
              transform="matrix(0.866 0.5 -0.866 0.5 720 400)"
            />
            <clipPath id="dso-sc-recessClip">
              <rect x="-252" y="-252" width="504" height="504" rx="34" transform={ISO} />
            </clipPath>
          </defs>

          {/* 1 background */}
          <rect width={SW} height={SH} fill="url(#dso-sc-vignette)" />

          {/* 2 base plate + mint lines */}
          <g>
            {[8, 6, 4, 2].map((y) => (
              <use key={y} href="#dso-sc-baseTop" y={y} className="dso-sc-base-ext" />
            ))}
            <use href="#dso-sc-baseTop" className="dso-sc-base" />
            <path className="dso-sc-mintline" d="M250 322L470 195" filter="url(#dso-sc-glow)" />
            <path className="dso-sc-mintline" d="M900 646L1200 473" filter="url(#dso-sc-glow)" />
          </g>

          {/* 3 slab extrusion, 4 top + bezel */}
          <g className="dso-sc-slab-ext">
            {Array.from({ length: 18 }, (_, i) => (
              <use key={i} href="#dso-sc-slabTop" y={36 - i * 2} />
            ))}
          </g>
          <use href="#dso-sc-slabTop" y="36" className="dso-sc-slab-rail" />
          <use href="#dso-sc-slabTop" className="dso-sc-slab-top" fill="url(#dso-sc-slabTopG)" />

          {/* 5 recess */}
          <g transform={ISO}>
            <rect
              x="-252"
              y="-252"
              width="504"
              height="504"
              rx="34"
              fill="url(#dso-sc-recessG)"
              className="dso-sc-recess"
            />
            <rect
              x="-252"
              y="-252"
              width="504"
              height="504"
              rx="34"
              className="dso-sc-recess-edge"
            />
          </g>

          {/* 6 dotted field, world map, grid */}
          <g clipPath="url(#dso-sc-recessClip)">
            <rect x="200" y="64" width="1040" height="600" fill="url(#dso-sc-dots)" />
            <g transform={ISO} fill="url(#dso-sc-dotsMap)">
              <path d="M-210 -160c40 -34 112 -34 146 -4c22 30 -8 64 -40 86c-30 22 -64 12 -76 -8c-22 -12 -52 -34 -30 -74z" />
              <path d="M-96 18c32 0 54 32 44 74c-6 42 -32 74 -54 64c-22 -22 -32 -86 10 -138z" />
              <path d="M-12 -134c42 -12 84 0 94 32c10 42 0 126 -42 148c-42 10 -74 -42 -74 -94c-6 -42 0 -74 22 -86z" />
              <path d="M92 -176c74 -22 148 0 160 42c10 42 -42 86 -96 86c-54 0 -96 -42 -96 -86c0 -22 10 -32 32 -42z" />
              <path d="M152 44c32 -10 64 10 64 42c0 32 -42 42 -64 22c-22 -22 -22 -54 0 -64z" />
            </g>
            <g transform={ISO} className="dso-sc-grid">
              <path d="M-252 -126h504M-252 0h504M-252 126h504M-126 -252v504M0 -252v504M126 -252v504" />
            </g>
          </g>

          {/* 7 radar */}
          <g transform={ISO}>
            <circle cx="0" cy="0" r="150" fill="url(#dso-sc-core)" />
            <g className="dso-sc-sweep">
              <path d="M0 0L-150 -150A212 212 0 0 1 150 -150Z" fill="url(#dso-sc-sweep)" />
              <path className="dso-sc-sweep-edge" d="M0 0L150 -150" filter="url(#dso-sc-glow)" />
            </g>
            <circle
              className="dso-sc-ring dso-sc-ring--3"
              cx="0"
              cy="0"
              r="212"
              filter="url(#dso-sc-glow)"
            />
            <circle className="dso-sc-ring dso-sc-ring--tick" cx="0" cy="0" r="226" />
            <circle className="dso-sc-ring dso-sc-ring--2" cx="0" cy="0" r="141" />
            <circle className="dso-sc-ring dso-sc-ring--1" cx="0" cy="0" r="70" />
            <circle className="dso-sc-centre" cx="0" cy="0" r="4" filter="url(#dso-sc-glowL)" />
          </g>

          {/* 8 links */}
          <g className="dso-sc-links">
            {nodes.map((d) => (
              <path
                key={d.id}
                className={`dso-sc-link${selected === d.id ? ' is-on' : ''}${quiet(d.id) ? ' is-quiet' : ''}`}
                d={`M${HX} ${HY}L${d.x} ${d.y}`}
              />
            ))}
          </g>

          {/* 9 markers, dataset dots, cubes */}
          {nodes.map((d) => (
            <g
              key={d.id}
              className={`dso-sc-node${quiet(d.id) ? ' is-quiet' : ''}${selected === d.id ? ' is-on' : ''}`}
            >
              {d.sats.map((s) => (
                <g
                  key={s.id}
                  className={`dso-sc-sat${s.live ? ' is-live' : ' is-road'}${hover === s.id ? ' is-hover' : ''}`}
                >
                  <circle
                    cx={s.x}
                    cy={s.y}
                    r={hover === s.id ? 4.5 : 2.5}
                    filter={s.live ? 'url(#dso-sc-glow)' : undefined}
                  />
                  <title>{`${s.label}: ${s.live ? 'live' : 'on the roadmap'}`}</title>
                </g>
              ))}
              {d.live ? (
                <Cube x={d.x} y={d.y} s={d.size} className="dso-sc-cube" />
              ) : (
                <ellipse className="dso-sc-marker" cx={d.x} cy={d.y} rx="7" ry="4.5" />
              )}
              {selected === d.id ? (
                <>
                  <circle
                    className="dso-sc-hot-halo"
                    cx={d.x}
                    cy={d.y - d.size}
                    r="14"
                    filter="url(#dso-sc-soft)"
                  />
                  <circle
                    className="dso-sc-hot"
                    cx={d.x}
                    cy={d.y - d.size}
                    r="5"
                    filter="url(#dso-sc-glow)"
                  />
                </>
              ) : null}
            </g>
          ))}

          {/* 10 fog */}
          <g filter="url(#dso-sc-fog)" className="dso-sc-fog">
            <ellipse cx="830" cy="300" rx="130" ry="46" fillOpacity="0.09" />
            <ellipse cx="1000" cy="430" rx="150" ry="52" fillOpacity="0.08" />
            <ellipse cx="560" cy="430" rx="120" ry="44" fillOpacity="0.06" />
            <ellipse cx="740" cy="560" rx="110" ry="36" fillOpacity="0.05" />
          </g>

          {/* 11 light bars */}
          <g strokeLinecap="round">
            <path className="dso-sc-bar-channel" d="M300 440L640 636" />
            <path
              className="dso-sc-bar"
              d="M300 440L640 636"
              stroke="url(#dso-sc-barG)"
              filter="url(#dso-sc-glowL)"
            />
            <path className="dso-sc-bar-channel" d="M800 636L1140 440" />
            <path
              className="dso-sc-bar"
              d="M800 636L1140 440"
              stroke="url(#dso-sc-barG)"
              filter="url(#dso-sc-glowL)"
            />
          </g>

          {/* 12 plaque + keys */}
          <g>
            <polygon className="dso-sc-plaque-shadow" points="466,244 606,163 606,209 466,290" />
            <polygon className="dso-sc-plaque" points="470,236 610,155 610,201 470,282" />
            <polygon className="dso-sc-plaque-face" points="478,236 602,164 602,196 478,268" />
            <text
              className="dso-sc-plaque-text"
              transform="matrix(0.866 -0.5 0 1 486 258)"
              x="2"
              y="0"
              filter="url(#dso-sc-glow)"
            >
              {selected ? 'SIGNAL FOUND' : 'SWEEPING'}
            </text>
            <polygon className="dso-sc-cube-l" points="641,158 669,174 669,182 641,166" />
            <polygon className="dso-sc-cube-r" points="669,174 683,166 683,174 669,182" />
            <polygon
              className="dso-sc-cube-t"
              points="641,158 655,150 683,166 669,174"
              filter="url(#dso-sc-glowL)"
            />
            <polygon className="dso-sc-key-l" points="690,136 718,152 718,160 690,144" />
            <polygon className="dso-sc-key-r" points="718,152 736,142 736,150 718,160" />
            <polygon className="dso-sc-key-t" points="690,136 708,126 736,142 718,152" />
            <ellipse className="dso-sc-port" cx="312" cy="332" rx="9" ry="5" />
            <ellipse
              className="dso-sc-port-light"
              cx="312"
              cy="332"
              rx="3.5"
              ry="2"
              filter="url(#dso-sc-glow)"
            />
          </g>

          {/* 13 glass panels */}
          <g className="dso-sc-panel dso-sc-panel--a">
            <polygon
              className="dso-sc-glass"
              points="775,320 945,222 945,32 775,130"
              fill="url(#dso-sc-glassG)"
            />
            <polygon className="dso-sc-glass-edge" points="775,130 945,32 945,36 775,134" />
            <ellipse
              className="dso-sc-blob"
              cx="900"
              cy="70"
              rx="40"
              ry="26"
              fillOpacity="0.22"
              filter="url(#dso-sc-soft)"
            />
            <ellipse
              className="dso-sc-blob"
              cx="830"
              cy="250"
              rx="34"
              ry="22"
              fillOpacity="0.12"
              filter="url(#dso-sc-soft)"
            />
            <g className="dso-sc-text" transform="matrix(0.866 -0.5 0 1 775 130)" fontSize="7.5">
              {panelA.map(([t, o], i) => (
                <text key={i} x="12" y={22 + i * 11.5} fillOpacity={o}>
                  {t}
                </text>
              ))}
              <text x="150" y="22" fillOpacity="0.5">
                01
              </text>
            </g>
          </g>
          <g className="dso-sc-panel dso-sc-panel--b">
            <polygon
              className="dso-sc-glass"
              points="1050,320 1170,389 1170,259 1050,190"
              fill="url(#dso-sc-glassG)"
            />
            <polygon className="dso-sc-glass-edge" points="1050,190 1170,259 1170,263 1050,194" />
            <ellipse
              className="dso-sc-blob"
              cx="1150"
              cy="300"
              rx="26"
              ry="18"
              fillOpacity="0.18"
              filter="url(#dso-sc-soft)"
            />
            <g className="dso-sc-text" transform="matrix(0.866 0.5 0 1 1050 190)" fontSize="7">
              <text x="10" y="18">
                COVERAGE · LIVE
              </text>
              {nodes.map((d, i) => (
                <text
                  key={d.id}
                  x="10"
                  y={32 + i * 10}
                  fillOpacity="0.65"
                >{`${short(d.label)} ${d.liveCount}/${d.items.length}`}</text>
              ))}
            </g>
          </g>
          <g className="dso-sc-panel dso-sc-panel--c">
            <polygon
              className="dso-sc-glass"
              points="335,414 445,350 445,190 335,254"
              fill="url(#dso-sc-glassG)"
            />
            <polygon className="dso-sc-glass-edge" points="335,254 445,190 445,194 335,258" />
            <ellipse
              className="dso-sc-blob"
              cx="410"
              cy="300"
              rx="30"
              ry="22"
              fillOpacity="0.16"
              filter="url(#dso-sc-soft)"
            />
            <g className="dso-sc-text" transform="matrix(0.866 -0.5 0 1 335 254)" fontSize="7">
              <text x="10" y="18">
                RINGS · 03
              </text>
              {nodes.map((d, i) => (
                <text
                  key={d.id}
                  x="10"
                  y={32 + i * 10}
                  fillOpacity="0.65"
                >{`${short(d.label)} ${d.ringLabel}`}</text>
              ))}
              <text
                x="10"
                y={32 + nodes.length * 10 + 8}
              >{`LIVE ${pinging} · SOON ${silent}`}</text>
            </g>
          </g>
          <g className="dso-sc-panel dso-sc-panel--d">
            <polygon
              className="dso-sc-glass"
              points="585,560 730,644 730,529 585,445"
              fill="url(#dso-sc-glassG)"
            />
            <polygon className="dso-sc-glass-edge" points="585,445 730,529 730,533 585,449" />
            <ellipse
              className="dso-sc-blob"
              cx="620"
              cy="520"
              rx="28"
              ry="18"
              fillOpacity="0.16"
              filter="url(#dso-sc-soft)"
            />
            <g className="dso-sc-text" transform="matrix(0.866 0.5 0 1 585 445)" fontSize="7">
              <text x="10" y="18">
                SWEEP · DATASETS
              </text>
              <text x="10" y="32" fillOpacity="0.65">
                FINDINGS ONLY · NEVER ADVICE
              </text>
              <text
                x="10"
                y="48"
                fillOpacity="0.65"
              >{`DIMENSIONS ${dims.length} · DATASETS ${totalDatasets}`}</text>
              <text x="10" y="58" fillOpacity="0.65">{`LIVE ${pinging} · ROADMAP ${silent}`}</text>
              <text x="10" y="68" fillOpacity="0.65">
                {selected
                  ? `LOCKED · ${current.label.toUpperCase()}`
                  : 'NO LOCK · SELECT A DIMENSION'}
              </text>
            </g>
          </g>

          {/* 14 ambient pool */}
          <ellipse
            className="dso-sc-pool"
            cx="720"
            cy="700"
            rx="420"
            ry="40"
            fillOpacity="0.07"
            filter="url(#dso-sc-fog)"
          />
        </svg>

        {/* upright layer: dimension names (the real controls) and dataset hit targets */}
        {!narrow &&
          nodes.map((d) => (
            <button
              key={d.id}
              type="button"
              className={`dso-sc-label${d.x < HX - 40 ? ' is-left' : d.x > HX + 40 ? ' is-right' : d.y < HY ? ' is-above' : ' is-below'}${selected === d.id ? ' is-on' : ''}${quiet(d.id) ? ' is-quiet' : ''}${d.live ? '' : ' is-road'}`}
              style={pct(d.x, d.y - (d.live ? d.size : 0))}
              aria-pressed={selected === d.id}
              aria-label={`${d.label}, ${d.live ? `${d.liveCount} live datasets` : 'on the roadmap'}, select`}
              onClick={() => toggle(d.id)}
            >
              <span className="dso-sc-label-name">{d.label}</span>
              <span className="dso-sc-label-sub">{d.live ? `${d.liveCount} LIVE` : 'ROADMAP'}</span>
            </button>
          ))}
        <button
          type="button"
          className="dso-sc-hub"
          style={pct(HX, HY)}
          onClick={() => select(null, 'radar')}
          aria-label="Ezana Sonar, clear the selection"
        >
          <span className="dso-sc-hub-name">Ezana</span>
          <span className="dso-sc-hub-sub">SONAR</span>
        </button>
        {!narrow &&
          nodes.map((d) =>
            d.sats.map((s) => (
              <span
                key={s.id}
                className="dso-sc-sathit"
                style={pct(s.x, s.y)}
                onMouseEnter={() => setHover(s.id)}
                onMouseLeave={() => setHover(null)}
              >
                {s.href ? (
                  <a
                    href={s.href}
                    aria-label={`${s.label}, open dataset`}
                    onFocus={() => setHover(s.id)}
                    onBlur={() => setHover(null)}
                  />
                ) : (
                  <i aria-hidden="true" />
                )}
                {hover === s.id ? (
                  <span className="dso-sc-tip" role="tooltip">
                    <small>{d.label.toUpperCase()}</small>
                    <b>{s.label}</b>
                    <em>{s.live ? 'Live · open dataset' : 'On the roadmap'}</em>
                  </span>
                ) : null}
              </span>
            )),
          )}
      </div>

      <ul className="dso-sr">
        {nodes.map((d) => (
          <li key={d.id}>
            {d.label}: {d.live ? `${d.liveCount} live datasets` : 'on the roadmap'}
            {d.id === selected ? ' (selected)' : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}

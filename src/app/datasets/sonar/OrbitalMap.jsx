'use client';

/**
 * The Ezana Sonar device scene on /datasets: the Claude Design "SIGNAL FOUND"
 * scene (docs/design/ezana-sonar-orbital-map-handoff.md, Part C), drawn 1:1
 * on the handoff's full 1440 x 810 stage and bound to this page's data: the
 * seven dataset dimensions and their datasets.
 *
 * Fidelity rules (Oct 14 rebuild):
 *   - The scene is the design's own composition. Every node sits on one of
 *     the design's node positions (SLOTS), every link follows the design's
 *     paths, and every panel uses the design's line grid. Data decides what
 *     each slot shows, never where the slots are.
 *   - No upright HTML labels over the plane. Dimension names live in the
 *     glass panels, the hover/focus tooltip and the screen-reader list.
 *   - No card chrome: no background rect, no border, no rounded clip. The
 *     device floats on the page's own ground, as it does on the canvas.
 *   - Panel readouts always render (the design shows them at every size);
 *     they are aria-hidden texture, the accessible copy is the list below.
 *   - The sweep wedge holds still at 12 to 3 o'clock, as drawn.
 *
 * What is real (nothing is estimated or invented):
 *   cube        a live dimension; the slot's size follows its rank by live
 *               dataset count
 *   glow dot    a live dimension past the four cube slots (emerald), or a
 *               roadmap dimension (mint)
 *   link        hub to dimension, on the design's path; selected brightens,
 *               the rest dim
 *   plaque      SIGNAL FOUND while any dataset is live, NO SIGNAL otherwise
 *   panels      A: selected dimension's datasets, else the dimensions.
 *               B: live coverage per dimension. C: live and roadmap lists.
 *               D: sweep totals.
 * Purely decorative marks (aria-hidden, no data): the two ring waypoints,
 * the small blip beside panel A, the contact dot when nothing is selected.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useSonarSelection } from './SonarSelection';
import './orbital-map.css';

const SW = 1440;
const SH = 810;
const HX = 720;
const HY = 364;
const ISO = 'matrix(0.866 0.5 -0.866 0.5 720 364)';

/* The design's node positions (Part C, "links + nodes on the surface").
   Cubes first, largest first; then the glow-dot positions. `via` is the
   design's ring waypoint the link bends through; `linked: false` means the
   design draws no link there until that node is selected. */
const CUBE_SLOTS = [
  { x: 1125, y: 414, s: 18, via: { x: 1045, y: 405 } },
  { x: 650, y: 352, s: 13 },
  { x: 880, y: 338, s: 11, linked: false },
  { x: 720, y: 540, s: 8 },
];
const DOT_SLOTS = [
  { x: 545, y: 520, r: 4, ring: 9 },
  { x: 975, y: 262, r: 3, via: { x: 960, y: 300 } },
  { x: 1060, y: 470, r: 2.5, linked: false },
  { x: 1000, y: 283, r: 2.5, linked: false },
];
const WAYPOINTS = [
  { x: 1045, y: 405 },
  { x: 960, y: 300 },
];
const CONTACT = { x: 790, y: 340 };

/* Visible crop of the stage. Wide is the whole canvas, exactly as designed;
   phones zoom onto the slab and drop panels B and D (Part A6). */
const CROPS = {
  wide: { x: 0, y: 0, w: SW, h: SH },
  narrow: { x: 170, y: 40, w: 1100, h: 720 },
};

const r1 = (n) => Math.round(n * 10) / 10;
const pctIn = (vb) => (x, y) => ({
  left: `${r1(((x - vb.x) / vb.w) * 100)}%`,
  top: `${r1(((y - vb.y) / vb.h) * 100)}%`,
});
const up = (s) => String(s || '').toUpperCase();
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const short = (label, n = 13) => up(label).replace(/ &.*$/, '').slice(0, n).padEnd(n, ' ');

/**
 * Pure: put each dimension on a design slot. Live dimensions take the cube
 * slots by live count (ties keep taxonomy order), overflow live and then
 * roadmap dimensions take the dot slots. Dimensions past the last slot are
 * left off the plane (they still appear in the panels and the list).
 */
export function sceneLayout(dims) {
  const live = dims.filter((d) => d.live).sort((a, b) => b.liveCount - a.liveCount);
  const road = dims.filter((d) => !d.live);
  const out = [];
  live.forEach((d, i) => {
    if (i < CUBE_SLOTS.length) out.push({ ...d, kind: 'cube', ...CUBE_SLOTS[i] });
    else out.push({ ...d, kind: 'dot', tone: 'em' });
  });
  road.forEach((d) => out.push({ ...d, kind: 'dot', tone: 'mint' }));
  let dot = 0;
  return out
    .map((d) => {
      if (d.kind === 'cube') return { ...d, linked: d.linked !== false };
      const slot = DOT_SLOTS[dot++];
      return slot ? { ...d, ...slot, linked: slot.linked !== false } : null;
    })
    .filter(Boolean)
    .map((d) => ({
      ...d,
      /* Where the hot contact dot and the tooltip anchor: a cube's top face. */
      top: { x: d.x, y: d.kind === 'cube' ? d.y - d.s : d.y },
      path: d.via
        ? `M${HX} ${HY}L${d.via.x} ${d.via.y}L${d.x} ${d.y}`
        : `M${HX} ${HY}L${d.x} ${d.y}`,
    }));
}

/* Isometric cube, design construction: centre (x, y) is the top face's
   front vertex; left and right faces, then the top. */
function Cube({ x, y, s }) {
  const dx = r1(s * 0.866);
  const dy = r1(s * 0.5);
  return (
    <g className="dso-sc-cube">
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

function useStageWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(SW);
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

/* Panel text: one <text> per line, at the design's coordinates. */
function Lines({ rows }) {
  return rows.map(([t, y, o, x], i) => (
    <text key={i} x={x ?? 10} y={y} fillOpacity={o ?? undefined} xmlSpace="preserve">
      {t}
    </text>
  ));
}

export default function OrbitalMap({ dims, pinging, silent }) {
  const { selected, select } = useSonarSelection();
  const [stageRef, width] = useStageWidth();
  const nodes = useMemo(() => sceneLayout(dims), [dims]);
  const [hover, setHover] = useState(null);

  const narrow = width < 560;
  const vb = narrow ? CROPS.narrow : CROPS.wide;
  const pct = pctIn(vb);

  const current = selected ? dims.find((d) => d.id === selected) : null;
  const currentNode = selected ? nodes.find((d) => d.id === selected) : null;
  const tipNode = hover ? nodes.find((d) => d.id === hover) : null;
  const quiet = (id) => Boolean(selected) && selected !== id;
  const toggle = useCallback(
    (id) => select(selected === id ? null : id, 'radar'),
    [select, selected],
  );

  /* Esc clears the lock from anywhere inside the scene (Part A5). */
  const onKeyDown = (e) => {
    if (e.key === 'Escape' && selected) {
      e.stopPropagation();
      select(null, 'radar');
    }
  };
  useEffect(() => {
    if (!selected) return;
    setHover(null);
  }, [selected]);

  const totalDatasets = dims.reduce((n, d) => n + (d.items?.length || 0), 0);
  const byLive = [...dims].sort((a, b) => b.liveCount - a.liveCount);
  const liveDims = byLive.filter((d) => d.live);
  const roadDims = dims.filter((d) => !d.live);
  const anyLive = liveDims.length > 0;
  const contact = currentNode ? currentNode.top : anyLive ? CONTACT : null;

  /* Panel A (design: SONAR SWEEP · NVDA). Title and sub stay fixed; below
     them the parser's log scrolls down through the glass: one short block
     per dataset (the selected dimension's, else the busiest dimensions'),
     each a read, a parse and a result taken from the taxonomy. The block is
     drawn twice, one height apart, so the scroll loops without a seam. */
  const slug = (it) =>
    clip(
      String(it.href || it.label || '')
        .replace(/^.*\//, '')
        .toLowerCase(),
      20,
    );
  const sources = current
    ? current.items.slice(0, 6).map((it) => ({ name: slug(it), live: it.live, dim: current.id }))
    : byLive.slice(0, 6).map((d) => ({
        name: clip(d.id, 20),
        live: d.live,
        dim: d.id,
        n: d.items.length,
      }));
  const codeLines = sources.flatMap((src) => [
    [`> read  ${src.dim}/${src.name}`, null],
    [`  parse(doc) → entities`, 0.6],
    [
      src.live ? `  ✓ ${src.n ? `${src.n} sets` : 'rows'} · cited` : '  … queued · roadmap',
      src.live ? null : 0.5,
    ],
  ]);
  const CODE_LH = 11;
  const CODE_H = Math.max(codeLines.length, 1) * CODE_LH;
  const panelA = [
    [`SONAR SWEEP · ${clip(up(current ? current.label : 'All dimensions'), 22)}`, 22, null, 12],
    [
      current
        ? `${current.live ? 'DIMENSION LOCKED' : 'ON THE ROADMAP'} · ${current.items.length} SRC`
        : `SUBJECT OPEN · ${totalDatasets} SRC`,
      34,
      0.6,
      12,
    ],
    ['01', 22, 0.5, 150],
  ];
  const codeRows = [0, 1].flatMap((copy) =>
    codeLines.map(([t, o], i) => [t, 56 + i * CODE_LH - copy * CODE_H, o, 12]),
  );

  /* Panel B (design: THEMES · MACRO). One row per dimension, then a footer. */
  const bRows = dims.slice(0, 7);
  const bFoot = 32 + bRows.length * 10 + 8;
  const panelB = [
    ['COVERAGE · LIVE', 18],
    ...bRows.map((d, i) => [
      `${short(d.label, 14)} ${String(d.liveCount).padStart(2, ' ')}/${d.items.length}`,
      32 + i * 10,
      0.65,
    ]),
    [`PINGING ${pinging} · SILENT ${silent}`, bFoot],
    ['TAXONOMY · CITED', bFoot + 12, 0.65],
  ];

  /* Panel C (design: DIRECT · 01 / CAPITOL · 02). */
  const cLive = liveDims.slice(0, 5);
  const cRoadAt = 32 + cLive.length * 10 + 8;
  const panelC = [
    ['LIVE · 01', 18],
    ...cLive.map((d, i) => [
      `${short(d.label)} ${String(d.liveCount).padStart(2, ' ')} LIVE`,
      32 + i * 10,
      0.65,
    ]),
    ['ROADMAP · 02', cRoadAt],
    ...roadDims.slice(0, 3).map((d, i) => [`${short(d.label)} SOON`, cRoadAt + 14 + i * 10, 0.65]),
  ];

  /* Panel D (design: BRIEFING · CITED). */
  const panelD = [
    ['BRIEFING · CITED', 18],
    ['FINDINGS ONLY · NEVER ADVICE', 32, 0.65],
    [`DIMENSIONS ${dims.length} · SRC ${totalDatasets}`, 48, 0.65],
    [`LIVE ${pinging} · ROADMAP ${silent}`, 58, 0.65],
    [current ? `LOCKED · ${clip(up(current.label), 18)}` : 'NO LOCK · SELECT A NODE', 68, 0.65],
    ...byLive
      .slice(0, 3)
      .map((d, i) => [`00${i + 1} ${d.liveCount}/${d.items.length}`, 86 + i * 10, 0.5, 100]),
  ];

  return (
    <div
      className={`dso-sc${selected ? ' has-selection' : ''}${narrow ? ' is-narrow' : ''}`}
      onKeyDown={onKeyDown}
    >
      <div className="dso-sc-stage" ref={stageRef} style={{ aspectRatio: `${vb.w} / ${vb.h}` }}>
        <svg
          className="dso-sc-scene"
          viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
          role="group"
          aria-label="Ezana Sonar device: the dataset dimensions on emerald radar rings. Select a node to lock it."
        >
          <defs>
            <linearGradient id="dso-sc-codeFade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="white" stopOpacity="0" />
              <stop offset="0.16" stopColor="white" stopOpacity="1" />
              <stop offset="0.84" stopColor="white" stopOpacity="1" />
              <stop offset="1" stopColor="white" stopOpacity="0" />
            </linearGradient>
            <mask
              id="dso-sc-codeMask"
              maskUnits="userSpaceOnUse"
              x="0"
              y="42"
              width="196"
              height="144"
            >
              <rect x="0" y="42" width="196" height="144" fill="url(#dso-sc-codeFade)" />
            </mask>
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

          {/* 1 background: none. The device stands on the page's own ground,
              so there is no rectangle (and no edge) around it. */}

          {/* 2 glass base plate + mint accent lines */}
          <g aria-hidden="true">
            {[8, 6, 4, 2].map((y) => (
              <use key={y} href="#dso-sc-baseTop" y={y} className="dso-sc-base-ext" />
            ))}
            <use href="#dso-sc-baseTop" className="dso-sc-base" />
            <path className="dso-sc-mintline" d="M250 322L470 195" filter="url(#dso-sc-glow)" />
            <path className="dso-sc-mintline" d="M900 646L1200 473" filter="url(#dso-sc-glow)" />
          </g>

          {/* 3 slab body (extruded) + bottom rail edge, 4 top face + bezel */}
          <g className="dso-sc-slab-ext" aria-hidden="true">
            {Array.from({ length: 18 }, (_, i) => (
              <use key={i} href="#dso-sc-slabTop" y={36 - i * 2} />
            ))}
          </g>
          <use href="#dso-sc-slabTop" y="36" className="dso-sc-slab-rail" aria-hidden="true" />
          <use
            href="#dso-sc-slabTop"
            className="dso-sc-slab-top"
            fill="url(#dso-sc-slabTopG)"
            aria-hidden="true"
          />

          {/* 5 recessed screen */}
          <g transform={ISO} aria-hidden="true">
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

          {/* 6 dotted field + world map + grid, clipped to the recess */}
          <g clipPath="url(#dso-sc-recessClip)" aria-hidden="true">
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

          {/* 7 radar: core glow, sweep wedge (still, as drawn), rings, centre */}
          <g transform={ISO} aria-hidden="true">
            <circle cx="0" cy="0" r="150" fill="url(#dso-sc-core)" />
            <path d="M0 0L-150 -150A212 212 0 0 1 150 -150Z" fill="url(#dso-sc-sweep)" />
            <path className="dso-sc-sweep-edge" d="M0 0L150 -150" filter="url(#dso-sc-glow)" />
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

          {/* 8 links, on the design's paths */}
          <g className="dso-sc-links" aria-hidden="true">
            {nodes.map((d) =>
              d.linked || selected === d.id ? (
                <path
                  key={d.id}
                  className={`dso-sc-link${selected === d.id ? ' is-on' : ''}${quiet(d.id) ? ' is-quiet' : ''}`}
                  d={d.path}
                />
              ) : null,
            )}
          </g>

          {/* 9a decorative waypoints, blip and contact (no data) */}
          <g aria-hidden="true">
            {WAYPOINTS.map((w) => (
              <ellipse
                key={`${w.x}-${w.y}`}
                className="dso-sc-marker"
                cx={w.x}
                cy={w.y}
                rx="7"
                ry="4.5"
              />
            ))}
            {contact ? (
              <>
                <circle
                  className="dso-sc-hot"
                  cx={contact.x}
                  cy={contact.y}
                  r="5"
                  filter="url(#dso-sc-glow)"
                />
                <circle
                  className="dso-sc-hot-halo"
                  cx={contact.x}
                  cy={contact.y}
                  r="14"
                  filter="url(#dso-sc-soft)"
                />
              </>
            ) : null}
          </g>

          {/* 9b dimension nodes: the real controls */}
          {nodes.map((d) => {
            const on = selected === d.id;
            const label = `${d.label}, ${d.live ? `${d.liveCount} live datasets` : 'on the roadmap'}`;
            return (
              <g
                key={d.id}
                className={`dso-sc-node dso-sc-node--${d.kind}${d.tone ? ` is-${d.tone}` : ''}${on ? ' is-on' : ''}${quiet(d.id) ? ' is-quiet' : ''}`}
                role="button"
                tabIndex={0}
                aria-pressed={on}
                aria-label={
                  on ? `${label}, selected. Select again to clear.` : `${label}. Select to lock.`
                }
                onClick={() => toggle(d.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggle(d.id);
                  }
                }}
                onMouseEnter={() => setHover(d.id)}
                onMouseLeave={() => setHover((h) => (h === d.id ? null : h))}
                onFocus={() => setHover(d.id)}
                onBlur={() => setHover((h) => (h === d.id ? null : h))}
              >
                {/* 44px-plus touch target at every size (invisible). */}
                <circle className="dso-sc-hit" cx={d.top.x} cy={d.top.y} r={narrow ? 34 : 24} />
                <circle
                  className="dso-sc-focus"
                  cx={d.top.x}
                  cy={d.top.y}
                  r={d.kind === 'cube' ? d.s + 8 : 11}
                />
                {d.kind === 'cube' ? (
                  <Cube x={d.x} y={d.y} s={d.s} />
                ) : (
                  <>
                    <circle
                      className="dso-sc-blip"
                      cx={d.x}
                      cy={d.y}
                      r={d.r}
                      filter="url(#dso-sc-glow)"
                    />
                    {d.ring ? (
                      <circle className="dso-sc-blip-ring" cx={d.x} cy={d.y} r={d.ring} />
                    ) : null}
                  </>
                )}
                {on ? (
                  <circle
                    className="dso-sc-sel"
                    cx={d.top.x}
                    cy={d.top.y}
                    r={d.kind === 'cube' ? d.s + 6 : 9}
                  />
                ) : null}
              </g>
            );
          })}

          {/* 10 fog */}
          <g filter="url(#dso-sc-fog)" className="dso-sc-fog" aria-hidden="true">
            <ellipse cx="830" cy="300" rx="130" ry="46" fillOpacity="0.09" />
            <ellipse cx="1000" cy="430" rx="150" ry="52" fillOpacity="0.08" />
            <ellipse cx="560" cy="430" rx="120" ry="44" fillOpacity="0.06" />
            <ellipse cx="740" cy="560" rx="110" ry="36" fillOpacity="0.05" />
          </g>

          {/* 11 front light bars */}
          <g strokeLinecap="round" aria-hidden="true">
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

          {/* 12 SIGNAL FOUND plaque, keycap, dark button, port light */}
          <g aria-hidden="true">
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
              {anyLive ? 'SIGNAL FOUND' : 'NO SIGNAL'}
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

          {/* 13 floating glass panels: the design's shapes, blobs and text grid */}
          {/* Panel A faces west, parallel to the right-hand walls (same
              plane as panel B), over the same footprint it had facing south. */}
          <g className="dso-sc-panel dso-sc-panel--a" aria-hidden="true">
            <polygon
              className="dso-sc-glass"
              points="775,32 945,130 945,320 775,222"
              fill="url(#dso-sc-glassG)"
            />
            <polygon className="dso-sc-glass-edge" points="775,32 945,130 945,134 775,36" />
            <ellipse
              className="dso-sc-blob"
              cx="900"
              cy="116"
              rx="40"
              ry="26"
              fillOpacity="0.22"
              filter="url(#dso-sc-soft)"
            />
            <ellipse
              className="dso-sc-blob"
              cx="830"
              cy="215"
              rx="34"
              ry="22"
              fillOpacity="0.12"
              filter="url(#dso-sc-soft)"
            />
            <g className="dso-sc-text" transform="matrix(0.866 0.5 0 1 775 32)" fontSize="7.5">
              <Lines rows={panelA} />
              <g mask="url(#dso-sc-codeMask)">
                <g
                  className="dso-sc-code"
                  style={{ '--dso-sc-code-h': `${CODE_H}px`, '--dso-sc-code-n': codeLines.length }}
                >
                  <Lines rows={codeRows} />
                </g>
              </g>
            </g>
          </g>
          <g className="dso-sc-panel dso-sc-panel--b" aria-hidden="true">
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
              <Lines rows={panelB} />
            </g>
          </g>
          <g className="dso-sc-panel dso-sc-panel--c" aria-hidden="true">
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
            <circle
              className="dso-sc-blob-warm"
              cx="400"
              cy="292"
              r="4"
              fillOpacity="0.6"
              filter="url(#dso-sc-soft)"
            />
            <g className="dso-sc-text" transform="matrix(0.866 -0.5 0 1 335 254)" fontSize="7">
              <Lines rows={panelC} />
            </g>
          </g>
          <g className="dso-sc-panel dso-sc-panel--d" aria-hidden="true">
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
              <Lines rows={panelD} />
            </g>
          </g>

          {/* 14 ambient pool under the slab */}
          <ellipse
            className="dso-sc-pool"
            cx="720"
            cy="700"
            rx="420"
            ry="40"
            fillOpacity="0.07"
            filter="url(#dso-sc-fog)"
            aria-hidden="true"
          />
        </svg>

        {/* Hub: an invisible clear-selection target on the radar centre. The
            news ticker also measures card flights from this element. */}
        <button
          type="button"
          className="dso-sc-hub"
          style={pct(HX, HY)}
          onClick={() => select(null, 'radar')}
          aria-label="Ezana Sonar, clear the selection"
        />

        {tipNode ? (
          <span className="dso-sc-tip" role="tooltip" style={pct(tipNode.top.x, tipNode.top.y)}>
            <small>
              {tipNode.live
                ? `${tipNode.liveCount} LIVE · ${tipNode.items.length} DATASETS`
                : 'ROADMAP'}
            </small>
            <b>{tipNode.label}</b>
            <em>{selected === tipNode.id ? 'Locked · select to clear' : 'Select to lock'}</em>
          </span>
        ) : null}
      </div>

      <ul className="dso-sr">
        {dims.map((d) => (
          <li key={d.id}>
            {d.label}: {d.live ? `${d.liveCount} live datasets` : 'on the roadmap'}
            {d.id === selected ? ' (selected)' : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}

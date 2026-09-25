'use client';

/**
 * SonarOrbitalMap, the Sonar band's fork of PersonalizationRadar.
 *
 * Copied from PersonalizationRadar.jsx (which stays untouched for history)
 * and diverges in exactly three ways for the band: the seven axis title
 * labels are replaced by the dimension icons from the top-nav Datasets
 * dropdown (same Lucide mapping as Navbar.js, so the two surfaces cannot
 * drift by hand), the trailing WiFi arcs and Personalized Intelligence
 * Dashboard pill are removed on both layouts, and the desktop legend row is
 * gone. Everything else, the layered-sine blip drift, the hover and pin
 * popup, the shared personalization-radar.css, is inherited as-is.
 *
 * Lucide is normally banned in new code. The requirement is the exact icons
 * the Datasets dropdown uses, which are Lucide, and this file inherits the
 * dependency from its parent. It is the one sanctioned use; do not introduce
 * Lucide anywhere else.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, MotionConfig } from 'framer-motion';
import { Landmark, Building2, Radar, TrendingUp, Users, Globe, ScrollText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DATASET_TAXONOMY } from '@/lib/datasets/taxonomy';
import './personalization-radar.css';

const CX = 560,
  CY = 360,
  RMIN = 84,
  RMAX = 300;

// The 7 axes ARE the shared taxonomy's 7 dimensions (ids + labels), so the radar
// can never drift from the nav / CategoryBar / signal map. Only the per-axis
// resting weight (how far the dot sits from the hub) is presentation-local.
const DIM_WEIGHT = {
  capitol: 0.94,
  titans: 0.62,
  eyes: 0.8,
  whispers: 0.38,
  hive: 0.72,
  lighthouse: 0.46,
  regulatory: 0.34,
};
// One icon per dimension, identical to the top-nav Datasets menu (Navbar.js).
// Navbar is the source of truth: if a dimension's icon changes there, mirror
// it here rather than inventing one.
const DIMENSION_ICON = {
  capitol: Landmark,
  titans: Building2,
  eyes: Radar,
  whispers: TrendingUp,
  hive: Users,
  lighthouse: Globe,
  regulatory: ScrollText,
};

const DIMS = DATASET_TAXONOMY.map((d) => ({
  id: d.id,
  nm: d.label,
  w: DIM_WEIGHT[d.id] ?? 0.5,
}));
const N = DIMS.length;

function ang(i) {
  return ((-90 + (i * 360) / N) * Math.PI) / 180;
}

// weight(t): base + two slow sine layers. Because a sum of sines has continuous
// velocity everywhere, a vertex can never jump, stutter, or snap direction the
// way the old target-hopping animation did when it reached a target. The random
// per-dimension frequencies/phases keep the seven points out of sync so the
// shape keeps reforming. t is in seconds; frequencies in Hz.
function weightAt(s, t, base) {
  const w =
    base +
    s.a1 * Math.sin(2 * Math.PI * s.f1 * t + s.p1) +
    s.a2 * Math.sin(2 * Math.PI * s.f2 * t + s.p2);
  return Math.max(0.14, Math.min(0.98, w));
}

function labelPos(i) {
  const a = ang(i);
  const lr = RMAX + 30;
  return {
    x: CX + lr * Math.cos(a),
    y: CY + lr * Math.sin(a),
    anchor: Math.abs(Math.cos(a)) < 0.25 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end',
  };
}

function MobileRadarFlow({ dims, sourceDetails, accentColor }) {
  const [activeSource, setActiveSource] = useState(null);
  const detail = activeSource ? sourceDetails?.[activeSource] : null;

  return (
    <div className="flex w-full min-w-0 flex-col items-center space-y-5">
      <div className="grid w-full min-w-0 grid-cols-2 gap-3">
        {dims.map(({ id, nm }, i) => {
          const isActive = activeSource === id;
          const isLastOdd = i === dims.length - 1 && dims.length % 2 === 1;
          const longLabel = id === 'whispers' || id === 'lighthouse' || id === 'regulatory';
          return (
            <div key={id} className={cn('min-w-0', isLastOdd && 'col-span-2 flex justify-center')}>
              <button
                type="button"
                onClick={() => setActiveSource((prev) => (prev === id ? null : id))}
                aria-expanded={isActive}
                className={cn(
                  'flex min-h-11 w-full min-w-0 max-w-full items-center justify-center gap-1.5 rounded-full border px-2 py-2 text-center transition-all duration-200 sm:px-2.5 sm:py-2.5',
                  isLastOdd && 'max-w-[calc(50%-0.375rem)]',
                  isActive
                    ? 'border-emerald-500 bg-emerald-700 text-white shadow-lg shadow-emerald-500/20'
                    : 'border-emerald-500/40 bg-[#0a0f0a]/95 text-emerald-100',
                )}
                style={{
                  borderColor: isActive ? undefined : `${accentColor}50`,
                  boxShadow: isActive
                    ? `0 8px 24px -8px ${accentColor}55, inset 0 1px 0 ${accentColor}40`
                    : `inset 0 1px 0 ${accentColor}15`,
                }}
              >
                {/* Icon ahead of the label, for continuity with the desktop
                    ring. The label stays: an icons-only tap grid with no
                    visible names fails usability on touch, and the desktop
                    requirement (titles off the ring) does not apply here. */}
                {(() => {
                  const Icon = DIMENSION_ICON[id];
                  return Icon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null;
                })()}
                <span
                  className={cn(
                    'min-w-0 text-[11px] font-medium leading-tight sm:text-xs',
                    // No line-clamp: long labels wrap in full and the min-h-10
                    // pill grows to fit, instead of clipping the longer names.
                    longLabel ? '[overflow-wrap:anywhere]' : 'whitespace-nowrap',
                  )}
                >
                  {nm}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {activeSource && detail && (
        <div
          className="w-full min-w-0 rounded-xl p-3 sm:p-4"
          style={{
            // Match the desktop hover popup: white card, Ezana-green outline,
            // dark legible text.
            background: '#fff',
            border: '1px solid #10b981',
            boxShadow: '0 8px 28px -8px rgba(0,0,0,0.18)',
          }}
        >
          {detail.tagline && (
            <p className="mb-2 text-center text-[11px] leading-snug text-slate-600">
              {detail.tagline}
            </p>
          )}
          <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
            Powered by
          </p>
          <ul className="max-h-48 space-y-3 overflow-y-auto pr-1">
            {detail.sources?.map((src) => (
              <li key={src.name} className="text-center">
                <div className="text-xs font-semibold text-slate-900">{src.name}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-slate-600">
                  {src.description}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function SonarOrbitalMap({
  sourceDetails,
  relevance = null,
  hubLabel = null,
  /* Stage 2 renders this map at roughly a sixth of its resting width. The
     viewBox scales everything with it, so 1px rings land near a sixth of a
     pixel and sub-pixel dots disappear into the band. Geometry that must keep
     a real rendered size gets multiplied here; strokes are handled in
     sonar-band.css with vector-effect, which CSS does better than arithmetic. */
  compact = false,
} = {}) {
  const accentColor = '#10b981';
  // `hoveredDim` is transient (mouse/focus over a dot or label); `pinnedDim`
  // persists after a click so the description card stays open. The card shows
  // whichever is active, with a pin taking precedence over a hover.
  const [hoveredDim, setHoveredDim] = useState(null);
  const [pinnedDim, setPinnedDim] = useState(null);

  /* The hub and its label are the two things that must NOT scale with the
     viewBox, and the reason is arithmetic: the map is drawn in 1120 units and
     rendered around 140px wide in stage 2, so the r=40 hub paints a 10px disc
     and no font size fits a two-line company name inside it.

     04-SPEC.md section 4 sizes both as a fraction of the rendered diameter
     instead, hub at 35% of it and label floored at 12 real pixels. Both need
     the rendered width, so it is measured. Read-only: nothing here changes the
     element's width, which CSS sets from --snr-orb-size, so there is no loop. */
  const svgRef = useRef(null);
  const [renderedPx, setRenderedPx] = useState(0);
  useEffect(() => {
    const el = svgRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      setRenderedPx((prev) => (Math.abs(prev - w) > 0.5 ? w : prev));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* viewBox units per rendered pixel. Falls back to the resting scale before
     the first measurement, which is also what SSR renders. */
  const unitsPerPx = renderedPx > 0 ? 1120 / renderedPx : 1120 / 440;

  /* The label is split here rather than in the markup because the hub has to
     be big enough to hold it, so the hub's radius depends on it. */
  const hubClip = (w) => (w.length > 12 ? `${w.slice(0, 11)}\u2026` : w);
  const hubText = typeof hubLabel === 'string' && hubLabel.trim() ? hubLabel.trim() : null;
  const hubWords = hubText ? hubText.split(/\s+/) : [];
  const hubLine1 = hubText ? hubClip(hubWords.length > 1 ? hubWords[0] : hubText) : null;
  const hubLine2 = hubWords.length > 1 ? hubClip(hubWords.slice(1).join(' ')) : null;
  const hubLongest = Math.max(hubLine1?.length || 0, hubLine2?.length || 0);

  /* Everything that must hold a real rendered size is derived from the scale,
     not from a constant multiplier. A constant cannot work: the mini map
     renders anywhere from about 120 to 155px wide depending on the header
     zone, so the same multiplier lands at a different pixel size at every
     viewport. The first pass at this used 2.2x on the dots and a hub fixed at
     35% of the diameter, and measured out at a 1.24px dot and a 9px label.

     The label floor is 12 real pixels, from 04-SPEC.md section 4, and it wins
     over fitting the hub: the hub grows to hold it instead. That is the
     disproportion the spec calls deliberate, and at these sizes it is the
     only way the pinged term is readable at all. */
  const hubLabelUnits = compact ? Math.round(12 * unitsPerPx) : null;
  /* 35% of the diameter, which is 04-SPEC.md section 4's figure and comes out
     around 49px rendered. Growing it to fully contain a 12px two-line label
     instead needed r=247 of a 300 radius, which swallowed the polygon and the
     dots and left a dark disc with a name on it. The label overflows the disc
     by a few pixels at the longest words and reads fine over the inner rings,
     helped by the dark backdrop the band sheet puts under the whole map. */
  const hubR = compact ? Math.round((0.35 * 1120) / 2) : 40;
  const dotR = (active) =>
    compact ? Math.round((active ? 5 : 3.5) * unitsPerPx) : active ? 6 : 4.5;
  const pulseR = compact ? Math.round(7 * unitsPerPx) : 5;
  const activeDim = pinnedDim !== null ? pinnedDim : hoveredDim;
  const togglePin = (i) => setPinnedDim((prev) => (prev === i ? null : i));
  const polyYouRef = useRef(null);
  const blipGroupRefs = useRef([]);
  // Stable ref callbacks (created once) so hover-driven re-renders don't detach
  // and reattach the animated nodes — that churn caused the dots to jump/restart.
  const blipGroupRefCbs = useRef(
    DIMS.map((_, i) => (el) => {
      blipGroupRefs.current[i] = el;
    }),
  );
  const stateRef = useRef(null);
  const rafRef = useRef(null);
  /* Relevance arrives from a ping and changes while the loop is running. It
     rides a ref rather than the effect's deps, because re-running that effect
     would re-seed every dimension's drift parameters and the whole map would
     visibly restart mid-glide. */
  const relevanceRef = useRef(relevance);
  const renderRef = useRef(null);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // Layered-sine drift parameters, randomized once on mount (empty deps, so
    // they never re-randomize on re-render). Each dimension drifts as the sum of
    // a fast and a slow sine wave around its base weight — continuous motion that
    // glides toward the hub and back out forever without ever hopping to a new
    // random target (the old pattern, which snapped direction at every target).
    const states = DIMS.map((d, i) => ({
      a: ang(i),
      base: d.w,
      f1: 0.05 + Math.random() * 0.05,
      p1: Math.random() * Math.PI * 2,
      a1: 0.16 + Math.random() * 0.1,
      f2: 0.011 + Math.random() * 0.013,
      p2: Math.random() * Math.PI * 2,
      a2: 0.1 + Math.random() * 0.08,
      /* The displayed weight, eased toward the relevance target each frame. */
      wDisp: d.w,
    }));
    stateRef.current = states;

    /* A ping repositions the orbits: each dimension's resting radius becomes
       its relevance to what was asked, so the dots glide out toward the icons
       of the datasets that actually matched and pull in toward the hub for the
       ones that did not. Easing a displayed weight toward the target rather
       than assigning it keeps the drift breathing through the move; the dots
       travel, they never teleport. */
    const easeTo = (s, i, snap) => {
      const rel = relevanceRef.current;
      const target = rel ? Math.min(1, Math.max(0.1, rel[DIMS[i].id] ?? 0.1)) : s.base;
      s.wDisp = snap ? target : s.wDisp + (target - s.wDisp) * 0.06;
      return s.wDisp;
    };

    function render(t, snap = false) {
      const pts = [];
      for (let i = 0; i < states.length; i++) {
        const s = states[i];
        const w = weightAt(s, t, easeTo(s, i, snap));
        const r = RMIN + w * (RMAX - RMIN);
        const x = CX + r * Math.cos(s.a);
        const y = CY + r * Math.sin(s.a);
        // Move the whole dot group with a single transform (GPU-composited via
        // will-change) instead of mutating cx/cy on two circles each frame. This
        // keeps the pulse ring's CSS scale animation from re-resolving its origin
        // every frame. Full precision (toFixed(2)) — the old toFixed(1) made
        // vertices step in 0.1px increments, a separate source of shimmer.
        const g = blipGroupRefs.current[i];
        if (g) g.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
        pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
      }
      if (polyYouRef.current) polyYouRef.current.setAttribute('points', pts.join(' '));
    }

    renderRef.current = (snap) => render(0, snap);

    if (reduce) {
      /* No glide under reduced motion: positions land on the target at once. */
      render(0, true);
    } else {
      const t0 = performance.now();
      function loop(now) {
        render((now - t0) / 1000);
        rafRef.current = requestAnimationFrame(loop);
      }
      rafRef.current = requestAnimationFrame(loop);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      renderRef.current = null;
    };
  }, []);

  /* Publish the new target to the running loop. Under reduced motion there is
     no loop to pick it up, so repaint once from here. */
  useEffect(() => {
    relevanceRef.current = relevance;
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce && renderRef.current) renderRef.current(true);
  }, [relevance]);

  const activeDetail = activeDim !== null ? sourceDetails?.[DIMS[activeDim].id] : null;
  const popupPos =
    activeDim !== null
      ? (() => {
          const a = ang(activeDim);
          const lr = RMAX + 30;
          const px = ((CX + lr * Math.cos(a)) / 1120) * 100;
          const py = ((CY + lr * Math.sin(a)) / 760) * 100;
          const cosA = Math.cos(a);
          const sinA = Math.sin(a); // vertical component of the node's angle

          // Horizontal anchor — flip so the popup never runs off the left/right.
          let translateX = '-50%';
          if (cosA > 0.25) translateX = '0%';
          else if (cosA < -0.25) translateX = '-100%';

          // Vertical anchor — mirror the horizontal flip: for a bottom-half node
          // (sinA > 0) anchor the popup's BOTTOM to the node and grow UPWARD so it
          // never clips off the bottom; side nodes center; top nodes stay below.
          let translateY = '8px';
          if (sinA > 0.25) translateY = 'calc(-100% - 8px)';
          else if (Math.abs(sinA) <= 0.25) translateY = '-50%';

          return {
            left: `${px}%`,
            top: `${py}%`,
            transform: `translate(${translateX}, ${translateY})`,
          };
        })()
      : null;

  return (
    // reducedMotion="user" makes every framer-motion animation below (the mobile
    // hub pulse/glow + the WiFi arcs on both layouts) honor the OS
    // prefers-reduced-motion setting — the CSS block in personalization-radar.css
    // only covers the SVG sweep/blip classes, not these motion components.
    <MotionConfig reducedMotion="user">
      <div className="w-full">
        {/* Mobile layout */}
        <div className="w-full max-w-md min-w-0 mx-auto lg:hidden">
          <MobileRadarFlow dims={DIMS} sourceDetails={sourceDetails} accentColor={accentColor} />
        </div>

        {/* Desktop radar */}
        <div className="hidden lg:block">
          <div className="relative w-full max-w-[1100px] mx-auto">
            <svg
              ref={svgRef}
              viewBox="0 0 1120 760"
              role="img"
              aria-label="Weighted radar chart of seven intelligence dimensions"
              className={cn('block w-full h-auto overflow-visible', compact && 'radar--compact')}
              onClick={() => setPinnedDim(null)}
            >
              <defs>
                <radialGradient id="radar-hg" cx="50%" cy="42%" r="60%">
                  <stop offset="0" stopColor="#10b981" stopOpacity="0.24" />
                  <stop offset="1" stopColor="#10b981" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="radar-sg" x1="0" y1="0" x2="1" y2="0.4">
                  <stop offset="0" stopColor="#10b981" stopOpacity="0.26" />
                  <stop offset="1" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="radar-sg2" x1="0" y1="0" x2="1" y2="0.4">
                  <stop offset="0" stopColor="#34d399" stopOpacity="0.18" />
                  <stop offset="1" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Rings */}
              <circle cx={CX} cy={CY} r={100} fill="none" strokeWidth="1" className="radar-grid" />
              <circle cx={CX} cy={CY} r={200} fill="none" strokeWidth="1" className="radar-grid" />
              <circle cx={CX} cy={CY} r={300} fill="none" strokeWidth="1" className="radar-grid" />

              {/* Crosshair */}
              <line
                x1={260}
                y1={CY}
                x2={860}
                y2={CY}
                strokeWidth="1"
                opacity="0.35"
                className="radar-grid"
              />
              <line
                x1={CX}
                y1={60}
                x2={CX}
                y2={660}
                strokeWidth="1"
                opacity="0.35"
                className="radar-grid"
              />

              {/* Axis spokes */}
              {DIMS.map((_, i) => {
                const a = ang(i);
                return (
                  <line
                    key={`spoke-${i}`}
                    x1={CX}
                    y1={CY}
                    x2={CX + RMAX * Math.cos(a)}
                    y2={CY + RMAX * Math.sin(a)}
                    strokeWidth="1"
                    opacity="0.4"
                    className="radar-grid"
                  />
                );
              })}

              {/* Sweep wedges */}
              <g className="radar-sweep1">
                <path
                  d={`M${CX} ${CY} L${CX} ${CY - RMAX} A${RMAX} ${RMAX} 0 0 1 ${CX + 228} ${CY - 202} Z`}
                  fill="url(#radar-sg)"
                />
                <line
                  x1={CX}
                  y1={CY}
                  x2={CX}
                  y2={CY - RMAX}
                  stroke="#10b981"
                  strokeWidth="1.6"
                  opacity="0.6"
                />
              </g>
              <g className="radar-sweep2">
                <path
                  d={`M${CX} ${CY} L${CX} ${CY - RMAX} A${RMAX} ${RMAX} 0 0 1 ${CX + 160} ${CY - 250} Z`}
                  fill="url(#radar-sg2)"
                />
                <line
                  x1={CX}
                  y1={CY}
                  x2={CX}
                  y2={CY - RMAX}
                  stroke="#34d399"
                  strokeWidth="1.2"
                  opacity="0.45"
                />
              </g>

              {/* Live polygon */}
              <polygon
                ref={polyYouRef}
                points=""
                className="radar-poly"
                fill="rgba(16,185,129,.13)"
                stroke="rgba(16,185,129,.34)"
                strokeWidth="1.3"
                strokeLinejoin="round"
              />

              {/* Blips + pulse rings — each group is positioned via a single
                transform updated by the RAF loop; the circles sit at the group's
                local origin so the pulse's scale animation never fights position
                updates. */}
              {DIMS.map((d, i) => {
                const a = ang(i);
                const r = RMIN + d.w * (RMAX - RMIN);
                const ix = CX + r * Math.cos(a);
                const iy = CY + r * Math.sin(a);
                const isActive = activeDim === i;
                return (
                  <g
                    key={`blip-${i}`}
                    ref={blipGroupRefCbs.current[i]}
                    className={cn('radar-blip-group', isActive && 'radar-blip-group--active')}
                    transform={`translate(${ix.toFixed(2)} ${iy.toFixed(2)})`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${d.nm} — show data sources`}
                    aria-expanded={isActive}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredDim(i)}
                    onMouseLeave={() => setHoveredDim(null)}
                    onFocus={() => setHoveredDim(i)}
                    onBlur={() => setHoveredDim(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePin(i);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        togglePin(i);
                      }
                    }}
                  >
                    {/* Invisible, larger hit target so the tiny dot is easy to
                      hover/click; moves with the group's RAF transform. */}
                    <circle
                      cx="0"
                      cy="0"
                      r="16"
                      fill="#fff"
                      fillOpacity="0"
                      style={{ pointerEvents: 'all' }}
                    />
                    {/* Radii as attributes, not CSS. The `r` property is not
                        dependable across Safari versions, and a dot that
                        silently keeps its authored radius is exactly the
                        failure this is fixing. */}
                    <circle
                      cx="0"
                      cy="0"
                      r={dotR(isActive)}
                      className="radar-blip-dot"
                      fill="#10b981"
                    />
                    <circle
                      cx="0"
                      cy="0"
                      r={pulseR}
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="1.4"
                      className="radar-blip-pulse"
                      style={{ animationDelay: `${-i * 0.34}s` }}
                    />
                  </g>
                );
              })}

              {/* Hub */}
              <circle
                cx={CX}
                cy={CY}
                r={hubR}
                className="radar-hub-ring"
                fill="#0a0f15"
                stroke="rgba(16,185,129,.3)"
                strokeWidth="1.5"
              />
              <circle cx={CX} cy={CY} r={hubR} className="radar-hub-fill" fill="url(#radar-hg)" />
              {/* The hub names what was pinged. Two lines, because most company
                  names are two words and one line of "Lockheed Martin" does not
                  fit an r=40 hub at any readable size.

                  Everything here is in the 1120x760 viewBox's user units, which
                  is the whole difficulty: the hub is 80 units across while the
                  default label is 30 units tall, so a fixed line offset and a
                  fixed size are both wrong. A 16-unit dy drew the two lines 4px
                  apart on screen, one over the other. The size is derived from
                  the longest line instead and the offset follows it in ems.

                  Without a ping the label is untouched: same single line, same
                  size off the stylesheet, so the resting orbital is unchanged. */}
              {(() => {
                const pinged = typeof hubLabel === 'string' && hubLabel.trim();
                if (!pinged) {
                  return (
                    <text x={CX} y={CY + 6} textAnchor="middle" className="radar-hub-label">
                      Ezana
                    </text>
                  );
                }
                const line1 = hubLine1;
                const line2 = hubLine2;
                const longest = hubLongest;
                /* Usable width inside the hub, which is the hub's own radius
                   grown under compact, less a little breathing room. The face
                   advances at roughly 0.58em, so this is the size at which the
                   longest line just fits.

                   Compact takes the larger of that and the 12-real-pixel floor
                   from 04-SPEC.md section 4, converted into viewBox units by
                   the measured scale. The floor is what matters in practice:
                   at the sizes this renders, a label that merely fits the hub
                   is still too small to read. Capped at the stylesheet's 30 in
                   the resting map so a three-letter ticker is not drawn
                   comically large. */
                const fs = compact
                  ? hubLabelUnits
                  : Math.max(9, Math.min(30, Math.round(72 / (longest * 0.58))));
                /* Baseline maths, not guesses: 0.36em is about the cap-height
                   centre, so a single line lands on CY and a pair straddles it. */
                const lift = Math.round(fs * 0.36);
                return (
                  <text
                    x={CX}
                    y={line2 ? CY - Math.round(fs * 0.55) + lift : CY + lift}
                    textAnchor="middle"
                    className="radar-hub-label"
                    style={{ fontSize: `${fs}px` }}
                  >
                    <tspan x={CX}>{line1}</tspan>
                    {line2 ? (
                      <tspan x={CX} dy="1.1em">
                        {line2}
                      </tspan>
                    ) : null}
                  </text>
                );
              })()}

              {/* Dimension icons (interactive). The title labels are gone; each
                  axis shows its Datasets-menu icon, all white on the band. Ink
                  lives in sonar-band.css rather than here: Lucide strokes with
                  currentColor, so the class owns the colour and the hover and
                  pin states stay opacity-only. Nothing names the dimension on
                  the ring now, so the popup and aria-label carry the name. */}
              {DIMS.map((d, i) => {
                const pos = labelPos(i);
                const Icon = DIMENSION_ICON[d.id];
                const isActive = activeDim === i;
                if (!Icon) return null;
                const S = 44; /* SVG units; renders near 20px at the band's half scale */
                return (
                  <g
                    key={`dim-icon-${i}`}
                    transform={`translate(${(pos.x - S / 2).toFixed(2)} ${(pos.y - S / 2).toFixed(2)})`}
                    role="button"
                    tabIndex={0}
                    aria-label={`${d.nm}, show data sources`}
                    aria-expanded={isActive}
                    className={cn('radar-dim-icon', isActive && 'radar-dim-icon--active')}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredDim(i)}
                    onMouseLeave={() => setHoveredDim(null)}
                    onFocus={() => setHoveredDim(i)}
                    onBlur={() => setHoveredDim(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePin(i);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        togglePin(i);
                      }
                    }}
                  >
                    {/* Invisible hit pad: a 44 unit glyph is a small target at
                        half scale, so the pad widens it without moving it. */}
                    <rect
                      x={-8}
                      y={-8}
                      width={S + 16}
                      height={S + 16}
                      fill="#fff"
                      fillOpacity="0"
                      style={{ pointerEvents: 'all' }}
                    />
                    <Icon x={0} y={0} width={S} height={S} strokeWidth={1.75} aria-hidden />
                  </g>
                );
              })}
            </svg>

            {/* Dimension description card — shown on hover or click of a dot/label */}
            {activeDim !== null && activeDetail && popupPos && (
              <div
                className="absolute z-50 rounded-xl p-4 w-[280px] sm:w-[300px]"
                style={{
                  ...popupPos,
                  // White card with an Ezana-green outline per handoff; text
                  // colors below are dark so they stay legible on white.
                  background: '#fff',
                  border: '1px solid #10b981',
                  boxShadow: '0 12px 32px -8px rgba(0,0,0,0.18)',
                  pointerEvents: 'none',
                }}
                role="tooltip"
              >
                {activeDetail.tagline && (
                  <div className="mb-3 text-center text-[11px] leading-snug text-slate-600">
                    {activeDetail.tagline}
                  </div>
                )}
                <div className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                  Powered by
                </div>
                <ul className="space-y-3">
                  {activeDetail.sources?.map((src) => (
                    <li key={src.name} className="text-center">
                      <div className="text-xs font-semibold text-slate-900">{src.name}</div>
                      <div className="mt-0.5 text-[11px] leading-snug text-slate-600">
                        {src.description}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}

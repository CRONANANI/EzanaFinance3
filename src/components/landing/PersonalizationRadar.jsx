'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, MotionConfig } from 'framer-motion';
import { User } from 'lucide-react';
import { EzanaNavLogo } from '@/components/brand/EzanaNavLogo';
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
const DIMS = DATASET_TAXONOMY.map((d) => ({ id: d.id, nm: d.label, w: DIM_WEIGHT[d.id] ?? 0.5 }));
const N = DIMS.length;

function ang(i) {
  return ((-90 + (i * 360) / N) * Math.PI) / 180;
}

// weight(t): base + two slow sine layers. Because a sum of sines has continuous
// velocity everywhere, a vertex can never jump, stutter, or snap direction the
// way the old target-hopping animation did when it reached a target. The random
// per-dimension frequencies/phases keep the seven points out of sync so the
// shape keeps reforming. t is in seconds; frequencies in Hz.
function weightAt(s, t) {
  const w =
    s.base +
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
                  'flex min-h-10 w-full min-w-0 max-w-full items-center justify-center gap-1.5 rounded-full border px-2 py-2 text-center transition-all duration-200 sm:px-2.5 sm:py-2.5',
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
                <span
                  className={cn(
                    'min-w-0 text-[11px] font-medium leading-tight sm:text-xs',
                    longLabel ? 'line-clamp-2 [overflow-wrap:anywhere]' : 'whitespace-nowrap',
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

      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          className="absolute h-20 w-20 rounded-full"
          style={{ background: `radial-gradient(circle, ${accentColor}15 0%, transparent 70%)` }}
          animate={{ scale: [1, 1.35, 1], opacity: [0.4, 0.75, 0.4] }}
          transition={{ duration: 2.5, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
        />
        <div
          className="relative grid h-[52px] w-[52px] place-items-center rounded-full border-2 bg-[#141516] text-sm font-semibold text-white shadow-lg"
          style={{
            borderColor: accentColor,
            boxShadow: `0 0 22px ${accentColor}50, 0 0 45px ${accentColor}20`,
          }}
        >
          Ezana
        </div>
      </div>

      <div className="flex flex-col items-center" aria-hidden>
        <svg width="100" height="50" viewBox="0 0 100 50" className="overflow-visible">
          <motion.path
            d="M 40 20 Q 50 10 60 20"
            fill="none"
            stroke="#10b981"
            strokeWidth="5"
            strokeLinecap="round"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.path
            d="M 28 32 Q 50 8 72 32"
            fill="none"
            stroke="#10b981"
            strokeWidth="5"
            strokeLinecap="round"
            animate={{ opacity: [0.7, 0.25, 0.7] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
          />
          <motion.path
            d="M 16 44 Q 50 6 84 44"
            fill="none"
            stroke="#10b981"
            strokeWidth="5"
            strokeLinecap="round"
            animate={{ opacity: [0.5, 0.15, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
          />
        </svg>
      </div>

      <div className="relative w-full max-w-xs min-w-0">
        <motion.div
          className="absolute -inset-0.5 rounded-2xl blur-md"
          style={{
            background: `linear-gradient(90deg, ${accentColor}20, ${accentColor}35, ${accentColor}20)`,
          }}
          animate={{ opacity: [0.5, 0.85, 0.5] }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: 'easeInOut' }}
        />
        <div
          className="relative flex w-full min-w-0 items-center justify-center gap-2.5 rounded-2xl border bg-[#0a0f0a]/95 px-4 py-3.5 text-center backdrop-blur-sm sm:px-6"
          style={{
            borderColor: `${accentColor}50`,
            boxShadow: `0 0 24px ${accentColor}20, inset 0 1px 0 ${accentColor}15`,
          }}
        >
          <User className="size-4 shrink-0 text-emerald-400" aria-hidden />
          <span className="text-sm font-medium leading-tight text-emerald-100">
            Personalized Intelligence Dashboard
          </span>
        </div>
      </div>
    </div>
  );
}

export default function PersonalizationRadar({ sourceDetails }) {
  const accentColor = '#10b981';
  // `hoveredDim` is transient (mouse/focus over a dot or label); `pinnedDim`
  // persists after a click so the description card stays open. The card shows
  // whichever is active, with a pin taking precedence over a hover.
  const [hoveredDim, setHoveredDim] = useState(null);
  const [pinnedDim, setPinnedDim] = useState(null);
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
    }));
    stateRef.current = states;

    function render(t) {
      const pts = [];
      for (let i = 0; i < states.length; i++) {
        const s = states[i];
        const w = weightAt(s, t);
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

    if (reduce) {
      render(0);
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
    };
  }, []);

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
          {/* Legend */}
          <div className="flex justify-center gap-5 mb-4">
            <span className="flex items-center gap-1.5 font-mono text-[10.5px] text-[color:var(--text-muted)]">
              <span
                className="inline-block w-3.5 h-2 rounded-sm"
                style={{ background: 'rgba(16,185,129,.5)', border: '1px solid var(--emerald)' }}
              />
              Your weighting, learned as you engage
            </span>
          </div>

          <div className="relative w-full max-w-[1100px] mx-auto">
            <svg
              viewBox="0 0 1120 760"
              role="img"
              aria-label="Weighted radar chart of seven intelligence dimensions"
              className="block w-full h-auto overflow-visible"
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
                    <circle cx="0" cy="0" r={isActive ? 6 : 4.5} fill="#10b981" />
                    <circle
                      cx="0"
                      cy="0"
                      r="5"
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
                r={40}
                fill="#0a0f15"
                stroke="rgba(16,185,129,.3)"
                strokeWidth="1.5"
              />
              <circle cx={CX} cy={CY} r={40} fill="url(#radar-hg)" />
              <text x={CX} y={CY + 6} textAnchor="middle" className="radar-hub-label">
                Ezana
              </text>

              {/* Dimension labels (interactive) */}
              {DIMS.map((d, i) => {
                const pos = labelPos(i);
                const isActive = activeDim === i;
                return (
                  <text
                    key={`label-${i}`}
                    x={pos.x}
                    y={pos.y}
                    textAnchor={pos.anchor}
                    className={cn('radar-ax-name', isActive && 'radar-ax-name--active')}
                    onMouseEnter={() => setHoveredDim(i)}
                    onMouseLeave={() => setHoveredDim(null)}
                    style={{ cursor: 'pointer' }}
                    role="button"
                    tabIndex={0}
                    aria-expanded={isActive}
                    onFocus={() => setHoveredDim(i)}
                    onBlur={() => setHoveredDim(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePin(i);
                    }}
                  >
                    {d.nm}
                  </text>
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

          {/* WiFi arcs + Personalized Intelligence Dashboard pill */}
          <div className="flex flex-col items-center -mt-2">
            <div className="flex flex-col items-center" aria-hidden>
              <svg width="140" height="70" viewBox="0 0 140 70" className="overflow-visible">
                <motion.path
                  d="M 56 28 Q 70 14 84 28"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="5"
                  strokeLinecap="round"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.path
                  d="M 39 45 Q 70 11 101 45"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="5"
                  strokeLinecap="round"
                  animate={{ opacity: [0.7, 0.25, 0.7] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
                />
                <motion.path
                  d="M 22 62 Q 70 8 118 62"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="5"
                  strokeLinecap="round"
                  animate={{ opacity: [0.5, 0.15, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                />
              </svg>
            </div>

            <div className="relative mt-2">
              <motion.div
                className="absolute -inset-1 rounded-xl blur-md"
                style={{
                  background:
                    'linear-gradient(90deg, rgba(16,185,129,0.13), rgba(16,185,129,0.22), rgba(16,185,129,0.13))',
                }}
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              />
              <div
                className="relative flex items-center gap-2.5 px-6 py-3.5 rounded-xl border bg-[#0a0f0a]/95 backdrop-blur-sm"
                style={{
                  borderColor: 'rgba(16,185,129,0.31)',
                  boxShadow: '0 0 30px rgba(16,185,129,0.13), inset 0 1px 0 rgba(16,185,129,0.1)',
                }}
              >
                <User className="size-4 text-emerald-400" />
                <span className="text-emerald-100 font-medium text-sm">
                  Personalized Intelligence Dashboard
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MotionConfig>
  );
}

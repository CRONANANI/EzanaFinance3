'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import { EzanaNavLogo } from '@/components/brand/EzanaNavLogo';
import { cn } from '@/lib/utils';
import './personalization-radar.css';

const CX = 560,
  CY = 360,
  RMIN = 84,
  RMAX = 300;
const N = 7;
const BASE_WEIGHTS = [0.55, 0.5, 0.52, 0.5, 0.48, 0.5, 0.46];

const DIMS = [
  { id: 'capitol', nm: 'Capitol Watch', w: 0.94 },
  { id: 'titans', nm: 'Titans Shadow', w: 0.62 },
  { id: 'eyes', nm: 'Eyes Above', w: 0.8 },
  { id: 'lighthouse', nm: 'Global Empire Lighthouse', w: 0.46 },
  { id: 'whispers', nm: 'Consumer Whispers', w: 0.38 },
  { id: 'hive', nm: 'The Hive', w: 0.72 },
  { id: 'regulatory', nm: 'Regulatory Winds', w: 0.34 },
];

function ang(i) {
  return ((-90 + (i * 360) / N) * Math.PI) / 180;
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function basePoints() {
  return BASE_WEIGHTS.map((b, i) => {
    const r = RMIN + b * (RMAX - RMIN);
    const a = ang(i);
    return `${(CX + r * Math.cos(a)).toFixed(1)},${(CY + r * Math.sin(a)).toFixed(1)}`;
  }).join(' ');
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
          className="w-full min-w-0 rounded-xl border p-3 sm:p-4"
          style={{
            background: 'rgba(10, 15, 10, 0.98)',
            borderColor: `${accentColor}40`,
            boxShadow: `0 8px 28px -8px rgba(0,0,0,0.5), 0 0 0 1px ${accentColor}10`,
          }}
        >
          {detail.tagline && (
            <p className="mb-2 text-center text-[11px] leading-snug text-emerald-200/85">
              {detail.tagline}
            </p>
          )}
          <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wide text-emerald-400/80">
            Powered by
          </p>
          <ul className="max-h-48 space-y-3 overflow-y-auto pr-1">
            {detail.sources?.map((src) => (
              <li key={src.name} className="text-center">
                <div className="text-xs font-semibold text-white">{src.name}</div>
                <div className="mt-0.5 text-[11px] leading-snug text-emerald-100/75">
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
  const [hoveredDim, setHoveredDim] = useState(null);
  const polyYouRef = useRef(null);
  const blipRefs = useRef([]);
  const pulseRefs = useRef([]);
  const stateRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const states = DIMS.map((d) => ({
      a: ang(DIMS.indexOf(d)),
      cur: d.w,
      start: d.w,
      target: d.w,
      t0: 0,
      dur: 1,
    }));
    stateRef.current = states;

    function repick(s, now) {
      s.start = s.cur;
      s.target = 0.16 + Math.random() * 0.82;
      s.dur = 1100 + Math.random() * 2400;
      s.t0 = now;
    }

    function render(now) {
      const pts = [];
      for (let i = 0; i < states.length; i++) {
        const s = states[i];
        let p = (now - s.t0) / s.dur;
        if (p >= 1) {
          p = 1;
          if (!reduce) repick(s, now);
        }
        const w = s.start + (s.target - s.start) * easeInOut(Math.max(0, Math.min(p, 1)));
        s.cur = w;
        const r = RMIN + w * (RMAX - RMIN);
        const x = CX + r * Math.cos(s.a);
        const y = CY + r * Math.sin(s.a);
        const blip = blipRefs.current[i];
        const pulse = pulseRefs.current[i];
        if (blip) {
          blip.setAttribute('cx', x.toFixed(1));
          blip.setAttribute('cy', y.toFixed(1));
        }
        if (pulse) {
          pulse.setAttribute('cx', x.toFixed(1));
          pulse.setAttribute('cy', y.toFixed(1));
        }
        pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      }
      if (polyYouRef.current) polyYouRef.current.setAttribute('points', pts.join(' '));
    }

    if (reduce) {
      render(0);
    } else {
      const t0 = performance.now();
      states.forEach((s) => repick(s, t0));
      function loop(now) {
        render(now);
        rafRef.current = requestAnimationFrame(loop);
      }
      rafRef.current = requestAnimationFrame(loop);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const hoveredDetail = hoveredDim !== null ? sourceDetails?.[DIMS[hoveredDim].id] : null;
  const popupPos =
    hoveredDim !== null
      ? (() => {
          const a = ang(hoveredDim);
          const lr = RMAX + 30;
          const px = ((CX + lr * Math.cos(a)) / 1120) * 100;
          const py = ((CY + lr * Math.sin(a)) / 760) * 100;
          const cosA = Math.cos(a);
          let translateX = '-50%';
          if (cosA > 0.25) translateX = '0%';
          else if (cosA < -0.25) translateX = '-100%';
          return { left: `${px}%`, top: `${py}%`, transform: `translate(${translateX}, 8px)` };
        })()
      : null;

  return (
    <div className="w-full">
      {/* Mobile layout */}
      <div className="w-full max-w-md min-w-0 mx-auto lg:hidden">
        <MobileRadarFlow dims={DIMS} sourceDetails={sourceDetails} accentColor={accentColor} />
      </div>

      {/* Desktop radar */}
      <div className="hidden lg:block">
        <div className="relative w-full max-w-[1100px] mx-auto">
          <svg
            viewBox="0 0 1120 760"
            role="img"
            aria-label="Weighted radar chart of seven intelligence dimensions"
            className="block w-full h-auto overflow-visible"
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
            <circle
              cx={CX}
              cy={CY}
              r={100}
              fill="none"
              stroke="rgba(255,255,255,.07)"
              strokeWidth="1"
            />
            <circle
              cx={CX}
              cy={CY}
              r={200}
              fill="none"
              stroke="rgba(255,255,255,.07)"
              strokeWidth="1"
            />
            <circle
              cx={CX}
              cy={CY}
              r={300}
              fill="none"
              stroke="rgba(255,255,255,.07)"
              strokeWidth="1"
            />

            {/* Crosshair */}
            <line
              x1={260}
              y1={CY}
              x2={860}
              y2={CY}
              stroke="rgba(255,255,255,.07)"
              strokeWidth="1"
              opacity="0.35"
            />
            <line
              x1={CX}
              y1={60}
              x2={CX}
              y2={660}
              stroke="rgba(255,255,255,.07)"
              strokeWidth="1"
              opacity="0.35"
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
                  stroke="rgba(255,255,255,.07)"
                  strokeWidth="1"
                  opacity="0.4"
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

            {/* Base polygon (average user) */}
            <polygon
              points={basePoints()}
              fill="rgba(255,255,255,.04)"
              stroke="#6b7280"
              strokeWidth="1"
              strokeDasharray="3 5"
              opacity="0.5"
            />

            {/* Live polygon */}
            <polygon
              ref={polyYouRef}
              points=""
              fill="rgba(16,185,129,.13)"
              stroke="rgba(16,185,129,.34)"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />

            {/* Blips + pulse rings */}
            {DIMS.map((d, i) => {
              const a = ang(i);
              const r = RMIN + d.w * (RMAX - RMIN);
              const ix = CX + r * Math.cos(a);
              const iy = CY + r * Math.sin(a);
              return (
                <g key={`blip-${i}`}>
                  <circle
                    ref={(el) => {
                      blipRefs.current[i] = el;
                    }}
                    cx={ix}
                    cy={iy}
                    r="4.5"
                    fill="#10b981"
                  />
                  <circle
                    ref={(el) => {
                      pulseRefs.current[i] = el;
                    }}
                    cx={ix}
                    cy={iy}
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
              r={48}
              fill="none"
              stroke="#10b981"
              strokeWidth="1.4"
              className="radar-hub-ring"
            />
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
              const isHovered = hoveredDim === i;
              return (
                <text
                  key={`label-${i}`}
                  x={pos.x}
                  y={pos.y}
                  textAnchor={pos.anchor}
                  className={cn('radar-ax-name', isHovered && 'radar-ax-name--active')}
                  onMouseEnter={() => setHoveredDim(i)}
                  onMouseLeave={() => setHoveredDim(null)}
                  style={{ cursor: 'help' }}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isHovered}
                  onFocus={() => setHoveredDim(i)}
                  onBlur={() => setHoveredDim(null)}
                >
                  {d.nm}
                </text>
              );
            })}
          </svg>

          {/* Hover popup card */}
          {hoveredDim !== null && hoveredDetail && popupPos && (
            <div
              className="absolute z-50 rounded-xl border p-4 w-[280px] sm:w-[300px]"
              style={{
                ...popupPos,
                background: 'rgba(10, 15, 10, 0.98)',
                borderColor: 'rgba(16,185,129,0.4)',
                boxShadow: '0 12px 32px -8px rgba(0,0,0,0.6), 0 0 0 1px rgba(16,185,129,0.1)',
                backdropFilter: 'blur(8px)',
                pointerEvents: 'none',
              }}
              role="tooltip"
            >
              {hoveredDetail.tagline && (
                <div className="mb-3 text-center text-[11px] leading-snug text-emerald-200/80">
                  {hoveredDetail.tagline}
                </div>
              )}
              <div className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wide text-emerald-400/80">
                Powered by
              </div>
              <ul className="space-y-3">
                {hoveredDetail.sources?.map((src) => (
                  <li key={src.name} className="text-center">
                    <div className="text-xs font-semibold text-white">{src.name}</div>
                    <div className="mt-0.5 text-[11px] leading-snug text-emerald-100/70">
                      {src.description}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-5 mt-3.5">
          <span className="flex items-center gap-1.5 font-mono text-[10.5px] text-[#8b949e]">
            <span
              className="inline-block w-3.5 h-2 rounded-sm"
              style={{ background: 'rgba(16,185,129,.5)', border: '1px solid #10b981' }}
            />
            Your weighting
          </span>
          <span className="flex items-center gap-1.5 font-mono text-[10.5px] text-[#8b949e]">
            <span
              className="inline-block w-3.5 h-2 rounded-sm"
              style={{ background: 'transparent', border: '1px dashed #6b7280' }}
            />
            Average user
          </span>
        </div>

        {/* WiFi arcs + Personalized Intelligence Dashboard pill */}
        <div className="flex flex-col items-center mt-1">
          <div className="text-emerald-500 mb-3.5">
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
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

          <div className="relative mt-3.5">
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
  );
}

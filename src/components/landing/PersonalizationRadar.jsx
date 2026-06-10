'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createRadarScene, ang, CX, CY, RMAX, VB_W, VB_H } from './radar-engine';
import './personalization-radar.css';

/* Label metadata only — the animated drawing (geometry, tweens, pulses) lives
   in radar-engine.js so it can be shared by the render worker and the
   main-thread fallback. Order MUST match DIM_WEIGHTS in radar-engine.js. */
const DIMS = [
  { id: 'capitol', nm: 'Capitol Watch' },
  { id: 'titans', nm: 'Titans Shadow' },
  { id: 'eyes', nm: 'Eyes Above' },
  { id: 'lighthouse', nm: 'Global Empire Lighthouse' },
  { id: 'whispers', nm: 'Consumer Whispers' },
  { id: 'hive', nm: 'The Hive' },
  { id: 'regulatory', nm: 'Regulatory Winds' },
];

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

/* ---------------------------------------------------------------------------
   Renderer wiring.

   The radar's animated layer (sweeps, polygons, dots, pulse rings, hub) is
   drawn to a <canvas> by the shared engine in radar-engine.js. The landing
   page also runs a full-screen WebGL aurora shader and a ~700-dot 3D globe,
   so a main-thread render loop here gets starved of frames and the dots go
   jerky. To make the motion smooth REGARDLESS of page load, the canvas is
   handed to a Web Worker via OffscreenCanvas: the loop then runs on the
   worker thread, which the main thread cannot starve. Where OffscreenCanvas
   isn't supported we fall back to a main-thread loop (still correct, just
   subject to contention — which the off-screen pausing of the hero loops
   mitigates separately).

   Interactive parts (dimension labels, hover popups, hub label) stay in the
   DOM, positioned over the canvas with the same coordinate math.
--------------------------------------------------------------------------- */

const FALLBACK_FRAME_BUDGET_MS = 64;

/** Worker-backed renderer: OffscreenCanvas animated on the worker thread. */
function startWorkerRenderer(canvas, wrap, reduce) {
  // Create the worker BEFORE transferring the canvas. If worker construction
  // fails, the canvas is still intact and the caller can fall back to the
  // main-thread renderer (a transferred canvas can no longer get a 2D
  // context, so the order matters).
  let worker;
  try {
    worker = new Worker(new URL('./radar.worker.js', import.meta.url));
  } catch {
    return null;
  }

  let offscreen;
  try {
    offscreen = canvas.transferControlToOffscreen();
  } catch {
    worker.terminate();
    return null; // transfer unsupported — caller falls back (canvas untouched)
  }

  const dpr = () => window.devicePixelRatio || 1;
  worker.postMessage(
    { type: 'init', canvas: offscreen, cssWidth: wrap.clientWidth, dpr: dpr(), reduce },
    [offscreen],
  );

  const ro = new ResizeObserver(() => {
    worker.postMessage({ type: 'resize', cssWidth: wrap.clientWidth, dpr: dpr() });
  });
  ro.observe(wrap);

  let observer = null;
  if (!reduce && typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(
      (entries) => {
        worker.postMessage({ type: 'running', running: entries.some((e) => e.isIntersecting) });
      },
      { rootMargin: '100px' },
    );
    observer.observe(wrap);
  }

  return () => {
    if (observer) observer.disconnect();
    ro.disconnect();
    worker.terminate();
  };
}

/** Main-thread fallback: same engine, driven by rAF on this thread. */
function startMainThreadRenderer(canvas, wrap, reduce) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return undefined;

  const scene = createRadarScene({ reduce });
  let scale = 1;
  let rafId = null;

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(wrap.clientWidth * ratio));
    const h = Math.max(1, Math.round((w * VB_H) / VB_W));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    scale = w / VB_W;
  }

  resize();
  scene.init(0);

  if (reduce) {
    scene.draw(ctx, 0, scale);
    const roStatic = new ResizeObserver(() => {
      resize();
      scene.draw(ctx, 0, scale);
    });
    roStatic.observe(wrap);
    return () => roStatic.disconnect();
  }

  let clock = 0;
  let lastTs = null;
  let running = false;

  function loop(ts) {
    if (lastTs !== null) clock += Math.min(ts - lastTs, FALLBACK_FRAME_BUDGET_MS);
    lastTs = ts;
    scene.draw(ctx, clock, scale);
    rafId = requestAnimationFrame(loop);
  }
  function start() {
    if (running) return;
    running = true;
    lastTs = null;
    rafId = requestAnimationFrame(loop);
  }
  function stop() {
    if (!running) return;
    running = false;
    if (rafId) cancelAnimationFrame(rafId);
  }

  const ro = new ResizeObserver(() => {
    resize();
    if (!running) scene.draw(ctx, clock, scale);
  });
  ro.observe(wrap);

  let observer = null;
  if (typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) start();
        else stop();
      },
      { rootMargin: '100px' },
    );
    observer.observe(wrap);
  } else {
    start();
  }

  return () => {
    if (observer) observer.disconnect();
    ro.disconnect();
    stop();
  };
}

export default function PersonalizationRadar({ sourceDetails }) {
  const accentColor = '#10b981';
  const [hoveredDim, setHoveredDim] = useState(null);
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // Prefer the worker (off the main thread → immune to page contention).
    const supportsOffscreen =
      typeof Worker !== 'undefined' && typeof canvas.transferControlToOffscreen === 'function';

    if (supportsOffscreen) {
      const dispose = startWorkerRenderer(canvas, wrap, reduce);
      if (dispose) return dispose;
      // Transfer failed (e.g. context already obtained) — fall through.
    }

    return startMainThreadRenderer(canvas, wrap, reduce);
  }, []);

  const hoveredDetail = hoveredDim !== null ? sourceDetails?.[DIMS[hoveredDim].id] : null;
  const popupPos =
    hoveredDim !== null
      ? (() => {
          const a = ang(hoveredDim);
          const lr = RMAX + 30;
          const px = ((CX + lr * Math.cos(a)) / VB_W) * 100;
          const py = ((CY + lr * Math.sin(a)) / VB_H) * 100;
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
        {/* Legend */}
        <div className="flex justify-center gap-5 mb-4">
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

        <div ref={wrapRef} className="relative w-full max-w-[1100px] mx-auto">
          <canvas
            ref={canvasRef}
            width={VB_W}
            height={VB_H}
            role="img"
            aria-label="Weighted radar chart of seven intelligence dimensions"
            className="block w-full h-auto"
          />

          {/* Hub label */}
          <div
            className="radar-hub-label"
            style={{ left: `${(CX / VB_W) * 100}%`, top: `${(CY / VB_H) * 100}%` }}
            aria-hidden
          >
            Ezana
          </div>

          {/* Dimension labels (interactive) */}
          {DIMS.map((d, i) => {
            const pos = labelPos(i);
            const isHovered = hoveredDim === i;
            const translateX =
              pos.anchor === 'middle' ? '-50%' : pos.anchor === 'start' ? '0%' : '-100%';
            return (
              <button
                key={`label-${i}`}
                type="button"
                className={cn('radar-ax-name', isHovered && 'radar-ax-name--active')}
                style={{
                  left: `${(pos.x / VB_W) * 100}%`,
                  top: `${(pos.y / VB_H) * 100}%`,
                  transform: `translate(${translateX}, -50%)`,
                }}
                onMouseEnter={() => setHoveredDim(i)}
                onMouseLeave={() => setHoveredDim(null)}
                onFocus={() => setHoveredDim(i)}
                onBlur={() => setHoveredDim(null)}
                aria-expanded={isHovered}
              >
                {d.nm}
              </button>
            );
          })}

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
  );
}

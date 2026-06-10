'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';
import './personalization-radar.css';

const VB_W = 1120,
  VB_H = 760;
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
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
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

/* Pulse-ring timing (2.6s loop, expand+fade over the first 70%, hidden for
   the rest), staggered 0.34s per dot. */
const PULSE_PERIOD_MS = 2600;
const PULSE_STAGGER_MS = 340;
const PULSE_VISIBLE_FRACTION = 0.7;
const PULSE_MAX_SCALE = 3.2;
const PULSE_BASE_R = 5;
const PULSE_BASE_SW = 1.4;

/* Hub ring breathing (was the radar-hub-pulse CSS keyframes). */
const HUB_PERIOD_MS = 3400;

/* Cap the per-frame time step. When the browser drops frames (heavy page,
   tab switch, scroll jank) the radar slows down for that instant instead of
   teleporting dots to where they "should" be — a skipped frame can never
   read as a jump. */
const MAX_FRAME_MS = 64;

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
   Canvas renderer.

   The radar's animated layer (sweeps, polygons, dots, pulse rings, hub) is
   drawn to a <canvas> in a single pass per frame. Earlier versions animated
   these as SVG elements — first with CSS compositor animations (which drift
   out of sync with JS-driven attribute writes and flicker), then with pure
   attribute writes (which force per-frame SVG style/layout/repaint work that
   drops frames and reads as jerky dots). Canvas sidesteps both failure
   modes: no DOM mutation, no style recalc, no SVG layout — just one cheap,
   atomic raster per frame, so the dots, edges, and rings always move
   together and always smoothly.

   Interactive parts (dimension labels, hover popups, hub label) stay in the
   DOM, positioned over the canvas with the same coordinate math.
--------------------------------------------------------------------------- */

function drawWedge(ctx, endX, endY, gradient, lineColor, lineWidth, lineAlpha) {
  const endAngle = Math.atan2(endY, endX);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -RMAX);
  ctx.arc(0, 0, RMAX, -Math.PI / 2, endAngle, false);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -RMAX);
  ctx.globalAlpha = lineAlpha;
  ctx.strokeStyle = lineColor;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

export default function PersonalizationRadar({ sourceDetails }) {
  const accentColor = '#10b981';
  const [hoveredDim, setHoveredDim] = useState(null);
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const states = DIMS.map((d, i) => ({
      a: ang(i),
      cur: d.w,
      start: d.w,
      target: d.w,
      t0: 0,
      dur: 1,
    }));

    function repick(s, now) {
      s.start = s.cur;
      s.target = 0.16 + Math.random() * 0.82;
      s.dur = 2800 + Math.random() * 3200;
      s.t0 = now;
    }

    const basePts = BASE_WEIGHTS.map((b, i) => {
      const r = RMIN + b * (RMAX - RMIN);
      const a = ang(i);
      return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
    });

    /* Gradients are defined in the wedges' local (unrotated) coordinate
       space and the hub's fixed position, so they are created once. They
       replicate the old SVG objectBoundingBox gradients. */
    const sweepGrad1 = ctx.createLinearGradient(0, -RMAX, 228, -RMAX + 0.4 * RMAX);
    sweepGrad1.addColorStop(0, 'rgba(16,185,129,0.26)');
    sweepGrad1.addColorStop(1, 'rgba(16,185,129,0)');
    const sweepGrad2 = ctx.createLinearGradient(0, -RMAX, 160, -RMAX + 0.4 * RMAX);
    sweepGrad2.addColorStop(0, 'rgba(52,211,153,0.18)');
    sweepGrad2.addColorStop(1, 'rgba(16,185,129,0)');
    const hubGrad = ctx.createRadialGradient(CX, CY - 6.4, 0, CX, CY - 6.4, 48);
    hubGrad.addColorStop(0, 'rgba(16,185,129,0.24)');
    hubGrad.addColorStop(1, 'rgba(16,185,129,0)');

    let scale = 1;
    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.round(wrap.clientWidth * dpr));
      const h = Math.max(1, Math.round((w * VB_H) / VB_W));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      scale = w / VB_W;
    }

    function render(clock) {
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, VB_W, VB_H);

      /* Grid rings */
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.lineWidth = 1;
      for (const r of [100, 200, 300]) {
        ctx.beginPath();
        ctx.arc(CX, CY, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      /* Crosshair */
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      ctx.moveTo(260, CY);
      ctx.lineTo(860, CY);
      ctx.moveTo(CX, 60);
      ctx.lineTo(CX, 660);
      ctx.stroke();

      /* Axis spokes */
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const a = ang(i);
        ctx.moveTo(CX, CY);
        ctx.lineTo(CX + RMAX * Math.cos(a), CY + RMAX * Math.sin(a));
      }
      ctx.stroke();
      ctx.globalAlpha = 1;

      /* Sweep wedges */
      const a1 = reduce ? 0 : (clock / 11000) * Math.PI * 2;
      const a2 = reduce ? 0 : -(clock / 15000) * Math.PI * 2;
      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(a1);
      drawWedge(ctx, 228, -202, sweepGrad1, '#10b981', 1.6, 0.6);
      ctx.restore();
      ctx.save();
      ctx.translate(CX, CY);
      ctx.rotate(a2);
      drawWedge(ctx, 160, -250, sweepGrad2, '#34d399', 1.2, 0.45);
      ctx.restore();

      /* Base polygon (average user) */
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      basePts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fill();
      ctx.setLineDash([3, 5]);
      ctx.strokeStyle = '#6b7280';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;

      /* Live polygon + vertex positions */
      const pts = [];
      for (let i = 0; i < states.length; i++) {
        const s = states[i];
        let p = (clock - s.t0) / s.dur;
        if (p >= 1) {
          p = 1;
          if (!reduce) repick(s, clock);
        }
        const w = s.start + (s.target - s.start) * easeInOut(Math.max(0, Math.min(p, 1)));
        s.cur = w;
        const r = RMIN + w * (RMAX - RMIN);
        pts.push([CX + r * Math.cos(s.a), CY + r * Math.sin(s.a)]);
      }

      ctx.beginPath();
      pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = 'rgba(16,185,129,0.13)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(16,185,129,0.34)';
      ctx.lineWidth = 1.3;
      ctx.lineJoin = 'round';
      ctx.stroke();

      /* Blips + pulse rings */
      for (let i = 0; i < pts.length; i++) {
        const [x, y] = pts[i];
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#10b981';
        ctx.fill();

        if (!reduce) {
          const phase = ((clock + i * PULSE_STAGGER_MS) / PULSE_PERIOD_MS) % 1;
          if (phase < PULSE_VISIBLE_FRACTION) {
            const k = easeOutCubic(phase / PULSE_VISIBLE_FRACTION);
            const ringScale = 1 + (PULSE_MAX_SCALE - 1) * k;
            ctx.beginPath();
            ctx.arc(x, y, PULSE_BASE_R * ringScale, 0, Math.PI * 2);
            ctx.globalAlpha = 0.85 * (1 - k);
            ctx.strokeStyle = '#10b981';
            ctx.lineWidth = PULSE_BASE_SW * ringScale;
            ctx.stroke();
            ctx.globalAlpha = 1;
          }
        }
      }

      /* Hub — breathing outer ring, dark disc, soft glow */
      const hubT = reduce
        ? 0
        : 0.5 - 0.5 * Math.cos(((clock % HUB_PERIOD_MS) / HUB_PERIOD_MS) * Math.PI * 2);
      ctx.beginPath();
      ctx.arc(CX, CY, 48 * (0.835 + 0.235 * hubT), 0, Math.PI * 2);
      ctx.globalAlpha = 0.7 + 0.2 * hubT;
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.beginPath();
      ctx.arc(CX, CY, 40, 0, Math.PI * 2);
      ctx.fillStyle = '#0a0f15';
      ctx.fill();
      ctx.strokeStyle = 'rgba(16,185,129,0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(CX, CY, 40, 0, Math.PI * 2);
      ctx.fillStyle = hubGrad;
      ctx.fill();
    }

    resize();

    if (reduce) {
      render(0);
      const ro = new ResizeObserver(() => {
        resize();
        render(0);
      });
      ro.observe(wrap);
      return () => ro.disconnect();
    }

    states.forEach((s) => repick(s, 0));

    /* Monotonic animation clock: advances by the real frame delta, capped at
       MAX_FRAME_MS, and simply stops while paused. Resuming (scroll back into
       view, returning to the tab) continues from the exact pose it stopped
       at — there is no absolute-time math that could snap dots forward. */
    let clock = 0;
    let lastTs = null;
    let running = false;

    function loop(ts) {
      if (lastTs !== null) clock += Math.min(ts - lastTs, MAX_FRAME_MS);
      lastTs = ts;
      render(clock);
      rafRef.current = requestAnimationFrame(loop);
    }
    function start() {
      if (running) return;
      running = true;
      lastTs = null;
      rafRef.current = requestAnimationFrame(loop);
    }
    function stop() {
      if (!running) return;
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }

    const ro = new ResizeObserver(() => {
      resize();
      if (!running) render(clock);
    });
    ro.observe(wrap);

    /* Only animate while on screen (the canvas is display:none on mobile and
       this also stops the loop entirely there). */
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

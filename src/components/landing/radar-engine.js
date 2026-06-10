/**
 * Pure drawing/animation engine for the Personalization Radar.
 *
 * This module is intentionally framework- and DOM-free: it references no
 * `window`, `document`, React, or browser globals beyond `Math`. That is what
 * lets the SAME code drive the radar from inside a Web Worker (via
 * OffscreenCanvas) and, as a fallback, from the main thread. Keeping the two
 * paths on one engine guarantees they stay pixel-identical.
 *
 * All geometry is authored in a fixed 1120×760 "viewBox" space; the caller
 * passes a `scale` so the same coordinates map onto any backing-store size.
 */

export const VB_W = 1120;
export const VB_H = 760;
export const CX = 560;
export const CY = 360;
export const RMIN = 84;
export const RMAX = 300;
export const N = 7;

/** Average-user reference polygon (the dashed shape). */
const BASE_WEIGHTS = [0.55, 0.5, 0.52, 0.5, 0.48, 0.5, 0.46];

/** Per-dimension starting weights — order must match the component's DIMS. */
const DIM_WEIGHTS = [0.94, 0.62, 0.8, 0.46, 0.38, 0.72, 0.34];

export function ang(i) {
  return ((-90 + (i * 360) / N) * Math.PI) / 180;
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

/* Pulse-ring timing (2.6s loop, expand+fade over the first 70%, hidden for
   the rest), staggered 0.34s per dot. */
const PULSE_PERIOD_MS = 2600;
const PULSE_STAGGER_MS = 340;
const PULSE_VISIBLE_FRACTION = 0.7;
const PULSE_MAX_SCALE = 3.2;
const PULSE_BASE_R = 5;
const PULSE_BASE_SW = 1.4;

/** Hub-ring breathing period. */
const HUB_PERIOD_MS = 3400;

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

/**
 * Create a radar "scene": it owns the per-dimension tween state and exposes a
 * single `draw(ctx, clock, scale)` that paints one internally-consistent frame
 * at animation time `clock` (ms). The caller owns the frame loop and clock, so
 * the same scene works under a worker rAF, a worker setTimeout, or a
 * main-thread rAF.
 *
 * @param {{ reduce?: boolean }} [opts] reduce — honour prefers-reduced-motion
 *   (no motion: tweens, sweeps, pulses and hub breathing are frozen).
 */
export function createRadarScene({ reduce = false } = {}) {
  /* Vertex motion = layered sine drift (seeded once per scene).
     Each dimension's weight is the sum of two slow sine waves, which has
     continuous velocity everywhere — so a vertex physically cannot snap,
     stutter or reverse sharply. This replaces the previous random
     "target-hopping" tween, whose direction change at every reached target
     produced the jerky/random movement. Random per-dimension frequencies and
     phases keep the seven points out of sync so the shape constantly reforms. */
  const states = DIM_WEIGHTS.map((w, i) => ({
    a: ang(i),
    base: w, // seed/home weight (0..1)
    f1: 0.05 + Math.random() * 0.05, // fast layer 0.05–0.10 Hz
    p1: Math.random() * Math.PI * 2,
    a1: 0.16 + Math.random() * 0.1, // amplitude 0.16–0.26
    f2: 0.011 + Math.random() * 0.013, // slow layer 0.011–0.024 Hz
    p2: Math.random() * Math.PI * 2,
    a2: 0.1 + Math.random() * 0.08, // amplitude 0.10–0.18
  }));

  function weightAt(s, t) {
    const w =
      s.base +
      s.a1 * Math.sin(2 * Math.PI * s.f1 * t + s.p1) +
      s.a2 * Math.sin(2 * Math.PI * s.f2 * t + s.p2);
    return Math.max(0.14, Math.min(0.98, w));
  }

  const basePts = BASE_WEIGHTS.map((b, i) => {
    const r = RMIN + b * (RMAX - RMIN);
    const a = ang(i);
    return [CX + r * Math.cos(a), CY + r * Math.sin(a)];
  });

  // Gradients are bound to a specific 2D context; cache and rebuild only if the
  // context identity changes (it does not in practice, but this keeps the
  // engine correct if a caller swaps contexts).
  let gradCtx = null;
  let sweepGrad1 = null;
  let sweepGrad2 = null;
  let hubGrad = null;

  function ensureGradients(ctx) {
    if (gradCtx === ctx && sweepGrad1) return;
    gradCtx = ctx;
    sweepGrad1 = ctx.createLinearGradient(0, -RMAX, 228, -RMAX + 0.4 * RMAX);
    sweepGrad1.addColorStop(0, 'rgba(16,185,129,0.26)');
    sweepGrad1.addColorStop(1, 'rgba(16,185,129,0)');
    sweepGrad2 = ctx.createLinearGradient(0, -RMAX, 160, -RMAX + 0.4 * RMAX);
    sweepGrad2.addColorStop(0, 'rgba(52,211,153,0.18)');
    sweepGrad2.addColorStop(1, 'rgba(16,185,129,0)');
    hubGrad = ctx.createRadialGradient(CX, CY - 6.4, 0, CX, CY - 6.4, 48);
    hubGrad.addColorStop(0, 'rgba(16,185,129,0.24)');
    hubGrad.addColorStop(1, 'rgba(16,185,129,0)');
  }

  /* Kept for call-site compatibility (worker + main-thread fallback both call
     it). Sine drift is fully seeded at scene creation, so there is nothing to
     prime here. */
  function init() {}

  function draw(ctx, clock, scale) {
    ensureGradients(ctx);

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

    /* Live polygon + vertex positions — layered sine drift, full precision
       (no rounding, so edges glide instead of stepping). When reduced motion
       is requested `clock` stays 0, giving a single static shape. */
    const t = clock / 1000;
    const pts = [];
    for (let i = 0; i < states.length; i++) {
      const s = states[i];
      const w = weightAt(s, t);
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

  return { init, draw };
}

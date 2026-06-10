/* eslint-disable no-restricted-globals */
/**
 * Radar render worker.
 *
 * Owns an OffscreenCanvas transferred from the main thread and runs the radar
 * animation loop on the WORKER thread. This is the whole point of the file:
 * the loop is isolated from main-thread contention (the landing page also runs
 * a WebGL aurora shader and a ~700-dot 3D globe), so the radar keeps a steady
 * frame cadence and never goes jerky no matter how busy the page is.
 *
 * Frame driver: prefer `requestAnimationFrame` when the worker exposes it
 * (Chromium does, and it is vsync-aligned), otherwise a `setTimeout` loop.
 * Either way the timer runs on the worker's own event loop, which the main
 * thread cannot starve.
 *
 * Messages in:
 *   { type: 'init', canvas, cssWidth, dpr, reduce }
 *   { type: 'resize', cssWidth, dpr }
 *   { type: 'running', running }   // pause when scrolled off-screen
 */

import { createRadarScene, VB_W, VB_H } from './radar-engine';

const FRAME_BUDGET_MS = 64; // cap dt so a hiccup slows motion instead of jumping

let canvas = null;
let ctx = null;
let scene = null;
let scale = 1;
let reduce = false;

let running = false;
let clock = 0;
let last = 0;
let timer = null;

const hasRaf = typeof requestAnimationFrame === 'function';
const schedule = hasRaf
  ? (cb) => requestAnimationFrame(cb)
  : (cb) => setTimeout(() => cb(now()), 16);
const cancel = hasRaf ? (id) => cancelAnimationFrame(id) : (id) => clearTimeout(id);

function now() {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}

function applySize(cssWidth, dpr) {
  const ratio = dpr || 1;
  const w = Math.max(1, Math.round((cssWidth || 1) * ratio));
  const h = Math.max(1, Math.round((w * VB_H) / VB_W));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  scale = w / VB_W;
}

function frame() {
  const t = now();
  clock += Math.min(t - last, FRAME_BUDGET_MS);
  last = t;
  if (scene && ctx) scene.draw(ctx, clock, scale);
  timer = schedule(frame);
}

function start() {
  if (running || reduce) return;
  running = true;
  last = now();
  timer = schedule(frame);
}

function stop() {
  if (!running) return;
  running = false;
  if (timer != null) cancel(timer);
  timer = null;
}

self.onmessage = (e) => {
  const msg = e.data || {};

  if (msg.type === 'init') {
    canvas = msg.canvas;
    reduce = !!msg.reduce;
    ctx = canvas.getContext('2d');
    scene = createRadarScene({ reduce });
    scene.init(0);
    applySize(msg.cssWidth, msg.dpr);

    if (reduce) {
      // Single static frame, no loop.
      if (ctx) scene.draw(ctx, 0, scale);
    } else {
      start();
    }
    return;
  }

  if (!canvas) return;

  if (msg.type === 'resize') {
    applySize(msg.cssWidth, msg.dpr);
    // Repaint immediately so a resize while paused isn't left blank.
    if (!running && ctx && scene) scene.draw(ctx, clock, scale);
    return;
  }

  if (msg.type === 'running') {
    if (msg.running) start();
    else stop();
    return;
  }
};

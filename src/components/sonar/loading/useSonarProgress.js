'use client';

/**
 * Drives the Sonar loading state: the clock, each dimension's status, the
 * focused dimension, the ticker phrase and the completion hand-off.
 *
 * Honest progress: a ping is one request with no per-dimension events, so
 * the statuses advance on a schedule paced by the ping's own estimate (the
 * same estimate the deep research card shows) and stop at Synthesizing. A
 * dimension shows Complete only when the answer has actually arrived
 * (`isComplete`), or when real `events` report it.
 *
 * Phases: 'running' -> (isComplete) 'completing' (dimensions flip to
 * Complete 80 ms apart, the core flares) -> 'exiting' (fade and scale) ->
 * 'done' (the caller shows the result). `dismissed` (the ping settled
 * without a brief) skips straight to a quiet fade, never "ready".
 */
import { useEffect, useRef, useState } from 'react';
import { DIMENSIONS, STATUSES, FOCUS_ORDER, TICKER_PHRASES } from './dimensions';

const TICK_MS = 250;
const FOCUS_MS = 2000;
const PHRASE_MS = 3200;
export const COMPLETE_STAGGER_MS = 80;
export const COMPLETE_HOLD_MS = 900;
export const EXIT_MS = 500;

/* Simulated pacing, designed around a 24 second answer and scaled to the
   ping's estimate. */
const REFERENCE_SEC = 24;
const OFFSETS = [0, 700, 1400, 350, 1050, 1750, 500];
const TAUS = [9000, 10500, 12000, 9800, 11200, 12600, 10200];
const SIM_CAP = 0.92;

export function statusFromProgress(p) {
  if (p < 0.22) return 'scanning';
  if (p < 0.48) return 'linking';
  if (p < 0.74) return 'cross-checking';
  return 'synthesizing';
}

/** How much slower (above 1) or faster than the reference this ping should pace. */
export function paceFor(estimate) {
  const max = Number(estimate?.maxSec);
  if (!Number.isFinite(max) || max <= 0) return 1;
  return Math.min(3, Math.max(0.4, max / REFERENCE_SEC));
}

export function simulatedStage(t, pace = 1) {
  const s = t / pace;
  if (s < 6000) return 0;
  if (s < 14000) return 1;
  if (s < 24000) return 2;
  return 3;
}

/**
 * Pure: the view at time `t` (ms since start), for tests and the hook.
 * `sinceComplete` is ms since the answer arrived, or -1.
 */
export function progressAt(t, { sinceComplete = -1, events = null, pace = 1 } = {}) {
  const dimensions = DIMENSIONS.map((dim, i) => {
    let status;
    let progress;
    const reported = events?.dimensions?.[dim.key];
    if (reported && STATUSES.includes(reported)) {
      status = reported;
      progress = (STATUSES.indexOf(reported) + 1) / STATUSES.length;
    } else {
      const local = Math.max(0, t - OFFSETS[i] * pace);
      progress = SIM_CAP * (1 - Math.exp(-local / (TAUS[i] * pace)));
      status = statusFromProgress(progress / SIM_CAP);
    }
    if (sinceComplete >= 0 && sinceComplete >= FOCUS_ORDER.indexOf(i) * COMPLETE_STAGGER_MS) {
      status = 'complete';
      progress = 1;
    }
    return { ...dim, index: i, status, progress };
  });
  const working = FOCUS_ORDER.filter((i) => dimensions[i].status !== 'complete');
  const focus = working.length === 0 ? -1 : working[Math.floor(t / FOCUS_MS) % working.length];
  const stage =
    sinceComplete >= 0
      ? 3
      : typeof events?.stage === 'number'
        ? events.stage
        : simulatedStage(t, pace);
  return {
    stage,
    focus,
    dimensions: dimensions.map((d) => ({ ...d, isFocused: d.index === focus })),
    phraseIndex: Math.floor(t / PHRASE_MS) % TICKER_PHRASES.length,
  };
}

export function phaseFor(sinceComplete, sinceDismiss = -1) {
  if (sinceDismiss >= 0) return sinceDismiss < EXIT_MS ? 'exiting' : 'done';
  if (sinceComplete < 0) return 'running';
  if (sinceComplete < COMPLETE_HOLD_MS) return 'completing';
  if (sinceComplete < COMPLETE_HOLD_MS + EXIT_MS) return 'exiting';
  return 'done';
}

export function useSonarProgress({
  isComplete = false,
  dismissed = false,
  events = null,
  estimate = null,
} = {}) {
  const startRef = useRef(null);
  const completeAtRef = useRef(null);
  const dismissAtRef = useRef(null);
  const [now, setNow] = useState(() => Date.now());

  if (startRef.current == null) startRef.current = now;
  if (isComplete && completeAtRef.current == null && dismissAtRef.current == null) {
    completeAtRef.current = Date.now();
  }
  if (dismissed && dismissAtRef.current == null && completeAtRef.current == null) {
    dismissAtRef.current = Date.now();
  }

  const sinceComplete = completeAtRef.current == null ? -1 : now - completeAtRef.current;
  const sinceDismiss = dismissAtRef.current == null ? -1 : now - dismissAtRef.current;
  const phase = phaseFor(sinceComplete, sinceDismiss);

  useEffect(() => {
    if (phase === 'done') return undefined;
    const id = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(id);
  }, [phase]);

  const t = now - startRef.current;
  return {
    elapsedMs: t,
    phase,
    completed: sinceComplete >= 0,
    ...progressAt(t, { sinceComplete, events, pace: paceFor(estimate) }),
  };
}

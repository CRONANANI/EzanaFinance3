'use client';

/**
 * Research Controls state (Sonar research workspace, Nov 13 2026): one place for the three
 * selects, shared by the right rail's card and every host that sends a research request.
 * Persisted in localStorage under `sonar_controls`; every read is sanitized, so a stale or
 * hand-edited value falls back to the defaults.
 */
import { useSyncExternalStore } from 'react';
import {
  CONTROL_DEFAULTS,
  sanitizeControls,
  isDefaultControls,
} from '@/lib/sonar/research-controls';

const KEY = 'sonar_controls';
const subs = new Set();
let current = null;

export function readControls() {
  if (current) return current;
  if (typeof window === 'undefined') return CONTROL_DEFAULTS;
  try {
    current = sanitizeControls(JSON.parse(window.localStorage.getItem(KEY) || '{}'));
  } catch {
    current = sanitizeControls({});
  }
  return current;
}

export function setControls(next) {
  current = sanitizeControls(next);
  try {
    if (isDefaultControls(current)) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, JSON.stringify(current));
  } catch {
    /* private mode: the choice still holds for this page */
  }
  subs.forEach((fn) => fn());
}

const subscribe = (fn) => {
  subs.add(fn);
  return () => subs.delete(fn);
};

/** [controls, setControls] */
export function useResearchControls() {
  const controls = useSyncExternalStore(subscribe, readControls, () => CONTROL_DEFAULTS);
  return [controls, setControls];
}

/** With non-default controls a question runs as standard research (a quick ping cannot honour them). */
export const controlsNeedResearch = () => !isDefaultControls(readControls());

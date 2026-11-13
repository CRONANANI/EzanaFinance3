'use client';

/**
 * The session thread (Sonar research workspace, Nov 13 2026): each answered question in this
 * page session (question, headline, mode, time) and what is needed to show it again from
 * memory, with no new request. In memory only (never stored), at most 12 entries.
 */
import { useSyncExternalStore } from 'react';

const MAX = 12;
const subs = new Set();
let entries = [];
const EMPTY = [];

export function addSessionEntry(entry) {
  if (!entry?.id || !entry.question) return;
  entries = [
    { ...entry, at: entry.at || Date.now() },
    ...entries.filter((e) => e.id !== entry.id),
  ].slice(0, MAX);
  subs.forEach((fn) => fn());
}

const subscribe = (fn) => {
  subs.add(fn);
  return () => subs.delete(fn);
};

export function useSessionThread() {
  return useSyncExternalStore(
    subscribe,
    () => entries,
    () => EMPTY,
  );
}

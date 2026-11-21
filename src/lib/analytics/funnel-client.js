'use client';

/**
 * Browser half of the funnel events (src/lib/analytics/funnel.js). Sends with
 * sendBeacon where possible so a navigation never waits on it. A random
 * per-browser id (localStorage) groups a visitor's steps; it identifies
 * nobody.
 */
import { CLIENT_FUNNEL_EVENTS } from './funnel';

const KEY = 'ez_funnel_id';

function anonId() {
  try {
    let id = window.localStorage.getItem(KEY);
    if (!id) {
      id = (crypto.randomUUID?.() || String(Math.random()).slice(2)).replace(/-/g, '');
      window.localStorage.setItem(KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export function trackFunnel(event, fields = {}) {
  if (typeof window === 'undefined' || !CLIENT_FUNNEL_EVENTS.has(event)) return;
  const body = JSON.stringify({ event, ...fields, anonId: anonId() });
  try {
    const blob = new Blob([body], { type: 'application/json' });
    if (navigator.sendBeacon?.('/api/funnel-event', blob)) return;
  } catch {
    /* fall through to fetch */
  }
  fetch('/api/funnel-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
    credentials: 'include',
  }).catch(() => {});
}

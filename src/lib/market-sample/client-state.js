'use client';

/**
 * Client view of the provider-data state (browser only). The only source is the server's
 * `x-ezana-data-state` response header (lib/market-sample/state.js); nothing here can be set
 * from a URL, storage or user input.
 */
import { DATA_STATE, dataStateOf } from './state';

let current = DATA_STATE.LIVE;
const listeners = new Set();
let observing = false;

export function getMarketDataState() {
  return current;
}

function set(next) {
  if (next === current) return;
  current = next;
  if (typeof document !== 'undefined') {
    if (next === DATA_STATE.SAMPLE) document.body.dataset.marketData = 'sample';
    else delete document.body.dataset.marketData;
  }
  for (const fn of listeners) fn(next);
}

export function subscribeMarketDataState(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * Watch same-origin API responses for the server's data-state header. A sample response turns
 * the page into sample mode (banner, chart and tooltip labels, labelled exports); the next live
 * response from the same kind of route turns it back.
 */
export function observeMarketDataState() {
  if (observing || typeof window === 'undefined') return;
  observing = true;
  const original = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const res = await original(...args);
    try {
      const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
      if (url.startsWith('/api/') || url.startsWith(window.location.origin)) {
        if (res.headers.has('x-ezana-data-state')) {
          const state = dataStateOf(res);
          /* unavailable leaves the page state as it is; live clears sample mode */
          if (state !== DATA_STATE.UNAVAILABLE) set(state);
        }
      }
    } catch {
      /* never break a request */
    }
    return res;
  };
}

/** Set from a server answer (the sample-status endpoint). */
export function setMarketDataStateFromServer(state) {
  set(state === DATA_STATE.SAMPLE ? DATA_STATE.SAMPLE : DATA_STATE.LIVE);
}

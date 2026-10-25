/**
 * Lightweight in-memory + sessionStorage cache for API responses.
 * Respects per-provider TTLs to stay within free-tier rate limits.
 */

import { BoundedMap } from './bounded-map.js';

/* Bounded (LRU) and single-flight: concurrent misses for one key share one
   fetch (reliability audit P2-13). */
const mem = new BoundedMap(300);
const inflight = new Map();

function storageKey(key) {
  return 'ezana_cache_' + key;
}

export const ApiCache = {
  async get(key, fetchFn, ttlSeconds) {
    const now = Date.now();

    const hit = mem.get(key);
    if (hit && now - hit.ts < ttlSeconds * 1000) {
      return hit.data;
    }

    if (typeof window !== 'undefined') {
      try {
        const raw = sessionStorage.getItem(storageKey(key));
        if (raw) {
          const parsed = JSON.parse(raw);
          if (now - parsed.ts < ttlSeconds * 1000) {
            mem.set(key, parsed);
            return parsed.data;
          }
        }
      } catch (_) {}
    }

    if (inflight.has(key)) return inflight.get(key);
    const pending = fetchFn();
    inflight.set(key, pending);
    let data;
    try {
      data = await pending;
    } finally {
      inflight.delete(key);
    }
    if (data != null) {
      const entry = { data, ts: now };
      mem.set(key, entry);
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(storageKey(key), JSON.stringify(entry));
        } catch (_) {}
      }
    }
    return data;
  },

  invalidate(key) {
    mem.delete(key);
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(storageKey(key));
      } catch (_) {}
    }
  },

  clear() {
    mem.clear();
    if (typeof window !== 'undefined') {
      try {
        Object.keys(sessionStorage)
          .filter((k) => k.startsWith('ezana_cache_'))
          .forEach((k) => sessionStorage.removeItem(k));
      } catch (_) {}
    }
  },
};

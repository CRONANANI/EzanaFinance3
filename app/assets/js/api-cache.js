/**
 * Lightweight in-memory + sessionStorage cache for API responses.
 * Respects per-provider TTLs to stay within free-tier rate limits.
 *
 * Usage:
 *   const data = await ApiCache.get('av:GLOBAL_QUOTE:AAPL', () => fetch(...).then(r => r.json()), 300);
 *   // 300 = seconds to keep cached
 */
(function (global) {
  'use strict';

  const mem = {};

  function storageKey(key) {
    return 'ezana_cache_' + key;
  }

  const ApiCache = {
    async get(key, fetchFn, ttlSeconds) {
      const now = Date.now();

      if (mem[key] && now - mem[key].ts < ttlSeconds * 1000) {
        return mem[key].data;
      }

      try {
        const raw = sessionStorage.getItem(storageKey(key));
        if (raw) {
          const parsed = JSON.parse(raw);
          if (now - parsed.ts < ttlSeconds * 1000) {
            mem[key] = parsed;
            return parsed.data;
          }
        }
      } catch (_) { /* sessionStorage may be unavailable */ }

      const data = await fetchFn();
      if (data != null) {
        const entry = { data, ts: now };
        mem[key] = entry;
        try { sessionStorage.setItem(storageKey(key), JSON.stringify(entry)); } catch (_) {}
      }
      return data;
    },

    invalidate(key) {
      delete mem[key];
      try { sessionStorage.removeItem(storageKey(key)); } catch (_) {}
    },

    clear() {
      Object.keys(mem).forEach(k => delete mem[k]);
      try {
        Object.keys(sessionStorage)
          .filter(k => k.startsWith('ezana_cache_'))
          .forEach(k => sessionStorage.removeItem(k));
      } catch (_) {}
    }
  };

  global.ApiCache = ApiCache;
})(typeof window !== 'undefined' ? window : this);

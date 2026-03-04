/**
 * Lightweight in-memory + sessionStorage cache for API responses.
 * Respects per-provider TTLs to stay within free-tier rate limits.
 */

const mem = {};

function storageKey(key) {
  return 'ezana_cache_' + key;
}

export const ApiCache = {
  async get(key, fetchFn, ttlSeconds) {
    const now = Date.now();

    if (mem[key] && now - mem[key].ts < ttlSeconds * 1000) {
      return mem[key].data;
    }

    if (typeof window !== 'undefined') {
      try {
        const raw = sessionStorage.getItem(storageKey(key));
        if (raw) {
          const parsed = JSON.parse(raw);
          if (now - parsed.ts < ttlSeconds * 1000) {
            mem[key] = parsed;
            return parsed.data;
          }
        }
      } catch (_) {}
    }

    const data = await fetchFn();
    if (data != null) {
      const entry = { data, ts: now };
      mem[key] = entry;
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(storageKey(key), JSON.stringify(entry));
        } catch (_) {}
      }
    }
    return data;
  },

  invalidate(key) {
    delete mem[key];
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem(storageKey(key));
      } catch (_) {}
    }
  },

  clear() {
    Object.keys(mem).forEach((k) => delete mem[k]);
    if (typeof window !== 'undefined') {
      try {
        Object.keys(sessionStorage)
          .filter((k) => k.startsWith('ezana_cache_'))
          .forEach((k) => sessionStorage.removeItem(k));
      } catch (_) {}
    }
  },
};

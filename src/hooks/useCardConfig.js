'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const NAMESPACE = 'ezana.empireRankings.cardConfig';

/**
 * useCardConfig — per-card localStorage-backed configuration.
 *
 * Returns `[config, update]` where `update` is a *merge* (Partial<T>) so
 * callers can write one knob at a time without clobbering the rest:
 *
 *   const [cfg, setCfg] = useCardConfig('country-ranking', { topN: 10 });
 *   setCfg({ topN: 25 });      // merges; other keys preserved
 *
 * Hydration-safe:
 *   - The initial SSR render uses the defaults exactly so markup stays
 *     stable and React doesn't emit a hydration mismatch warning.
 *   - We load persisted values on the first client-side effect and
 *     replay them via setState.
 *
 * Storage is best-effort: quota errors, private-mode exceptions, and
 * malformed JSON are all swallowed — the card still works in memory.
 */
export function useCardConfig(cardId, defaults) {
  const defaultsRef = useRef(defaults);
  const [config, setConfig] = useState(defaults);
  const [hydrated, setHydrated] = useState(false);
  const key = `${NAMESPACE}.${cardId}`;

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? window.localStorage.getItem(key) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setConfig({ ...defaultsRef.current, ...parsed });
        }
      }
    } catch {
      // ignore — fall back to defaults
    }
    setHydrated(true);
    // cardId changes shouldn't happen in practice; the key is derived from it.
  }, [key]);

  const update = useCallback(
    (next) => {
      setConfig((prev) => {
        const merged = typeof next === 'function' ? next(prev) : { ...prev, ...next };
        try {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, JSON.stringify(merged));
          }
        } catch {
          // quota / private mode — memory-only is fine
        }
        return merged;
      });
    },
    [key],
  );

  return [config, update, { hydrated }];
}

export default useCardConfig;

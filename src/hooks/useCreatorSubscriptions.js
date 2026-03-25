'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'ezana_ftq_creator_subscriptions_v1';

/** Max free creator subscriptions per account (partner/creator follows). */
export const FREE_CREATOR_SUBSCRIPTION_LIMIT = 3;

function readState() {
  if (typeof window === 'undefined') {
    return { map: {} };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { map: {} };
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.map === 'object') return parsed;
    return { map: {} };
  } catch {
    return { map: {} };
  }
}

function writeState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

/**
 * Tracks which creators the user subscribes to for quant strategy access.
 * `map[creatorId]`: "free" | "paid" — first FREE_CREATOR_SUBSCRIPTION_LIMIT unique
 * subscriptions use "free" slots; beyond that user must upgrade (mock: blocked until paid).
 *
 * Future: sync `map` + counts to Supabase `profiles` JSON column or dedicated table.
 */
export function useCreatorSubscriptions() {
  const [map, setMap] = useState({});

  useEffect(() => {
    setMap(readState().map || {});
  }, []);

  const freeUsed = useMemo(
    () => Object.values(map).filter((v) => v === 'free').length,
    [map]
  );

  const freeSlotsRemaining = Math.max(0, FREE_CREATOR_SUBSCRIPTION_LIMIT - freeUsed);

  const isSubscribedToCreator = useCallback(
    (creatorId) => !!creatorId && map[creatorId] != null,
    [map]
  );

  const subscribeToCreator = useCallback(
    (creatorId, { paid = false } = {}) => {
      if (!creatorId) return { ok: false, reason: 'invalid' };
      if (map[creatorId]) return { ok: true, already: true, kind: map[creatorId] };

      let nextKind = 'paid';
      if (!paid) {
        if (freeUsed >= FREE_CREATOR_SUBSCRIPTION_LIMIT) {
          return { ok: false, reason: 'free_exhausted' };
        }
        nextKind = 'free';
      }

      const next = { ...map, [creatorId]: nextKind };
      setMap(next);
      writeState({ map: next });
      return { ok: true, kind: nextKind };
    },
    [map, freeUsed]
  );

  const unsubscribeFromCreator = useCallback((creatorId) => {
    if (!creatorId || !map[creatorId]) return;
    const next = { ...map };
    delete next[creatorId];
    setMap(next);
    writeState({ map: next });
  }, [map]);

  return {
    subscribeToCreator,
    unsubscribeFromCreator,
    isSubscribedToCreator,
    freeSlotsRemaining,
    freeUsed,
    freeLimit: FREE_CREATOR_SUBSCRIPTION_LIMIT,
  };
}

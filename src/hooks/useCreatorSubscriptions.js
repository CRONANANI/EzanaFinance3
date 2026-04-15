'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';

const STORAGE_KEY_PREFIX = 'ezana_ftq_creator_subscriptions_v1';
const LEGACY_UNSCOPED_KEY = 'ezana_ftq_creator_subscriptions_v1';

/** Max free creator subscriptions per account (partner/creator follows). */
export const FREE_CREATOR_SUBSCRIPTION_LIMIT = 3;

function keyFor(userId) {
  if (!userId) return null;
  return `${STORAGE_KEY_PREFIX}:${userId}`;
}

function clearLegacyUnscoped() {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(LEGACY_UNSCOPED_KEY);
    if (raw) localStorage.removeItem(LEGACY_UNSCOPED_KEY);
  } catch { /* ignore */ }
}

function readState(userId) {
  if (typeof window === 'undefined') return { map: {} };
  const k = keyFor(userId);
  if (!k) return { map: {} };
  try {
    const raw = localStorage.getItem(k);
    if (!raw) return { map: {} };
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.map === 'object') return parsed;
    return { map: {} };
  } catch {
    return { map: {} };
  }
}

function writeState(userId, state) {
  const k = keyFor(userId);
  if (!k) return; // Never write without a user
  try {
    localStorage.setItem(k, JSON.stringify(state));
  } catch {
    /* ignore quota */
  }
}

/**
 * Tracks which creators the user subscribes to for quant strategy access.
 * `map[creatorId]`: "free" | "paid" — first FREE_CREATOR_SUBSCRIPTION_LIMIT unique
 * subscriptions use "free" slots; beyond that user must upgrade (mock: blocked until paid).
 *
 * Per-user localStorage key: ezana_ftq_creator_subscriptions_v1:<userId>
 * Future: sync `map` + counts to Supabase `profiles` JSON column or dedicated table.
 */
export function useCreatorSubscriptions() {
  const { user } = useAuth();
  const [map, setMap] = useState({});

  useEffect(() => {
    // One-time legacy cleanup
    clearLegacyUnscoped();

    if (!user?.id) {
      setMap({});
      return;
    }
    setMap(readState(user.id).map || {});
  }, [user?.id]);

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
      if (!user?.id) return { ok: false, reason: 'not_authenticated' };
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
      writeState(user.id, { map: next });
      return { ok: true, kind: nextKind };
    },
    [map, freeUsed, user?.id]
  );

  const unsubscribeFromCreator = useCallback((creatorId) => {
    if (!creatorId || !map[creatorId]) return;
    if (!user?.id) return;
    const next = { ...map };
    delete next[creatorId];
    setMap(next);
    writeState(user.id, { map: next });
  }, [map, user?.id]);

  return {
    subscribeToCreator,
    unsubscribeFromCreator,
    isSubscribedToCreator,
    freeSlotsRemaining,
    freeUsed,
    freeLimit: FREE_CREATOR_SUBSCRIPTION_LIMIT,
  };
}

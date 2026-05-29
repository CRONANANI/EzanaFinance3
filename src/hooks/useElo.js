'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { subscribeEloChanged } from '@/lib/elo-events';
import { getTierLabel } from '@/lib/elo-tier-colors';

/**
 * Live ELO state for a user: initial fetch + postgres realtime on user_elo.
 * @param {string | null | undefined} userId
 */
export function useElo(userId) {
  const [rating, setRating] = useState(0);
  const [tier, setTier] = useState('novice');
  const [peak, setPeak] = useState(0);
  const [loading, setLoading] = useState(true);

  const applyRow = useCallback((elo) => {
    if (!elo) return;
    setRating(elo.current_rating ?? 0);
    setTier(elo.tier || 'novice');
    setPeak(elo.peak_rating ?? 0);
  }, []);

  const refetch = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/elo/user/${userId}`);
      if (!res.ok) return;
      const data = await res.json();
      applyRow(data.elo);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [userId, applyRow]);

  useEffect(() => {
    setLoading(true);
    refetch();
  }, [refetch]);

  useEffect(() => {
    if (!userId) return undefined;

    const channel = supabase
      .channel(`user_elo:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_elo',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload?.new) applyRow(payload.new);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, applyRow]);

  useEffect(() => {
    const unsub = subscribeEloChanged(() => {
      refetch();
    });
    return unsub;
  }, [refetch]);

  return {
    rating,
    tier,
    tierLabel: getTierLabel(tier),
    peak,
    loading,
    refetch,
  };
}

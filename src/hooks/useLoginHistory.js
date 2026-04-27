'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';

/**
 * Tracks the user's login history over the last 30 days.
 * On mount: POSTs today's login (idempotent) then GETs the window.
 *
 * Returns:
 *   loginDates: Set<'YYYY-MM-DD'> — dates the user logged in
 *   streakDays: number — consecutive UTC days ending today (or from yesterday if today not recorded)
 *   isLoading: boolean
 */
export function useLoginHistory(days = 30) {
  const { user } = useAuth();
  const [loginDates, setLoginDates] = useState(() => new Set());
  const [streakDays, setStreakDays] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoginDates(new Set());
      setStreakDays(0);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        await fetch('/api/login-history', { method: 'POST', credentials: 'include' }).catch(() => {});

        const res = await fetch(`/api/login-history?days=${days}`, { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setLoginDates(new Set(data.dates || []));
        setStreakDays(data.streakDays || 0);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, days]);

  return { loginDates, streakDays, isLoading };
}

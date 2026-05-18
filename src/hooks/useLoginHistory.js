'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/AuthProvider';

/**
 * Tracks the user's login history over the last N days.
 * On mount: POSTs today's login (idempotent), then GETs the full window.
 * If POST fails (table missing, network error), GET still runs independently.
 *
 * Returns:
 *   loginDates: Set<'YYYY-MM-DD'> — dates the user logged in
 *   streakDays: number — consecutive UTC days ending today
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

        // Fire-and-forget POST — record today's login, but don't block on it
        fetch('/api/login-history', { method: 'POST', credentials: 'include' }).catch(() => {});

        // Small delay to let the POST land before we GET
        await new Promise((r) => setTimeout(r, 300));

        if (cancelled) return;

        // GET the login history — this is what actually populates the component
        const res = await fetch(`/api/login-history?days=${days}`, { credentials: 'include' });
        if (cancelled) return;

        if (!res.ok) {
          console.warn('[useLoginHistory] GET failed:', res.status);
          // Fallback: at least show today as active
          const today = new Date().toISOString().split('T')[0];
          setLoginDates(new Set([today]));
          setStreakDays(1);
          return;
        }

        const data = await res.json();
        if (cancelled) return;

        const dates = data.dates || [];
        setLoginDates(new Set(dates));
        setStreakDays(data.streakDays || 0);

        // If the API returned a fallback hint, log it for the developer
        if (data._fallback) {
          console.warn(
            '[useLoginHistory] Table missing — showing fallback. Run the migration:',
            data._hint,
          );
        }
      } catch (err) {
        if (!cancelled) {
          console.warn('[useLoginHistory] error:', err);
          // Fallback: show today as active so the card isn't dead
          const today = new Date().toISOString().split('T')[0];
          setLoginDates(new Set([today]));
          setStreakDays(1);
        }
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

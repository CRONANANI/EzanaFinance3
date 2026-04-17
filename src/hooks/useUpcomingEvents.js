'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const ENDPOINT = '/api/market-data/upcoming-events';
const REFRESH_MS = 15 * 60 * 1000; // 15 minutes, matches the edge cache TTL

/**
 * Fetches the unified "Upcoming Events & Alerts" feed (earnings, dividends,
 * IPOs, economic calendar) from the server route that aggregates FMP.
 *
 * Mirrors the SWR-style contract used elsewhere in the app:
 *   { events, errors, isLoading, error, refresh, isRateLimited }
 *
 * Refreshes every 15 minutes in the background. We intentionally do NOT
 * refresh on focus — the data is slow-changing and the card is a passive
 * at-a-glance summary, not a tape-reading surface.
 */
export function useUpcomingEvents({ country } = {}) {
  const [events, setEvents] = useState([]);
  const [errors, setErrors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const abortRef = useRef(null);

  const load = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const qs = country ? `?country=${encodeURIComponent(country)}` : '';
    try {
      const res = await fetch(`${ENDPOINT}${qs}`, {
        signal: controller.signal,
        cache: 'no-store',
      });

      if (res.status === 429) {
        // Quiet retry — the card keeps showing the last good data.
        setIsRateLimited(true);
        return;
      }
      setIsRateLimited(false);

      const data = await res.json().catch(() => ({ events: [], errors: [] }));
      if (!res.ok) {
        setError(new Error((data.errors && data.errors[0]) || `HTTP ${res.status}`));
        return;
      }

      setEvents(Array.isArray(data.events) ? data.events : []);
      setErrors(Array.isArray(data.errors) ? data.errors : []);
      setError(null);
    } catch (e) {
      if (e.name === 'AbortError') return;
      setError(e);
    } finally {
      setIsLoading(false);
    }
  }, [country]);

  useEffect(() => {
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      clearInterval(id);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [load]);

  return {
    events,
    errors,
    isLoading,
    error,
    isRateLimited,
    refresh: load,
  };
}

/** Groups events by "YYYY-MM-DD" preserving insertion (pre-sorted) order. */
export function groupEventsByDay(events) {
  const groups = {};
  for (const e of events) {
    const key = (e.fullDate || '').slice(0, 10);
    if (!key) continue;
    (groups[key] ??= []).push(e);
  }
  return groups;
}

/** "Today" / "Tomorrow" / "Mon, Apr 22" style label. */
export function formatEventDay(isoDay) {
  if (!isoDay) return '';
  const [y, m, d] = isoDay.split('-').map(Number);
  if (!y || !m || !d) return isoDay;
  const target = new Date(y, m - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return target.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Fetches the ISR feed from /api/isr/feed based on the given filters.
 * Refreshes every 60s while the tab is visible (hidden tabs skip to save
 * bandwidth and Polymarket calls). Returns a { data, isLoading, error } shape.
 * When `enabled` is false, no requests are made (empty data, not loading).
 */
export function useIsrFeed({
  countries = [],
  topic = 'All',
  minSeverity = 'Low',
  window = '24h',
  enabled = true,
} = {}) {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const countriesKey = countries.join(',');

  useEffect(() => {
    if (!enabled) {
      setData([]);
      setIsLoading(false);
      setError(null);
      return undefined;
    }

    let active = true;
    async function run() {
      try {
        setIsLoading(true);
        setError(null);
        await fetch('/api/news/massive/poll', { cache: 'no-store' });
        const params = new URLSearchParams({
          countries: countriesKey,
          topic,
          minSeverity,
          window,
        });
        const res = await fetch(`/api/isr/feed?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`ISR feed failed: ${res.status}`);
        const payload = await res.json();
        if (!active || !mountedRef.current) return;
        setData(Array.isArray(payload?.events) ? payload.events : []);
      } catch (err) {
        if (!active || !mountedRef.current) return;
        setError(err);
        setData([]);
      } finally {
        if (active && mountedRef.current) setIsLoading(false);
      }
    }

    run();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') run();
    }, 60_000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [countriesKey, topic, minSeverity, window, enabled]);

  return { data, isLoading, error };
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const REFRESH_MS = 5 * 60 * 1000; // 5 minutes

/**
 * useSectorPerformance — fetches GICS sector performance for a given range
 * (1D / 1W / 1M / YTD). Mirrors the SWR-ish shape used by useUpcomingEvents.
 */
export function useSectorPerformance(range = '1D') {
  const [sectors, setSectors] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const abortRef = useRef(null);

  const load = useCallback(
    async (signal) => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/fmp/sector-performance?range=${encodeURIComponent(range)}`,
          { signal, credentials: 'include' },
        );
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setSectors(Array.isArray(body?.sectors) ? body.sectors : []);
          setError(body?.error || `Failed to load sectors (${res.status})`);
          return;
        }
        setSectors(Array.isArray(body?.sectors) ? body.sectors : []);
        setError(body?.error || null);
      } catch (err) {
        if (err?.name === 'AbortError') return;
        setError(err?.message || 'Failed to load sectors');
        setSectors([]);
      } finally {
        setIsLoading(false);
      }
    },
    [range],
  );

  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    const ctl = new AbortController();
    abortRef.current = ctl;
    load(ctl.signal);
    const t = setInterval(() => load(ctl.signal), REFRESH_MS);
    return () => {
      clearInterval(t);
      ctl.abort();
    };
  }, [load]);

  return {
    sectors,
    isLoading,
    error,
    refresh: () => load(),
  };
}

export default useSectorPerformance;

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useSectorPerformance — fetches GICS sector performance for a given range
 * (1D / 1W / 1M / YTD). Server-side computes cumulative compounded returns
 * from FMP's sector-performance-snapshot + live v3 sector-performance feeds.
 *
 * Refresh cadence matches the underlying data:
 *   - 1D: 60s (live intraday updates once a minute)
 *   - 1W / 1M / YTD: 10 min (historical snapshots don't change intraday)
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
        const params = new URLSearchParams({ range });
        const res = await fetch(`/api/fmp/sector-performance?${params.toString()}`, {
          signal,
          credentials: 'include',
        });
        const body = await res.json().catch(() => ({}));
        const nextSectors = Array.isArray(body?.sectors) ? body.sectors : [];
        if (!res.ok) {
          // Surface the error string but still render whatever partial data
          // we got so the UI can show "last known" values rather than
          // flashing an empty grid.
          setSectors(nextSectors);
          setError(body?.error || `Failed to load sectors (${res.status})`);
          return;
        }
        setSectors(nextSectors);
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

    // Reset the sector list on range change so the grid doesn't show stale
    // 1D values while a 1W computation is in flight. The hook's `isLoading`
    // flag drives the skeleton — with stale data mixed in, users can't tell
    // which range they're actually looking at.
    setSectors([]);
    load(ctl.signal);

    const refreshMs = range === '1D' ? 60_000 : 10 * 60_000;
    const t = setInterval(() => load(ctl.signal), refreshMs);
    return () => {
      clearInterval(t);
      ctl.abort();
    };
  }, [load, range]);

  return {
    sectors,
    isLoading,
    error,
    refresh: () => load(),
  };
}

export default useSectorPerformance;

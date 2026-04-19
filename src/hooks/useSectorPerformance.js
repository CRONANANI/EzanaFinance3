'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useSectorPerformance — fetches GICS sector performance for a given range
 * (1D / 1W / 1M / YTD) from /api/fmp/sector-performance.
 *
 * Return shape:
 *   - sectors   : [{ sector, name, changePct }]
 *   - asOf      : ISO date of the most recent snapshot used (or null)
 *   - degraded  : { reason } when we had to fall back (e.g. no recent
 *                 trading-day data) — the grid is still populated but the
 *                 UI should explain why values look unusual.
 *   - error     : { message, detail? } for hard failures
 *
 * Refresh cadence matches the underlying data:
 *   - 1D: 60s (in case "today's" snapshot lands mid-session)
 *   - 1W/1M/YTD: 10 min (historical snapshots don't move intraday)
 */
export function useSectorPerformance(range = '1D') {
  const [sectors, setSectors] = useState([]);
  const [asOf, setAsOf] = useState(null);
  const [degraded, setDegraded] = useState(null);
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
          setSectors(nextSectors);
          setAsOf(body?.asOf ?? null);
          setDegraded(body?.degraded ?? null);
          setError({
            message: body?.error || `Failed to load sectors (${res.status})`,
            detail: body?.detail,
          });
          return;
        }

        setSectors(nextSectors);
        setAsOf(body?.asOf ?? null);
        setDegraded(body?.degraded ?? null);
      } catch (err) {
        if (err?.name === 'AbortError') return;
        setError({ message: err?.message || 'Failed to load sectors' });
        setSectors([]);
        setAsOf(null);
        setDegraded(null);
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

    // Clear between range changes so the skeleton shows during the next fetch
    // instead of stale values from the previous range.
    setSectors([]);
    setAsOf(null);
    setDegraded(null);
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
    asOf,
    degraded,
    error,
    isLoading,
    refresh: () => load(),
  };
}

export default useSectorPerformance;

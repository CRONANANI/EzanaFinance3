'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

/** @typedef {'1D'|'1M'|'6M'|'1Y'} PortfolioRange */

const RANGE_ORDER = ['1D', '1M', '6M', '1Y'];

/**
 * Fetches `/api/portfolio/value-series?range=` with the range in the URL so
 * each window is cached separately. While a new range is loading, previously
 * fetched points stay visible to avoid a blank chart (SWR "keep previous").
 *
 * @param {PortfolioRange} range
 */
export function usePortfolioValueSeries(range) {
  const { isAuthenticated, user } = useAuth();
  const [cache, setCache] = useState(
    () => /** @type {Record<PortfolioRange, { at: string, value: number }[] | undefined>} */ ({}),
  );
  const [rangeLoading, setRangeLoading] = useState(/** @type {PortfolioRange | null} */ (null));
  const [error, setError] = useState(/** @type {Error | null} */ (null));
  const abortRef = useRef(/** @type {AbortController | null} */ (null));

  const runFetch = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setCache({});
      setRangeLoading(null);
      setError(null);
      return;
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setRangeLoading(range);
    setError(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        if (!ac.signal.aborted) {
          setRangeLoading(null);
        }
        return;
      }

      const res = await fetch(`/api/portfolio/value-series?range=${encodeURIComponent(range)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
        signal: ac.signal,
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || res.statusText || 'Request failed');
      }
      const j = await res.json();
      const points = Array.isArray(j.points) ? j.points : [];
      if (!ac.signal.aborted) {
        setCache((c) => ({ ...c, [range]: points }));
        setError(null);
      }
    } catch (e) {
      if (/** @type {any} */ (e)?.name === 'AbortError') return;
      if (!ac.signal.aborted) {
        setError(/** @type {Error} */ (e));
      }
    } finally {
      if (!ac.signal.aborted) {
        setRangeLoading(null);
      }
    }
  }, [isAuthenticated, user, range]);

  useEffect(() => {
    runFetch();
    return () => {
      abortRef.current?.abort();
    };
  }, [runFetch]);

  const { displayPoints, isLoading } = useMemo(() => {
    const forRange = cache[range];
    const waiting = rangeLoading === range;
    if (waiting) {
      if (forRange && forRange.length > 0) {
        return { displayPoints: forRange, isLoading: false };
      }
      const keep = firstNonEmptyCacheEntry(cache, range);
      return { displayPoints: keep || [], isLoading: !keep?.length };
    }
    if (forRange) {
      return { displayPoints: forRange, isLoading: false };
    }
    return { displayPoints: [], isLoading: false };
  }, [cache, range, rangeLoading]);

  /** Points for `range` only (no cross-range keep). Use for $ / % delta for the selected window. */
  const dataForCurrentRange = cache[range];

  return { points: displayPoints, dataForCurrentRange, isLoading, error };
}

/**
 * @param {Record<PortfolioRange, { at: string, value: number }[] | undefined>} cache
 * @param {PortfolioRange} current
 */
function firstNonEmptyCacheEntry(cache, current) {
  if (cache[current]?.length) return cache[current];
  for (const r of RANGE_ORDER) {
    if (r === current) continue;
    if (cache[r]?.length) return cache[r];
  }
  return null;
}

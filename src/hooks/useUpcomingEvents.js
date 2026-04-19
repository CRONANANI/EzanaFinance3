'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { encodeRelevanceParams } from '@/lib/upcoming-events/relevance-params';

const ENDPOINT = '/api/market-data/upcoming-events';
const REFRESH_MS = 15 * 60 * 1000; // 15 minutes, matches the edge cache TTL

/**
 * Build a stable cache/compare key from a relevance object so the fetch
 * only reruns when the set of followed identifiers actually changes (not
 * on every parent render).
 */
function relevanceKey(rel) {
  if (!rel) return 'country=US';
  const setKey = (s) =>
    s && typeof s.size === 'number'
      ? Array.from(s).slice(0, 500).sort().join(',')
      : '';
  return [
    `t=${setKey(rel.tickers)}`,
    `p=${setKey(rel.politicians)}`,
    `c=${setKey(rel.cryptos)}`,
    `m=${setKey(rel.commodities)}`,
    `country=${rel.country || 'US'}`,
  ].join('|');
}

/**
 * Fetches the unified "Upcoming Events & Alerts" feed — filtered down to
 * the events that are actually relevant to the signed-in user.
 *
 * Accepts an optional `relevance` object produced by `useUserRelevanceSet`
 * and encodes it into the query string; the server uses those sets to
 * drop every earnings/dividend/IPO/congress/crypto/commodity event whose
 * subject isn't owned or followed. Economic events are always included
 * for the user's country.
 *
 * Refreshes every 15 minutes in the background. We intentionally do NOT
 * refresh on focus — the data is slow-changing and the card is a passive
 * at-a-glance summary, not a tape-reading surface.
 *
 * Contract mirrors the SWR-style one used elsewhere in the app:
 *   { events, errors, isLoading, error, refresh, isRateLimited, relevanceEmpty }
 */
export function useUpcomingEvents({ relevance, country: countryOverride } = {}) {
  const [events, setEvents] = useState([]);
  const [errors, setErrors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [relevanceEmpty, setRelevanceEmpty] = useState(
    relevance ? !!relevance.isEmpty : false
  );
  const abortRef = useRef(null);

  // Stabilise the query string — only rebuild when the underlying
  // identifiers or country change.
  const key = useMemo(() => {
    const base = relevance || {};
    const countryEffective =
      countryOverride || base.country || 'US';
    return relevanceKey({ ...base, country: countryEffective });
  }, [relevance, countryOverride]);

  const load = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const params = encodeRelevanceParams(
      relevance
        ? { ...relevance, country: countryOverride || relevance.country }
        : { country: countryOverride || 'US' }
    );

    const qs = params.toString();
    const url = qs ? `${ENDPOINT}?${qs}` : ENDPOINT;

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        cache: 'no-store',
      });

      if (res.status === 429) {
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
      if (typeof data?.relevance?.isEmpty === 'boolean') {
        setRelevanceEmpty(data.relevance.isEmpty);
      }
      setError(null);
    } catch (e) {
      if (e.name === 'AbortError') return;
      setError(e);
    } finally {
      setIsLoading(false);
    }
    // `key` is the single source of truth for when a refetch is needed —
    // including `relevance`/`countryOverride` would cause redundant loads
    // whenever the parent produces a new set reference with the same data.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

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
    relevanceEmpty,
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

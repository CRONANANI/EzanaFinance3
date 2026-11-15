'use client';

/**
 * Related catalysts and the "still matches?" check for the selected item
 * (Market Monitor 2.0). Both are read only, and both fail quietly: the panel
 * shows its empty state and the rest of the page carries on.
 */
import { useEffect, useRef, useState } from 'react';

/* Classes with a verified event source today (src/lib/watchlist/catalysts.js). */
const WITH_CATALYSTS = new Set(['stock', 'bond_etf', 'commodity']);

export function useWatchlistCatalysts(item) {
  const type = item?.type || null;
  const ticker = item?.ticker || null;
  const [state, setState] = useState({ status: 'idle', items: [] });
  useEffect(() => {
    if (!type || !ticker || !WITH_CATALYSTS.has(type)) {
      setState({ status: 'ready', items: [] });
      return undefined;
    }
    let cancelled = false;
    setState({ status: 'loading', items: [] });
    fetch(
      `/api/watchlist/catalysts?type=${encodeURIComponent(type)}&ticker=${encodeURIComponent(ticker)}`,
      { credentials: 'include' },
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        if (!cancelled) setState({ status: 'ready', items: Array.isArray(d.items) ? d.items : [] });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error', items: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [type, ticker]);
  return state;
}

/**
 * Does a smart-added item still match its rule? `ruleId` is null for manual
 * items and for rules that were turned off, in which case nothing is asked.
 * Resolves { status, matchesNow, evaluatedAt, conditions }.
 */
export function useSmartExplain(authedFetch, ruleId, item) {
  const type = item?.type || null;
  const ticker = item?.ticker || null;
  const fetcher = useRef(authedFetch);
  fetcher.current = authedFetch;
  const [state, setState] = useState({ status: 'idle', matchesNow: null, conditions: [] });
  useEffect(() => {
    if (!ruleId || !type || !ticker) {
      setState({ status: 'idle', matchesNow: null, conditions: [] });
      return undefined;
    }
    let cancelled = false;
    setState({ status: 'loading', matchesNow: null, conditions: [] });
    fetcher
      .current(
        `/api/watchlists/smart/${ruleId}/explain?type=${encodeURIComponent(type)}&ticker=${encodeURIComponent(ticker)}`,
      )
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d) => {
        if (cancelled) return;
        setState({
          status: 'ready',
          matchesNow: d.matchesNow ?? null,
          evaluatedAt: d.evaluatedAt || null,
          conditions: Array.isArray(d.conditions) ? d.conditions : [],
        });
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'error', matchesNow: null, conditions: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [ruleId, type, ticker]);
  return state;
}

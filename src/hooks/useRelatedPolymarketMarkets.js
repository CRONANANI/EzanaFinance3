'use client';

import { useEffect, useState } from 'react';

function eventHasSearchSignal(event) {
  if (!event) return false;
  if (event.headline || event.title) return true;
  if (event.summary || event.description) return true;
  return false;
}

/**
 * Lazily fetches prediction markets SEMANTICALLY related to an event. Embeds the
 * event's headline + summary server-side (Supabase gte-small) and nearest-
 * neighbour matches pre-embedded markets via /api/market-data/related-markets
 * (match_markets RPC, cosine, threshold 0.803). Matches on meaning, not shared
 * words — far more accurate than the old keyword/entity substring search.
 *
 * Signature and `enabled`-gating are unchanged so RelatedMarketsPanel and its
 * call sites need no changes. `noHighConfidence` is set true when nothing clears
 * the threshold (empty result) — driving the panel's honest empty state.
 */
export function useRelatedPolymarketMarkets(event, { enabled = true, limit = 8 } = {}) {
  const [markets, setMarkets] = useState([]);
  const [noHighConfidence, setNoHighConfidence] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Query text mirrors Adjacent: "${headline}. ${summary}".
  const queryText = event
    ? `${event.headline || event.title || ''}. ${event.summary || event.description || ''}`.trim()
    : '';

  useEffect(() => {
    if (!enabled || !event) {
      return undefined;
    }
    if (!eventHasSearchSignal(event)) {
      setMarkets([]);
      setNoHighConfidence(false);
      setError(null);
      setIsLoading(false);
      return undefined;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setNoHighConfidence(false);

    async function run() {
      try {
        const res = await fetch('/api/market-data/related-markets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: queryText, limit }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data?._debug || data?.error || 'Failed to load markets');
        const list = Array.isArray(data?.markets) ? data.markets : [];
        setMarkets(list);
        // nothing cleared the similarity threshold → honest empty state
        setNoHighConfidence(list.length === 0);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
    // queryText encodes the event's text; re-run when it (or enabled/limit) changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, limit, queryText]);

  return { markets, noHighConfidence, isLoading, error };
}

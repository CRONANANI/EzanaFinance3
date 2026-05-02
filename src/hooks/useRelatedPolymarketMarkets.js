'use client';

import { useEffect, useState } from 'react';

function eventHasSearchSignal(event) {
  if (!event) return false;
  if (event.headline || event.title) return true;
  if (event.summary || event.description) return true;
  if (Array.isArray(event.impactedKeywords) && event.impactedKeywords.length > 0) return true;
  if (Array.isArray(event.impactedSymbols) && event.impactedSymbols.length > 0) return true;
  return false;
}

/**
 * Lazily fetches Polymarket markets related to an event. Designed to be called
 * when a user opens a "View related prediction markets" panel — not eagerly on
 * every event render — so we don't hit Polymarket's API for events the user
 * never inspects.
 *
 * Pass `enabled: false` to defer the fetch. Flip to true (e.g. on panel open)
 * to trigger the request.
 */
export function useRelatedPolymarketMarkets(event, { enabled = true, limit = 8 } = {}) {
  const [markets, setMarkets] = useState([]);
  const [noHighConfidence, setNoHighConfidence] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const kwKey = Array.isArray(event?.impactedKeywords) ? event.impactedKeywords.join('\u0001') : '';
  const symKey = Array.isArray(event?.impactedSymbols) ? event.impactedSymbols.join('\u0001') : '';

  useEffect(() => {
    if (!enabled || !event) {
      return;
    }
    if (!eventHasSearchSignal(event)) {
      setMarkets([]);
      setNoHighConfidence(false);
      setError(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setNoHighConfidence(false);

    async function run() {
      try {
        const res = await fetch('/api/polymarket/related-markets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            headline: event.headline ?? event.title,
            title: event.title ?? event.headline,
            topic: event.topic,
            summary: event.summary,
            description: event.description,
            impactedKeywords: event.impactedKeywords,
            impactedSymbols: event.impactedSymbols,
            country: event.country,
            limit,
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(data?.error || 'Failed to load markets');
        setMarkets(Array.isArray(data?.markets) ? data.markets : []);
        setNoHighConfidence(Boolean(data?.noHighConfidence));
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
  }, [
    enabled,
    limit,
    event?.id,
    event?.headline,
    event?.title,
    event?.summary,
    event?.description,
    kwKey,
    symKey,
    event?.topic,
    event?.country,
  ]);

  return { markets, noHighConfidence, isLoading, error };
}

'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

/**
 * Fetches news-article / market-implications enrichment for the schedule
 * events currently visible in the home page Schedule band.
 *
 * Mirrors the relevanceKey pattern in useUpcomingEvents: it only refetches
 * when the *set* of visible event ids changes, not on every parent render.
 * The batch is capped to the events actually on screen (max 20). On any
 * failure it resolves to an empty map so the schedule renders unchanged —
 * enrichment never blocks the events.
 *
 * @param {Array} events visible schedule events ({ id, category, type, title, symbol, fullDate })
 * @returns {{ contextById: Record<string, {article: object|null, blurb: string|null}>, isLoading: boolean }}
 */
export function useEventContext(events) {
  const [contextById, setContextById] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // Stable key over the visible ids (+ dates) so the effect only reruns when
  // the actual set changes. Cap at 20 to match the server's batch limit.
  const { batch, key } = useMemo(() => {
    const list = (events || []).filter((e) => e && e.id).slice(0, 20);
    const k = list
      .map((e) => `${e.id}:${e.fullDate || ''}`)
      .sort()
      .join('|');
    return { batch: list, key: k };
  }, [events]);

  // Read the latest batch through a ref so the effect can depend on `key`
  // alone (identical id-set → no refetch) without a stale closure.
  const batchRef = useRef(batch);
  batchRef.current = batch;

  useEffect(() => {
    if (!key) {
      setContextById({});
      return undefined;
    }
    let cancelled = false;
    const controller = new AbortController();
    setIsLoading(true);

    (async () => {
      try {
        const res = await fetch('/api/market-data/event-context', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            events: batchRef.current.map((e) => ({
              id: e.id,
              category: e.category,
              type: e.type,
              title: e.title,
              symbol: e.symbol,
              fullDate: e.fullDate,
            })),
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        const map = {};
        for (const r of data.results || []) {
          if (r && r.id) {
            map[r.id] = { article: r.article || null, blurb: r.blurb || null };
          }
        }
        setContextById(map);
      } catch (err) {
        // Graceful degradation — leave context empty; events render as before.
        if (!cancelled && err?.name !== 'AbortError') {
          setContextById({});
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [key]);

  return { contextById, isLoading };
}

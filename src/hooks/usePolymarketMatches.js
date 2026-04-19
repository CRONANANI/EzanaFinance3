'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Given an ISR event list, fetches matching active Polymarket markets and
 * returns a map keyed by event id. Events without a match are omitted — the
 * caller should treat absence as "no badge".
 */
export function usePolymarketMatches(events) {
  const [matches, setMatches] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => () => { mountedRef.current = false; }, []);

  const key = (events || []).map((e) => e?.id).join(',');

  useEffect(() => {
    let active = true;
    if (!events || events.length === 0) {
      setMatches({});
      return;
    }
    async function run() {
      try {
        setIsLoading(true);
        const res = await fetch('/api/isr/polymarket-matches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(events),
        });
        if (!res.ok) {
          if (active && mountedRef.current) setMatches({});
          return;
        }
        const payload = await res.json();
        if (!active || !mountedRef.current) return;
        setMatches(payload && typeof payload === 'object' ? payload : {});
      } catch {
        if (active && mountedRef.current) setMatches({});
      } finally {
        if (active && mountedRef.current) setIsLoading(false);
      }
    }
    run();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { data: matches, isLoading };
}

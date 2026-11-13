'use client';

/**
 * useSavedRelated (Sonar research workspace, Nov 13 2026): up to two of the signed-in
 * reader's own saved items whose ticker or subject matches the current answer, fetched once
 * per answer, for the right rail's Related research. Nothing for a guest, nothing on error.
 */
import { useEffect, useState } from 'react';

export function useSavedRelated({ ticker = null, subject = null, enabled = false } = {}) {
  const [items, setItems] = useState([]);
  const key = `${ticker || ''}|${subject || ''}`;
  useEffect(() => {
    setItems([]);
    if (!enabled || (!ticker && !subject)) return undefined;
    const ctrl = new AbortController();
    const qs = new URLSearchParams({ limit: '2' });
    if (ticker) qs.set('ticker', ticker);
    if (subject) qs.set('subject', subject);
    fetch(`/api/sonar/saved?${qs}`, { credentials: 'include', signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => setItems(Array.isArray(j?.items) ? j.items.slice(0, 2) : []))
      .catch(() => {});
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);
  return items;
}

export default useSavedRelated;

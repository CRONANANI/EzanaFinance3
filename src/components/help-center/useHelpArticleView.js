'use client';

import { useEffect } from 'react';

/**
 * Counts one view of a Help Center article for the "Trending articles" rail.
 * Fires once per page load (sendBeacon, falling back to a keepalive fetch),
 * deduped per tab with sessionStorage so a refresh loop cannot inflate counts.
 * Only real articles are counted: pass a null slug for a not-found page.
 *
 * @param {'user'|'partner'} section
 * @param {string|null} slug
 */
export function useHelpArticleView(section, slug) {
  useEffect(() => {
    if (!slug || typeof window === 'undefined') return;
    const key = `hc-viewed:${section}:${slug}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, '1');
    } catch {
      /* storage blocked; still count once for this mount */
    }
    const payload = JSON.stringify({ section, slug });
    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          '/api/help-center/view',
          new Blob([payload], { type: 'application/json' }),
        );
        return;
      }
    } catch {
      /* fall through to fetch */
    }
    fetch('/api/help-center/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }, [section, slug]);
}

export default useHelpArticleView;

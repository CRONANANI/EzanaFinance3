'use client';

import { useEffect, useRef, useCallback } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

/**
 * Tracks user activity breadcrumbs from the navbar. Fire-and-forget POST only.
 */
export function useActivityTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const lastPath = useRef('');
  const pageEnteredAt = useRef(Date.now());

  const track = useCallback(
    (eventType, eventData = {}) => {
      if (!user?.id) return;
      fetch('/api/notifications/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_type: eventType, event_data: eventData }),
      }).catch(() => {});
    },
    [user?.id],
  );

  const tickerQ = searchParams?.get('q') || '';

  useEffect(() => {
    if (!pathname) return;
    if (pathname === lastPath.current) return;

    if (lastPath.current) {
      const duration = Date.now() - pageEnteredAt.current;
      if (duration > 2000) {
        track('page_view', { page: lastPath.current, duration_ms: duration });
      }
    }

    lastPath.current = pathname;
    pageEnteredAt.current = Date.now();
  }, [pathname, track]);

  useEffect(() => {
    if (!pathname || pathname !== '/company-research' || !tickerQ) return;
    track('ticker_view', { ticker: tickerQ.toUpperCase(), page: pathname });
  }, [pathname, tickerQ, track]);

  useEffect(() => {
    const onUnload = () => {
      if (!user?.id || !lastPath.current) return;
      const duration = Date.now() - pageEnteredAt.current;
      if (duration <= 2000) return;
      try {
        const blob = new Blob(
          [JSON.stringify({ event_type: 'page_view', event_data: { page: lastPath.current, duration_ms: duration } })],
          { type: 'application/json' },
        );
        navigator.sendBeacon('/api/notifications/track', blob);
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [user?.id]);

  return { track };
}

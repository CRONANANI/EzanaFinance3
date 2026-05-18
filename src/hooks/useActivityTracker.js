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
  const visibleMsRef = useRef(0);
  const visibleStartRef = useRef(null);

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
    if (typeof document === 'undefined') return undefined;
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        if (visibleStartRef.current != null) {
          visibleMsRef.current += Date.now() - visibleStartRef.current;
          visibleStartRef.current = null;
        }
      } else {
        visibleStartRef.current = Date.now();
      }
    };
    visibleStartRef.current = document.visibilityState === 'visible' ? Date.now() : null;
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  useEffect(() => {
    if (!pathname) return;
    if (pathname === lastPath.current) return;

    if (lastPath.current) {
      const duration = Date.now() - pageEnteredAt.current;
      if (duration > 2000) {
        track('page_view', { page: lastPath.current, duration_ms: duration });
      }
      let visibleMs = visibleMsRef.current;
      if (document.visibilityState === 'visible' && visibleStartRef.current != null) {
        visibleMs += Date.now() - visibleStartRef.current;
      }
      if (visibleMs > 500) {
        track('dwell_time', { page: lastPath.current, visible_ms: Math.round(visibleMs) });
      }
    }

    lastPath.current = pathname;
    pageEnteredAt.current = Date.now();
    visibleMsRef.current = 0;
    visibleStartRef.current =
      typeof document !== 'undefined' && document.visibilityState === 'visible' ? Date.now() : null;
  }, [pathname, track]);

  useEffect(() => {
    if (!pathname || pathname !== '/company-research' || !tickerQ) return;
    track('ticker_view', { ticker: tickerQ.toUpperCase(), page: pathname });
  }, [pathname, tickerQ, track]);

  useEffect(() => {
    const onUnload = () => {
      if (!user?.id || !lastPath.current) return;
      const duration = Date.now() - pageEnteredAt.current;
      let visibleMs = visibleMsRef.current;
      if (document.visibilityState === 'visible' && visibleStartRef.current != null) {
        visibleMs += Date.now() - visibleStartRef.current;
      }
      try {
        if (duration > 2000) {
          const blob = new Blob(
            [
              JSON.stringify({
                event_type: 'page_view',
                event_data: { page: lastPath.current, duration_ms: duration },
              }),
            ],
            { type: 'application/json' },
          );
          navigator.sendBeacon('/api/notifications/track', blob);
        }
        if (visibleMs > 500) {
          const blob = new Blob(
            [
              JSON.stringify({
                event_type: 'dwell_time',
                event_data: { page: lastPath.current, visible_ms: Math.round(visibleMs) },
              }),
            ],
            { type: 'application/json' },
          );
          navigator.sendBeacon('/api/notifications/track', blob);
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [user?.id]);

  return { track };
}

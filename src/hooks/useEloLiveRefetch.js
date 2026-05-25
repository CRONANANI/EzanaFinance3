'use client';

import { useEffect } from 'react';
import { subscribeEloChanged } from '@/lib/elo-events';

/**
 * Refetch ELO data on elo:changed (same tab) and visibilitychange (other tabs).
 * @param {(() => void) | null | undefined} refetch
 */
export function useEloLiveRefetch(refetch) {
  useEffect(() => {
    if (typeof refetch !== 'function') return undefined;

    const unsubscribe = subscribeEloChanged(() => {
      refetch();
    });

    const onVisibility = () => {
      if (document.visibilityState === 'visible') refetch();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refetch]);
}

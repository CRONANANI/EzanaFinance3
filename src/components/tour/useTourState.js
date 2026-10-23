'use client';

/**
 * Has this visitor done a given guided tour? localStorage answers instantly
 * (and is the only store for guests); signed-in users also persist to
 * profiles.user_settings through /api/onboarding/tour so the tour does not
 * replay on another device. Every storage touch is wrapped: private windows
 * and blocked storage degrade to "run the tour once per load".
 */
import { useCallback, useEffect, useState } from 'react';

const storageKey = (key) => `ezana_tour_${key}`;

export function useTourState(key) {
  const [shouldRun, setShouldRun] = useState(false);

  useEffect(() => {
    let local = false;
    try {
      local = localStorage.getItem(storageKey(key)) === 'done';
    } catch {
      local = false;
    }
    if (local) return undefined;
    let live = true;
    fetch(`/api/onboarding/tour?key=${encodeURIComponent(key)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => live && setShouldRun(!d?.completed))
      .catch(() => live && setShouldRun(true));
    return () => {
      live = false;
    };
  }, [key]);

  const complete = useCallback(() => {
    try {
      localStorage.setItem(storageKey(key), 'done');
    } catch {
      /* storage blocked: the tour simply may replay next load */
    }
    fetch('/api/onboarding/tour', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key }),
    }).catch(() => {});
    setShouldRun(false);
  }, [key]);

  const replay = useCallback(() => {
    try {
      localStorage.removeItem(storageKey(key));
    } catch {
      /* fine: replay is explicit anyway */
    }
    setShouldRun(true);
  }, [key]);

  return { shouldRun, complete, replay };
}

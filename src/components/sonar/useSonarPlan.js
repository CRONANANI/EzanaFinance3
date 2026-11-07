'use client';

/**
 * useSonarPlan (Nov 2026): who is reading a Sonar answer, for the side navigation's locked
 * sections and their call to action. Guests need no request. A signed-in reader's plan tier
 * and seat come from GET /api/sonar/entitlements, read once per page load and shared by
 * every answer on the page. Until it answers (or if it fails) the reader counts as a free
 * member, so nothing unlocks early.
 *
 * -> { isGuest, planTier, version, ready }
 */
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth-context';

let cache = null;
let inflight = null;

function load() {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch('/api/sonar/entitlements', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        cache = d ? { planTier: Number(d.planTier) || 0, version: d.version || 'regular' } : null;
        return cache;
      })
      .catch(() => null)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function useSonarPlan() {
  const { isAuthenticated, loading } = useAuth();
  const [plan, setPlan] = useState(cache);
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    let live = true;
    load().then((p) => {
      if (live && p) setPlan(p);
    });
    return () => {
      live = false;
    };
  }, [isAuthenticated]);
  if (!isAuthenticated)
    return { isGuest: true, planTier: null, version: 'regular', ready: !loading };
  return {
    isGuest: false,
    planTier: plan?.planTier ?? 0,
    version: plan?.version || 'regular',
    ready: Boolean(plan),
  };
}

export default useSonarPlan;

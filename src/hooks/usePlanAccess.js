'use client';

/**
 * The signed-in user's plan tier and the registry features it unlocks
 * (GET /api/billing/entitlements). Display only: gated APIs check on the
 * server. Returns null until loaded, and null for signed-out visitors.
 */
import { useEffect, useState } from 'react';

let cache = null;
let inflight = null;

function load() {
  if (cache) return Promise.resolve(cache);
  if (!inflight) {
    inflight = fetch('/api/billing/entitlements', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        cache = d;
        return d;
      })
      .catch(() => null)
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function usePlanAccess() {
  const [access, setAccess] = useState(cache);
  useEffect(() => {
    let alive = true;
    load().then((d) => {
      if (alive) setAccess(d);
    });
    return () => {
      alive = false;
    };
  }, []);
  return access;
}

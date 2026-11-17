'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Data for the council band of the Learning Center, as the signed-in member.
 * The hub always carries this hook (it is small and imports no council
 * model); it fetches nothing until `enabled`, which the hub sets only once it
 * knows the viewer is a council member.
 *
 *   live     GET /api/org/learning          the member's own council learning
 *   sample   GET /api/org/learning/sample   ({ sample: null } for everyone but
 *                                           master admin and demo accounts)
 *
 * The page has one sample switch (the hub's "Sample content" label in the KPI
 * strip). While it is on and the sample bundle arrived, the band reads the
 * bundle and nothing is fetched or written for it. The live payload is
 * fetched only when it will be shown.
 */
async function getJson(url) {
  const res = await fetch(url, { cache: 'no-store', credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

function useLoad(url, enabled) {
  const [state, setState] = useState({ status: 'loading', data: null });
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const load = useCallback(async () => {
    setState({ status: 'loading', data: null });
    try {
      const r = await getJson(url);
      if (alive.current)
        setState(r.ok ? { status: 'ready', data: r.data } : { status: 'error', data: null });
    } catch {
      if (alive.current) setState({ status: 'error', data: null });
    }
  }, [url]);
  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);
  return { ...state, retry: load };
}

const NOOP = () => {};

export function useCouncilLearning(enabled, { sampleOn = false, sampleKnown = true } = {}) {
  const sample = useLoad('/api/org/learning/sample', enabled);
  const bundle = sample.status === 'ready' ? sample.data?.sample || null : null;
  const known = enabled && sampleKnown && sample.status !== 'loading';
  const sampleActive = Boolean(bundle) && sampleOn;
  const live = useLoad('/api/org/learning', known && !sampleActive);

  return useMemo(() => {
    if (!enabled) return { enabled: false, status: 'loading', data: null, retry: NOOP };
    if (!known) return { enabled: true, status: 'loading', data: null, retry: NOOP };
    if (sampleActive)
      return { enabled: true, status: 'ready', data: bundle, retry: NOOP, sampleActive: true };
    return {
      enabled: true,
      status: live.status,
      data: live.data,
      retry: live.retry,
      sampleActive: false,
    };
  }, [enabled, known, sampleActive, bundle, live]);
}

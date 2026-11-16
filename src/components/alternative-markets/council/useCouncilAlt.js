'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCouncilResearch } from '@/components/research/council/useCouncilResearch';

/**
 * Data for the council cards of Alternative Markets, as the signed-in
 * member. The page always carries this hook (it is small and imports no
 * council model); it fetches nothing until `enabled`, which the page sets
 * only once it knows the viewer is a council member.
 *
 *   fund     the US Equities council loader (useCouncilResearch): book,
 *            teams, coverage, policy rules, plus its sample switch (master
 *            admin and demo accounts only)
 *   extras   GET /api/org/alternative-markets          documents, pitches,
 *            meetings, members, standing
 *   sample   GET /api/org/alternative-markets/sample   ({ sample: null } for
 *            everyone but master admin and demo accounts)
 *
 * While the sample shows, every council card reads the sample bundles and
 * nothing on the cards writes. Live parts are fetched only when they will be
 * shown.
 */
const BASE = '/api/org/alternative-markets';

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

const IDLE = {
  enabled: false,
  fund: { status: 'loading', raw: null, retry: () => {} },
  extras: { status: 'loading', data: null, retry: () => {} },
  sampleActive: false,
  sampleAvailable: false,
  setShowSample: () => {},
};

export function useCouncilAlt(enabled) {
  const council = useCouncilResearch(null, enabled);
  const sample = useLoad(`${BASE}/sample`, enabled);
  const bundle = sample.status === 'ready' ? sample.data?.sample || null : null;

  /* The sample shows when both sample bundles arrived and the switch is on. */
  const sampleKnown =
    enabled && sample.status !== 'loading' && (bundle ? council.sampleAvailable : true);
  const sampleActive = Boolean(bundle) && council.sampleActive;
  const live = useLoad(BASE, sampleKnown && !sampleActive);

  return useMemo(() => {
    if (!enabled) return IDLE;
    let extras;
    if (!sampleKnown) extras = { status: 'loading', data: null, retry: () => {} };
    else if (sampleActive) extras = { status: 'ready', data: bundle, retry: () => {} };
    else extras = { status: live.status, data: live.data, retry: live.retry };
    return {
      enabled: true,
      fund: sampleKnown
        ? council.fund
        : { status: 'loading', raw: null, retry: council.fund.retry },
      extras,
      sampleActive,
      sampleAvailable: Boolean(bundle) && council.sampleAvailable,
      setShowSample: council.setShowSample,
    };
  }, [enabled, council, sampleKnown, sampleActive, bundle, live]);
}

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCouncilResearch } from '@/components/research/council/useCouncilResearch';

/**
 * Data for Council watch on the Watchlist, as the signed-in member. The page
 * always carries this hook (it is small and imports no council model); it
 * fetches nothing until `enabled`, which the page sets only once it knows the
 * viewer is a council member.
 *
 *   fund     the US Equities council loader (useCouncilResearch): book,
 *            sector teams, members, sector coverage, handoffs, research
 *            dates, policy rules, plus its sample switch (master admin and
 *            demo accounts only)
 *   extras   GET /api/org/watchlist          open pitches, Coverage
 *            assignments, meetings and committee sessions
 *   sample   GET /api/org/watchlist/sample   ({ sample: null } for everyone
 *            but master admin and demo accounts)
 *
 * While the sample shows, every council card reads the sample bundles and
 * nothing writes. Live parts are fetched only when they will be shown. Each
 * part loads and fails on its own.
 */
const BASE = '/api/org/watchlist';

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
const IDLE = {
  enabled: false,
  fund: { status: 'loading', raw: null, retry: NOOP },
  extras: { status: 'loading', data: null, retry: NOOP },
  policyPositions: null,
  viewerMemberId: null,
  sampleActive: false,
  sampleAvailable: false,
  setShowSample: NOOP,
};

export function useCouncilWatchlist(enabled) {
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
    if (!sampleKnown) {
      return {
        ...IDLE,
        enabled: true,
        fund: { status: 'loading', raw: null, retry: council.fund.retry },
      };
    }
    const fund = council.fund;
    const extras = sampleActive
      ? { status: 'ready', data: bundle, retry: NOOP }
      : { status: live.status, data: live.data, retry: live.retry };
    /* What the policy engine reads: the sample's holdings under their sector
       team, or the council's own book. */
    const policyPositions = sampleActive
      ? bundle.policyPositions || []
      : fund.status === 'ready'
        ? fund.raw?.positions || []
        : null;
    const viewerMemberId = sampleActive
      ? fund.raw?.viewer?.memberId || bundle.viewer?.memberId || null
      : fund.raw?.viewer?.memberId || live.data?.viewer?.memberId || null;
    return {
      enabled: true,
      fund,
      extras,
      policyPositions,
      viewerMemberId,
      sampleActive,
      sampleAvailable: Boolean(bundle) && council.sampleAvailable,
      setShowSample: council.setShowSample,
    };
  }, [enabled, council, sampleKnown, sampleActive, bundle, live]);
}

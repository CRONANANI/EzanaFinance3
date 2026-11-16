'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCouncilResearch } from '@/components/research/council/useCouncilResearch';

/**
 * Data for the Council view of Global Market Analysis, as the signed-in
 * member. Mounted only once the page knows the viewer is a council member.
 *
 *   fund     the US Equities council loader (useCouncilResearch): book,
 *            teams, coverage, rules, latest benchmark, plus its sample
 *            switch (master admin and demo accounts only)
 *   extras   GET /api/org/market-analysis         snapshots, documents,
 *            meetings, standing
 *   sample   GET /api/org/market-analysis/sample  ({ sample: null } for
 *            everyone but master admin and demo accounts)
 *   debrief  GET /api/debrief-items               the member's own saved items
 *
 * While the sample shows, every council card reads the sample bundles and
 * nothing on the view writes (useSectorMoves reads the delayed sector fund
 * moves, which are market data, not council data). Live council parts are fetched only when they
 * will be shown.
 */
const BASE = '/api/org/market-analysis';

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
    if (!url) return;
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

export function useCouncilMarket() {
  const council = useCouncilResearch(null, true);
  const sample = useLoad(`${BASE}/sample`, true);
  const bundle = sample.status === 'ready' ? sample.data?.sample || null : null;

  /* The sample shows when both sample bundles arrived and the switch is on. */
  const sampleKnown = sample.status !== 'loading' && (bundle ? council.sampleAvailable : true);
  const sampleActive = Boolean(bundle) && council.sampleActive;
  const wantLive = sampleKnown && !sampleActive;
  const live = useLoad(BASE, wantLive);
  const debrief = useLoad('/api/debrief-items', true);

  return useMemo(() => {
    let extras;
    if (!sampleKnown) extras = { status: 'loading', data: null, retry: () => {} };
    else if (sampleActive) extras = { status: 'ready', data: bundle, retry: () => {} };
    else extras = { status: live.status, data: live.data, retry: live.retry };
    return {
      fund: sampleKnown
        ? council.fund
        : { status: 'loading', raw: null, retry: council.fund.retry },
      extras,
      sampleActive,
      sampleAvailable: Boolean(bundle) && council.sampleAvailable,
      setShowSample: council.setShowSample,
      debrief,
    };
  }, [council, sampleKnown, sampleActive, bundle, live, debrief]);
}

/** Delayed day moves of the sector funds beside the sleeves. */
export function useSectorMoves(funds = []) {
  const key = [...new Set(funds)].sort().join(',');
  const res = useLoad(key ? `/api/market-data/quotes?symbols=${key}` : null, Boolean(key));
  return key ? res : { status: 'ready', data: { quotes: {} }, retry: () => {} };
}

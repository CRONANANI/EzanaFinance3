'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCouncilResearch } from '@/components/research/council/useCouncilResearch';

/**
 * Data for the council tab of Quant Lab, as the signed-in member. The
 * Overview always carries this hook (it is small and imports no council
 * model); it fetches nothing until `enabled`, which the page sets only once
 * it knows the viewer is a council member.
 *
 *   fund     the US Equities council loader (useCouncilResearch): book,
 *            sector teams, members, policy rules, benchmark, plus its sample
 *            switch (master admin and demo accounts only)
 *   extras   GET /api/org/quant-lab          open pitches, model checklists,
 *            Model assignments
 *   sample   GET /api/org/quant-lab/sample   ({ sample: null } for everyone
 *            but master admin and demo accounts)
 *   risk     GET /api/org/quant-lab/risk     the lab's risk engine on the
 *            council's holdings (?sample=1 for the sample holdings)
 *
 * While the sample shows, every council card reads the sample bundles and
 * nothing writes. Live parts are fetched only when they will be shown. Each
 * part loads and fails on its own.
 */
const BASE = '/api/org/quant-lab';

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
const LOADING = { status: 'loading', data: null, retry: NOOP };
const IDLE = {
  enabled: false,
  fund: { status: 'loading', raw: null, retry: NOOP },
  extras: LOADING,
  risk: LOADING,
  policy: LOADING,
  members: [],
  viewerMemberId: null,
  sampleActive: false,
  sampleAvailable: false,
  setShowSample: NOOP,
};

export function useCouncilQuant(enabled) {
  const council = useCouncilResearch(null, enabled);
  const sample = useLoad(`${BASE}/sample`, enabled);
  const bundle = sample.status === 'ready' ? sample.data?.sample || null : null;

  /* The sample shows when both sample bundles arrived and the switch is on. */
  const sampleKnown =
    enabled && sample.status !== 'loading' && (bundle ? council.sampleAvailable : true);
  const sampleActive = Boolean(bundle) && council.sampleActive;
  const live = useLoad(BASE, sampleKnown && !sampleActive);
  const risk = useLoad(sampleActive ? `${BASE}/risk?sample=1` : `${BASE}/risk`, sampleKnown);

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
       team, or the council's own book and stored rules. */
    const policy = sampleActive
      ? {
          status: 'ready',
          data: { positions: bundle.positions || [], rules: bundle.rules || [] },
          retry: NOOP,
        }
      : {
          status: fund.status,
          data:
            fund.status === 'ready'
              ? { positions: fund.raw?.positions || [], rules: fund.raw?.rules || [] }
              : null,
          retry: fund.retry,
        };
    const members = sampleActive ? bundle.members || [] : fund.raw?.members || [];
    const viewerMemberId = sampleActive
      ? bundle.viewer?.memberId || null
      : fund.raw?.viewer?.memberId || live.data?.viewer?.memberId || null;
    return {
      enabled: true,
      fund,
      extras,
      risk: { status: risk.status, data: risk.data, retry: risk.retry },
      policy,
      members,
      viewerMemberId,
      sampleActive,
      sampleAvailable: Boolean(bundle) && council.sampleAvailable,
      setShowSample: council.setShowSample,
    };
  }, [enabled, council, sampleKnown, sampleActive, bundle, live, risk]);
}

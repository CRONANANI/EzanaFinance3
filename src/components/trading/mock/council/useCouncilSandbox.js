'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCouncilResearch } from '@/components/research/council/useCouncilResearch';

/**
 * Data for the Council sandbox on Mock Portfolio, as the signed-in member.
 * The page always carries this hook (it is small and imports no council
 * model); it fetches nothing until `enabled`, which the page sets only once
 * it knows the viewer is a council member.
 *
 *   fund     the US Equities council loader (useCouncilResearch): book,
 *            sector teams, members, stored policy rules and the fund's
 *            benchmark, plus its sample switch (master admin and demo
 *            accounts only)
 *   extras   GET /api/org/mock-portfolio          open pitches, the fund's
 *            daily values and fund challenge standing
 *   sample   GET /api/org/mock-portfolio/sample   ({ sample: null } for
 *            everyone but master admin and demo accounts)
 *   series   the viewer's own sandbox value series with the S&P 500 over the
 *            chosen range, from the paper account's existing series route
 *            (read-only), fetched again when `tradesKey` changes
 *
 * While the sample shows, every council card reads the sample bundles and
 * nothing writes. Live parts are fetched only when they will be shown. Each
 * part loads and fails on its own. Paper orders, resets and theses never go
 * through here.
 */
const BASE = '/api/org/mock-portfolio';

async function getJson(url) {
  const res = await fetch(url, { cache: 'no-store', credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

function useLoad(url, enabled, key = 0) {
  const [state, setState] = useState({ status: 'loading', data: null });
  const alive = useRef(true);
  const seq = useRef(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const load = useCallback(async () => {
    const mine = ++seq.current;
    setState((s) => ({ status: 'loading', data: s.data }));
    try {
      const r = await getJson(url);
      if (alive.current && mine === seq.current)
        setState(r.ok ? { status: 'ready', data: r.data } : { status: 'error', data: null });
    } catch {
      if (alive.current && mine === seq.current) setState({ status: 'error', data: null });
    }
  }, [url]);
  useEffect(() => {
    if (enabled) load();
  }, [enabled, load, key]);
  return { ...state, retry: load };
}

const NOOP = () => {};
const LOADING = { status: 'loading', data: null, retry: NOOP };
const IDLE = {
  enabled: false,
  fund: { status: 'loading', raw: null, retry: NOOP },
  extras: LOADING,
  series: LOADING,
  sandbox: null,
  policyPositions: null,
  viewerMemberId: null,
  sampleActive: false,
  sampleAvailable: false,
  setShowSample: NOOP,
};

export function useCouncilSandbox(enabled, { range = '3M', tradesKey = 0 } = {}) {
  const council = useCouncilResearch(null, enabled);
  const sample = useLoad(`${BASE}/sample`, enabled);
  const bundle = sample.status === 'ready' ? sample.data?.sample || null : null;

  /* The sample shows when both sample bundles arrived and the switch is on. */
  const sampleKnown =
    enabled && sample.status !== 'loading' && (bundle ? council.sampleAvailable : true);
  const sampleActive = Boolean(bundle) && council.sampleActive;
  const wantLive = sampleKnown && !sampleActive;
  const live = useLoad(BASE, wantLive);
  const series = useLoad(
    `/api/portfolio/mock-value-series?range=${encodeURIComponent(range)}&benchmark=1`,
    wantLive,
    tradesKey,
  );

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
    const seriesPart = sampleActive
      ? {
          status: 'ready',
          data: { points: bundle.sandbox.points, benchmark: bundle.sandbox.benchmark },
          retry: NOOP,
        }
      : { status: series.status, data: series.data, retry: series.retry };
    /* What the policy rules read for the fund: the sample's holdings under
       their sector team, or the council's own book. */
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
      series: seriesPart,
      /* The sample sandbox, only while the sample shows. */
      sandbox: sampleActive ? bundle.sandbox : null,
      policyPositions,
      viewerMemberId,
      sampleActive,
      sampleAvailable: Boolean(bundle) && council.sampleAvailable,
      setShowSample: council.setShowSample,
    };
  }, [enabled, council, sampleKnown, sampleActive, bundle, live, series]);
}

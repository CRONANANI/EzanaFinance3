'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCouncilResearch } from '@/components/research/council/useCouncilResearch';

/**
 * Data for the council band of Ezana Echo, as the signed-in member. The Echo
 * front page always carries this hook (it is small and imports no council
 * model); it fetches nothing until `enabled`, which the page sets only once
 * it knows the viewer is a council member.
 *
 *   fund     the US Equities council loader (useCouncilResearch): book,
 *            sector teams, coverage, members, plus its sample switch (master
 *            admin and demo accounts only)
 *   extras   GET /api/org/ezana-echo          published research, pitches,
 *            member directory
 *   sample   GET /api/org/ezana-echo/sample   ({ sample: null } for everyone
 *            but master admin and demo accounts)
 *   saved    GET /api/echo/saved-articles     the viewer's own saved list
 *
 * While the sample shows, every council card reads the sample bundles and
 * nothing on the band writes. Live parts are fetched only when they will be
 * shown. `tickers` (held plus open-pitch tickers, upper case) feeds the Our
 * names tab; it is built inline here so the public bundle stays free of the
 * council model.
 */
const BASE = '/api/org/ezana-echo';
const CLOSED = new Set(['rejected', 'exited', 'in_portfolio', 'approved']);

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
  saved: { status: 'loading', data: null, retry: NOOP },
  tickers: null,
  sampleActive: false,
  sampleAvailable: false,
  setShowSample: NOOP,
};

const up = (t) =>
  String(t || '')
    .toUpperCase()
    .trim();

export function useCouncilEcho(enabled) {
  const council = useCouncilResearch(null, enabled);
  const sample = useLoad(`${BASE}/sample`, enabled);
  const saved = useLoad('/api/echo/saved-articles', enabled);
  const bundle = sample.status === 'ready' ? sample.data?.sample || null : null;

  /* The sample shows when both sample bundles arrived and the switch is on. */
  const sampleKnown =
    enabled && sample.status !== 'loading' && (bundle ? council.sampleAvailable : true);
  const sampleActive = Boolean(bundle) && council.sampleActive;
  const live = useLoad(BASE, sampleKnown && !sampleActive);

  return useMemo(() => {
    if (!enabled) return IDLE;
    let extras;
    if (!sampleKnown) extras = { status: 'loading', data: null, retry: NOOP };
    else if (sampleActive) extras = { status: 'ready', data: bundle, retry: NOOP };
    else extras = { status: live.status, data: live.data, retry: live.retry };
    const fund = sampleKnown
      ? council.fund
      : { status: 'loading', raw: null, retry: council.fund.retry };

    /* Held plus open-pitch tickers, once both parts are in. A part that
       failed leaves the set to the other (an error shows on its card). */
    let tickers = null;
    if (fund.status !== 'loading' && extras.status !== 'loading') {
      const all = new Set();
      for (const p of fund.raw?.positions || []) if (p?.ticker) all.add(up(p.ticker));
      for (const p of extras.data?.pitches || [])
        if (p?.ticker && !p.archived_at && !CLOSED.has(p.stage)) all.add(up(p.ticker));
      tickers = all;
    }
    return {
      enabled: true,
      fund,
      extras,
      saved: { status: saved.status, data: saved.data, retry: saved.retry },
      tickers,
      sampleActive,
      sampleAvailable: Boolean(bundle) && council.sampleAvailable,
      setShowSample: council.setShowSample,
    };
  }, [enabled, council, sampleKnown, sampleActive, bundle, live, saved]);
}

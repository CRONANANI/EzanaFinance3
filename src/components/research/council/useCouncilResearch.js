'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Data for the council sections of US Equities, as the signed-in member.
 *
 *   fund    GET /api/org/company-research            (book, teams, rules, ...)
 *   ticker  GET /api/org/company-research?ticker=X   (documents and pitches)
 *   sample  GET /api/org/company-research/sample     (master admin and demo
 *           accounts only; { sample: null } for everyone else)
 *
 * Fetches nothing until `enabled` (the page knows the viewer is a council
 * member). Each part
 * loads and fails on its own. A sample viewer waits for the bundle rather
 * than flashing council data first. While the sample shows, every section
 * reads the bundle; nothing on these sections writes anything.
 */
const BASE = '/api/org/company-research';

/* The ticker part of a sample bundle, filtered the way the live route
   filters. Kept here (not imported from the model) so the retail bundle,
   which always carries this hook, stays free of the council model. */
function sampleTickerPart(raw, ticker) {
  const t = String(ticker || '').toUpperCase();
  const is = (v) => String(v || '').toUpperCase() === t;
  return {
    docs: (raw?.notes || []).filter((n) => is(n.ticker)),
    pitches: (raw?.pitches || []).filter((p) => is(p.ticker)),
    hops: [],
  };
}

async function getJson(url) {
  const res = await fetch(url, { cache: 'no-store', credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

export function useCouncilResearch(ticker, enabled = true) {
  const [fund, setFund] = useState({ status: 'loading', data: null });
  const [part, setPart] = useState({ status: 'idle', data: null, ticker: null });
  const [sample, setSample] = useState({ status: 'loading', bundle: null });
  const [showSample, setShowSample] = useState(true);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const loadFund = useCallback(async () => {
    setFund({ status: 'loading', data: null });
    try {
      const r = await getJson(BASE);
      if (alive.current)
        setFund(r.ok ? { status: 'ready', data: r.data } : { status: 'error', data: null });
    } catch {
      if (alive.current) setFund({ status: 'error', data: null });
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    loadFund();
    (async () => {
      let bundle = null;
      try {
        const r = await getJson(`${BASE}/sample`);
        if (r.ok) bundle = r.data?.sample || null;
      } catch {
        bundle = null;
      }
      if (alive.current) setSample({ status: 'ready', bundle });
    })();
  }, [enabled, loadFund]);

  const sampleAvailable = Boolean(sample.bundle);
  const sampleActive = sampleAvailable && showSample;
  const sampleLoading = sample.status === 'loading';

  const loadPart = useCallback(async (sym) => {
    if (!sym) {
      setPart({ status: 'idle', data: null, ticker: null });
      return;
    }
    setPart({ status: 'loading', data: null, ticker: sym });
    try {
      const r = await getJson(`${BASE}?ticker=${encodeURIComponent(sym)}`);
      if (!alive.current) return;
      setPart((prev) =>
        prev.ticker !== sym
          ? prev
          : r.ok
            ? { status: 'ready', data: r.data, ticker: sym }
            : { status: 'error', data: null, ticker: sym },
      );
    } catch {
      if (alive.current)
        setPart((prev) =>
          prev.ticker !== sym ? prev : { status: 'error', data: null, ticker: sym },
        );
    }
  }, []);

  /* Live ticker records are fetched only when they will be shown. */
  const wantLive = enabled && !sampleLoading && !sampleActive;
  useEffect(() => {
    if (wantLive) loadPart(ticker || null);
  }, [ticker, wantLive, loadPart]);

  return useMemo(() => {
    if (sampleLoading) {
      return {
        sampleActive: false,
        sampleAvailable: false,
        setShowSample,
        fund: { status: 'loading', raw: null, retry: loadFund },
        ticker: { status: ticker ? 'loading' : 'idle', part: null, retry: () => {} },
      };
    }
    if (sampleActive) {
      const raw = sample.bundle;
      return {
        sampleActive: true,
        sampleAvailable: true,
        setShowSample,
        fund: { status: 'ready', raw, retry: loadFund },
        ticker: {
          status: ticker ? 'ready' : 'idle',
          part: ticker ? sampleTickerPart(raw, ticker) : null,
          retry: () => {},
        },
      };
    }
    return {
      sampleActive: false,
      sampleAvailable,
      setShowSample,
      fund: { status: fund.status, raw: fund.data, retry: loadFund },
      ticker: {
        status: !ticker ? 'idle' : part.ticker === ticker ? part.status : 'loading',
        part: part.ticker === ticker ? part.data : null,
        retry: () => loadPart(ticker),
      },
    };
  }, [
    sampleLoading,
    sampleActive,
    sampleAvailable,
    sample.bundle,
    fund,
    part,
    ticker,
    loadFund,
    loadPart,
  ]);
}

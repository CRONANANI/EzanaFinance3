'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { pickCompetition, standingOf } from '@/lib/org-fund-analytics-model';

/**
 * Data for Fund Analytics. Each resource loads on its own and owns its state
 * ({ status: 'loading' | 'ready' | 'error' | 'forbidden', data }), so a failed
 * request shows as a failure with Retry in the section that needs it, never
 * as an empty fund.
 *
 * Every read goes through routes that already exist, as the signed-in member.
 * The server decides what each member may read.
 *
 * The default period arrives with the page (`initialData`), so nothing is
 * fetched for it. A period is fetched the first time it is chosen and kept.
 *
 * Sample content: master admin and demo accounts also receive a sample
 * bundle. While it shows, every resource is answered from the bundle and
 * nothing is sent anywhere.
 */
const FUND_URL = '/api/org/analytics/fund';
const SAMPLE_URL = '/api/org/analytics/sample';
const LOADING = { status: 'loading', data: null };
const FORBIDDEN = { status: 'forbidden', data: null };

async function getJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (res.status === 403) return { forbidden: true };
  if (!res.ok) throw new Error('request failed');
  return { data: await res.json() };
}

/** The council's place in an open competition, from the two existing routes. */
async function loadStanding() {
  const list = await getJson('/api/org/competitions');
  if (list.forbidden) return { forbidden: true };
  const comp = pickCompetition(list.data?.competitions);
  if (!comp) return { data: null };
  let standings = [];
  try {
    const board = await getJson(`/api/org/competitions/${encodeURIComponent(comp.id)}/leaderboard`);
    standings = board.data?.standings || [];
  } catch {
    /* The entry's own rank still shows; only the field size is missing. */
  }
  return { data: standingOf(comp, standings) };
}

/**
 * @param {{ enabled: boolean, initialData: object|null, sampleViewer: boolean,
 *           wantHealth: boolean }} opts
 */
export function useFundAnalyticsData({ enabled, initialData, sampleViewer, wantHealth }) {
  const [period, setPeriod] = useState('semester');
  const [live, setLive] = useState(() =>
    initialData ? { 'fund:semester': { status: 'ready', data: initialData } } : {},
  );
  const [sample, setSample] = useState(() =>
    sampleViewer ? { status: 'loading', bundle: null } : { status: 'ready', bundle: null },
  );
  const [showSample, setShowSample] = useState(true);
  const alive = useRef(true);
  const liveRef = useRef(live);
  liveRef.current = live;
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(async (key) => {
    setLive((s) => ({ ...s, [key]: { status: 'loading', data: s[key]?.data ?? null } }));
    let next;
    try {
      let out;
      if (key.startsWith('fund:')) out = await getJson(`${FUND_URL}?period=${key.slice(5)}`);
      else if (key === 'attention') out = await getJson('/api/org/analytics/attention');
      else if (key === 'health') out = await getJson('/api/org/fund-health');
      else out = await loadStanding();
      next = out.forbidden ? FORBIDDEN : { status: 'ready', data: out.data };
    } catch {
      next = { status: 'error', data: null };
    }
    if (alive.current) setLive((s) => ({ ...s, [key]: next }));
  }, []);

  /* First load: everything but the period that arrived with the page. */
  useEffect(() => {
    if (!enabled) return;
    if (!liveRef.current['fund:semester']) load('fund:semester');
    load('attention');
    load('standing');
    if (!sampleViewer) return;
    (async () => {
      let bundle = null;
      try {
        const res = await fetch(SAMPLE_URL, { cache: 'no-store' });
        if (res.ok) bundle = (await res.json())?.sample || null;
      } catch {
        bundle = null;
      }
      if (alive.current) setSample({ status: 'ready', bundle });
    })();
  }, [enabled, sampleViewer, load]);

  useEffect(() => {
    if (enabled && wantHealth) load('health');
  }, [enabled, wantHealth, load]);

  const sampleAvailable = Boolean(sample.bundle);
  const sampleActive = sampleAvailable && showSample;

  const choosePeriod = useCallback(
    (next) => {
      setPeriod(next);
      const key = `fund:${next}`;
      const have = liveRef.current[key];
      if (!sampleActive && enabled && (!have || have.status === 'error')) load(key);
    },
    [sampleActive, enabled, load],
  );

  /* Leaving sample content may land on a period that was never fetched. */
  useEffect(() => {
    if (!enabled || sampleActive || sample.status === 'loading') return;
    const key = `fund:${period}`;
    if (!liveRef.current[key]) load(key);
  }, [enabled, sampleActive, sample.status, period, load]);

  const sampleFund = useMemo(() => {
    if (!sampleActive) return null;
    const b = sample.bundle;
    return { ...b.fund, ...(b.byPeriod[period] || b.byPeriod.semester) };
  }, [sampleActive, sample.bundle, period]);

  const resource = useCallback(
    (key) => {
      if (!enabled || sample.status === 'loading') return LOADING;
      if (sampleActive) {
        if (key === 'fund') return { status: 'ready', data: sampleFund };
        if (key === 'standing') return { status: 'ready', data: sample.bundle.standing };
        const data = sample.bundle[key];
        return data ? { status: 'ready', data } : FORBIDDEN;
      }
      if (key === 'health' && !wantHealth) return FORBIDDEN;
      if (key === 'fund') {
        const cur = live[`fund:${period}`];
        if (cur?.status === 'ready' || cur?.status === 'error') return cur;
        /* While another period loads, the last one stays on the page, marked
           as refreshing, so the layout does not jump. */
        const prev = Object.entries(live).find(
          ([k, v]) => k.startsWith('fund:') && v.status === 'ready',
        );
        return prev ? { status: 'ready', data: prev[1].data, refreshing: true } : LOADING;
      }
      return live[key] || LOADING;
    },
    [enabled, sample, sampleActive, sampleFund, live, period, wantHealth],
  );

  const retry = useCallback(
    (...keys) => {
      if (sampleActive) return;
      keys.forEach((k) => load(k === 'fund' ? `fund:${period}` : k));
    },
    [sampleActive, load, period],
  );

  /** A member's scorecard while sample content shows (null on the live page). */
  const sampleScorecard = useCallback(
    (memberId) => (sampleActive ? sample.bundle.scorecards?.[memberId] || null : undefined),
    [sampleActive, sample.bundle],
  );

  return {
    period,
    choosePeriod,
    resource,
    retry,
    sampleActive,
    sampleAvailable,
    sampleFundName: sampleActive ? sample.bundle.fundName : null,
    setShowSample,
    sampleScorecard,
  };
}

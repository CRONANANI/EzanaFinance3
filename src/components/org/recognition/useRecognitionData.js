'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  applySampleAction,
  sampleBase,
  sampleRatings,
  sampleScorecard,
  sampleWeights,
} from '@/lib/org-recognition-sample';

/**
 * Data for Recognition.
 *
 * The roster and the badges and awards arrive with the page (`initialBase`),
 * and so does the first ranked list (`initialRatings`), so the first paint
 * has data. Every read and write goes through routes that already exist, as
 * the signed-in member; the server decides what each member may read and do.
 *
 * Sample content: master admin and demo accounts also receive a sample
 * bundle. While it shows, every read is answered from the bundle, every
 * action is applied to the bundle on the page (applySampleAction, the same
 * rules as the routes) and nothing is sent anywhere.
 */
const BASE_URL = '/api/org/recognition';
const SAMPLE_URL = '/api/org/recognition/sample';
const REFRESH_EVENT = 'ezana:org-nav-counts-refresh';

const readJson = (res) => res.json().catch(() => ({}));
const ratingsKey = (listMode, period) => (listMode === 'movers' ? `movers:${period}` : listMode);

async function send(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await readJson(res);
  return { ok: res.ok, status: res.status, data };
}

export function useRecognitionData({ enabled, initialBase, initialRatings, sampleViewer }) {
  const [base, setBase] = useState(() =>
    initialBase ? { status: 'ready', data: initialBase } : { status: 'loading', data: null },
  );
  const [sample, setSample] = useState(() =>
    sampleViewer ? { status: 'loading', bundle: null } : { status: 'ready', bundle: null },
  );
  const [showSample, setShowSample] = useState(true);
  const [ratings, setRatings] = useState(() =>
    initialRatings
      ? {
          [ratingsKey(initialRatings.listMode, initialRatings.period)]: {
            status: 'ready',
            data: initialRatings,
          },
        }
      : {},
  );
  const [cards, setCards] = useState({});
  const [version, setVersion] = useState(0);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const bundle = sample.bundle;
  const sampleActive = Boolean(bundle) && showSample;

  const loadBase = useCallback(async () => {
    setBase((b) => ({ status: b.data ? 'refreshing' : 'loading', data: b.data }));
    try {
      const res = await fetch(BASE_URL, { cache: 'no-store' });
      const data = await readJson(res);
      if (!alive.current) return;
      if (res.status === 403) setBase({ status: 'forbidden', data: null });
      else if (!res.ok) setBase((b) => ({ status: 'error', data: b.data }));
      else setBase({ status: 'ready', data });
    } catch {
      if (alive.current) setBase((b) => ({ status: 'error', data: b.data }));
    }
  }, []);

  useEffect(() => {
    if (!enabled || initialBase) return;
    loadBase();
  }, [enabled, initialBase, loadBase]);

  useEffect(() => {
    if (!enabled || !sampleViewer) return undefined;
    let off = false;
    fetch(SAMPLE_URL, { cache: 'no-store' })
      .then((r) => (r.ok ? readJson(r) : {}))
      .then((j) => {
        if (!off) setSample({ status: 'ready', bundle: j?.sample || null });
      })
      .catch(() => {
        if (!off) setSample({ status: 'ready', bundle: null });
      });
    return () => {
      off = true;
    };
  }, [enabled, sampleViewer]);

  /* ── Ratings (one ranked list at a time) ── */
  const loadRatings = useCallback(async (listMode, period) => {
    const key = ratingsKey(listMode, period);
    setRatings((r) => ({ ...r, [key]: { status: 'loading', data: r[key]?.data || null } }));
    try {
      const qs = new URLSearchParams({ listMode, period }).toString();
      const res = await fetch(`${BASE_URL}/ratings?${qs}`, { cache: 'no-store' });
      const data = await readJson(res);
      if (!alive.current) return;
      setRatings((r) => ({
        ...r,
        [key]: res.ok ? { status: 'ready', data } : { status: 'error', data: null },
      }));
    } catch {
      if (alive.current) setRatings((r) => ({ ...r, [key]: { status: 'error', data: null } }));
    }
  }, []);

  const ratingsOf = useCallback(
    (listMode, period) => {
      if (sampleActive) {
        return { status: 'ready', data: sampleRatings(bundle, listMode, period) };
      }
      return ratings[ratingsKey(listMode, period)] || { status: 'idle', data: null };
    },
    [sampleActive, bundle, ratings],
  );

  /* ── Scorecards ── */
  const loadCard = useCallback(async (memberId) => {
    if (!memberId) return;
    setCards((c) => ({ ...c, [memberId]: { status: 'loading', data: c[memberId]?.data || null } }));
    try {
      const res = await fetch(`${BASE_URL}/scorecard/${encodeURIComponent(memberId)}`, {
        cache: 'no-store',
      });
      const data = await readJson(res);
      if (!alive.current) return;
      setCards((c) => ({
        ...c,
        [memberId]: res.ok
          ? { status: 'ready', data }
          : { status: res.status === 404 ? 'missing' : 'error', data: null },
      }));
    } catch {
      if (alive.current) setCards((c) => ({ ...c, [memberId]: { status: 'error', data: null } }));
    }
  }, []);

  const cardOf = useCallback(
    (memberId) => {
      if (!memberId) return { status: 'idle', data: null };
      if (sampleActive) {
        const data = sampleScorecard(bundle, memberId);
        return data ? { status: 'ready', data } : { status: 'missing', data: null };
      }
      return cards[memberId] || { status: 'idle', data: null };
    },
    [sampleActive, bundle, cards],
  );

  /* ── Weights ── */
  const loadWeights = useCallback(async () => {
    if (sampleActive) return { ok: true, data: sampleWeights(bundle) };
    try {
      const res = await fetch(`${BASE_URL}/weights`, { cache: 'no-store' });
      const data = await readJson(res);
      return res.ok ? { ok: true, data } : { ok: false };
    } catch {
      return { ok: false };
    }
  }, [sampleActive, bundle]);

  /* ── Actions ── */
  const refreshAll = useCallback(async () => {
    setCards({});
    setRatings({});
    setVersion((v) => v + 1);
    await loadBase();
  }, [loadBase]);

  const act = useCallback(
    async (action) => {
      if (sampleActive) {
        const res = applySampleAction(bundle, action);
        if (res.ok) setSample({ status: 'ready', bundle: res.bundle });
        return res;
      }
      let r;
      try {
        if (action.type === 'award') r = await send('POST', BASE_URL, action.form);
        else if (action.type === 'recompute') r = await send('POST', `${BASE_URL}/recompute`, {});
        else if (action.type === 'auto') r = await send('POST', `${BASE_URL}/auto`, {});
        else if (action.type === 'weights') {
          r = await send('PUT', `${BASE_URL}/weights`, {
            role: action.role,
            weights: action.weights,
          });
        } else return { ok: false, error: 'Unknown action' };
      } catch {
        return { ok: false, error: null };
      }
      if (!r.ok) return { ok: false, error: r.data?.error || null, status: r.status };
      let message = null;
      if (action.type === 'recompute') {
        const results = r.data?.results || [];
        const rated = results.filter((x) => x.ratedThesisCount > 0).length;
        message = `Recomputed ${results.length} ${results.length === 1 ? 'member' : 'members'}; ${rated} with scored pitches.`;
      } else if (action.type === 'auto') {
        const n = r.data?.awarded?.length || 0;
        message = n
          ? `Awarded ${n} ${n === 1 ? 'badge' : 'badges'} for ${r.data.period}.`
          : r.data?.message || 'Nothing new to award.';
      } else if (action.type === 'weights') {
        message = 'Display weights saved.';
      }
      await refreshAll();
      if (action.type === 'award' && typeof window !== 'undefined') {
        window.dispatchEvent(new Event(REFRESH_EVENT));
      }
      return { ok: true, message, data: r.data };
    },
    [sampleActive, bundle, refreshAll],
  );

  const baseData = sampleActive ? sampleBase(bundle) : base.data;
  return {
    base: sampleActive ? { status: 'ready', data: baseData } : base,
    sampleActive,
    sampleAvailable: Boolean(bundle),
    sampleLoading: sample.status === 'loading',
    toggleSample: () => setShowSample((s) => !s),
    retryBase: loadBase,
    ratingsOf,
    loadRatings,
    cardOf,
    loadCard,
    loadWeights,
    act,
    version,
  };
}

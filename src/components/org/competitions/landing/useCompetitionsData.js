'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { applySampleAction } from '@/lib/org-competitions-sample';

/**
 * Data for the Competitions landing screen.
 *
 * The payload arrives with the page (`initialData`) when the server could
 * load it. Reads and writes go through existing routes as the signed-in
 * member; the server decides what each council receives.
 *
 * Sample content: master admin and demo accounts also receive a sample
 * bundle. While it shows, the page reads the bundle and every action
 * (create, join, enter a fund challenge) is applied to it on the page only.
 */
const URL_ = '/api/org/pitch-competitions/overview';
const SAMPLE_URL = '/api/org/pitch-competitions/sample';

const EMPTY = {
  viewer: { canManage: false, role: null },
  entered: [],
  hosted: [],
  joinable: [],
  fund: { competitions: [], boards: {}, canEnter: false },
  badges: [],
  errors: {},
};

async function postJson(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return res.ok ? { ok: true, data } : { ok: false, error: data?.error || null };
}

export function useCompetitionsData({ initialData, sampleViewer }) {
  const [live, setLive] = useState(() =>
    initialData
      ? { status: 'ready', data: { ...EMPTY, ...initialData } }
      : { status: 'loading', data: null },
  );
  const [sample, setSample] = useState(() =>
    sampleViewer ? { status: 'loading', bundle: null } : { status: 'ready', bundle: null },
  );
  const [showSample, setShowSample] = useState(true);
  const alive = useRef(true);
  const sampleRef = useRef(sample);
  sampleRef.current = sample;
  const hadInitial = useRef(Boolean(initialData));

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLive((s) => ({ status: 'loading', data: s.data }));
    let next;
    try {
      const res = await fetch(URL_, { cache: 'no-store' });
      if (res.status === 403) next = { status: 'forbidden', data: null };
      else if (!res.ok) next = { status: 'error', data: null };
      else next = { status: 'ready', data: { ...EMPTY, ...(await res.json()) } };
    } catch {
      next = { status: 'error', data: null };
    }
    if (!alive.current) return;
    setLive((s) => (quiet && next.status !== 'ready' && s.data ? s : next));
  }, []);

  useEffect(() => {
    if (!hadInitial.current) load();
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
  }, [sampleViewer, load]);

  const sampleAvailable = Boolean(sample.bundle);
  const sampleActive = sampleAvailable && showSample;
  const sampleLoading = sampleViewer && sample.status === 'loading';

  const state = sampleActive
    ? { status: 'ready', data: { ...EMPTY, ...sample.bundle, errors: {} } }
    : sampleLoading && live.status === 'ready'
      ? { status: 'loading', data: live.data }
      : live;

  /** Every write. Sample: applied on the page. Live: the existing routes. */
  const act = useCallback(
    async (action) => {
      if (sampleRef.current.bundle && showSample) {
        const res = applySampleAction(sampleRef.current.bundle, action);
        if (res.ok) setSample({ status: 'ready', bundle: res.bundle });
        return { ok: res.ok, error: res.error || null, sample: true };
      }
      let res = { ok: false, error: null };
      try {
        if (action.type === 'create') {
          res = await postJson('/api/org/pitch-competitions', action.form);
          if (res.ok) return { ok: true, slug: res.data?.competition?.slug || null };
        } else if (action.type === 'enter_fund') {
          res = await postJson('/api/org/competitions', { competition_id: action.id });
        }
      } catch {
        res = { ok: false, error: null };
      }
      if (res.ok) await load({ quiet: true });
      return res;
    },
    [showSample, load],
  );

  return {
    state,
    act,
    retry: () => load(),
    sampleActive,
    sampleAvailable,
    setShowSample,
  };
}

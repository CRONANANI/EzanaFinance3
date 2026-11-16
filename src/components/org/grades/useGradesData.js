'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { applySampleAction, gradeBody } from '@/lib/org-grades-model';

/**
 * Data for Grades.
 *
 * The payload arrives with the page (`initialData`) when the server could
 * load it, so the first paint has data. Reads and writes go through the
 * grades route as the signed-in member; the server decides what each member
 * receives (an analyst or portfolio manager only ever receives their own
 * grades) and who may enter or change one.
 *
 * Sample content: master admin and demo accounts also receive a sample
 * bundle. While it shows, the page reads the bundle, entering or changing a
 * grade is applied to the bundle on the page with the route's checks, and
 * nothing is sent anywhere.
 */
const URL_ = '/api/org/grades';
const SAMPLE_URL = '/api/org/grades/sample';

const EMPTY = {
  viewer: { userId: null, canGrade: false, name: null },
  visibility: 'visible',
  gradingHidden: false,
  grades: [],
  roster: [],
  cohorts: [],
};

async function sendLive(action) {
  const body = gradeBody(action.form);
  const payload =
    action.type === 'update'
      ? {
          id: action.id,
          score: body.score,
          max_score: body.max_score,
          letter: body.letter,
          feedback: body.feedback,
        }
      : body;
  const res = await fetch(URL_, {
    method: action.type === 'update' ? 'PATCH' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data?.error || null, status: res.status };
  return { ok: true, id: data?.grade?.id || action.id || null };
}

/**
 * @param {{ initialData: object|null, sampleViewer: boolean }} opts
 */
export function useGradesData({ initialData, sampleViewer }) {
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
    /* A quiet refresh that fails keeps the rows already on the page. */
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
    ? { status: 'ready', data: { ...EMPTY, ...sample.bundle } }
    : sampleLoading && live.status === 'ready' && !live.data?.grades?.length
      ? { status: 'loading', data: live.data }
      : live;

  const act = useCallback(
    async (action) => {
      if (sampleRef.current.bundle && showSample) {
        const res = applySampleAction(sampleRef.current.bundle, action);
        if (res.ok) setSample({ status: 'ready', bundle: res.bundle });
        return { ok: res.ok, error: res.error || null, id: res.id || null, sample: true };
      }
      let res;
      try {
        res = await sendLive(action);
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

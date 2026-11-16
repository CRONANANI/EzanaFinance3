'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applySampleAction,
  sampleBoard,
  sampleDetail,
  samplePanels,
} from '@/lib/org-pitch-pipeline-sample';

/**
 * Data for the Pitch Pipeline.
 *
 * The pipeline arrives with the page (`initialData`) when the server could
 * load it. Every read and write goes through routes that already exist, as
 * the signed-in member; the server decides what each member may read and do,
 * and seals the ballots of an open blind vote before anything is sent.
 *
 * Sample content: master admin and demo accounts also receive a sample
 * bundle. While it shows, the board, each pitch and each panel are answered
 * from the bundle (through the same sealing functions the server uses), each
 * action is applied to the bundle on the page with the routes' rules, and
 * nothing is sent anywhere.
 */
const BOARD_URL = '/api/org/pitches/board';
const SAMPLE_URL = '/api/org/pitches/sample';
const REFRESH_EVENT = 'ezana:org-nav-counts-refresh';
const LOADING = { status: 'loading', data: null };

async function readJson(res) {
  return res.json().catch(() => ({}));
}

const json = (method, url, body) =>
  fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });

/* One request per action. Returns { ok, error, id }. */
async function sendLive(a) {
  const one = `/api/org/pitches/${encodeURIComponent(a.pitchId || '')}`;
  let res;
  switch (a.type) {
    case 'advance':
      res = await json(
        'POST',
        `${one}/advance`,
        a.override ? { override: true, override_reason: a.reason } : {},
      );
      break;
    case 'reject':
      res = await json('POST', `${one}/advance`, { reject: true, note: a.note });
      break;
    case 'exit':
      res = await json('POST', `${one}/stage`, { to_stage: 'exited', note: a.note });
      break;
    case 'editThesis':
      res = await json('PATCH', one, a.patch);
      break;
    case 'vote':
      res = await json('POST', `${one}/vote`, { vote: a.vote, rationale: a.rationale });
      break;
    case 'meetingStatus':
      res = await json('PATCH', `/api/org/pitches/ic-meetings/${encodeURIComponent(a.meetingId)}`, {
        status: a.status,
      });
      break;
    case 'assignMeeting':
      res = await json('POST', `${one}/ic-meeting`, { ic_meeting_id: a.meetingId || null });
      break;
    case 'scheduleMeeting':
      res = await json('POST', '/api/org/pitches/ic-meetings', {
        ...a.form,
        meets_at: a.form.meets_at ? new Date(a.form.meets_at).toISOString() : null,
        quorum_pct: Number(a.form.quorum_pct),
      });
      break;
    case 'signoff':
      res = await json('POST', `${one}/signoff`, {
        scope: a.scope,
        decision: a.decision,
        comment: a.comment || undefined,
      });
      break;
    case 'crossDesk':
      res = await json('POST', `${one}/cross-desk`, { decision: a.decision, reason: a.reason });
      break;
    case 'deliverable':
      res = await json('POST', `${one}/deliverables`, { kind: a.kind, title: a.title });
      break;
    case 'model':
      res = await json(
        'POST',
        `${one}/models`,
        a.reviewed
          ? { model_type: a.modelType, reviewed: true }
          : { model_type: a.modelType, file_url: a.fileUrl },
      );
      break;
    case 'deskMeeting':
      res = await json('POST', `${one}/desk-meeting`, a.body);
      break;
    case 'comment':
      res = await json('POST', `${one}/discussion`, { body: a.body });
      break;
    case 'decision':
      res = await json('POST', `${one}/decision`, {
        decision: a.decision,
        decision_rationale: a.rationale,
      });
      break;
    case 'falsification':
      res = await json('POST', `${one}/falsification`, {
        tripped: Boolean(a.tripped),
        note: a.note,
      });
      break;
    case 'submit':
      res = await json('POST', '/api/org/pitches', a.body);
      break;
    default:
      return { ok: false, error: 'Unknown action' };
  }
  const data = await readJson(res);
  if (!res.ok) return { ok: false, error: data?.error || null, gate: data?.gate || null };
  return { ok: true, id: data?.pitch?.id || data?.meeting?.id || null };
}

async function getJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (res.status === 404) return { status: 'missing' };
  if (!res.ok) return { status: 'error' };
  return { status: 'ready', data: await readJson(res) };
}

/**
 * @param {{ enabled: boolean, initialData: object|null, sampleViewer: boolean }} opts
 */
export function usePipelineData({ enabled, initialData, sampleViewer }) {
  const [live, setLive] = useState(() =>
    initialData ? { status: 'ready', data: initialData } : LOADING,
  );
  const [sample, setSample] = useState(() =>
    sampleViewer ? { status: 'loading', raw: null } : { status: 'ready', raw: null },
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

  const loadBoard = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLive((s) => ({ status: 'loading', data: s.data }));
    let next;
    try {
      const res = await fetch(BOARD_URL, { cache: 'no-store' });
      if (res.status === 403) next = { status: 'forbidden', data: null };
      else if (!res.ok) next = { status: 'error', data: null };
      else next = { status: 'ready', data: await res.json() };
    } catch {
      next = { status: 'error', data: null };
    }
    if (!alive.current) return;
    /* A quiet refresh that fails keeps the rows already on the page. */
    setLive((s) => (quiet && next.status !== 'ready' && s.data ? s : next));
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (!hadInitial.current) loadBoard();
    if (!sampleViewer) return;
    (async () => {
      let raw = null;
      try {
        const res = await fetch(SAMPLE_URL, { cache: 'no-store' });
        if (res.ok) raw = (await res.json())?.sample?.raw || null;
      } catch {
        raw = null;
      }
      if (alive.current) setSample({ status: 'ready', raw });
    })();
  }, [enabled, sampleViewer, loadBoard]);

  const sampleAvailable = Boolean(sample.raw);
  const sampleActive = sampleAvailable && showSample;

  const sampleData = useMemo(() => (sample.raw ? sampleBoard(sample.raw) : null), [sample.raw]);
  let board = live;
  if (!enabled || sample.status === 'loading') board = LOADING;
  else if (sampleActive) board = { status: 'ready', data: sampleData };

  const retry = useCallback(() => loadBoard(), [loadBoard]);

  /** One pitch, with its ballots as the server allows this member to see them. */
  const loadDetail = useCallback(
    async (id) => {
      if (sampleActive) {
        const d = sampleDetail(sampleRef.current.raw, id);
        return d ? { status: 'ready', data: d } : { status: 'missing' };
      }
      try {
        const r = await getJson(`/api/org/pitches/${encodeURIComponent(id)}`);
        return r.status === 'ready' ? { status: 'ready', data: r.data.pitch } : r;
      } catch {
        return { status: 'error' };
      }
    },
    [sampleActive],
  );

  /** The stage panels a pitch needs: sign-offs, cross-desk, desk meeting, models. */
  const loadPanels = useCallback(
    async (id, stage) => {
      if (sampleActive) {
        const d = samplePanels(sampleRef.current.raw, id);
        return d ? { status: 'ready', data: d } : { status: 'missing' };
      }
      const one = `/api/org/pitches/${encodeURIComponent(id)}`;
      const want = {
        signoff: stage === 'screening',
        crossDesk: stage === 'cross_desk_review',
        deskMeeting: ['deep_dive', 'cross_desk_review', 'pitch_scheduled', 'ic_vote'].includes(
          stage,
        ),
        models: ['deep_dive', 'cross_desk_review', 'pitch_scheduled', 'ic_vote'].includes(stage),
      };
      try {
        const [signoff, crossDesk, deskMeeting, models] = await Promise.all([
          want.signoff ? getJson(`${one}/signoff`) : null,
          want.crossDesk ? getJson(`${one}/cross-desk`) : null,
          want.deskMeeting ? getJson(`${one}/desk-meeting`) : null,
          want.models ? getJson(`${one}/models`) : null,
        ]);
        const parts = [signoff, crossDesk, deskMeeting, models].filter(Boolean);
        if (parts.some((p) => p.status !== 'ready')) return { status: 'error' };
        return {
          status: 'ready',
          data: {
            signoff: signoff?.data || null,
            crossDesk: crossDesk?.data || null,
            deskMeeting: deskMeeting?.data || null,
            models: models?.data || null,
          },
        };
      } catch {
        return { status: 'error' };
      }
    },
    [sampleActive],
  );

  /**
   * Run one action. Sample rows change on the page only. Live actions send
   * one request, then refresh the pipeline and the sidebar counts.
   */
  const act = useCallback(
    async (action) => {
      if (sampleActive) {
        const res = applySampleAction(sampleRef.current.raw, action);
        if (res.ok) {
          sampleRef.current = { status: 'ready', raw: res.raw };
          setSample(sampleRef.current);
        }
        return { ok: res.ok, error: res.error || null, id: res.id || null };
      }
      let out;
      try {
        out = await sendLive(action);
      } catch {
        return { ok: false, error: 'Could not connect. Nothing was changed.' };
      }
      if (out.ok) {
        await loadBoard({ quiet: true });
        if (typeof window !== 'undefined') window.dispatchEvent(new Event(REFRESH_EVENT));
      }
      return out;
    },
    [sampleActive, loadBoard],
  );

  return {
    board,
    retry,
    act,
    loadDetail,
    loadPanels,
    sampleActive,
    sampleAvailable,
    setShowSample,
  };
}

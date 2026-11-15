'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { applySampleAction, createBody } from '@/lib/org-assignments-model';

/**
 * Data for Assignments.
 *
 * The board arrives with the page (`initialData`) when the server could load
 * it, so the first paint has data. Every read and write goes through routes
 * that already exist, as the signed-in member; the server decides what each
 * member may read and do.
 *
 * Sample content: master admin and demo accounts also receive a sample
 * bundle. While it shows, the board and every detail are answered from the
 * bundle, each action is applied to the bundle on the page by the page model
 * (the same status path and rules as the server), and nothing is sent
 * anywhere.
 */
const BOARD_URL = '/api/org/assignments';
const SAMPLE_URL = '/api/org/assignments/sample';
const REFRESH_EVENT = 'ezana:org-nav-counts-refresh';

const EMPTY_BOARD = {
  assignments: [],
  metrics: {},
  roster: [],
  teams: [],
  cohorts: [],
  roles: [],
  templates: [],
  viewer: { canAssign: false, userId: null },
};
const LOADING = { status: 'loading', data: null };

async function readJson(res) {
  return res.json().catch(() => ({}));
}

/* One request per action. Returns { ok, error, id }. */
async function sendLive(action) {
  const json = (method, url, body) =>
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  const patch = (body) => json('PATCH', BOARD_URL, { id: action.id, ...body });
  const one = `${BOARD_URL}/${encodeURIComponent(action.id || '')}`;
  let res;
  switch (action.type) {
    case 'create':
      res = await json('POST', BOARD_URL, createBody(action.form, action.targets));
      break;
    case 'start':
      res = await patch({ status: 'in_progress' });
      break;
    case 'review':
      res = await patch({ status: 'under_review' });
      break;
    case 'approve':
      res = await patch({ status: 'complete' });
      break;
    case 'return':
      res = await patch({ status: 'returned', comment: action.comment });
      break;
    case 'grade': {
      const body = { status: 'graded' };
      if (action.max !== '' && action.max != null) body.rubric_max = Number(action.max);
      if (action.score !== '' && action.score != null) body.rubric_score = Number(action.score);
      if (action.comment) body.rubric_comment = action.comment;
      res = await patch(body);
      break;
    }
    case 'submit':
      res = await json('POST', `${one}/submissions`, { note: action.note || null });
      break;
    case 'comment':
      res = await json('POST', `${one}/comments`, { body: action.body });
      break;
    case 'upload': {
      const body = new FormData();
      body.append('file', action.file);
      res = await fetch(`${one}/attachments`, { method: 'POST', body });
      break;
    }
    case 'deleteFile':
      res = await fetch(
        `${one}/attachments?attachmentId=${encodeURIComponent(action.attachmentId)}`,
        { method: 'DELETE' },
      );
      break;
    default:
      return { ok: false, error: 'Unknown action' };
  }
  const data = await readJson(res);
  if (!res.ok) return { ok: false, error: data?.error || null };
  return { ok: true, id: data?.assignment?.id || null };
}

/**
 * @param {{ enabled: boolean, initialData: object|null, sampleViewer: boolean }} opts
 */
export function useAssignmentsData({ enabled, initialData, sampleViewer }) {
  const [live, setLive] = useState(() =>
    initialData ? { status: 'ready', data: { ...EMPTY_BOARD, ...initialData } } : LOADING,
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

  const loadBoard = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLive((s) => ({ status: 'loading', data: s.data }));
    let next;
    try {
      const res = await fetch(BOARD_URL, { cache: 'no-store' });
      if (res.status === 403) next = { status: 'forbidden', data: null };
      else if (!res.ok) next = { status: 'error', data: null };
      else next = { status: 'ready', data: { ...EMPTY_BOARD, ...(await res.json()) } };
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
      let bundle = null;
      try {
        const res = await fetch(SAMPLE_URL, { cache: 'no-store' });
        if (res.ok) bundle = (await res.json())?.sample || null;
      } catch {
        bundle = null;
      }
      if (alive.current) setSample({ status: 'ready', bundle });
    })();
  }, [enabled, sampleViewer, loadBoard]);

  const sampleAvailable = Boolean(sample.bundle);
  const sampleActive = sampleAvailable && showSample;

  let board = live;
  if (!enabled || sample.status === 'loading') board = LOADING;
  else if (sampleActive) board = { status: 'ready', data: sample.bundle.board };

  const retry = useCallback(() => loadBoard(), [loadBoard]);

  /** One assignment with its submissions, comments and files. */
  const loadDetail = useCallback(
    async (id) => {
      if (sampleActive) {
        const d = sampleRef.current.bundle?.details?.[id];
        if (!d) return { status: 'missing' };
        const viewer = sampleRef.current.bundle.board.viewer;
        return {
          status: 'ready',
          data: {
            ...d,
            viewer: {
              userId: viewer.userId,
              canReview: viewer.canAssign,
              isAssignee: Boolean(d.assignment.mine),
            },
            fileViewer: { userId: viewer.userId, canManage: viewer.canAssign },
          },
        };
      }
      try {
        const one = `${BOARD_URL}/${encodeURIComponent(id)}`;
        const [res, filesRes] = await Promise.all([
          fetch(one, { cache: 'no-store' }),
          fetch(`${one}/attachments`, { cache: 'no-store' }).catch(() => null),
        ]);
        if (res.status === 404) return { status: 'missing' };
        if (!res.ok) return { status: 'error' };
        const data = await res.json();
        let attachments = data.attachments || [];
        let fileViewer = {
          userId: data.viewer?.userId,
          canManage: Boolean(data.viewer?.canReview),
        };
        let filesFailed = !filesRes || !filesRes.ok;
        if (!filesFailed) {
          const files = await readJson(filesRes);
          const names = new Map(attachments.map((a) => [a.id, a.uploader_name]));
          attachments = (files.attachments || []).map((f) => ({
            ...f,
            uploader_name: names.get(f.id) || null,
          }));
          if (files.viewer) fileViewer = files.viewer;
        } else {
          filesFailed = true;
        }
        return { status: 'ready', data: { ...data, attachments, fileViewer, filesFailed } };
      } catch {
        return { status: 'error' };
      }
    },
    [sampleActive],
  );

  /**
   * Run one action. Sample rows change on the page only. Live actions send
   * one request, then refresh the board and the sidebar counts.
   */
  const act = useCallback(
    async (action) => {
      if (sampleActive) {
        const res = applySampleAction(sampleRef.current.bundle, action);
        if (res.ok) {
          sampleRef.current = { status: 'ready', bundle: res.bundle };
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
    sampleActive,
    sampleAvailable,
    setShowSample,
  };
}

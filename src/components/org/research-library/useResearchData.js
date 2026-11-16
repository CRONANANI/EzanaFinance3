'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { searchQuery } from '@/lib/org-research-library-model';
import {
  applySampleAction,
  deriveChain,
  deriveDetail,
  deriveDossier,
  deriveLibrary,
  deriveLineage,
} from '@/lib/org-research-library-sample';

/**
 * Data for the Research Library.
 *
 * The library arrives with the page (`initialData`) when the server could load
 * it, so the first paint has data. Every other read and every write goes
 * through routes that already exist, as the signed-in member; the server and
 * the row policies decide what each member may read and do.
 *
 * Sample content: master admin and demo accounts also receive a sample
 * bundle. While it shows, every read is answered from the bundle, each action
 * is applied to the bundle on the page with the server's rules, and nothing
 * is sent anywhere.
 */
const BASE = '/api/org/research-notes';
const SAMPLE_URL = `${BASE}/sample`;
const REFRESH_EVENT = 'ezana:org-nav-counts-refresh';
const LOADING = { status: 'loading', data: null };

async function readJson(res) {
  return res.json().catch(() => ({}));
}
async function getJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  const data = await readJson(res);
  return { res, data };
}

function formBody(form) {
  return {
    title: form.title,
    body: form.body,
    abstract: form.abstract || null,
    doc_type: form.doc_type,
    ticker: form.ticker || null,
    sector: form.sector || null,
    term: form.term || null,
    tags: form.tags || [],
    visibility: form.visibility,
    citations: form.citations || null,
    pitch_id: form.pitch_id || null,
  };
}

/* One request per action. Returns { ok, error, blockers, id, archived }. */
async function sendLive(action) {
  const one = `${BASE}/${encodeURIComponent(action.id || '')}`;
  const json = (method, url, body) =>
    fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    });
  let res;
  switch (action.type) {
    case 'create':
      res = await json('POST', BASE, { ...formBody(action.form), status: 'draft' });
      break;
    case 'edit':
      res = await json('PATCH', one, formBody(action.form));
      break;
    case 'status':
      res = await json('PATCH', one, { status: action.status });
      break;
    case 'publish':
      res = await fetch(`${one}/publish`, { method: 'POST' });
      break;
    case 'supersede':
      res = await json('POST', `${one}/supersede`, {});
      break;
    case 'pin':
      res = await json('PATCH', one, { pinned: Boolean(action.value) });
      break;
    case 'exemplar':
      res = await json('PATCH', one, { is_exemplar: Boolean(action.value) });
      break;
    case 'delete':
      res = await fetch(one, { method: 'DELETE' });
      break;
    case 'comment':
      res = await json('POST', `${one}/comments`, {
        body: action.body,
        is_review_block: Boolean(action.block),
      });
      break;
    case 'resolve':
      res = await json('PATCH', `${one}/comments`, {
        comment_id: action.commentId,
        resolved: Boolean(action.resolved),
      });
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
    case 'handoff':
      res = await json('POST', `${BASE}/coverage-lineage`, {
        ticker: action.ticker,
        from_member_id: action.from || null,
        to_member_id: action.to || null,
        handoff_note_id: action.noteId || null,
        term: action.term || null,
      });
      break;
    default:
      return { ok: false, error: 'Unknown action' };
  }
  const data = await readJson(res);
  if (!res.ok) {
    return {
      ok: false,
      error: data?.error || null,
      blockers: res.status === 409 ? data?.blockers || [] : null,
    };
  }
  return { ok: true, id: data?.note?.id || null, archived: Boolean(data?.archived) };
}

/**
 * @param {{ enabled: boolean, initialData: object|null, sampleViewer: boolean,
 *           q: string, filters: object, initialKey: string }} opts
 */
export function useResearchData({ enabled, initialData, sampleViewer, q, filters, initialKey }) {
  const seeded = initialData?.library || null;
  const [live, setLive] = useState(() => (seeded ? { status: 'ready', data: seeded } : LOADING));
  const [sample, setSample] = useState(() =>
    sampleViewer ? { status: 'loading', bundle: null } : { status: 'ready', bundle: null },
  );
  const [showSample, setShowSample] = useState(true);
  const [lineage, setLineage] = useState(LOADING);
  const [sonar, setSonar] = useState(LOADING);
  const alive = useRef(true);
  const sampleRef = useRef(sample);
  sampleRef.current = sample;
  const loadedKey = useRef(seeded ? initialKey : null);
  const queryRef = useRef({ q, filters });
  queryRef.current = { q, filters };
  const cache = useRef({});

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const sampleAvailable = Boolean(sample.bundle);
  const sampleActive = sampleAvailable && showSample;
  const activeRef = useRef(sampleActive);
  activeRef.current = sampleActive;

  /* ── Library ── */
  const loadLibrary = useCallback(async ({ quiet = false } = {}) => {
    const { q: query, filters: f } = queryRef.current;
    const key = searchQuery(query, f);
    if (!quiet) setLive((s) => ({ status: 'loading', data: s.data }));
    let next;
    try {
      const { res, data } = await getJson(`${BASE}/search?${key}`);
      if (res.status === 403) next = { status: 'forbidden', data: null };
      else if (!res.ok) next = { status: 'error', data: null };
      else next = { status: 'ready', data };
    } catch {
      next = { status: 'error', data: null };
    }
    if (!alive.current) return;
    /* Only the answer to the latest query is kept. */
    if (searchQuery(queryRef.current.q, queryRef.current.filters) !== key) return;
    loadedKey.current = key;
    /* A quiet refresh that fails keeps the rows already on the page. */
    setLive((s) => (quiet && next.status !== 'ready' && s.data ? s : next));
  }, []);

  const key = searchQuery(q, filters);
  useEffect(() => {
    if (!enabled || sampleActive) return;
    if (loadedKey.current === key) return;
    loadLibrary();
  }, [enabled, sampleActive, key, loadLibrary]);

  /* ── Coverage lineage (stale tickers, handoffs) and Sonar reports ── */
  const loadLineage = useCallback(async () => {
    setLineage(LOADING);
    try {
      const { res, data } = await getJson(`${BASE}/coverage-lineage`);
      if (alive.current) setLineage(res.ok ? { status: 'ready', data } : { status: 'error' });
    } catch {
      if (alive.current) setLineage({ status: 'error', data: null });
    }
  }, []);
  const loadSonar = useCallback(async () => {
    setSonar(LOADING);
    try {
      const { res, data } = await getJson('/api/org/sonar-reports');
      if (alive.current)
        setSonar(res.ok ? { status: 'ready', data: data.reports || [] } : { status: 'error' });
    } catch {
      if (alive.current) setSonar({ status: 'error', data: null });
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    loadLineage();
    loadSonar();
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
  }, [enabled, sampleViewer, loadLineage, loadSonar]);

  /* What the page draws. */
  let library = live;
  let lineageOut = lineage;
  let sonarOut = sonar;
  if (!enabled || sample.status === 'loading') {
    library = LOADING;
    lineageOut = LOADING;
    sonarOut = LOADING;
  } else if (sampleActive) {
    library = { status: 'ready', data: deriveLibrary(sample.bundle, q, filters) };
    lineageOut = { status: 'ready', data: deriveLineage(sample.bundle) };
    sonarOut = { status: 'ready', data: sample.bundle.sonar };
  }

  /* ── Lazy reference lists ── */
  const lazy = useCallback(async (name, url, pick) => {
    if (activeRef.current) {
      const b = sampleRef.current.bundle;
      return { status: 'ready', data: b[name] || [] };
    }
    if (cache.current[name]) return cache.current[name];
    try {
      const { res, data } = await getJson(url);
      if (!res.ok) return { status: 'error', data: null };
      const out = { status: 'ready', data: pick(data) };
      cache.current[name] = out;
      return out;
    } catch {
      return { status: 'error', data: null };
    }
  }, []);
  const getTemplates = useCallback(
    () => lazy('templates', `${BASE}/templates`, (d) => d.templates || []),
    [lazy],
  );
  const getPitches = useCallback(
    () => lazy('pitches', '/api/org/pitches', (d) => d.pitches || []),
    [lazy],
  );
  const getMembers = useCallback(
    () => lazy('members', '/api/org/members', (d) => d.members || []),
    [lazy],
  );

  /* ── One document ── */
  const loadDetail = useCallback(async (noteId) => {
    if (activeRef.current) {
      const d = deriveDetail(sampleRef.current.bundle, noteId);
      return d ? { status: 'ready', data: { ...d, fetchedAt: Date.now() } } : { status: 'missing' };
    }
    const one = `${BASE}/${encodeURIComponent(noteId)}`;
    try {
      const [n, v, c, a] = await Promise.all([
        getJson(one),
        getJson(`${one}/versions`).catch(() => null),
        getJson(`${one}/comments`).catch(() => null),
        getJson(`${one}/attachments`).catch(() => null),
      ]);
      if (n.res.status === 404) return { status: 'missing' };
      if (!n.res.ok) return { status: 'error' };
      const okOf = (x) => Boolean(x && x.res.ok);
      return {
        status: 'ready',
        data: {
          note: n.data.note,
          supersededBy: n.data.supersededBy || null,
          versions: okOf(v) ? v.data.versions || [] : [],
          versionsFailed: !okOf(v),
          comments: okOf(c) ? c.data.comments || [] : [],
          openBlocks: okOf(c) ? c.data.openBlocks || 0 : 0,
          commentsFailed: !okOf(c),
          attachments: okOf(a) ? a.data.attachments || [] : [],
          filesFailed: !okOf(a),
          fetchedAt: Date.now(),
        },
      };
    } catch {
      return { status: 'error' };
    }
  }, []);

  /** Fresh file rows with new download links (the server's links last five minutes). */
  const loadFiles = useCallback(async (noteId) => {
    if (activeRef.current) {
      const d = deriveDetail(sampleRef.current.bundle, noteId);
      return { ok: true, attachments: d?.attachments || [], fetchedAt: Date.now() };
    }
    try {
      const { res, data } = await getJson(`${BASE}/${encodeURIComponent(noteId)}/attachments`);
      if (!res.ok) return { ok: false };
      return { ok: true, attachments: data.attachments || [], fetchedAt: Date.now() };
    } catch {
      return { ok: false };
    }
  }, []);

  const countOpen = useCallback((noteId, kind) => {
    if (activeRef.current) return;
    fetch(`${BASE}/${encodeURIComponent(noteId)}/${kind === 'download' ? 'download' : 'view'}`, {
      method: 'POST',
    }).catch(() => {});
  }, []);

  /* ── Ticker dossier and coverage chain ── */
  const loadDossier = useCallback(async (ticker) => {
    if (activeRef.current)
      return { status: 'ready', data: deriveDossier(sampleRef.current.bundle, ticker) };
    try {
      const { res, data } = await getJson(`${BASE}/dossier/${encodeURIComponent(ticker)}`);
      return res.ok ? { status: 'ready', data } : { status: 'error' };
    } catch {
      return { status: 'error' };
    }
  }, []);
  const loadChain = useCallback(async (ticker) => {
    if (activeRef.current)
      return { status: 'ready', data: deriveChain(sampleRef.current.bundle, ticker) };
    try {
      const { res, data } = await getJson(
        `${BASE}/coverage-lineage?ticker=${encodeURIComponent(ticker)}`,
      );
      return res.ok ? { status: 'ready', data } : { status: 'error' };
    } catch {
      return { status: 'error' };
    }
  }, []);

  /* ── Assistant summaries (written on request, not stored) ── */
  const summarize = useCallback(async ({ noteId, ids, label }) => {
    if (activeRef.current) return { ok: false, sample: true };
    try {
      const res = noteId
        ? await fetch(`${BASE}/${encodeURIComponent(noteId)}/summary`, { method: 'POST' })
        : await fetch(`${BASE}/summary`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note_ids: (ids || []).slice(0, 40), label }),
          });
      const data = await readJson(res);
      if (!res.ok || !data.summary) return { ok: false };
      return { ok: true, summary: String(data.summary) };
    } catch {
      return { ok: false };
    }
  }, []);

  /**
   * Run one action. Sample rows change on the page only. Live actions send
   * one request, then refresh the library, the coverage and the sidebar.
   */
  const act = useCallback(
    async (action) => {
      if (activeRef.current) {
        const res = applySampleAction(sampleRef.current.bundle, action);
        if (res.ok) {
          sampleRef.current = { status: 'ready', bundle: res.bundle };
          setSample(sampleRef.current);
        }
        return {
          ok: res.ok,
          error: res.error || null,
          blockers: res.blockers || null,
          id: res.id || null,
          archived: Boolean(res.archived),
        };
      }
      let out;
      try {
        out = await sendLive(action);
      } catch {
        return { ok: false, error: 'connect' };
      }
      if (out.ok || action.type === 'create') {
        await loadLibrary({ quiet: true });
        if (['create', 'edit', 'delete', 'handoff', 'publish'].includes(action.type)) loadLineage();
        if (typeof window !== 'undefined') window.dispatchEvent(new Event(REFRESH_EVENT));
      }
      return out;
    },
    [loadLibrary, loadLineage],
  );

  return {
    library,
    lineage: lineageOut,
    sonar: sonarOut,
    retryLibrary: loadLibrary,
    retryLineage: loadLineage,
    retrySonar: loadSonar,
    getTemplates,
    getPitches,
    getMembers,
    loadDetail,
    loadFiles,
    countOpen,
    loadDossier,
    loadChain,
    summarize,
    act,
    sampleActive,
    sampleAvailable,
    setShowSample,
  };
}

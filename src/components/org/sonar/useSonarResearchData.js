'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { filterReports, hasFilters, serverQuery } from '@/lib/org-sonar-research-model';
import {
  applySampleAction,
  sampleAnalytics,
  sampleBudget,
  sampleComments,
  sampleDetail,
  samplePitches,
  sampleReports,
} from '@/lib/org-sonar-research-sample';

/**
 * Data for Sonar Research.
 *
 * Every read and write goes through routes that already exist, as the
 * signed-in member; the server and the row policies decide what each member
 * may read and do. Each section loads on its own, so one failure leaves the
 * rest of the page working and offers Retry where it happened.
 *
 * Sample content: master admin and demo accounts also receive a sample
 * bundle. While it shows, every section is answered from the bundle (with the
 * same rules the routes use), each action is applied to it on the page, and
 * nothing is sent anywhere.
 */
export const SAMPLE_URL = '/api/org/sonar-reports/sample';
const LOADING = { status: 'loading', data: null };

async function readJson(res) {
  return res.json().catch(() => ({}));
}

async function getJson(url) {
  try {
    const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
    if (res.status === 403) return { status: 'forbidden', data: null };
    if (res.status === 404) return { status: 'missing', data: null };
    const body = await readJson(res);
    if (!res.ok) return { status: 'error', data: null, error: body?.error || null };
    return { status: 'ready', data: body };
  } catch {
    return { status: 'error', data: null };
  }
}

async function send(method, url, body) {
  try {
    const res = await fetch(url, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await readJson(res);
    if (!res.ok) return { ok: false, error: data?.error || 'That did not work. Try again.' };
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'Could not connect. Nothing was changed.' };
  }
}

/* One request per action, to the existing routes. */
function sendLive(a) {
  const one = `/api/org/sonar-reports/${encodeURIComponent(a.reportId || '')}`;
  switch (a.type) {
    case 'status':
      return send('PATCH', one, {
        status: a.status,
        ...(typeof a.reviewNote === 'string' ? { reviewNote: a.reviewNote } : {}),
      });
    case 'settings':
      return send('PATCH', one, a.patch);
    case 'collection':
      return send('PATCH', one, { collectionId: a.collectionId, inCollection: a.inCollection });
    case 'delete':
      return send('DELETE', one);
    case 'comment':
      return send('POST', `${one}/comments`, {
        body: a.body,
        anchor: a.anchor,
        version: a.version,
        ...(a.parentId ? { parentId: a.parentId } : {}),
      });
    case 'resolve':
      return send('PATCH', `${one}/comments`, { commentId: a.commentId, resolved: a.resolved });
    case 'budget':
      return send('PATCH', '/api/org/sonar-budget', {
        ...(Number.isInteger(a.pool) ? { monthlyDeepRuns: a.pool } : {}),
        ...(a.allocations?.length ? { allocations: a.allocations } : {}),
      });
    default:
      return Promise.resolve({ ok: false, error: 'Unknown action' });
  }
}

/** The sample bundle, for master admin and demo accounts. */
function useSample(enabled, sampleViewer) {
  const [sample, setSample] = useState(() =>
    sampleViewer ? { status: 'loading', raw: null } : { status: 'ready', raw: null },
  );
  const [showSample, setShowSample] = useState(true);
  const ref = useRef(sample);
  ref.current = sample;
  useEffect(() => {
    if (!enabled || !sampleViewer) return undefined;
    let live = true;
    (async () => {
      const r = await getJson(SAMPLE_URL);
      if (live) setSample({ status: 'ready', raw: r.data?.sample?.raw || null });
    })();
    return () => {
      live = false;
    };
  }, [enabled, sampleViewer]);
  const update = useCallback((raw) => {
    ref.current = { status: 'ready', raw };
    setSample(ref.current);
  }, []);
  const available = Boolean(sample.raw);
  return {
    loading: sample.status === 'loading',
    raw: sample.raw,
    ref,
    update,
    available,
    active: available && showSample,
    setShowSample,
  };
}

/**
 * @param {{ enabled: boolean, sampleViewer: boolean, filters: object, windowDays: string }} opts
 */
export function useSonarResearchData({ enabled, sampleViewer, filters, windowDays }) {
  const sample = useSample(enabled, sampleViewer);
  const [reports, setReports] = useState(LOADING);
  const [archive, setArchive] = useState(LOADING);
  const [budget, setBudget] = useState(LOADING);
  const [analytics, setAnalytics] = useState(LOADING);
  const [pitches, setPitches] = useState(LOADING);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const set = (fn) => (v) => alive.current && fn(v);

  const live = enabled && !sample.loading && !sample.active;
  const filtered = hasFilters(filters);
  const query = serverQuery(filters);

  const loadReports = useCallback(async () => {
    setReports(LOADING);
    set(setReports)(await getJson('/api/org/sonar-reports'));
  }, []);
  const loadArchive = useCallback(async () => {
    setArchive(LOADING);
    set(setArchive)(await getJson(`/api/org/sonar-reports?${query}`));
  }, [query]);
  const loadBudget = useCallback(async () => {
    setBudget(LOADING);
    set(setBudget)(await getJson('/api/org/sonar-budget'));
  }, []);
  const loadAnalytics = useCallback(async () => {
    setAnalytics(LOADING);
    set(setAnalytics)(await getJson(`/api/org/sonar-analytics?days=${windowDays}`));
  }, [windowDays]);
  const loadPitches = useCallback(async () => {
    setPitches(LOADING);
    set(setPitches)(await getJson('/api/org/pitches'));
  }, []);

  useEffect(() => {
    if (!live) return;
    loadReports();
    loadBudget();
    loadPitches();
  }, [live, loadReports, loadBudget, loadPitches]);
  useEffect(() => {
    if (live && filtered) loadArchive();
  }, [live, filtered, loadArchive]);
  useEffect(() => {
    if (live) loadAnalytics();
  }, [live, loadAnalytics]);

  /* Sample views, in the live shapes. */
  const S = sample.raw;
  const sampleView = useMemo(() => {
    if (!sample.active || !S) return null;
    const list = sampleReports(S);
    return {
      reports: { status: 'ready', data: list },
      archive: {
        status: 'ready',
        data: { ...list, reports: filterReports(list.reports, filters, list.viewer.userId) },
      },
      budget: { status: 'ready', data: sampleBudget(S) },
      analytics: { status: 'ready', data: sampleAnalytics(S, windowDays) },
      pitches: { status: 'ready', data: samplePitches(S) },
    };
  }, [sample.active, S, filters, windowDays]);

  const waiting = !enabled || sample.loading;
  const pick = (liveState, key) => (waiting ? LOADING : sampleView ? sampleView[key] : liveState);

  const reportsState = pick(reports, 'reports');
  /* Visibility is filtered on the page for live rows (the route has no such filter). */
  const archiveLive = !filtered
    ? reports
    : archive.status === 'ready'
      ? {
          ...archive,
          data: {
            ...archive.data,
            reports: filterReports(
              archive.data?.reports || [],
              filters,
              archive.data?.viewer?.userId,
            ),
          },
        }
      : archive;
  const archiveState = pick(archiveLive, 'archive');

  const act = useCallback(
    async (action) => {
      if (sample.active) {
        const res = applySampleAction(sample.ref.current.raw, action);
        if (res.ok) sample.update(res.raw);
        return { ok: res.ok, error: res.error || null, sample: true };
      }
      const out = await sendLive(action);
      if (out.ok) {
        if (action.type === 'budget') loadBudget();
        else {
          loadReports();
          if (filtered) loadArchive();
        }
      }
      return out;
    },
    [sample, loadBudget, loadReports, loadArchive, filtered],
  );

  return {
    sampleActive: sample.active,
    sampleAvailable: sample.available,
    setShowSample: sample.setShowSample,
    reports: reportsState,
    archive: archiveState,
    budget: pick(budget, 'budget'),
    analytics: pick(analytics, 'analytics'),
    pitches: pick(pitches, 'pitches'),
    retry: {
      reports: () => {
        loadReports();
        if (filtered) loadArchive();
      },
      budget: loadBudget,
      analytics: loadAnalytics,
      pitches: loadPitches,
    },
    act,
  };
}

/**
 * One report, its comments and the viewer's rights. A sample report (its id
 * starts with "sample-") is answered from the sample bundle for master admin
 * and demo accounts only.
 */
export function useSonarReport({ reportId, version, sampleViewer }) {
  const isSample = String(reportId || '').startsWith('sample-');
  const sample = useSample(true, sampleViewer && isSample);
  const [detail, setDetail] = useState(LOADING);
  const [comments, setComments] = useState(LOADING);
  const [gone, setGone] = useState(false);

  const fromSample = isSample && sampleViewer;
  const loadDetail = useCallback(async () => {
    setDetail((d) => ({ status: 'loading', data: d.data }));
    const r = await getJson(
      `/api/org/sonar-reports/${encodeURIComponent(reportId)}${version ? `?v=${version}` : ''}`,
    );
    setDetail(r);
  }, [reportId, version]);
  const loadComments = useCallback(async () => {
    setComments(LOADING);
    setComments(await getJson(`/api/org/sonar-reports/${encodeURIComponent(reportId)}/comments`));
  }, [reportId]);

  useEffect(() => {
    if (fromSample) return;
    loadDetail();
  }, [fromSample, loadDetail]);
  useEffect(() => {
    if (fromSample) return;
    loadComments();
  }, [fromSample, loadComments]);

  let detailState = detail;
  let commentsState = comments;
  if (fromSample) {
    if (sample.loading) {
      detailState = LOADING;
      commentsState = LOADING;
    } else if (!sample.raw) {
      detailState = { status: 'missing', data: null };
      commentsState = { status: 'ready', data: { comments: [] } };
    } else {
      const d = sampleDetail(sample.raw, reportId, version || null);
      detailState = d ? { status: 'ready', data: d } : { status: 'missing', data: null };
      commentsState = { status: 'ready', data: sampleComments(sample.raw, reportId) };
    }
  }

  const act = useCallback(
    async (action) => {
      const a = { ...action, reportId };
      if (fromSample) {
        const res = applySampleAction(sample.ref.current.raw, a);
        if (res.ok) {
          sample.update(res.raw);
          if (a.type === 'delete') setGone(true);
        }
        return { ok: res.ok, error: res.error || null, sample: true };
      }
      const out = await sendLive(a);
      if (out.ok) {
        if (a.type === 'delete') setGone(true);
        else if (a.type === 'comment' || a.type === 'resolve') loadComments();
        else loadDetail();
      }
      return out;
    },
    [fromSample, sample, reportId, loadComments, loadDetail],
  );

  /** Members and pitches for the sharing dialog. */
  const loadLists = useCallback(async () => {
    if (fromSample) {
      const raw = sample.ref.current.raw;
      return {
        ok: true,
        members: (raw?.members || []).filter((m) => m.user_id !== raw?.viewer?.userId),
        pitches: raw?.pitches || [],
      };
    }
    const [m, p] = await Promise.all([getJson('/api/org/members'), getJson('/api/org/pitches')]);
    return {
      ok: m.status === 'ready' && p.status === 'ready',
      members: (m.data?.members || []).filter((x) => x.is_active !== false),
      pitches: p.data?.pitches || [],
    };
  }, [fromSample, sample.ref]);

  return {
    isSample: fromSample,
    loadLists,
    detail: detailState,
    comments: commentsState,
    gone,
    retry: { detail: loadDetail, comments: loadComments },
    act,
  };
}

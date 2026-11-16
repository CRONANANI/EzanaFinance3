'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DEFAULT_PERIOD, cleanPeriod } from '@/lib/org-reports-model';

/**
 * Data for Reports.
 *
 * Live: the saved reports (summarised) and the newest in full come from
 * GET /api/org/reports as the signed-in member; the server decides access
 * (role and the advisor's export setting) and RLS stays underneath. The
 * check before saving is a dry run of the same POST, which saves nothing.
 *
 * Sample content: master admin and demo accounts also receive three sample
 * reports. While they show, generating adds a row on the page only, deleting
 * removes it on the page only, and nothing is sent anywhere.
 */
const URL_LIST = '/api/org/reports';
const URL_SAMPLE = '/api/org/reports/sample';

async function getJson(url, opts) {
  const res = await fetch(url, { cache: 'no-store', ...opts });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

const post = (body) =>
  getJson(URL_LIST, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

export function useReportsData({ sampleViewer }) {
  const [live, setLive] = useState({ status: 'loading', reports: [], latest: null, viewer: null });
  const [sample, setSample] = useState(() =>
    sampleViewer ? { status: 'loading', bundle: null } : { status: 'ready', bundle: null },
  );
  const [showSample, setShowSample] = useState(true);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLive((s) => ({ ...s, status: 'loading' }));
    let next;
    try {
      const r = await getJson(URL_LIST);
      if (r.status === 403) next = { status: 'forbidden', reports: [], latest: null, viewer: null };
      else if (!r.ok) next = { status: 'error', reports: [], latest: null, viewer: null };
      else
        next = {
          status: 'ready',
          reports: r.data.reports || [],
          latest: r.data.latest || null,
          viewer: r.data.viewer || null,
        };
    } catch {
      next = { status: 'error', reports: [], latest: null, viewer: null };
    }
    if (!alive.current) return;
    setLive((s) => (quiet && next.status === 'error' && s.status === 'ready' ? s : next));
  }, []);

  useEffect(() => {
    load();
    if (!sampleViewer) return;
    (async () => {
      let bundle = null;
      try {
        const r = await getJson(URL_SAMPLE);
        if (r.ok) bundle = r.data?.sample || null;
      } catch {
        bundle = null;
      }
      if (alive.current) setSample({ status: 'ready', bundle });
    })();
  }, [sampleViewer, load]);

  const sampleAvailable = Boolean(sample.bundle);
  /* Sample content is only for members who could use the page anyway. */
  const liveAccess = live.viewer?.access || null;
  const sampleActive =
    sampleAvailable && showSample && (liveAccess === null || liveAccess === 'ok');
  const sampleLoading = sampleViewer && sample.status === 'loading';

  const view = useMemo(() => {
    if (sampleActive) {
      const b = sample.bundle;
      return {
        status: 'ready',
        reports: b.reports,
        latest: b.latest,
        viewer: {
          access: 'ok',
          canGenerate: true,
          canDelete: true,
          exportScope: live.viewer?.exportScope || 'exec_pm_advisor',
        },
        council: b.council,
      };
    }
    if (sampleLoading && live.status === 'ready' && live.reports.length === 0) {
      return { ...live, status: 'loading' };
    }
    return live;
  }, [sampleActive, sample.bundle, sampleLoading, live]);

  /** The check before saving. Returns { ok, preview, status }. */
  const check = useCallback(
    async ({ period, includeRoster, includeNames }) => {
      if (sampleActive) {
        const base = sample.bundle.reports[0];
        return {
          ok: true,
          preview: {
            ...base,
            id: null,
            title: `${sample.bundle.council} fund report, ${cleanPeriod(period)}`,
            period: cleanPeriod(period),
            createdAt: new Date().toISOString(),
            includeRoster,
            includeNames,
          },
        };
      }
      try {
        const r = await post({
          period_label: period || DEFAULT_PERIOD,
          include_roster: includeRoster,
          include_analyst_names: includeNames,
          dry_run: true,
        });
        return {
          ok: r.ok,
          preview: r.data?.preview || null,
          status: r.status,
          error: r.data?.error,
        };
      } catch {
        return { ok: false, preview: null, status: 0 };
      }
    },
    [sampleActive, sample.bundle],
  );

  /** Save a report. Returns { ok, id, sample, status }. */
  const save = useCallback(
    async ({ period, includeRoster, includeNames }, preview) => {
      if (sampleActive) {
        const row = {
          ...preview,
          id: `sample-local-${Date.now()}`,
          author: preview.author,
          local: true,
          is_demo: true,
        };
        setSample((s) => ({
          ...s,
          bundle: { ...s.bundle, reports: [row, ...s.bundle.reports] },
        }));
        return { ok: true, id: null, sample: true };
      }
      let r;
      try {
        r = await post({
          period_label: period || DEFAULT_PERIOD,
          include_roster: includeRoster,
          include_analyst_names: includeNames,
        });
      } catch {
        return { ok: false, status: 0 };
      }
      if (r.ok) await load({ quiet: true });
      return { ok: r.ok, id: r.data?.report?.id || null, status: r.status, error: r.data?.error };
    },
    [sampleActive, load],
  );

  /** Delete a report. Returns { ok, sample, status }. */
  const remove = useCallback(
    async (id) => {
      if (sampleActive) {
        setSample((s) => {
          const reports = s.bundle.reports.filter((x) => x.id !== id);
          const latest = s.bundle.latest && s.bundle.latest.id === id ? null : s.bundle.latest;
          return { ...s, bundle: { ...s.bundle, reports, latest } };
        });
        return { ok: true, sample: true };
      }
      let r;
      try {
        r = await getJson(`${URL_LIST}/${encodeURIComponent(id)}`, { method: 'DELETE' });
      } catch {
        return { ok: false, status: 0 };
      }
      if (r.ok || r.status === 404) await load({ quiet: true });
      return { ok: r.ok, status: r.status };
    },
    [sampleActive, load],
  );

  return {
    view,
    sampleActive,
    sampleAvailable: sampleAvailable && (liveAccess === null || liveAccess === 'ok'),
    setShowSample,
    check,
    save,
    remove,
    refresh: () => load({ quiet: live.status === 'ready' }),
    retry: () => load(),
  };
}

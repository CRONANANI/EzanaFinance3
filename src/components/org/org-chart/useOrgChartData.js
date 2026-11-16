'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { applyMemberEdit, applyRankChange, withEditRights } from '@/lib/org-chart-model';

/**
 * Data for the Org chart. Two resources, each with its own state
 * ({ status: 'loading' | 'ready' | 'error', data }), so a failed request shows
 * as a failure with Retry in the sections that need it, never as an empty
 * council:
 *
 *   chart    members, ranks, teams, coverage, edit rights, the rank log
 *   summary  the fund book's totals and each sector team's sleeve
 *
 * Both arrive with the page (`initialData`) when the server could load them;
 * anything missing is fetched. Every read and write goes through routes that
 * already exist, as the signed-in member. The server decides what each member
 * may change; the page only hides what would be refused.
 *
 * Sample content: master admin and demo accounts also receive a sample
 * bundle. While it shows, both resources are answered from the bundle, and a
 * rank change, member edit or coverage assignment is applied to the page only.
 * Nothing is sent anywhere.
 */
const CHART_URL = '/api/org/chart';
const SUMMARY_URL = '/api/org/team-hub/summary';
const SAMPLE_URL = '/api/org/chart/sample';
const LOADING = { status: 'loading', data: null };
const NONE = [];

async function getJson(url) {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('request failed');
  return res.json();
}

async function send(url, body) {
  let res;
  try {
    res = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: 'Could not reach the server. Nothing was saved.' };
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: json?.error || 'Could not save. Nothing was changed.' };
  return { ok: true, json };
}

const ready = (data) => ({ status: 'ready', data });

/**
 * @param {{ enabled: boolean, initialData: {chart?: object, summary?: object}|null,
 *           sampleViewer: boolean }} opts
 */
export function useOrgChartData({ enabled, initialData, sampleViewer }) {
  const [live, setLive] = useState(() => ({
    chart: initialData?.chart ? ready(initialData.chart) : LOADING,
    summary: initialData?.summary ? ready(initialData.summary) : LOADING,
  }));
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

  /* `quiet` keeps what is on the page while a fresh copy loads (after a save). */
  const load = useCallback(async (key, quiet = false) => {
    if (!quiet) setLive((s) => ({ ...s, [key]: LOADING }));
    try {
      const data = await getJson(key === 'chart' ? CHART_URL : SUMMARY_URL);
      if (alive.current) setLive((s) => ({ ...s, [key]: ready(data) }));
    } catch {
      /* A quiet refresh that fails leaves the page as the save left it. */
      if (alive.current && !quiet)
        setLive((s) => ({ ...s, [key]: { status: 'error', data: null } }));
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    if (liveRef.current.chart.status !== 'ready') load('chart');
    if (liveRef.current.summary.status !== 'ready') load('summary');
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

  const sampleAvailable = Boolean(sample.bundle);
  const sampleActive = sampleAvailable && showSample;

  const resource = useCallback(
    (key) => {
      if (!enabled || sample.status === 'loading') return LOADING;
      if (sampleActive) return ready(sample.bundle[key]);
      return live[key] || LOADING;
    },
    [enabled, sample, sampleActive, live],
  );

  const retry = useCallback(
    (...keys) => {
      if (sampleActive) return;
      keys.forEach((k) => load(k));
    },
    [sampleActive, load],
  );

  const patchSampleChart = useCallback((fn) => {
    setSample((s) => (s.bundle ? { ...s, bundle: { ...s.bundle, chart: fn(s.bundle.chart) } } : s));
  }, []);
  const patchLiveChart = useCallback((fn) => {
    setLive((s) => (s.chart.data ? { ...s, chart: ready(fn(s.chart.data)) } : s));
  }, []);

  /**
   * Save member edits (title, manager, term dates, graduating marker and
   * covered sectors) through the existing chart route: one request per body.
   * Stops at the first refusal and says how many were saved.
   */
  const saveMembers = useCallback(
    async (bodies) => {
      const list = (Array.isArray(bodies) ? bodies : [bodies]).filter(Boolean);
      if (list.length === 0) return { ok: true, sample: sampleActive };
      const apply = (chart, body) => {
        const rights = withEditRights(applyMemberEdit(chart.members, body), chart.viewer?.memberId);
        return { ...chart, members: rights.members };
      };
      if (sampleActive) {
        list.forEach((body) => patchSampleChart((c) => apply(c, body)));
        return { ok: true, sample: true };
      }
      let saved = 0;
      for (const body of list) {
        const res = await send(CHART_URL, body);
        if (!res.ok) {
          if (saved > 0) load('chart', true);
          return {
            ok: false,
            error:
              saved > 0 ? `${res.error} ${saved} of ${list.length} changes were saved.` : res.error,
          };
        }
        saved += 1;
        patchLiveChart((c) => apply(c, body));
      }
      load('chart', true);
      return { ok: true };
    },
    [sampleActive, patchSampleChart, patchLiveChart, load],
  );

  /** Change a member's rank through the existing rank route. */
  const changeRank = useCallback(
    async (memberId, tierId) => {
      if (sampleActive) {
        const next = applyRankChange(sample.bundle.chart, memberId, tierId);
        if (!next) return { ok: false, error: 'You cannot give this member that rank.' };
        patchSampleChart(() => next);
        return { ok: true, sample: true };
      }
      const res = await send(`/api/org/members/${encodeURIComponent(memberId)}/role`, {
        tier: tierId,
      });
      if (!res.ok) return res;
      const row = res.json?.member || null;
      if (row) {
        patchLiveChart((c) => {
          const rights = withEditRights(
            c.members.map((m) => (m.id === memberId ? { ...m, ...row } : m)),
            c.viewer?.memberId,
          );
          return { ...c, members: rights.members };
        });
      }
      load('chart', true);
      return { ok: true };
    },
    [sampleActive, sample.bundle, patchSampleChart, patchLiveChart, load],
  );

  return {
    resource,
    retry,
    saveMembers,
    changeRank,
    sampleActive,
    sampleAvailable,
    setShowSample,
    sampleScorecard: (memberId) =>
      sampleActive ? sample.bundle.scorecards?.[memberId] || null : undefined,
    sampleBadges: (memberId) =>
      sampleActive ? sample.bundle.badges?.[memberId] || NONE : undefined,
  };
}

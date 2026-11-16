'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  applySampleAction,
  evaluateHoldings,
  evaluateProposal,
  ruleBody,
} from '@/lib/org-compliance-model';

/**
 * Data for Compliance.
 *
 * Live: rules and open breaches arrive with the page when the server could
 * load them; holdings readings (the check route's portfolio mode, which logs
 * nothing), the resolved list and the activity log load here. Every read and
 * write goes through the existing routes as the signed-in member; the server
 * decides who may change rules or resolve.
 *
 * Sample content: master admin and demo accounts also receive a sample
 * bundle. While it shows, the page reads the bundle, every action is applied
 * to it on the page with the routes' checks, readings and idea checks run the
 * same rule engine locally, and nothing is sent anywhere.
 */
const RULES_URL = '/api/org/ips/rules';
const BREACH_URL = '/api/org/ips/violations';
const CHECK_URL = '/api/org/ips/check';
const SAMPLE_URL = '/api/org/ips/sample';
const NAV_REFRESH = 'ezana:org-nav-counts-refresh';

async function getJson(url, opts) {
  const res = await fetch(url, { cache: 'no-store', ...opts });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

const send = (url, method, body) =>
  getJson(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

/**
 * @param {{ initialData: object|null, sampleViewer: boolean, role: string|null, actorName?: string }} opts
 */
export function useComplianceData({ initialData, sampleViewer, role, actorName }) {
  const [live, setLive] = useState(() =>
    initialData
      ? { status: 'ready', ...initialData }
      : { status: 'loading', rules: [], violations: [] },
  );
  const [holdings, setHoldings] = useState({ status: 'loading', data: null });
  const [resolvedList, setResolvedList] = useState({ status: 'idle', list: [] });
  const [sample, setSample] = useState(() =>
    sampleViewer ? { status: 'loading', bundle: null } : { status: 'ready', bundle: null },
  );
  const [showSample, setShowSample] = useState(true);
  const [logKey, setLogKey] = useState(0);
  const alive = useRef(true);
  const hadInitial = useRef(Boolean(initialData));

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const loadHoldings = useCallback(async () => {
    setHoldings((h) => ({ status: 'loading', data: h.data }));
    try {
      const r = await send(CHECK_URL, 'POST', { mode: 'portfolio' });
      if (!alive.current) return;
      setHoldings(r.ok ? { status: 'ready', data: r.data } : { status: 'error', data: null });
    } catch {
      if (alive.current) setHoldings({ status: 'error', data: null });
    }
  }, []);

  const loadRules = useCallback(async () => {
    const r = await getJson(RULES_URL);
    if (!r.ok) throw Object.assign(new Error('rules'), { status: r.status });
    return { rules: r.data.rules || [], canEdit: Boolean(r.data.viewer?.canEdit) };
  }, []);

  const loadOpen = useCallback(async () => {
    const r = await getJson(BREACH_URL);
    if (!r.ok) throw Object.assign(new Error('breaches'), { status: r.status });
    return {
      violations: r.data.violations || [],
      canResolve: Boolean(r.data.viewer?.canResolve),
      resolutionStorage: Boolean(r.data.viewer?.resolutionStorage),
    };
  }, []);

  const loadResolved = useCallback(async () => {
    setResolvedList((s) => ({ status: 'loading', list: s.list }));
    try {
      const r = await getJson(`${BREACH_URL}?state=resolved`);
      if (!alive.current) return;
      setResolvedList(
        r.ok ? { status: 'ready', list: r.data.violations || [] } : { status: 'error', list: [] },
      );
    } catch {
      if (alive.current) setResolvedList({ status: 'error', list: [] });
    }
  }, []);

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      if (!quiet) setLive((s) => ({ ...s, status: 'loading' }));
      let next;
      try {
        const [a, b] = await Promise.all([loadRules(), loadOpen()]);
        next = { status: 'ready', ...a, ...b };
      } catch (e) {
        next = { status: e?.status === 403 ? 'forbidden' : 'error', rules: [], violations: [] };
      }
      if (!alive.current) return;
      setLive((s) => (quiet && next.status !== 'ready' && s.status === 'ready' ? s : next));
    },
    [loadRules, loadOpen],
  );

  useEffect(() => {
    if (!hadInitial.current) load();
    loadHoldings();
    if (!sampleViewer) return;
    (async () => {
      let bundle = null;
      try {
        const r = await getJson(SAMPLE_URL);
        if (r.ok) bundle = r.data?.sample || null;
      } catch {
        bundle = null;
      }
      if (alive.current) setSample({ status: 'ready', bundle });
    })();
  }, [sampleViewer, load, loadHoldings]);

  const sampleAvailable = Boolean(sample.bundle);
  const sampleActive = sampleAvailable && showSample;
  const sampleLoading = sampleViewer && sample.status === 'loading';

  /* What the page draws. Sample content replaces council data while shown. */
  const view = useMemo(() => {
    if (sampleActive) {
      const b = sample.bundle;
      return {
        status: 'ready',
        rules: b.rules,
        violations: b.violations,
        canEdit: role === 'executive',
        canResolve: role === 'executive' || role === 'portfolio_manager',
        /* Sample rows show resolver and reason only once the real council
           could store them, so the sample never promises more than exists. */
        resolutionStorage: Boolean(live.resolutionStorage),
        holdings: {
          status: 'ready',
          data: evaluateHoldings({ rules: b.rules, positions: b.positions }),
        },
        resolved: {
          status: 'ready',
          list: live.resolutionStorage
            ? b.resolved
            : b.resolved.map((v) => ({ ...v, resolved_by_name: null, resolution_reason: null })),
        },
        activity: b.activity,
      };
    }
    if (sampleLoading && live.status === 'ready' && !live.rules.length && !live.violations.length) {
      return {
        ...live,
        status: 'loading',
        holdings: { status: 'loading' },
        resolved: resolvedList,
      };
    }
    return { ...live, holdings, resolved: resolvedList, activity: null };
  }, [sampleActive, sample.bundle, role, live, holdings, resolvedList, sampleLoading]);

  const sampleAct = useCallback(
    (action) => {
      const r = applySampleAction(sample.bundle, action, { role, actorName });
      if (r.ok) setSample({ status: 'ready', bundle: r.bundle });
      return { ok: r.ok, error: r.ok ? null : r.error, sample: true };
    },
    [sample.bundle, role, actorName],
  );

  const afterRuleChange = useCallback(async () => {
    try {
      const a = await loadRules();
      if (alive.current) setLive((s) => ({ ...s, ...a, status: 'ready' }));
    } catch {
      /* The change itself succeeded; a later Refresh catches up. */
    }
    loadHoldings();
    setLogKey((k) => k + 1);
  }, [loadRules, loadHoldings]);

  /** Add, toggle or delete a rule. Returns { ok, error, status }. */
  const ruleAction = useCallback(
    async (action) => {
      if (sampleActive) return sampleAct(action);
      let r;
      try {
        if (action.type === 'add') r = await send(RULES_URL, 'POST', ruleBody(action.form));
        else if (action.type === 'toggle')
          r = await send(RULES_URL, 'POST', { id: action.id, is_active: !action.active });
        else r = await send(`${RULES_URL}?id=${encodeURIComponent(action.id)}`, 'DELETE');
      } catch {
        return { ok: false, error: null, status: 0 };
      }
      if (r.ok) await afterRuleChange();
      return { ok: r.ok, error: r.data?.error || null, status: r.status };
    },
    [sampleActive, sampleAct, afterRuleChange],
  );

  /** Resolve a breach. Returns { ok, error, status, reasonStored }. */
  const resolve = useCallback(
    async (id, reason) => {
      if (sampleActive) return sampleAct({ type: 'resolve', id, reason });
      let r;
      try {
        r = await send(BREACH_URL, 'PATCH', {
          id,
          resolved: true,
          ...(live.resolutionStorage ? { reason } : {}),
        });
      } catch {
        return { ok: false, error: null, status: 0 };
      }
      if (r.ok) {
        try {
          const b = await loadOpen();
          if (alive.current) setLive((s) => ({ ...s, ...b, status: 'ready' }));
        } catch {
          /* Refetch failed; Refresh catches up. */
        }
        if (resolvedList.status !== 'idle') loadResolved();
        setLogKey((k) => k + 1);
        if (typeof window !== 'undefined') window.dispatchEvent(new Event(NAV_REFRESH));
      }
      return {
        ok: r.ok,
        error: r.data?.error || null,
        status: r.status,
        reasonStored: Boolean(r.data?.reasonStored),
      };
    },
    [sampleActive, sampleAct, live.resolutionStorage, loadOpen, resolvedList.status, loadResolved],
  );

  /** Run the idea check. Saves nothing. Returns { ok, result, error }. */
  const runIdea = useCallback(
    async (inputs) => {
      const body = {
        ticker: inputs.ticker,
        sector: inputs.sector || null,
        sizePct: inputs.sizePct === '' ? null : Number(inputs.sizePct),
        marketCap: inputs.marketCap === '' ? null : Number(inputs.marketCap),
      };
      if (sampleActive) {
        const b = sample.bundle;
        return {
          ok: true,
          result: evaluateProposal({ rules: b.rules, positions: b.positions, ...body }),
        };
      }
      try {
        const r = await send(CHECK_URL, 'POST', body);
        if (!r.ok) return { ok: false, error: r.status === 403 ? 'forbidden' : 'error' };
        return { ok: true, result: r.data };
      } catch {
        return { ok: false, error: 'error' };
      }
    },
    [sampleActive, sample.bundle],
  );

  const refresh = useCallback(() => {
    load({ quiet: live.status === 'ready' });
    loadHoldings();
    if (resolvedList.status !== 'idle') loadResolved();
    setLogKey((k) => k + 1);
  }, [load, loadHoldings, loadResolved, live.status, resolvedList.status]);

  const ensureResolved = useCallback(() => {
    if (!sampleActive && resolvedList.status === 'idle') loadResolved();
  }, [sampleActive, resolvedList.status, loadResolved]);

  return {
    view,
    sampleActive,
    sampleAvailable,
    setShowSample,
    ruleAction,
    resolve,
    runIdea,
    refresh,
    retry: () => load(),
    retryHoldings: loadHoldings,
    retryResolved: loadResolved,
    ensureResolved,
    logKey,
  };
}

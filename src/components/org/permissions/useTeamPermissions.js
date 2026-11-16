'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { applyChange, cellState } from '@/lib/org-permissions-model';

/**
 * Data for Team Permissions.
 *
 * Live: the payload arrives with the page when the server could read it,
 * otherwise it is fetched here. Every change goes to the change route as the
 * signed-in member; the server decides (role can grant, direct report, the
 * grantor holds the right) and the page only mirrors that decision. A change
 * shows at once and is undone with the server's message when it is refused.
 *
 * Sample content: master admin and demo accounts also receive a sample
 * bundle with a few viewpoints. While it shows, changes follow the same cell
 * rules on the page and nothing is sent anywhere.
 */
const URL = '/api/org/permissions';
const SAMPLE_URL = '/api/org/permissions/sample';

async function getJson(url, opts) {
  const res = await fetch(url, { cache: 'no-store', ...opts });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export function useTeamPermissions({ initialData, sampleViewer }) {
  const [live, setLive] = useState(() =>
    initialData ? { status: 'ready', payload: initialData } : { status: 'loading', payload: null },
  );
  const [sample, setSample] = useState(() =>
    sampleViewer ? { status: 'loading', bundle: null } : { status: 'ready', bundle: null },
  );
  const [showSample, setShowSample] = useState(true);
  const [view, setView] = useState(null);
  const [saving, setSaving] = useState(null); // `${memberId}:${key}`
  const alive = useRef(true);
  const hadInitial = useRef(Boolean(initialData));

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
      const r = await getJson(URL);
      next = r.ok
        ? { status: 'ready', payload: r.data }
        : { status: r.status === 403 ? 'forbidden' : 'error', payload: null };
    } catch {
      next = { status: 'error', payload: null };
    }
    if (!alive.current) return;
    setLive((s) => (quiet && next.status !== 'ready' && s.status === 'ready' ? s : next));
  }, []);

  useEffect(() => {
    if (!hadInitial.current) load();
    if (!sampleViewer) return;
    (async () => {
      let bundle = null;
      try {
        const r = await getJson(SAMPLE_URL);
        if (r.ok) bundle = r.data?.sample || null;
      } catch {
        bundle = null;
      }
      if (!alive.current) return;
      setSample({ status: 'ready', bundle });
      if (bundle) setView(bundle.initial);
    })();
  }, [sampleViewer, load]);

  const sampleActive = Boolean(showSample && sample.bundle);
  const sampleLoading = sampleViewer && sample.status === 'loading';
  const viewKey = sampleActive ? view || sample.bundle.initial : null;
  const payload = sampleActive ? sample.bundle.payloads[viewKey] : live.payload;
  const status = sampleActive ? 'ready' : sampleLoading ? 'loading' : live.status;

  /**
   * Grant or revoke one right for one member.
   * @returns {Promise<{ ok: boolean, sample?: boolean, error?: string }>}
   */
  const change = useCallback(
    async (memberId, key, action) => {
      const current = sampleActive ? sample.bundle.payloads[viewKey] : live.payload;
      if (!current) return { ok: false, error: 'Nothing to change.' };
      const member = current.reports.find((m) => m.id === memberId);
      const v = current.viewer;
      const at = new Date().toISOString();
      const patch = { memberId, key, action, by: v.id, byName: v.name, at };

      if (sampleActive) {
        const state = member
          ? cellState({ member, key, canGrant: v.canGrant, grantable: v.grantable })
          : null;
        const allowed = action === 'grant' ? state === 'grant' : state === 'extra' && v.canGrant;
        if (!allowed) return { ok: false, error: 'That change is not allowed.' };
        const next = applyChange(current, patch);
        next.reports = next.reports.map((m) =>
          m.id === memberId ? { ...m, extras: m.extras.map((e) => ({ ...e, pending: false })) } : m,
        );
        setSample((s) => ({
          ...s,
          bundle: { ...s.bundle, payloads: { ...s.bundle.payloads, [viewKey]: next } },
        }));
        return { ok: true, sample: true };
      }

      setSaving(`${memberId}:${key}`);
      setLive((s) => ({ ...s, payload: applyChange(s.payload, patch) }));
      let res;
      try {
        res = await getJson(URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberId, permissionKey: key, action }),
        });
      } catch {
        res = { ok: false, data: {} };
      }
      if (!alive.current) return { ok: res.ok };
      setSaving(null);
      /* A refused change is undone at once; then, either way, show what the
         server now holds. */
      if (!res.ok) setLive({ status: 'ready', payload: current });
      await load({ quiet: true });
      if (!res.ok) {
        return {
          ok: false,
          error: res.data?.error || 'The change was not saved. Try again.',
        };
      }
      return { ok: true };
    },
    [sampleActive, sample.bundle, viewKey, live.payload, load],
  );

  return {
    status,
    payload,
    sampleActive,
    sampleAvailable: Boolean(sample.bundle),
    setShowSample,
    views: sampleActive ? sample.bundle.views : [],
    viewKey,
    setView,
    saving,
    change,
    retry: () => load(),
    refresh: () => (sampleActive ? undefined : load({ quiet: true })),
  };
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { sampleRespond } from '@/lib/org-cohorts-sample';

/**
 * Where Cohorts reads and writes.
 *
 * Council data goes through the cohort, applicant and alumni routes as the
 * signed-in member; the server decides what each member receives and may
 * change, and row-level rules stay the gate.
 *
 * Sample content: master admin and demo accounts also receive a sample
 * bundle. While it shows, every request is answered on the page by
 * `sampleRespond` with the routes' own checks, writes change the bundle on
 * the page only, and nothing is sent anywhere.
 *
 * `request(method, url, body)` resolves to { ok, status, json } and never
 * throws. `version` changes after every write, so sections reload.
 */
const SAMPLE_URL = '/api/org/cohorts/sample';

export function useCohortsSource({ sampleViewer }) {
  const [sample, setSample] = useState(() => ({
    status: sampleViewer ? 'loading' : 'ready',
    bundle: null,
  }));
  const [showSample, setShowSample] = useState(true);
  const [version, setVersion] = useState(0);
  const bundleRef = useRef(null);
  bundleRef.current = sample.bundle;
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  useEffect(() => {
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
  }, [sampleViewer]);

  const sampleAvailable = Boolean(sample.bundle);
  const sampleActive = sampleAvailable && showSample;
  const sampleLoading = sampleViewer && sample.status === 'loading';

  const request = useCallback(
    async (method, url, body) => {
      if (sampleActive && bundleRef.current) {
        const res = sampleRespond(bundleRef.current, { method, url, body });
        if (res.bundle && res.status < 300) {
          bundleRef.current = res.bundle;
          setSample({ status: 'ready', bundle: res.bundle });
          setVersion((v) => v + 1);
        }
        return { ok: res.status < 300, status: res.status, json: res.json || {} };
      }
      try {
        const init = { method, cache: 'no-store' };
        if (body !== undefined) {
          init.headers = { 'Content-Type': 'application/json' };
          init.body = JSON.stringify(body);
        }
        const res = await fetch(url, init);
        const json = await res.json().catch(() => ({}));
        if (res.ok && method !== 'GET') setVersion((v) => v + 1);
        return { ok: res.ok, status: res.status, json: json || {} };
      } catch {
        return { ok: false, status: 0, json: { error: 'Could not connect. Try again.' } };
      }
    },
    [sampleActive],
  );

  return {
    request,
    version,
    sampleActive,
    sampleAvailable,
    sampleLoading,
    setShowSample,
    sampleBundle: sampleActive ? sample.bundle : null,
  };
}

/**
 * One section's data: { status: 'loading'|'ready'|'error', data, reload }.
 * Reloads when the url, the source (sample or council) or `version` change.
 * A reload after a write keeps the rows on the page while it runs.
 */
export function useResource(request, url, version, { skip = false } = {}) {
  const [state, setState] = useState({ status: skip ? 'ready' : 'loading', data: null });
  const [tick, setTick] = useState(0);
  const lastUrl = useRef(null);

  useEffect(() => {
    if (skip || !url) {
      setState({ status: 'ready', data: null });
      return undefined;
    }
    let live = true;
    const fresh = lastUrl.current !== url;
    lastUrl.current = url;
    setState((s) => (fresh || !s.data ? { status: 'loading', data: null } : s));
    request('GET', url).then((res) => {
      if (!live) return;
      setState(
        res.ok
          ? { status: 'ready', data: res.json }
          : { status: res.status === 403 ? 'forbidden' : 'error', data: null },
      );
    });
    return () => {
      live = false;
    };
  }, [request, url, version, tick, skip]);

  const reload = useCallback(() => {
    setState({ status: 'loading', data: null });
    setTick((t) => t + 1);
  }, []);

  return { ...state, reload };
}

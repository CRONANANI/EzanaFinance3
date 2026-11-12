'use client';

import { useCallback, useEffect, useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export const QUANT_BASE = '/for-the-quants';
const STORAGE_KEY = 'ezana.quantLab.strategy';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Append the research context to a Quant Lab path. Pure, so it is testable. */
export function contextHref(path, context = {}, extra = {}) {
  const q = new URLSearchParams();
  const merged = { ...context, ...extra };
  for (const key of ['strategy', 'version', 'run', 'tab']) {
    const value = merged[key];
    if (value !== undefined && value !== null && value !== '') q.set(key, String(value));
  }
  for (const [key, value] of Object.entries(extra)) {
    if (!q.has(key) && value !== undefined && value !== null && value !== '') {
      q.set(key, String(value));
    }
  }
  const qs = q.toString();
  return qs ? `${path}?${qs}` : path;
}

/**
 * The selection that follows the user across Quant Lab workspaces.
 *
 *   strategy  strategy uuid    URL param, mirrored to sessionStorage
 *   version   version number   URL param, omitted for latest
 *   run       backtest run id  URL param
 *
 * The URL is the source of truth, so the selection survives navigation,
 * refresh and a shared link. With no `strategy` in the URL, `stored` is the
 * last one used in this browser tab; callers fall back to it, then to the
 * most recently updated strategy.
 */
export function useQuantContext() {
  const router = useRouter();
  const pathname = usePathname() || QUANT_BASE;
  const params = useSearchParams();

  const rawStrategy = params.get('strategy') || '';
  const strategy = UUID_RE.test(rawStrategy) ? rawStrategy : '';
  const rawRun = params.get('run') || '';
  const run = UUID_RE.test(rawRun) ? rawRun : '';
  const version = params.get('version') || '';

  /* A per-tab convenience only. Storage can be unavailable; nothing depends on it. */
  useEffect(() => {
    if (!strategy) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, strategy);
    } catch {
      /* not remembered */
    }
  }, [strategy]);

  const readStored = useCallback(() => {
    try {
      const v = window.sessionStorage.getItem(STORAGE_KEY) || '';
      return UUID_RE.test(v) ? v : '';
    } catch {
      return '';
    }
  }, []);

  const context = useMemo(() => ({ strategy, version, run }), [strategy, version, run]);

  /** A link to another workspace that carries the current selection. */
  const href = useCallback((path, extra) => contextHref(path, context, extra), [context]);

  /** Change the selection on the current workspace without adding history. */
  const setContext = useCallback(
    (next) => {
      const merged = { ...context, ...next };
      /* A different strategy makes the old version and run meaningless. */
      if (next.strategy !== undefined && next.strategy !== context.strategy) {
        if (next.version === undefined) merged.version = '';
        if (next.run === undefined) merged.run = '';
      }
      router.replace(contextHref(pathname, merged), { scroll: false });
    },
    [context, pathname, router],
  );

  return { ...context, href, setContext, readStored };
}

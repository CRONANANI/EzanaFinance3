'use client';

/**
 * Lazy loader for one supporting section of the selected stock
 * (/api/research/company/:symbol?part=financials|ownership|filings).
 * Fetched only when a tab that needs it renders; results are cached per
 * symbol and part for this page visit, so switching tabs never refetches and
 * a ticker change never shows another ticker's data.
 */
import { useCallback, useEffect, useState } from 'react';

const cache = new Map();
const inflight = new Map();

function load(symbol, part) {
  const key = `${symbol}:${part}`;
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  if (inflight.has(key)) return inflight.get(key);
  const p = fetch(`/api/research/company/${encodeURIComponent(symbol)}?part=${part}`)
    .then(async (r) => {
      const json = await r.json().catch(() => ({}));
      if (!r.ok || json?.error) {
        const err = new Error(json?.error || `Request failed (${r.status})`);
        err.status = r.status;
        throw err;
      }
      cache.set(key, json);
      return json;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/** @returns {{ status: 'idle'|'loading'|'ready'|'error', data: any, error: string|null, retry: () => void }} */
export function useResearchPart(symbol, part, enabled = true) {
  const sym = symbol ? String(symbol).toUpperCase() : null;
  const cached = sym ? cache.get(`${sym}:${part}`) : null;
  const [state, setState] = useState(() =>
    cached
      ? { status: 'ready', data: cached, error: null }
      : { status: 'idle', data: null, error: null },
  );
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!sym || !enabled) return undefined;
    let cancelled = false;
    const hit = cache.get(`${sym}:${part}`);
    if (hit) {
      setState({ status: 'ready', data: hit, error: null });
      return undefined;
    }
    setState({ status: 'loading', data: null, error: null });
    load(sym, part)
      .then((data) => !cancelled && setState({ status: 'ready', data, error: null }))
      .catch(
        (err) =>
          !cancelled &&
          setState({ status: 'error', data: null, error: err?.message || 'Could not load' }),
      );
    return () => {
      cancelled = true;
    };
  }, [sym, part, enabled, nonce]);

  const retry = useCallback(() => {
    if (sym) cache.delete(`${sym}:${part}`);
    setNonce((n) => n + 1);
  }, [sym, part]);

  return { ...state, retry };
}

export default useResearchPart;

'use client';

/**
 * Member detail (sizes, donor states, spending purposes, outside groups) from
 * /api/campaign-finance/member, cached per member and cycle for the visit so
 * the drawer and the per-member card views share one request.
 */
import { useEffect, useState } from 'react';

const cache = new Map();

export function fetchMember(id, cycle) {
  const key = `${cycle}:${id}`;
  if (!cache.has(key)) {
    cache.set(
      key,
      fetch(`/api/campaign-finance/member?bioguideId=${encodeURIComponent(id)}&cycle=${cycle}`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
        .then((d) => d.member || null)
        .catch((e) => {
          cache.delete(key);
          throw e;
        }),
    );
  }
  return cache.get(key);
}

/** { status: 'idle'|'loading'|'ready'|'empty'|'error', member, retry } */
export function useMemberDetail(id, cycle) {
  const [state, setState] = useState({ status: id ? 'loading' : 'idle', member: null });
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (!id) {
      setState({ status: 'idle', member: null });
      return undefined;
    }
    let alive = true;
    setState({ status: 'loading', member: null });
    fetchMember(id, cycle)
      .then((m) => alive && setState({ status: m ? 'ready' : 'empty', member: m }))
      .catch(() => alive && setState({ status: 'error', member: null }));
    return () => {
      alive = false;
    };
  }, [id, cycle, nonce]);
  return { ...state, retry: () => setNonce((n) => n + 1) };
}

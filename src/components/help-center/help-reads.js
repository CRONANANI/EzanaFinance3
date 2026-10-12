'use client';

/**
 * Reading progress for the help centre's Start here path.
 *
 * Signed out, reads live in localStorage (LS_KEY) so progress still shows on
 * that device. Signed in, they live in the member's account through
 * /api/help/reads; on the first signed-in visit any local reads are merged
 * into the account and the local copy is cleared.
 */
import { useEffect } from 'react';
import { useAuth } from '@/components/auth-context';

export const LS_KEY = 'ezana_help_reads';

export function readLocal() {
  try {
    const v = JSON.parse(window.localStorage.getItem(LS_KEY) || '[]');
    return Array.isArray(v) ? v.filter((s) => typeof s === 'string') : [];
  } catch {
    return [];
  }
}

export function markReadLocally(slug) {
  try {
    const cur = readLocal();
    if (!cur.includes(slug)) window.localStorage.setItem(LS_KEY, JSON.stringify([...cur, slug]));
  } catch {
    /* storage blocked: nothing to keep */
  }
}

export function clearLocal() {
  try {
    window.localStorage.removeItem(LS_KEY);
  } catch {
    /* storage blocked */
  }
}

export async function postReads(slugs) {
  const r = await fetch('/api/help/reads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slugs }),
  });
  return r.ok;
}

/**
 * Marks an article read when its page mounts: in the account when signed in
 * (keeping the local copy if the account write fails), locally otherwise.
 * Waits for the session to resolve so a signed-in reader is never recorded
 * as a local-only read.
 */
export function useHelpArticleRead(slug) {
  const { isAuthenticated, loading } = useAuth();
  useEffect(() => {
    if (!slug || loading) return;
    if (!isAuthenticated) {
      markReadLocally(slug);
      return;
    }
    postReads([slug])
      .then((ok) => {
        if (!ok) markReadLocally(slug);
      })
      .catch(() => markReadLocally(slug));
  }, [slug, isAuthenticated, loading]);
}

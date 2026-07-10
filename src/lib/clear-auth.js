'use client';

import { supabase } from '@/lib/supabase-browser';

/**
 * Clear LOCAL Supabase auth state unconditionally and without any network
 * dependency.
 *
 * Why this exists: the default `supabase.auth.signOut()` uses `scope: 'global'`,
 * which makes a network call to revoke the session server-side. If that call
 * hangs or fails (offline, slow, 5xx), the session stored in localStorage is
 * NOT cleared — so the next page load re-hydrates via getSession() as "logged
 * in", which is exactly the leaked-authed-navbar bug. Using `scope: 'local'`
 * plus an explicit purge of the auth-token key guarantees the local session is
 * gone before we redirect, regardless of the network outcome. The authoritative
 * server sign-out route still runs afterwards to clear the cookie.
 */
export function clearLocalAuth() {
  try {
    // scope: 'local' clears the stored session without a network round-trip.
    supabase.auth.signOut({ scope: 'local' });
  } catch {
    /* ignore */
  }
  if (typeof window === 'undefined') return;
  try {
    Object.keys(window.localStorage).forEach((key) => {
      if (/^sb-.*-auth-token$/.test(key) || key === 'supabase.auth.token') {
        window.localStorage.removeItem(key);
      }
    });
  } catch {
    /* ignore */
  }
}

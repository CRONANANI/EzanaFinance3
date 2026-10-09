'use client';

/**
 * Client-side admin check, UI only. The allowlist stays on the server
 * (ADMIN_EMAILS); the browser asks /api/auth/is-admin. Never trust this for
 * permission gating: every admin write or read re-checks on the server with
 * isAdminUser() from admin-helpers.js.
 */
import { useEffect, useState } from 'react';

/* One answer per signed-in user id for the life of the tab. */
const answers = new Map();

function checkAdmin(userId) {
  if (!answers.has(userId)) {
    const p = fetch('/api/auth/is-admin', { credentials: 'same-origin', cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : { isAdmin: false }))
      .then((b) => b?.isAdmin === true)
      .catch(() => {
        answers.delete(userId);
        return false;
      });
    answers.set(userId, p);
  }
  return answers.get(userId);
}

/**
 * @param {{ id?: string } | null | undefined} user  the signed-in user from useAuth()
 * @returns {{ isAdmin: boolean, checking: boolean }}
 *   checking is true while the answer for a signed-in user is still loading.
 */
export function useIsAdmin(user) {
  const userId = user?.id || null;
  const [state, setState] = useState({ userId: null, isAdmin: false });

  useEffect(() => {
    if (!userId) return undefined;
    let live = true;
    checkAdmin(userId).then((isAdmin) => {
      if (live) setState({ userId, isAdmin });
    });
    return () => {
      live = false;
    };
  }, [userId]);

  if (!userId) return { isAdmin: false, checking: false };
  if (state.userId !== userId) return { isAdmin: false, checking: true };
  return { isAdmin: state.isAdmin, checking: false };
}

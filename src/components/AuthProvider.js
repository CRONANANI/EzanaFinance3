'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { clearLocalAuth } from '@/lib/clear-auth';
import { AuthContext, useAuth } from '@/components/auth-context';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const anonId =
          typeof window !== 'undefined' ? window.localStorage.getItem('ezana_anon_id') : null;
        if (anonId) {
          fetch('/api/auth/merge-anon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ anonId }),
          })
            .then(() => {
              window.localStorage.removeItem('ezana_anon_id');
            })
            .catch(() => {});
        }
        fetch('/api/notifications/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_type: 'session_start',
            event_data: {
              timestamp: Date.now(),
              device: typeof navigator !== 'undefined' ? navigator.userAgent : '',
            },
          }),
        }).catch(() => {});
      }
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = () => {
    // Clear LOCAL auth state synchronously and unconditionally (no network
    // dependency) so a failed/hung sign-out can't leave a stale session that
    // re-hydrates as logged-in on the next load. Then hand off to the
    // authoritative server sign-out route (clears the cookie + redirects).
    clearLocalAuth();
    setUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/api/auth/signout';
    }
  };

  const value = {
    user,
    loading,
    signOut,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/* Re-exported so the many existing `import { useAuth } from '@/components/AuthProvider'`
   call sites keep working. A consumer that only READS auth state should import
   it from '@/components/auth-context' instead, to keep supabase-js out of its
   route's bundle. */
export { useAuth };

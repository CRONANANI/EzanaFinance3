'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';

const AuthContext = createContext({ user: null, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
      })
      .catch((err) => {
        /* A failed session read must not strand consumers on loading:true —
           they would block (e.g. gated layouts) until a full reload. */
        console.warn('[Auth] getSession failed:', err?.message || err);
        setUser(null);
      })
      .finally(() => {
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
      /* Hourly TOKEN_REFRESHED events deliver a new `user` object identity
         for the same user. Re-using the previous reference keeps every
         downstream context (Partner, Org, …) from re-running its fetch
         chain — and re-gating the page — on every token refresh. */
      setUser((prev) =>
        event === 'TOKEN_REFRESHED' && prev && session?.user && prev.id === session.user.id
          ? prev
          : (session?.user ?? null),
      );
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const value = {
    user,
    loading,
    signOut,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

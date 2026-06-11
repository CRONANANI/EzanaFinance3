'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';

const AuthContext = createContext({ user: null, loading: true });

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

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      /* ignore */
    }
    setUser(null);
    // Hard-navigate to the same login page the landing-page Login button opens,
    // so every signOut path lands consistently signed-out.
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
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

export function useAuth() {
  return useContext(AuthContext);
}

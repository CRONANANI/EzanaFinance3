'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase-browser';
import { clearLocalAuth } from '@/lib/clear-auth';
import { initializePostHog, posthog } from '@/components/PostHogInit';

const AuthContext = createContext({ user: null, loading: true });

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const identifiedUserId = useRef(null);

  const identifyPostHogUser = (authenticatedUser) => {
    if (
      !authenticatedUser?.id ||
      identifiedUserId.current === authenticatedUser.id ||
      !initializePostHog()
    ) {
      return;
    }

    if (identifiedUserId.current) {
      posthog.reset();
    }

    posthog.identify(authenticatedUser.id, {
      email: authenticatedUser.email,
      name: authenticatedUser.user_metadata?.full_name,
    });
    identifiedUserId.current = authenticatedUser.id;
  };

  const resetPostHogUser = () => {
    if (!identifiedUserId.current) return;

    posthog.reset();
    identifiedUserId.current = null;
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      identifyPostHogUser(session?.user);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        identifyPostHogUser(session.user);
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

      if (event === 'SIGNED_OUT') {
        resetPostHogUser();
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
    resetPostHogUser();
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

export function useAuth() {
  return useContext(AuthContext);
}

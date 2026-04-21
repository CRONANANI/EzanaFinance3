'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

/**
 * Matches /home-dashboard "Current Value": GET /api/plaid/holdings summary when brokerage is connected.
 */
export function usePlaidPortfolioSummary() {
  const { user, isAuthenticated } = useAuth();
  const [connected, setConnected] = useState(false);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSummary = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setConnected(false);
      setSummary(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setConnected(false);
        setSummary(null);
        return;
      }
      const res = await fetch('/api/plaid/holdings', {
        headers: { Authorization: `Bearer ${token}` },
        // Portfolio data is user-specific and changes with every trade —
        // never accept a cached response from the browser / CDN.
        cache: 'no-store',
      });
      if (!res.ok) {
        setConnected(false);
        setSummary(null);
        return;
      }
      const data = await res.json();
      setConnected(!!data.connected);
      setSummary(data.summary ?? null);
    } catch {
      setConnected(false);
      setSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return { connected, summary, isLoading, refresh: fetchSummary };
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

/**
 * Fetches the user's Alpaca brokerage portfolio summary from /api/alpaca/positions.
 *
 * Returns:
 *   connected: true when the user has an active Alpaca brokerage account with positions
 *   summary: { totalValue, totalPL, totalPLPercent, positionCount, cash, equity }
 *   isLoading: true while the initial fetch is in flight
 *   refresh: callable to force a re-fetch
 *
 * When the user does not have an Alpaca account, the underlying API returns 404 with
 * { error: 'No brokerage account' }. This hook treats that as connected=false rather
 * than an error — it's the normal "user doesn't have brokerage yet" state.
 */
export function useAlpacaPortfolioSummary() {
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
      const res = await fetch('/api/alpaca/positions', {
        headers: { Authorization: `Bearer ${token}` },
        // Portfolio data is user-specific and changes with every trade —
        // never accept a cached response from the browser / CDN.
        cache: 'no-store',
      });

      // 404 from /api/alpaca/positions means "user has no Alpaca brokerage account"
      // — treat as not connected, not an error state.
      if (res.status === 404) {
        setConnected(false);
        setSummary(null);
        return;
      }

      if (!res.ok) {
        setConnected(false);
        setSummary(null);
        return;
      }

      const data = await res.json();

      // Alpaca route response shape:
      //   { positions: [...], account: { equity, cash, ... }, summary: { totalMarketValue, totalUnrealizedPL, ... } }
      // Normalize into the same shape usePlaidPortfolioSummary returns so the
      // home page can use them interchangeably.
      const normalizedSummary = {
        totalValue: Number(data?.account?.equity ?? data?.summary?.totalMarketValue ?? 0),
        totalCostBasis: Number(data?.summary?.totalCostBasis ?? 0),
        totalGainLoss: Number(data?.summary?.totalUnrealizedPL ?? 0),
        totalGainLossPercent: Number(data?.summary?.totalUnrealizedPLPercent ?? 0),
        positionCount: Number(data?.summary?.positionCount ?? 0),
        cash: Number(data?.account?.cash ?? 0),
        equity: Number(data?.account?.equity ?? 0),
      };

      // Treat as connected only when the user actually has a funded account.
      // equity > 0 covers both "has cash but no positions" and "has positions".
      const hasAccount =
        normalizedSummary.equity > 0 || normalizedSummary.positionCount > 0;

      setConnected(hasAccount);
      setSummary(hasAccount ? normalizedSummary : null);
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

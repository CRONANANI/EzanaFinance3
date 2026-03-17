/**
 * PortfolioContext — Loads the authenticated user's Plaid portfolio
 * data on login and provides it to the entire dashboard.
 *
 * Wrap your dashboard layout with <PortfolioProvider> and use
 * usePortfolio() in any component to access:
 *   - portfolio.connected       — boolean, has any brokerage linked
 *   - portfolio.summary         — { totalValue, totalGainLoss, ... }
 *   - portfolio.aggregated       — holdings grouped by ticker
 *   - portfolio.holdings        — raw holding rows
 *   - portfolio.accounts        — linked accounts
 *   - portfolio.institutions     — connected brokerages
 *   - portfolio.isLoading        — true while fetching
 *   - portfolio.error           — error message if fetch failed
 *   - portfolio.refresh()        — manually re-sync from Plaid
 *   - portfolio.tickers          — array of ticker symbols user owns
 */

'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/lib/supabase';

const PortfolioContext = createContext(null);

export function PortfolioProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const [portfolio, setPortfolio] = useState({
    connected: false,
    institutions: [],
    accounts: [],
    holdings: [],
    aggregated: [],
    summary: null,
    lastSynced: null,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const getToken = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    } catch {
      return null;
    }
  }, []);

  const fetchPortfolio = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/plaid/holdings', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to fetch portfolio');
      }

      const data = await res.json();
      setPortfolio(data);
    } catch (err) {
      console.error('[Portfolio] Fetch error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, user, getToken]);

  const refresh = useCallback(async () => {
    if (!isAuthenticated || !user) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const syncRes = await fetch('/api/plaid/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!syncRes.ok) {
        const data = await syncRes.json();
        throw new Error(data.error || 'Sync failed');
      }

      await fetchPortfolio();
    } catch (err) {
      console.error('[Portfolio] Sync error:', err);
      setError(err.message);
      setIsLoading(false);
    }
  }, [isAuthenticated, user, getToken, fetchPortfolio]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchPortfolio();
    } else {
      setPortfolio({
        connected: false,
        institutions: [],
        accounts: [],
        holdings: [],
        aggregated: [],
        summary: null,
        lastSynced: null,
      });
    }
  }, [isAuthenticated, user, fetchPortfolio]);

  const tickers = (portfolio.aggregated || [])
    .filter((h) => h.ticker)
    .map((h) => h.ticker);

  // Build portfolio shape for PortfolioDashboard compatibility
  const topPerformers = [...(portfolio.aggregated || [])]
    .sort((a, b) => (b.gainLossPercent || 0) - (a.gainLossPercent || 0))
    .slice(0, 5)
    .map((h) => ({
      ...h,
      ticker_symbol: h.ticker,
      gainLossPercent: h.gainLossPercent,
      currentValue: h.totalValue,
      institution_value: h.totalValue,
      quantity: h.totalQuantity,
      institution_price: h.lastPrice,
    }));

  const allocation = (portfolio.aggregated || []).reduce((acc, h) => {
    const label = ['etf', 'mutual fund'].includes((h.type || '').toLowerCase()) ? 'ETFs' : 'Stocks';
    acc[label] = (acc[label] || 0) + (h.totalValue || 0);
    return acc;
  }, {});

  const accountsWithHoldings = (portfolio.accounts || []).map((acc) => {
    const acctHoldings = (portfolio.holdings || []).filter((h) => h.account_id === acc.account_id);
    const totalValue = acctHoldings.reduce((s, h) => s + (h.value ?? h.institution_value ?? 0), 0);
    const totalCost = acctHoldings.reduce((s, h) => s + (h.cost_basis || 0), 0);
    return {
      ...acc,
      holdings: acctHoldings.map((h) => ({
        ...h,
        ticker_symbol: h.ticker,
      })),
      totalValue,
      totalCostBasis: totalCost,
      gainLoss: totalValue - totalCost,
      gainLossPercent: totalCost > 0 ? ((totalValue - totalCost) / totalCost * 100) : 0,
    };
  });

  const portfolioForDashboard = portfolio.summary ? {
    summary: {
      ...portfolio.summary,
      totalGainLossPercent: portfolio.summary.totalGainLossPercent,
      accountCount: portfolio.accounts?.length || 0,
      holdingsCount: portfolio.holdings?.length || 0,
    },
    accounts: accountsWithHoldings,
    topPerformers,
    allocation,
    recentTransactions: [],
  } : null;

  const value = {
    ...portfolio,
    portfolio: portfolioForDashboard,
    isLoading,
    error,
    refresh,
    fetchPortfolio,
    tickers,
    getToken,
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext);
  if (!ctx) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return ctx;
}

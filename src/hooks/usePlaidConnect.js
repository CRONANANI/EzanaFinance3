/**
 * usePlaidConnect — Opens Plaid Link for the authenticated user.
 * Passes the user's Supabase JWT to all API calls so the server
 * knows which user is connecting.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { usePortfolio } from '@/contexts/PortfolioContext';

export function usePlaidConnect({ onSuccess, onExit } = {}) {
  const { getToken, fetchPortfolio } = usePortfolio();
  const [linkToken, setLinkToken] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [connectedAccount, setConnectedAccount] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function createLinkToken() {
      try {
        const token = await getToken();
        if (!token) return;

        const res = await fetch('/api/plaid/create-link-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.details || data.error || 'Failed to create link token');
        }

        const { link_token } = await res.json();
        if (!cancelled) setLinkToken(link_token);
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }

    createLinkToken();
    return () => { cancelled = true; };
  }, [getToken]);

  const handleSuccess = useCallback(async (publicToken, metadata) => {
    setIsLoading(true);
    setError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/plaid/exchange-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ public_token: publicToken }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.details || data.error || 'Failed to exchange token');
      }

      const result = await res.json();
      setConnectedAccount(result);

      await fetchPortfolio();

      onSuccess?.(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [getToken, fetchPortfolio, onSuccess]);

  const handleExit = useCallback((err) => {
    if (err) console.warn('[Plaid] Link exited with error:', err);
    onExit?.();
  }, [onExit]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: handleSuccess,
    onExit: handleExit,
  });

  const openPlaid = useCallback(() => {
    if (ready && !isLoading) open();
  }, [ready, isLoading, open]);

  return {
    openPlaid,
    isReady: ready && !!linkToken,
    isLoading,
    error,
    connectedAccount,
  };
}

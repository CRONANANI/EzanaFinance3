'use client';

import { useState, useEffect, useCallback } from 'react';

export function usePortfolio() {
  const [portfolio, setPortfolio] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPortfolio = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/portfolio');

      if (!response.ok) {
        if (response.status === 401) {
          setError('Please sign in to view your portfolio');
        } else {
          setError('Failed to load portfolio data');
        }
        setPortfolio(null);
        return;
      }

      const data = await response.json();
      setPortfolio(data);
    } catch (err) {
      setError('Failed to load portfolio data');
      console.error('Portfolio fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPortfolio();
  }, [fetchPortfolio]);

  return {
    portfolio,
    isLoading,
    error,
    refetch: fetchPortfolio,
  };
}

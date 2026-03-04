'use client';

import { useState, useEffect, useCallback } from 'react';
import { FmpAPI } from '@/lib/fmp-api';
import { apiService } from '@/lib/api-service';
import { API_CONFIG } from '@/lib/api-config';

/**
 * Hook for market quotes - tries backend first, then FMP
 */
export function useMarketQuotes(symbols = [], options = {}) {
  const { pollIntervalMs = 5000, enabled = true } = options;
  const [quotes, setQuotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchQuotes = useCallback(async () => {
    if (!symbols.length) {
      setQuotes([]);
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const symbolList = symbols.map((s) => s.toUpperCase());
      let data = null;

      try {
        const res = await apiService.getMarketQuotes(symbolList);
        if (res && res.quotes) {
          data = res.quotes;
        }
      } catch (_) {}

      if (!data && API_CONFIG?.fmp?.key) {
        const fmpQuotes = await FmpAPI.getBatchQuote(symbolList);
        if (fmpQuotes?.length) {
          data = fmpQuotes.map((q) => ({
            symbol: q.symbol,
            current_price: q.price,
            change_percent: q.changesPercentage,
            change: q.change,
          }));
        }
      }

      setQuotes(data || []);
    } catch (err) {
      setError(err);
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  }, [symbols.join(',')]);

  useEffect(() => {
    if (!enabled) return;
    fetchQuotes();
    const id = pollIntervalMs > 0 ? setInterval(fetchQuotes, pollIntervalMs) : null;
    return () => (id ? clearInterval(id) : undefined);
  }, [fetchQuotes, pollIntervalMs, enabled]);

  return { quotes, loading, error, refetch: fetchQuotes };
}

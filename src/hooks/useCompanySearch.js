'use client';

import { useState, useCallback } from 'react';
import { FmpAPI } from '@/lib/fmp-api';

export function useCompanySearch() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const search = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const results = await FmpAPI.searchSymbol(query.trim(), 15);
      setSuggestions(Array.isArray(results) ? results : []);
    } catch (err) {
      setError(err);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
  }, []);

  return { suggestions, loading, error, search, clearSuggestions };
}

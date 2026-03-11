'use client';

import { useState, useEffect, useCallback } from 'react';
import { FinnhubAPI } from '@/lib/finnhub';

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debouncedValue;
}

/** Debounced company search - 300ms */
export function useCompanySearchFinnhub() {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    FinnhubAPI.search(debouncedQuery.trim())
      .then((results) => {
        if (!cancelled) setSuggestions(Array.isArray(results) ? results : []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setSuggestions([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  const clearSuggestions = useCallback(() => setSuggestions([]), []);

  return { query, setQuery, suggestions, loading, error, clearSuggestions };
}

/** Company profile - /stock/profile2 */
export function useCompanyProfile(symbol) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!symbol) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    FinnhubAPI.getCompanyProfile(symbol)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [symbol]);

  return { data, loading, error };
}

/** Real-time quote */
export function useQuote(symbol) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!symbol) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    FinnhubAPI.getQuote(symbol)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [symbol]);

  return { data, loading, error };
}

/** Company news */
export function useCompanyNews(symbol, daysBack = 30) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!symbol) {
      setData([]);
      return;
    }
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - daysBack);
    const toStr = to.toISOString().slice(0, 10);
    const fromStr = from.toISOString().slice(0, 10);

    let cancelled = false;
    setLoading(true);
    setError(null);
    FinnhubAPI.getCompanyNews(symbol, fromStr, toStr)
      .then((res) => {
        if (!cancelled) setData(Array.isArray(res) ? res.slice(0, 10) : []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setData([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [symbol, daysBack]);

  return { data, loading, error };
}

/** Key metrics / financials */
export function useStockMetric(symbol) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!symbol) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    FinnhubAPI.getStockMetric(symbol)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [symbol]);

  return { data, loading, error };
}

/** Analyst recommendations */
export function useRecommendation(symbol) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!symbol) {
      setData([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    FinnhubAPI.getRecommendation(symbol)
      .then((res) => {
        if (!cancelled) setData(Array.isArray(res) ? res : []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setData([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [symbol]);

  return { data, loading, error };
}

/** Earnings history */
export function useEarnings(symbol) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!symbol) {
      setData([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    FinnhubAPI.getEarnings(symbol, 8)
      .then((res) => {
        if (!cancelled) setData(Array.isArray(res) ? res : []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setData([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [symbol]);

  return { data, loading, error };
}

/** Peers / competitors */
export function usePeers(symbol) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!symbol) {
      setData([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    FinnhubAPI.getPeers(symbol)
      .then((res) => {
        if (!cancelled) setData(Array.isArray(res) ? res : []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setData([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [symbol]);

  return { data, loading, error };
}

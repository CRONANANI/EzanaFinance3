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

/** Real-time quote - auto-refreshes every 30 seconds */
export function useQuote(symbol) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchQuote = useCallback(() => {
    if (!symbol) return;
    setLoading(true);
    setError(null);
    FinnhubAPI.getQuote(symbol)
      .then((res) => setData(res))
      .catch((err) => {
        setError(err);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [symbol]);

  useEffect(() => {
    if (!symbol) {
      setData(null);
      return;
    }
    fetchQuote();
    const interval = setInterval(fetchQuote, 30000);
    return () => clearInterval(interval);
  }, [symbol, fetchQuote]);

  return { data, loading, error, refetch: fetchQuote };
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

/** Price target (premium - may be limited on free tier) */
export function usePriceTarget(symbol) {
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
    FinnhubAPI.getPriceTarget(symbol)
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

/** Symbol search - returns raw Finnhub results filtered by type */
export function useSymbolSearch(query) {
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.trim().length < 1) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    FinnhubAPI.searchRaw(debouncedQuery.trim())
      .then((raw) => {
        if (cancelled) return;
        const filtered = raw.filter(
          (r) =>
            r.type === 'Common Stock' ||
            r.type === 'ADR' ||
            r.type === 'ETF' ||
            r.type === 'REIT'
        );
        setResults(filtered.slice(0, 15));
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err);
          setResults([]);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  return { results, isLoading, error };
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

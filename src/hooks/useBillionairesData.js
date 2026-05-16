import { useState, useEffect, useRef } from 'react';

/**
 * Fetches Forbes billionaire data from our API route and converts it
 * into a score map (ISO -> 0-100) suitable for the heatmap.
 *
 * Scoring: logarithmic scale based on billionaire count per country.
 */
export function useBillionairesData() {
  const [scores, setScores] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const fetched = useRef(false);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch('/api/market-data/billionaires');
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data = await res.json();
        if (!data.byCountry?.length) throw new Error('Empty byCountry');

        const maxCount = Math.max(...data.byCountry.map((c) => c.count), 1);
        const logMax = Math.log(maxCount + 1);

        const scoreMap = {};
        for (const entry of data.byCountry) {
          const logScore = Math.log(entry.count + 1) / logMax;
          scoreMap[entry.iso] = Math.round(Math.max(5, logScore * 100));
        }

        setScores(scoreMap);
      } catch (err) {
        console.error('[useBillionairesData]', err);
        setError(err.message);
        setScores(FALLBACK_BILLIONAIRE_SCORES);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return { scores, loading, error };
}

const FALLBACK_BILLIONAIRE_SCORES = {
  US: 100,
  CN: 82,
  IN: 62,
  DE: 52,
  RU: 48,
  HK: 38,
  BR: 35,
  CA: 34,
  GB: 42,
  FR: 36,
  IT: 30,
  CH: 32,
  JP: 28,
  KR: 26,
  AU: 28,
  TW: 30,
  MX: 20,
  TH: 22,
  SE: 24,
  ES: 20,
  ID: 22,
  TR: 24,
  IL: 26,
  NO: 18,
  SG: 20,
  PH: 14,
  MY: 16,
  NG: 12,
  ZA: 14,
  NL: 18,
  CL: 10,
  CO: 10,
  PL: 12,
  AT: 14,
  DK: 12,
  SA: 16,
  AE: 18,
};

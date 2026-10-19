'use client';

import { useJson } from './use-json';

/** Batch sparklines for a list of market ids: { series, loading, error }. */
export function useSparklines(ids, range = '1d') {
  const list = (ids || []).filter(Boolean).slice(0, 10);
  const url = list.length
    ? `/api/prediction-markets/sparklines?range=${range}&ids=${list.map(encodeURIComponent).join(',')}`
    : null;
  const { data, loading, error } = useJson(url);
  return { series: data?.series || {}, loading, error };
}

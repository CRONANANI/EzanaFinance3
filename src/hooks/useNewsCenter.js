'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { buildInterestIndex, composeFeed } from '@/lib/home/news-center';

/* How many of the reader's top tickers get their own news request. The news
   provider filters a multi-ticker request to stories that mention every
   ticker at once, so each ticker is asked for separately and merged. */
const NEWS_TICKER_REQUESTS = 3;

async function getJson(url, signal) {
  try {
    const res = await fetch(url, { signal, credentials: 'same-origin' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Loads and ranks the /home News Center. Every source is an existing route:
 *   /api/echo/hub                 Echo cards (public, cached)
 *   /api/user/interest-profile    the reader's interest scores
 *   /api/community/feed           following + trending posts
 *   /api/market-data/news         general and per-ticker market news
 * A failed source just leaves its part of the feed empty.
 *
 * @param {{ tickers?: Set<string> | string[] }} options holdings and
 *   watchlist symbols (useUserRelevanceSet().tickers), used to seed interests.
 */
export function useNewsCenter({ tickers } = {}) {
  const { user } = useAuth();
  const userId = user?.id || null;
  const [raw, setRaw] = useState(null);
  const [tickerNews, setTickerNews] = useState([]);

  // Stable primitive for the effect deps: a Set changes identity every render.
  const tickerKey = useMemo(
    () =>
      [...(tickers || [])]
        .map((t) => String(t).toUpperCase())
        .sort()
        .join(','),
    [tickers],
  );

  useEffect(() => {
    if (!userId) return undefined;
    const ac = new AbortController();
    (async () => {
      const [hub, profile, following, trending, general] = await Promise.all([
        getJson('/api/echo/hub', ac.signal),
        getJson('/api/user/interest-profile', ac.signal),
        getJson('/api/community/feed?tab=following&limit=30', ac.signal),
        getJson('/api/community/feed?tab=trending&limit=5', ac.signal),
        getJson('/api/market-data/news?category=general', ac.signal),
      ]);
      if (ac.signal.aborted) return;
      setRaw({
        echoCards: hub?.articles || [],
        profile,
        following: following?.posts || [],
        trending: trending?.posts || [],
        generalNews: general?.news || [],
      });
    })();
    return () => ac.abort();
  }, [userId]);

  const idx = useMemo(
    () => buildInterestIndex(raw?.profile || null, tickerKey ? tickerKey.split(',') : []),
    [raw?.profile, tickerKey],
  );

  // Second pass: news for the reader's strongest tickers.
  const topTickersKey = useMemo(
    () =>
      [...idx.tickers.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, NEWS_TICKER_REQUESTS)
        .map(([sym]) => sym)
        .join(','),
    [idx],
  );

  useEffect(() => {
    if (!raw || !topTickersKey) {
      setTickerNews([]);
      return undefined;
    }
    const ac = new AbortController();
    (async () => {
      const lists = await Promise.all(
        topTickersKey
          .split(',')
          .map((sym) =>
            getJson(`/api/market-data/news?tickers=${encodeURIComponent(sym)}&limit=10`, ac.signal),
          ),
      );
      if (ac.signal.aborted) return;
      setTickerNews(lists.flatMap((l) => l?.news || []));
    })();
    return () => ac.abort();
  }, [raw, topTickersKey]);

  const feed = useMemo(() => {
    if (!raw) return null;
    return composeFeed({
      echoCards: raw.echoCards,
      newsRows: [...tickerNews, ...raw.generalNews],
      following: raw.following,
      trending: raw.trending,
      idx,
      selfId: userId,
    });
  }, [raw, tickerNews, idx, userId]);

  return { feed, isLoading: !raw };
}

/**
 * Server read for the /datasets orbital map's notification cards: the newest
 * STOCK Act disclosures and the newest federal contract awards, from the same
 * stores the Politician Tracker and Government Contracts pages read. Cached
 * for 15 minutes, the window both of those pages use. Either feed failing
 * yields an empty list for that feed, never a thrown page.
 */
import { unstable_cache } from 'next/cache';
import { readTrades } from '@/lib/politicians/congress-store';
import { getRecentAwardFeed } from '@/lib/usaspending-store';

const PER_FEED = 12;

async function readFeedUncached() {
  const [t, a] = await Promise.allSettled([
    /* Over-fetch: the mapper drops rows without a ticker and repeats. */
    readTrades({ page: 0, limit: PER_FEED * 3, windowDays: 90 }),
    getRecentAwardFeed({ limit: PER_FEED }),
  ]);
  const trades = t.status === 'fulfilled' && !t.value?.error ? t.value.trades || [] : [];
  const awards = a.status === 'fulfilled' ? a.value || [] : [];
  return { trades, awards };
}

export const readOrbitalFeed = unstable_cache(readFeedUncached, ['datasets-orbital-feed'], {
  revalidate: 900,
});

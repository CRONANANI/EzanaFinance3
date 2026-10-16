import { getWhaleMoves } from '@/lib/whale-moves-store';
import { getBurryWatcher } from '@/lib/whales/burry';
import { WhaleMovesClient } from './WhaleMovesClient';

/**
 * Whale Moves: composite-scored institutional and activist signal. Server-fetches
 * the materialized whale_moves (populated by the compute-whale-moves cron). An
 * empty table shows an honest empty state; the sample renders only under
 * NEXT_PUBLIC_ALLOW_SAMPLE_DATA in local development.
 *
 * The Burry Watcher card loads in parallel; any failure there degrades to its
 * own unavailable state and never blocks the moves table.
 */
export const revalidate = 900;
export const dynamic = 'force-dynamic';

export default async function WhaleMovesPage() {
  const [moves, burry] = await Promise.all([
    getWhaleMoves({ limit: 120 }),
    getBurryWatcher().catch(() => null),
  ]);
  return <WhaleMovesClient moves={moves} burry={burry} />;
}

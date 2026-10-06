import { getWhaleMoves } from '@/lib/whale-moves-store';
import { WhaleMovesClient } from './WhaleMovesClient';

/**
 * Whale Moves: composite-scored institutional and activist signal. Server-fetches
 * the materialized whale_moves (populated by the compute-whale-moves cron). An
 * empty table shows an honest empty state; the sample renders only under
 * NEXT_PUBLIC_ALLOW_SAMPLE_DATA in local development.
 */
export const revalidate = 900;
export const dynamic = 'force-dynamic';

export default async function WhaleMovesPage() {
  const moves = await getWhaleMoves({ limit: 120 });
  return <WhaleMovesClient moves={moves} />;
}

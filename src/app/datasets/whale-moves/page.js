import { getWhaleMoves } from '@/lib/whale-moves-store';
import { WhaleMovesClient } from './WhaleMovesClient';

/**
 * Whale Moves — composite-scored institutional & activist signal. Server-fetches
 * the materialized whale_moves (populated by the compute-whale-moves cron); the
 * client falls back to a clearly-labeled sample until the EDGAR ingestion has
 * loaded two quarters of 13F history. Revalidates so a fresh score cycle shows
 * without a redeploy.
 */
export const revalidate = 900;
export const dynamic = 'force-dynamic';

export default async function WhaleMovesPage() {
  const moves = await getWhaleMoves({ limit: 120 });
  return <WhaleMovesClient moves={moves} />;
}

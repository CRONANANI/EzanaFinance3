import { CONGRESS_TRADES_SAMPLE, POLITICIAN_LEADERBOARD } from './congress-trades-sample';
import PoliticalTradesClient from './PoliticalTradesClient';

/**
 * Congressional trading dataset page — Claude Design "Political Trade Tracker 1a"
 * redesign, sibling of the Government Contracts "1b" page (same shared CategoryBar
 * + ticker + margins). Presentation-layer rebuild only.
 *
 * Data tiers mirror gov contracts: the client attempts the live STOCK Act feed
 * (/api/quiver/congress-trades) and falls back to this vetted static sample,
 * which is the guaranteed public-teaser tier and defines the canonical row shape.
 * The full gated live dataset lives inside the app.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Congressional trading data | Ezana',
  description:
    'Every stock transaction disclosed by members of Congress under the STOCK Act — normalized and enriched with party, chamber, and excess-return context.',
};

export default function PoliticalDatasetPage() {
  return (
    <PoliticalTradesClient
      sampleTrades={CONGRESS_TRADES_SAMPLE}
      sampleLeaders={POLITICIAN_LEADERBOARD}
    />
  );
}

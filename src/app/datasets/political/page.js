import { CONGRESS_TRADES_SAMPLE } from './congress-trades-sample';
import PoliticalTradesClient from './PoliticalTradesClient';

/**
 * Congressional trading dataset page — Political Trade Tracker 1a.
 *
 * NO MOCK DATA IN PRODUCTION (hard rule): the page binds to the live, canonical,
 * enriched STOCK Act feed (/api/politicians/trades). The static sample is NEVER
 * rendered in production — it is passed only when explicitly opted-in for local
 * development (NEXT_PUBLIC_ALLOW_SAMPLE_DATA==='true' AND not production). When
 * live data is unavailable the client shows an honest empty/error state instead.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Congressional trading data | Ezana',
  description:
    'Every stock transaction disclosed by members of Congress under the STOCK Act — normalized and enriched with party, chamber, and excess-return context.',
};

const DEV_SAMPLE_ENABLED =
  process.env.NEXT_PUBLIC_ALLOW_SAMPLE_DATA === 'true' && process.env.NODE_ENV !== 'production';

export default function PoliticalDatasetPage() {
  return (
    <PoliticalTradesClient devSampleTrades={DEV_SAMPLE_ENABLED ? CONGRESS_TRADES_SAMPLE : null} />
  );
}

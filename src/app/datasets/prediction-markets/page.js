import { getOpenMarkets } from '@/lib/hive/store';
import { usd, pct, shortDate } from '@/lib/titans/format';
import { LegislationMarketsSection } from '@/components/congress/LegislationMarketsSection';
import PredictionMarketsClient from './PredictionMarketsClient';

/**
 * Prediction markets dataset page. Server component: the open Polymarket and
 * Kalshi markets from prediction_market_index (index crons, every two hours).
 * Empty table shows an honest empty state; the sample renders only under
 * NEXT_PUBLIC_ALLOW_SAMPLE_DATA in local development.
 */
export const dynamic = 'force-dynamic';

const VENUE = { polymarket: 'Polymarket', kalshi: 'Kalshi' };

function compact(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(Math.round(n));
}

function volumeText(m) {
  if (m.volume == null) return null;
  return m.volume_unit === 'contracts' ? `${compact(m.volume)} contracts` : usd(m.volume);
}

export default async function PredictionMarketsDatasetPage() {
  const markets = await getOpenMarkets({ polymarket: 100, kalshi: 50 });
  const rows = markets.map((m) => ({
    id: m.market_id,
    event: m.question,
    venue: VENUE[m.platform] || m.platform,
    probability: m.probability != null ? pct(Number(m.probability) * 100, 0) : null,
    volume: volumeText(m),
    close: shortDate(m.end_date),
    href: m.link || null,
  }));
  const latest = markets.reduce(
    (max, m) => (m.indexed_at && m.indexed_at > (max || '') ? m.indexed_at : max),
    null,
  );
  return (
    <PredictionMarketsClient rows={rows} updated={latest ? shortDate(latest) : null}>
      <LegislationMarketsSection />
    </PredictionMarketsClient>
  );
}

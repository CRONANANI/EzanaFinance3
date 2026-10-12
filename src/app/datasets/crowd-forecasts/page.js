import { openCrowdForecasts } from '@/lib/lighthouse/store';
import { pct, shortDate } from '@/lib/titans/format';
import CrowdForecastsClient from './CrowdForecastsClient';

/**
 * Crowdsourced Intelligence dataset page. Open Manifold questions (play
 * money), most forecasters first, from crowd_forecasts.
 */
export const dynamic = 'force-dynamic';

export default async function CrowdForecastsPage() {
  const items = await openCrowdForecasts(150);
  const rows = items.map((f) => ({
    id: f.forecast_id,
    question: f.question,
    probability: f.probability != null ? pct(Number(f.probability) * 100, 0) : null,
    forecasters: f.forecasters != null ? Number(f.forecasters).toLocaleString('en-US') : null,
    close: shortDate(f.close_date),
    category: f.category || null,
    href: f.link || null,
  }));
  const latest = items.reduce((m, f) => (f.indexed_at > (m || '') ? f.indexed_at : m), null);
  return <CrowdForecastsClient rows={rows} updated={latest ? shortDate(latest) : null} />;
}

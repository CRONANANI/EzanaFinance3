import { getSecFilings } from '@/lib/sec-filings-store';
import { INSIDER_TRADES_SAMPLE } from './sec-filings-sample';
import { SecFilingsClient } from './SecFilingsClient';

/**
 * SEC filings dataset page — three live tabbed feeds (Insider / Institutional /
 * Activist) read from Supabase (populated by ingest-sec-filings). The page never
 * calls EDGAR directly. Sample insider rows remain the honest empty-state
 * fallback until the live table is populated.
 */
export const revalidate = 600;

export const metadata = {
  title: 'SEC filings | Ezana',
  description:
    'Live SEC EDGAR filings — insider (Form 4), institutional (13F), and activist (13D/13G) — synced into Ezana.',
};

export default async function SecFilingsDatasetPage() {
  const [insiderRes, instRes, activistRes] = await Promise.allSettled([
    getSecFilings({ family: 'insider', limit: 50 }),
    getSecFilings({ family: 'institutional', limit: 50 }),
    getSecFilings({ family: 'activist', limit: 50 }),
  ]);
  const val = (r) => (r.status === 'fulfilled' && Array.isArray(r.value) ? r.value : []);

  const feeds = {
    insider: val(insiderRes),
    institutional: val(instRes),
    activist: val(activistRes),
  };

  return <SecFilingsClient feeds={feeds} insiderSample={INSIDER_TRADES_SAMPLE} />;
}

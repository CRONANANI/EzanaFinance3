import { getSecFilings } from '@/lib/sec-filings-store';
import { INSIDER_TRADES_SAMPLE } from './sec-filings-sample';
import { ALLOW_SAMPLE } from '@/lib/titans/format';
import { SecFilingsClient } from './SecFilingsClient';

/**
 * SEC filings dataset page: three live tabbed feeds (Insider / Institutional /
 * Activist) read from the filings cache (populated by ingest-sec-filings). The
 * page never calls EDGAR directly. Sample insider rows render only in local
 * development under NEXT_PUBLIC_ALLOW_SAMPLE_DATA; otherwise an empty feed
 * shows an honest empty state.
 */
export const revalidate = 600;

export const metadata = {
  title: 'SEC filings | Ezana',
  description:
    'Live SEC EDGAR filings: insider (Form 4), institutional (13F) and activist (Schedule 13D/13G), synced into Ezana.',
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

  return (
    <SecFilingsClient
      feeds={feeds}
      insiderSample={ALLOW_SAMPLE ? INSIDER_TRADES_SAMPLE : undefined}
    />
  );
}

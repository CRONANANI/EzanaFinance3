import { timed } from '@/lib/perf/timed';
import { Suspense } from 'react';
import { getActivistOverview } from '@/lib/titans/store';
import { ALLOW_SAMPLE } from '@/lib/titans/format';
import ActivistClient from './ActivistClient';
import fixture from './activist-fixture.sample.json';

/**
 * Activist & Block Positions (Schedule 13D / 13G), Oct 2026 redesign
 * (docs: activist-handoff). Server component: loads the campaign snapshot
 * (refresh_titans_activist) and hands it to the client; the filings table,
 * price paths and the three panels read their own API routes. Empty
 * snapshot -> honest empty states; the SAMPLE fixture renders only under
 * NEXT_PUBLIC_ALLOW_SAMPLE_DATA with its chip and fictional names.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Activist and block positions (13D/13G) | Ezana',
  description:
    'Schedule 13D and 13G filings from SEC EDGAR as campaigns: who crossed 5% of which company, what they say they want, how stakes develop, and what happened around the event date.',
};

export default async function ActivistDatasetPage() {
  let overview = null;
  try {
    overview = await timed('/datasets/activist', getActivistOverview, 'getActivistOverview')();
  } catch (e) {
    console.error('[titans] activist overview:', e?.message || e);
  }
  let sampled = false;
  if (!overview && ALLOW_SAMPLE) {
    overview = fixture.overview;
    sampled = true;
  }
  return (
    <Suspense fallback={null}>
      <ActivistClient overview={overview} sampled={sampled} />
    </Suspense>
  );
}

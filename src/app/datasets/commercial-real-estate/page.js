import { getCre } from '@/lib/eyes/store';
import CreClient from './CreClient';

/**
 * Commercial real estate activity (Eyes Above). Server component; reads are cached for an hour under
 * the `eyes` tag. No sample data.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Commercial real estate activity | Ezana',
  description:
    'Market-wide U.S. commercial real estate indicators from FRED: CRE prices, bank CRE loans, delinquency and nonresidential construction spending.',
};

export default async function Page() {
  let data = null;
  let error = false;
  try {
    data = await getCre();
  } catch (e) {
    console.error('[eyes] commercial-real-estate:', e?.message || e);
    error = true;
  }
  return <CreClient data={data} error={error} />;
}

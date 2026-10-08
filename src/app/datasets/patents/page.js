import { getPatents } from '@/lib/eyes/store';
import PatentsClient from './PatentsClient';

/**
 * Patent activity (Eyes Above). Server component; reads are cached for an hour under
 * the `eyes` tag. No sample data.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Patent activity | Ezana',
  description:
    'Granted U.S. patents by company from the USPTO PatentSearch API: 12-month grant momentum, technology mix and the latest grants to public companies.',
};

export default async function Page() {
  let data = null;
  let error = false;
  try {
    data = await getPatents();
  } catch (e) {
    console.error('[eyes] patents:', e?.message || e);
    error = true;
  }
  return <PatentsClient data={data} error={error} />;
}

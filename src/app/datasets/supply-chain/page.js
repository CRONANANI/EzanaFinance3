import { getSupplyChain } from '@/lib/eyes/store';
import SupplyChainClient from './SupplyChainClient';

/**
 * Supply Chain Monitoring (Eyes Above). Server component: chokepoint and port
 * movers from IMF PortWatch, the NY Fed GSCPI and the Cass Freight Index.
 * Reads are cached for an hour under the `eyes` tag. No sample data.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Supply chain monitoring | Ezana',
  description:
    'Daily ship transits through 28 maritime chokepoints and port calls at the 100 busiest ports from IMF PortWatch, the NY Fed Global Supply Chain Pressure Index and the Cass Freight Index.',
};

export default async function SupplyChainPage() {
  let data = null;
  let error = false;
  try {
    data = await getSupplyChain();
  } catch (e) {
    console.error('[eyes] supply chain:', e?.message || e);
    error = true;
  }
  return <SupplyChainClient data={data} error={error} />;
}

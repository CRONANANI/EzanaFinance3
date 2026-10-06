import { getEtfFunds } from '@/lib/titans/store';
import EtfHoldingsClient from './EtfHoldingsClient';

/**
 * ETF Holdings (Form N-PORT). Server component: the tracked ETFs and the ones
 * not covered; holdings, "who holds this" and overlap load on demand.
 * No sample data.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'ETF holdings (N-PORT) | Ezana',
  description:
    'What the largest US-listed ETFs hold, which ETFs hold a stock, and how much two ETFs overlap, from SEC Form N-PORT filings.',
};

export default async function EtfHoldingsPage() {
  let data = { funds: [], notCovered: [] };
  try {
    data = await getEtfFunds();
  } catch (e) {
    console.error('[titans] etf funds:', e?.message || e);
  }
  return <EtfHoldingsClient funds={data.funds} notCovered={data.notCovered} />;
}

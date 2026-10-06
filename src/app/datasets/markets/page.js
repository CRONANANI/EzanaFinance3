import { getFundamentalsTable } from '@/lib/titans/store';
import FundamentalsClient from './FundamentalsClient';

/**
 * Prices & Fundamentals. Server component: the latest fiscal year of reported
 * fundamentals for the largest filers by revenue, from SEC EDGAR XBRL. Prices
 * are not shown yet (no licensed price feed). No sample data.
 */
export const dynamic = 'force-dynamic';

export default async function MarketsDatasetPage() {
  let table = null;
  try {
    table = await getFundamentalsTable({ limit: 500 });
  } catch (e) {
    console.error('[titans] fundamentals table:', e?.message || e);
  }
  return <FundamentalsClient table={table} />;
}

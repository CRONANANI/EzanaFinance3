import { getInsiderOverview } from '@/lib/titans/store';
import InsiderClient from './InsiderClient';

/**
 * Insider Trading (Form 4). Server component: loads the 30-day overview
 * (largest open-market buys and sales, cluster buys) and hands it to the
 * client. Empty -> honest empty states; no sample data.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Insider trading (Form 4) | Ezana',
  description:
    'Open-market buys and sales by company officers, directors and 10% owners, parsed from SEC Form 4 filings.',
};

export default async function InsiderPage() {
  let overview = null;
  try {
    overview = await getInsiderOverview();
  } catch (e) {
    console.error('[titans] insider overview:', e?.message || e);
  }
  return <InsiderClient overview={overview} />;
}

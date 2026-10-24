import { timed } from '@/lib/perf/timed';
import CampaignFinanceRecordsClient from './CampaignFinanceRecordsClient';
import {
  CF_DEFAULT_CYCLE,
  getCampaignFinanceCycles,
  getCampaignFinanceOverview,
} from '@/lib/campaign-finance/load';

/**
 * Campaign Finance Intelligence: receipts, spending, cash, debt and outside
 * money for every member of Congress. The overview (per-member figures plus
 * every party, chamber and network roll-up) is computed on the server and
 * cached for ten minutes behind the hourly refresh. Opts out of the marketing
 * shell via the datasets layout's STANDALONE_ROUTES.
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Campaign Finance Intelligence | Ezana',
  description:
    'Receipts, spending, cash on hand, debt and outside money for every member of Congress, with party and chamber comparisons, contribution sizes and the outside groups spending around each member.',
};

export default async function CampaignFinanceRecordsPage() {
  const [initial, cycles] = await Promise.all([
    timed(
      '/datasets/campaignfinancerecords',
      getCampaignFinanceOverview,
      'getCampaignFinanceOverview',
    )(CF_DEFAULT_CYCLE),
    timed(
      '/datasets/campaignfinancerecords',
      getCampaignFinanceCycles,
      'getCampaignFinanceCycles',
    )(),
  ]);
  return (
    <CampaignFinanceRecordsClient
      initial={initial}
      cycles={cycles.length ? cycles : [CF_DEFAULT_CYCLE]}
      todayIso={new Date().toISOString().slice(0, 10)}
    />
  );
}

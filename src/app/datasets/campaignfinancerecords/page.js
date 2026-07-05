import CampaignFinanceRecordsClient from './CampaignFinanceRecordsClient';

/**
 * Campaign Finance Records dataset page (FEC / OpenFEC) — dedicated route so the
 * Capitol Watch "Campaign Finance Records" menu item lands on a real
 * campaign-finance page instead of the Congressional Trading page. Opts out of
 * the old MarketingPageShell/DatasetsSubnav via the datasets layout's
 * STANDALONE_ROUTES. Data comes from the /api/fec/* routes (server-only key).
 */
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Campaign Finance Records | Ezana',
  description:
    'Federal Election Commission contribution and spending data for members of Congress — top raisers, donor industries, and outside money.',
};

export default function CampaignFinanceRecordsPage() {
  return <CampaignFinanceRecordsClient />;
}

import { FundAnalytics } from '@/components/org/fund-analytics/FundAnalytics';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadFundAnalytics } from '@/lib/org-fund-analytics';
import { isCommunityDemoViewer } from '@/lib/community/demo-page';

export const dynamic = 'force-dynamic';

/**
 * /org-team-hub/fund-analytics. Membership is checked on the server in
 * layout.js, which also provides the shared sidebar (TeamHubShell).
 *
 * The default period arrives with the page, so the first paint has data and
 * there is no fetch after it. The other two periods are fetched on demand.
 * `sampleViewer` only tells the page whether to ask for sample content
 * (master admin and demo accounts); the sample route checks again.
 */
export default async function FundAnalyticsPage() {
  const supabase = getUserClient();
  const member = await getCurrentOrgMember(supabase);
  let initialData = null;
  let sampleViewer = false;
  if (member) {
    const [{ payload }, auth] = await Promise.all([
      loadFundAnalytics(supabase, member, 'semester'),
      supabase.auth.getUser(),
    ]);
    initialData = payload;
    sampleViewer = isCommunityDemoViewer(auth?.data?.user || null);
  }

  return <FundAnalytics initialData={initialData} sampleViewer={sampleViewer} />;
}

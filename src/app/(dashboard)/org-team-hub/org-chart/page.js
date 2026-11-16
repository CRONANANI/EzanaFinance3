import { OrgChart } from '@/components/org/org-chart/OrgChart';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadChart } from '@/app/api/org/chart/_loader';
import { loadTeamHubSummary } from '@/app/api/org/team-hub/summary/_loader';
import { isCommunityDemoViewer } from '@/lib/community/demo-page';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Org chart | Ezana Finance',
  description:
    'The council on one page: reporting structure, sector teams, sector coverage, flag routing and the member roster.',
};

/**
 * /org-team-hub/org-chart. Membership is checked on the server in layout.js,
 * which also provides the shared sidebar (TeamHubShell).
 *
 * The chart and the fund summary arrive with the page, so the first paint has
 * data. A read that fails seeds nothing for that part, and the page fetches
 * it and shows an error with Retry if that fails too. `sampleViewer` only
 * tells the page whether to ask for sample content (master admin and demo
 * accounts); the sample route checks again.
 */
export default async function OrgChartPage() {
  const supabase = getUserClient();
  const member = await getCurrentOrgMember(supabase);

  let initialData = null;
  let sampleViewer = false;
  if (member) {
    const [chartRes, summaryRes, auth] = await Promise.allSettled([
      loadChart(supabase, member),
      loadTeamHubSummary(supabase, member),
      supabase.auth.getUser(),
    ]);
    const chart =
      chartRes.status === 'fulfilled' && !chartRes.value.error ? chartRes.value.payload : null;
    const summary = summaryRes.status === 'fulfilled' ? summaryRes.value : null;
    initialData = { chart, summary };
    sampleViewer =
      auth.status === 'fulfilled' && isCommunityDemoViewer(auth.value?.data?.user || null);
  }

  return <OrgChart initialData={initialData} sampleViewer={sampleViewer} />;
}

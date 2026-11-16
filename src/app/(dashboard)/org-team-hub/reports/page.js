import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { isCommunityDemoViewer } from '@/lib/community/demo-page';
import { ReportsPage } from '@/components/org/reports/ReportsPage';

export const dynamic = 'force-dynamic';

/**
 * /org-team-hub/reports. Membership is checked on the server in layout.js,
 * which also provides the shared sidebar (TeamHubShell). The page loads its
 * reports on the client. `sampleViewer` only tells the page whether to ask
 * for sample content (master admin and demo accounts); the sample route
 * checks again.
 */
export default async function ReportsRoute() {
  const supabase = getUserClient();
  const [member, auth] = await Promise.all([
    getCurrentOrgMember(supabase),
    supabase.auth.getUser(),
  ]);
  const sampleViewer = Boolean(member) && isCommunityDemoViewer(auth?.data?.user || null);
  return <ReportsPage sampleViewer={sampleViewer} viewerRole={member?.role || null} />;
}

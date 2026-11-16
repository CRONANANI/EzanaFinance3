import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadPermissionsMatrix } from '@/lib/org-permissions-server';
import { isCommunityDemoViewer } from '@/lib/community/demo-page';
import { TeamPermissionsPage } from '@/components/org/permissions/TeamPermissionsPage';

export const dynamic = 'force-dynamic';

/**
 * /org-team-hub/permissions. Membership is checked on the server in
 * layout.js, which also provides the shared sidebar (TeamHubShell).
 *
 * The matrix (the same payload as GET /api/org/permissions) arrives with the
 * page, so the first paint has data. When it cannot be loaded the page
 * fetches it itself and shows its own error with Retry. `sampleViewer` only
 * tells the page whether to ask for sample content (master admin and demo
 * accounts); the sample route checks again.
 */
export default async function TeamPermissionsRoute() {
  const supabase = getUserClient();
  const member = await getCurrentOrgMember(supabase);
  let initialData = null;
  let sampleViewer = false;
  if (member) {
    const [matrix, auth] = await Promise.all([
      loadPermissionsMatrix(supabase, member).catch(() => null),
      supabase.auth.getUser(),
    ]);
    initialData = matrix;
    sampleViewer = isCommunityDemoViewer(auth?.data?.user || null);
  }
  return <TeamPermissionsPage initialData={initialData} sampleViewer={sampleViewer} />;
}

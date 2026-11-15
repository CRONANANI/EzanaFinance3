import { AssignmentsPage } from '@/components/org/assignments/AssignmentsPage';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadAssignments } from '@/app/api/org/assignments/_loader';
import { isCommunityDemoViewer } from '@/lib/community/demo-page';

export const dynamic = 'force-dynamic';

const one = (v) => (Array.isArray(v) ? v[0] : v) || null;

/**
 * /org-team-hub/assignments. Membership is checked on the server in
 * layout.js, which also provides the shared sidebar (TeamHubShell).
 *
 * The board (the same payload as GET /api/org/assignments) arrives with the
 * page, so the first paint has data. When it cannot be loaded the page
 * fetches it and shows its own error with Retry.
 *
 * The view, the tab and the open assignment are kept in the page address
 * (?view=calendar&tab=mine&a=<id>), so one assignment can be linked.
 * `sampleViewer` only tells the page whether to ask for sample content
 * (master admin and demo accounts); the sample route checks again.
 */
export default async function AssignmentsRoute({ searchParams }) {
  const supabase = getUserClient();
  const member = await getCurrentOrgMember(supabase);
  let initialData = null;
  let sampleViewer = false;
  if (member) {
    const [{ payload }, auth] = await Promise.all([
      loadAssignments(supabase, member),
      supabase.auth.getUser(),
    ]);
    initialData = payload ?? null;
    sampleViewer = isCommunityDemoViewer(auth?.data?.user || null);
  }

  return (
    <AssignmentsPage
      initialData={initialData}
      sampleViewer={sampleViewer}
      initialView={one(searchParams?.view)}
      initialTab={one(searchParams?.tab)}
      initialOpen={one(searchParams?.a)}
    />
  );
}

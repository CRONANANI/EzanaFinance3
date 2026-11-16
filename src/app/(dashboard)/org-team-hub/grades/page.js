import { GradesPage } from '@/components/org/grades/GradesPage';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadGrades } from '@/app/api/org/grades/_loader';
import { isCommunityDemoViewer } from '@/lib/community/demo-page';

export const dynamic = 'force-dynamic';

const one = (v) => (Array.isArray(v) ? v[0] : v) || null;

/**
 * /org-team-hub/grades. Membership is checked on the server in layout.js,
 * which also provides the shared sidebar (TeamHubShell).
 *
 * The grades (the same payload as GET /api/org/grades) arrive with the page,
 * so the first paint has data. An executive receives the council's grades;
 * any other member receives only their own, and none while visibility is
 * paused. When the payload cannot be loaded the page fetches it and shows
 * its own error with Retry.
 *
 * An executive's open member record is kept in the page address
 * (?member=<user id>). `sampleViewer` only tells the page whether to ask for
 * sample content (master admin and demo accounts); the sample route checks
 * again.
 */
export default async function GradesRoute({ searchParams }) {
  const supabase = getUserClient();
  const member = await getCurrentOrgMember(supabase);
  let initialData = null;
  let sampleViewer = false;
  if (member) {
    const [{ payload }, auth] = await Promise.all([
      loadGrades(supabase, member),
      supabase.auth.getUser(),
    ]);
    initialData = payload ?? null;
    sampleViewer = isCommunityDemoViewer(auth?.data?.user || null);
  }

  return (
    <GradesPage
      initialData={initialData}
      sampleViewer={sampleViewer}
      initialMember={member?.role === 'executive' ? one(searchParams?.member) : null}
    />
  );
}

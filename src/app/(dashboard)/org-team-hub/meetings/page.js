import { MeetingsPage } from '@/components/org/meetings/MeetingsPage';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadMeetingsList } from '@/app/api/org/meetings/_loader';
import { isCommunityDemoViewer } from '@/lib/community/demo-page';

export const dynamic = 'force-dynamic';

const one = (v) => (Array.isArray(v) ? v[0] : v) || null;

/**
 * /org-team-hub/meetings. Membership is checked on the server in layout.js,
 * which also provides the shared sidebar (TeamHubShell).
 *
 * The library (the same payload as GET /api/org/meetings) arrives with the
 * page, so the first paint has data. When it cannot be loaded the page
 * fetches it and shows its own error with Retry.
 *
 * The open meeting, tab, category and term are kept in the page address
 * (?m=<id>&tab=past&cat=ic&term=2026-fall), so one meeting can be linked.
 * `sampleViewer` only tells the page whether to ask for sample content
 * (master admin and demo accounts); the sample route checks again.
 */
export default async function MeetingsRoute({ searchParams }) {
  const supabase = getUserClient();
  const member = await getCurrentOrgMember(supabase);
  let initialData = null;
  let sampleViewer = false;
  if (member) {
    const [{ payload }, auth] = await Promise.all([
      loadMeetingsList(supabase, member),
      supabase.auth.getUser(),
    ]);
    initialData = payload ?? null;
    sampleViewer = isCommunityDemoViewer(auth?.data?.user || null);
  }

  return (
    <MeetingsPage
      initialData={initialData}
      sampleViewer={sampleViewer}
      initialMeeting={one(searchParams?.m)}
      initialTab={one(searchParams?.tab)}
      initialCategory={one(searchParams?.cat)}
      initialTerm={one(searchParams?.term)}
    />
  );
}

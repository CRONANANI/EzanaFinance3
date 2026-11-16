import { getAdminClient, getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadCompetitionsOverview } from '@/lib/competitions/overview';
import { isCommunityDemoViewer } from '@/lib/community/demo-page';
import { CompetitionsPage } from '@/components/org/competitions/landing/CompetitionsPage';

export const dynamic = 'force-dynamic';

const one = (v) => (Array.isArray(v) ? v[0] : v) || null;

/* Dates on the page (circuit deadlines) are taken against one day, worked
   out on the server, so server and client render the same. */
function todayIso() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto' }).format(new Date());
}

/**
 * /org-competitions. The landing screen: the council's figures, what it owes,
 * the events it entered, events open to join, the events it hosts, the
 * pitch circuit's next dates, its fund challenge standing and its trophies.
 * `?tab=fund` opens the Fund challenges tab (Fund Analytics links there).
 *
 * The payload (the same as GET /api/org/pitch-competitions/overview) arrives
 * with the page. `sampleViewer` only tells the page whether to ask for
 * sample content (master admin and demo accounts); the sample route checks
 * again.
 */
export default async function OrgCompetitionsPage({ searchParams }) {
  const params = (await searchParams) || {};
  const supabase = getUserClient();
  const member = await getCurrentOrgMember(supabase);
  let initialData = null;
  let sampleViewer = false;
  if (member) {
    const [payload, auth] = await Promise.all([
      loadCompetitionsOverview(supabase, getAdminClient(), member).catch(() => null),
      supabase.auth.getUser(),
    ]);
    initialData = payload;
    sampleViewer = isCommunityDemoViewer(auth?.data?.user || null);
  }

  return (
    <CompetitionsPage
      initialData={initialData}
      sampleViewer={sampleViewer}
      initialTab={one(params.tab)}
      todayIso={todayIso()}
    />
  );
}

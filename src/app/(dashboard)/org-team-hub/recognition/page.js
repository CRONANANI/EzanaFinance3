import { RecognitionPage } from '@/components/org/recognition/RecognitionPage';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadRatings, loadRecognitionBase } from '@/app/api/org/recognition/_loader';
import { isCommunityDemoViewer } from '@/lib/community/demo-page';

export const dynamic = 'force-dynamic';

const one = (v) => (Array.isArray(v) ? v[0] : v) || null;

/**
 * /org-team-hub/recognition. Membership is checked on the server in
 * layout.js, which also provides the shared sidebar (TeamHubShell).
 *
 * The roster, the badges and awards (the same payload as GET
 * /api/org/recognition) and the first ranked list (Top movers, 30D) arrive
 * with the page, so the first paint has data. When either cannot be loaded
 * the page fetches it and shows its own error with Retry.
 *
 * The open scorecard is kept in the page address (?member=<id>), so one
 * member's scorecard can be linked. `sampleViewer` only tells the page
 * whether to ask for sample content (master admin and demo accounts); the
 * sample route checks again.
 */
export default async function RecognitionRoute({ searchParams }) {
  const supabase = getUserClient();
  const member = await getCurrentOrgMember(supabase);
  let initialBase = null;
  let initialRatings = null;
  let sampleViewer = false;
  if (member) {
    const [base, ratings, auth] = await Promise.all([
      loadRecognitionBase(supabase, member),
      loadRatings(supabase, member, 'movers', '30d'),
      supabase.auth.getUser(),
    ]);
    initialBase = base.payload ?? null;
    initialRatings = ratings.payload ?? null;
    sampleViewer = isCommunityDemoViewer(auth?.data?.user || null);
  }

  return (
    <RecognitionPage
      initialBase={initialBase}
      initialRatings={initialRatings}
      sampleViewer={sampleViewer}
      initialMember={one(searchParams?.member)}
    />
  );
}

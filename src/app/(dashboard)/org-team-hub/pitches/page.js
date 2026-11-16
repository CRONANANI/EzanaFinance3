import { PitchPipelinePage } from '@/components/org/pitches/PitchPipelinePage';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadPitchBoard } from '@/lib/org-pitch-api-helpers';
import { isCommunityDemoViewer } from '@/lib/community/demo-page';

export const dynamic = 'force-dynamic';

const one = (v) => (Array.isArray(v) ? v[0] : v) || null;

/**
 * /org-team-hub/pitches. Membership is checked on the server in layout.js,
 * which also provides the shared sidebar (TeamHubShell).
 *
 * The pipeline (the same payload as GET /api/org/pitches/board) arrives with
 * the page, so the first paint has data. When it cannot be loaded the page
 * fetches it and shows its own error with Retry.
 *
 * The chosen stage and the open pitch are kept in the page address
 * (?stage=deep_dive&pitch=<id>), so a pitch can be linked; older per-pitch
 * links redirect here. ?new=pitch (with an optional &ticker=) opens the
 * submit flow on arrival, prefilled with that ticker. `sampleViewer` only tells the page whether to ask for
 * sample content (master admin and demo accounts); the sample route checks
 * again.
 */
export default async function PitchPipelineRoute({ searchParams }) {
  const supabase = getUserClient();
  const member = await getCurrentOrgMember(supabase);
  let initialData = null;
  let sampleViewer = false;
  if (member) {
    const viewer = {
      id: member.id,
      role: member.role,
      tier: member.tier || null,
      team_id: member.team_id || null,
    };
    const [board, auth] = await Promise.all([
      loadPitchBoard(supabase, member.org_id, { viewer }).catch(() => null),
      supabase.auth.getUser(),
    ]);
    initialData = board;
    sampleViewer = isCommunityDemoViewer(auth?.data?.user || null);
  }

  return (
    <PitchPipelinePage
      initialData={initialData}
      sampleViewer={sampleViewer}
      initialStage={one(searchParams?.stage)}
      initialPitch={one(searchParams?.pitch)}
      initialNew={one(searchParams?.new) === 'pitch'}
      initialTicker={one(searchParams?.ticker)}
    />
  );
}

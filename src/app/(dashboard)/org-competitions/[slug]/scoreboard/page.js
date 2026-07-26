import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadCompetition } from '@/lib/competitions/loaders';
import { canManageCompetition } from '@/lib/competitions/permissions';
import { ScoreboardClient } from '@/components/org/competitions/ScoreboardClient';

export const dynamic = 'force-dynamic';

export default async function CompetitionScoreboardPage({ params }) {
  const { slug } = await params;
  const supabase = getUserClient();
  const member = await getCurrentOrgMember(supabase);
  if (!member) {
    return (
      <div className="dashboard-page-inset">
        <div className="pcx-empty-page">This page is for organizational members only.</div>
      </div>
    );
  }
  const competition = await loadCompetition(supabase, slug);
  if (!competition || !canManageCompetition(member, competition)) {
    return (
      <div className="dashboard-page-inset">
        <div className="pcx-empty-page">The scoreboard is only visible to the host organizers.</div>
      </div>
    );
  }

  return (
    <div className="dashboard-page-inset">
      <ScoreboardClient competition={competition} />
    </div>
  );
}

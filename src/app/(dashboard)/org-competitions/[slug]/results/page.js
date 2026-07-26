import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadCompetition } from '@/lib/competitions/loaders';
import { canManageCompetition } from '@/lib/competitions/permissions';
import { ResultsClient } from '@/components/org/competitions/ResultsClient';

export const dynamic = 'force-dynamic';

export default async function CompetitionResultsPage({ params }) {
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
  if (!competition) {
    return (
      <div className="dashboard-page-inset">
        <div className="pcx-empty-page">Competition not found, or you don’t have access to it.</div>
      </div>
    );
  }

  return (
    <div className="dashboard-page-inset">
      <ResultsClient competition={competition} isHost={canManageCompetition(member, competition)} />
    </div>
  );
}

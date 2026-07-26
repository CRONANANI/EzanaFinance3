import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadCompetition } from '@/lib/competitions/loaders';
import { loadJoinRequests } from '@/lib/competitions/onboarding';
import { canManageCompetition } from '@/lib/competitions/permissions';
import { RequestsClient } from '@/components/org/competitions/RequestsClient';

export const dynamic = 'force-dynamic';

export default async function CompetitionRequestsPage({ params }) {
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
  const requests = await loadJoinRequests(supabase, competition.id);

  return (
    <div className="dashboard-page-inset">
      <RequestsClient
        competition={competition}
        initialRequests={requests}
        canManage={canManageCompetition(member, competition)}
      />
    </div>
  );
}

import { getUserClient, getAdminClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadConfig } from '@/lib/competitions/onboarding';
import { JoinClient } from '@/components/org/competitions/JoinClient';

export const dynamic = 'force-dynamic';

export default async function CompetitionJoinPage({ params }) {
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

  // A not-yet-joined org can't read the competition under RLS, so load the public
  // shape + config via admin; the join API enforces every rule server-side.
  const admin = getAdminClient();
  const { data: competition } = await admin
    .from('pitch_competitions')
    .select('id, host_org_id, name, slug, theme, status')
    .eq('slug', slug)
    .maybeSingle();
  if (!competition) {
    return (
      <div className="dashboard-page-inset">
        <div className="pcx-empty-page">Competition not found.</div>
      </div>
    );
  }

  const config = await loadConfig(admin, competition.id);
  const [{ count: myTeams }, { count: myPending }] = await Promise.all([
    admin.from('pitch_teams').select('id', { count: 'exact', head: true }).eq('competition_id', competition.id).eq('org_id', member.org_id),
    admin.from('pitch_join_requests').select('id', { count: 'exact', head: true }).eq('competition_id', competition.id).eq('org_id', member.org_id).eq('status', 'pending'),
  ]);

  return (
    <div className="dashboard-page-inset">
      <JoinClient
        competition={competition}
        config={config}
        isHost={competition.host_org_id === member.org_id}
        alreadyEntered={(myTeams || 0) > 0}
        hasPending={(myPending || 0) > 0}
      />
    </div>
  );
}

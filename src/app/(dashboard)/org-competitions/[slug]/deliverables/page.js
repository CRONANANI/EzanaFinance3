import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadCompetition } from '@/lib/competitions/loaders';
import { loadConfig, loadDeliverables } from '@/lib/competitions/onboarding';
import { DeliverablesClient } from '@/components/org/competitions/DeliverablesClient';

export const dynamic = 'force-dynamic';

export default async function CompetitionDeliverablesPage({ params }) {
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

  // The caller's own team (RLS lets a member read their own org's team row).
  const { data: team } = await supabase
    .from('pitch_teams')
    .select('id, team_name, status, org_id')
    .eq('competition_id', competition.id)
    .eq('org_id', member.org_id)
    .maybeSingle();

  const config = await loadConfig(supabase, competition.id);
  const deliverables = team ? await loadDeliverables(supabase, team.id) : [];

  return (
    <div className="dashboard-page-inset">
      <DeliverablesClient
        competition={competition}
        team={team || null}
        config={config}
        initialDeliverables={deliverables}
      />
    </div>
  );
}

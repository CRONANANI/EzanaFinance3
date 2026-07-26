import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadCompetition } from '@/lib/competitions/loaders';
import { loadConfig } from '@/lib/competitions/onboarding';
import { canManageCompetition } from '@/lib/competitions/permissions';
import { ConfigClient } from '@/components/org/competitions/ConfigClient';

export const dynamic = 'force-dynamic';

export default async function CompetitionConfigPage({ params }) {
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

  const config = await loadConfig(supabase, competition.id);

  return (
    <div className="dashboard-page-inset">
      <ConfigClient
        competition={{ ...competition, isHost: competition.host_org_id === member.org_id }}
        initialConfig={config}
        canManage={canManageCompetition(member, competition)}
      />
    </div>
  );
}

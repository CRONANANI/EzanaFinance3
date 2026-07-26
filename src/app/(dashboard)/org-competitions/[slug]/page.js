import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadCompetition, loadStructure } from '@/lib/competitions/loaders';
import { canManageCompetition } from '@/lib/competitions/permissions';
import { CommandCenterClient } from '@/components/org/competitions/CommandCenterClient';

export const dynamic = 'force-dynamic';

export default async function CompetitionCommandCenterPage({ params }) {
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

  let structure = null;
  try {
    structure = await loadStructure(supabase, competition.id);
  } catch {
    structure = null;
  }

  return (
    <div className="dashboard-page-inset">
      <CommandCenterClient
        initialCompetition={{ ...competition, isHost: competition.host_org_id === member.org_id }}
        initialStructure={structure}
        canManage={canManageCompetition(member, competition)}
      />
    </div>
  );
}

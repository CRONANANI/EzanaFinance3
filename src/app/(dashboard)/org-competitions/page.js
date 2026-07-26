import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { loadCompetitions } from '@/lib/competitions/loaders';
import { COMPETITION_MANAGER_ROLES } from '@/lib/competitions/permissions';
import { CompetitionsListClient } from '@/components/org/competitions/CompetitionsListClient';

export const dynamic = 'force-dynamic';

export default async function OrgCompetitionsPage() {
  const supabase = getUserClient();
  const member = await getCurrentOrgMember(supabase);

  if (!member) {
    return (
      <div className="dashboard-page-inset">
        <div className="pcx-empty-page">This page is for organizational members only.</div>
      </div>
    );
  }

  let initial = [];
  try {
    initial = await loadCompetitions(supabase, member.org_id);
  } catch {
    initial = [];
  }

  return (
    <div className="dashboard-page-inset">
      <CompetitionsListClient
        initial={initial}
        canManage={assertOrgRole(member, COMPETITION_MANAGER_ROLES)}
      />
    </div>
  );
}

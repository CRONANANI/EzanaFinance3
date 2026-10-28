import { getUserClient, getAdminClient } from '@/lib/supabase';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { loadCompetitions, loadJoinableCompetitions } from '@/lib/competitions/loaders';
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

  // Open competitions hosted by other councils (service role, since RLS hides
  // competitions this org is not part of). Never throws.
  const joinable = await loadJoinableCompetitions(
    getAdminClient(),
    member.org_id,
    initial.map((c) => c.id),
  );

  return (
    <div className="dashboard-page-inset">
      <CompetitionsListClient
        initial={initial}
        joinable={joinable}
        canManage={assertOrgRole(member, COMPETITION_MANAGER_ROLES)}
      />
    </div>
  );
}

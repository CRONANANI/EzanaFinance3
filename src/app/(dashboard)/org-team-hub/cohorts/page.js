import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { CohortManager } from '@/components/org/academic2/CohortManager';

export const dynamic = 'force-dynamic';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];

// Mirrors GET /api/org/cohorts (no status filter, as the client's mount fetch)
// so CohortManager can seed its cohorts list + viewer and skip the mount fetch.
// Per-tab data (recruitment/roster/onboarding/alumni) still lazy-loads on open.
async function loadCohorts(supabase, member) {
  const { data, error } = await supabase
    .from('org_cohorts')
    .select('*')
    .eq('org_id', member.org_id)
    .order('created_at', { ascending: false });
  if (error) return null;

  return {
    cohorts: data || [],
    viewer: {
      memberId: member.id,
      userId: member.user_id,
      role: member.role,
      isExecutive: member.role === 'executive',
      canManage: MANAGER_ROLES.includes(member.role),
      isAdvisor: member.role === 'executive' && member.sub_role === 'Faculty Advisor',
    },
  };
}

export default async function CohortsPage() {
  const supabase = createServerSupabase();
  const member = await getCurrentOrgMember(supabase);
  const initialData = member ? await loadCohorts(supabase, member) : null;

  return (
    <div className="dashboard-page-inset">
      <CohortManager initialData={initialData} />
    </div>
  );
}

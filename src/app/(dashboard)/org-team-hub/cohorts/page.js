import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { isCommunityDemoViewer } from '@/lib/community/demo-page';
import { readAddress } from '@/lib/org-cohorts-model';
import { CohortsPage } from '@/components/org/cohorts/CohortsPage';

export const dynamic = 'force-dynamic';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];
const one = (v) => (Array.isArray(v) ? v[0] : v) || null;

/* The same payload as GET /api/org/cohorts (cohorts and viewer), so the first
   paint has the cohort list. Each section then loads its own data. */
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

/**
 * /org-team-hub/cohorts. Membership is checked on the server in layout.js,
 * which also provides the shared sidebar (TeamHubShell). The chosen cohort
 * and tab come from the address (?cohort=<id>&tab=<tab>). `sampleViewer`
 * only tells the page whether to ask for sample content (master admin and
 * demo accounts); the sample route checks again.
 */
export default async function CohortsRoute({ searchParams }) {
  const supabase = getUserClient();
  const member = await getCurrentOrgMember(supabase);
  let initialData = null;
  let sampleViewer = false;
  if (member) {
    const [payload, auth] = await Promise.all([
      loadCohorts(supabase, member),
      supabase.auth.getUser(),
    ]);
    initialData = payload;
    sampleViewer = isCommunityDemoViewer(auth?.data?.user || null);
  }
  const params = new URLSearchParams();
  const cohort = one(searchParams?.cohort);
  const tab = one(searchParams?.tab);
  if (cohort) params.set('cohort', String(cohort));
  if (tab) params.set('tab', String(tab));

  return (
    <CohortsPage
      initialData={initialData}
      sampleViewer={sampleViewer}
      initialAddress={readAddress(params.toString())}
    />
  );
}

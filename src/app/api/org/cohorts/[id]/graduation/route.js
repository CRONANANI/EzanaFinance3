import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadGraduation } from '@/lib/org-cohort-graduation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];

async function resolveParams(context) {
  return (await context?.params) || {};
}

/* GET /api/org/cohorts/:id/graduation : graduation readiness for one cohort.
   The members of this cohort flagged to graduate, the sectors each covers and,
   for executives and portfolio managers, whether each sector has a published
   handoff. Analysts get the list with handoff status null: team visibility
   rules may hide documents from them, so a "missing" there could be wrong.
   The archive route graduates exactly this list (same loader). */
export const GET = withApiGuard(
  async (request, user, context) => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await resolveParams(context);

    const { data: cohort } = await supabase
      .from('org_cohorts')
      .select('id, archived')
      .eq('id', id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!cohort) return NextResponse.json({ error: 'Cohort not found' }, { status: 404 });

    const showHandoffs = MANAGER_ROLES.includes(member.role);
    const { gate } = await loadGraduation(supabase, member.org_id, id, { showHandoffs });
    return NextResponse.json({
      archived: !!cohort.archived,
      members: gate.members,
      required: showHandoffs ? gate.required : null,
      published: showHandoffs ? gate.published : null,
      missing: showHandoffs ? gate.missing : null,
      handoffs_visible: showHandoffs,
    });
  },
  { requireAuth: true },
);

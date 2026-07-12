import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { MANAGER_ROLES, ATS_STAGES } from '../ats-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function resolveParams(context) {
  return (await context?.params) || {};
}

/* PATCH /api/org/applicants/:id — advance / reject / decline an applicant
   (manager only). Reject and decline route to the two archive lanes and capture
   a reason. Accepting is a stage move only; provisioning the member is the
   separate POST /:id/provision call (the transactional payoff). */
export const PATCH = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Manager role required' }, { status: 403 });
    }
    const { id } = await resolveParams(context);

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { data: applicant } = await supabase
      .from('org_applicants')
      .select('id, stage, provisioned_member_id')
      .eq('id', id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!applicant) return NextResponse.json({ error: 'Applicant not found' }, { status: 404 });

    const update = {};
    const targetStage = body?.stage;
    if (targetStage) {
      if (!ATS_STAGES.includes(targetStage)) {
        return NextResponse.json({ error: 'Invalid stage' }, { status: 400 });
      }
      // Guard the payoff path: acceptance must go through /provision so a member
      // row is actually created — never a bare stage flip.
      if (targetStage === 'accepted' && !applicant.provisioned_member_id) {
        return NextResponse.json(
          { error: 'Use POST /provision to accept — it creates the member row.' },
          { status: 400 },
        );
      }
      update.stage = targetStage;
      if ((targetStage === 'rejected' || targetStage === 'declined') && 'rejected_reason' in body) {
        update.rejected_reason = body.rejected_reason
          ? String(body.rejected_reason).slice(0, 400)
          : null;
      }
      if (targetStage !== 'rejected' && targetStage !== 'declined') {
        update.rejected_reason = null;
      }
    } else if ('rejected_reason' in body) {
      update.rejected_reason = body.rejected_reason
        ? String(body.rejected_reason).slice(0, 400)
        : null;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('org_applicants')
      .update(update)
      .eq('id', id)
      .eq('org_id', member.org_id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ applicant: data });
  },
  { requireAuth: true },
);

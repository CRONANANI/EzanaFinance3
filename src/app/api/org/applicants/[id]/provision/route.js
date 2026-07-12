import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import {
  createServerSupabaseClient,
  isServerSupabaseConfigured,
} from '@/lib/supabase-service-role';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { logOrgAction } from '@/lib/org-audit';
import { MANAGER_ROLES } from '../../ats-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const PROVISION_ROLES = ['executive', 'portfolio_manager', 'analyst'];

async function resolveParams(context) {
  return (await context?.params) || {};
}

const MEMBER_SELECT =
  'id, user_id, display_name, role, title, tier, team_id, reports_to, cohort_id, lifecycle_status, joined_at, mentor_member_id';

/* POST /api/org/applicants/:id/provision — accept → provision, in ONE call.
   Idempotent. Creates the account, then the org_members row, slots it into the
   org chart (reports_to / team_id / title / tier), stamps cohort_id +
   lifecycle_status='onboarding', pairs a mentor, and links the applicant back
   via provisioned_member_id. The onboarding track is the cohort's onboarding
   tasks — the new member appears in that matrix automatically by being an
   onboarding member of the cohort (see the onboarding route). */
export const POST = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Manager role required' }, { status: 403 });
    }
    const { id } = await resolveParams(context);

    const { data: applicant } = await supabase
      .from('org_applicants')
      .select('*')
      .eq('id', id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!applicant) return NextResponse.json({ error: 'Applicant not found' }, { status: 404 });

    // ── Idempotency: if already provisioned, return the existing member. ──────
    if (applicant.provisioned_member_id) {
      const { data: existing } = await supabase
        .from('org_members')
        .select(MEMBER_SELECT)
        .eq('id', applicant.provisioned_member_id)
        .eq('org_id', member.org_id)
        .maybeSingle();
      return NextResponse.json({ member: existing, applicant, already: true });
    }

    if (!applicant.email) {
      return NextResponse.json(
        { error: 'Applicant has no email — cannot create an account to provision.' },
        { status: 400 },
      );
    }
    if (!isServerSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Server not configured for provisioning' },
        { status: 503 },
      );
    }

    let body = {};
    try {
      body = await request.json();
    } catch {
      /* optional body */
    }
    const role = PROVISION_ROLES.includes(body?.role) ? body.role : 'analyst';

    const service = createServerSupabaseClient();

    // Validate optional chart-slot references belong to this org.
    async function memberInOrg(mid) {
      if (!mid) return true;
      const { data } = await supabase
        .from('org_members')
        .select('id')
        .eq('id', mid)
        .eq('org_id', member.org_id)
        .maybeSingle();
      return !!data;
    }
    if (!(await memberInOrg(body?.reports_to))) {
      return NextResponse.json(
        { error: 'reports_to is not a member of your org' },
        { status: 400 },
      );
    }
    if (!(await memberInOrg(body?.mentor_member_id))) {
      return NextResponse.json({ error: 'mentor is not a member of your org' }, { status: 400 });
    }
    if (body?.team_id) {
      const { data: team } = await supabase
        .from('org_teams')
        .select('id')
        .eq('id', body.team_id)
        .eq('org_id', member.org_id)
        .maybeSingle();
      if (!team) return NextResponse.json({ error: 'team_id is not in your org' }, { status: 400 });
    }

    // ── 1) Create the account (unconfirmed — the person claims it later). ─────
    const { data: created, error: createErr } = await service.auth.admin.createUser({
      email: applicant.email,
      email_confirm: false,
      user_metadata: { full_name: applicant.full_name, provisioned_org: member.org_id },
    });
    if (createErr || !created?.user?.id) {
      const msg = createErr?.message || '';
      if (/already|registered|exists/i.test(msg)) {
        return NextResponse.json(
          {
            error:
              'An account already exists for this email. Link it via an invite instead of auto-provisioning.',
          },
          { status: 409 },
        );
      }
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }
    const newUserId = created.user.id;

    // ── 2) Create the org_members row and slot it into the chart. ────────────
    const insert = {
      org_id: member.org_id,
      user_id: newUserId,
      display_name: applicant.full_name,
      role,
      title: body?.title ? String(body.title).slice(0, 120) : null,
      team_id: body?.team_id || null,
      reports_to: body?.reports_to || null,
      cohort_id: applicant.cohort_id,
      lifecycle_status: 'onboarding',
      joined_at: new Date().toISOString(),
      is_active: true,
      mentor_member_id: body?.mentor_member_id || null,
    };
    if (body?.tier) insert.tier = String(body.tier);

    const { data: newMember, error: memErr } = await service
      .from('org_members')
      .insert(insert)
      .select(MEMBER_SELECT)
      .single();
    if (memErr) {
      // Roll back the orphaned auth user so a retry is clean.
      await service.auth.admin.deleteUser(newUserId).catch(() => {});
      return NextResponse.json({ error: 'Failed to create member row' }, { status: 500 });
    }

    // ── 3) Link the applicant back + mark accepted. ──────────────────────────
    const { data: updatedApplicant } = await service
      .from('org_applicants')
      .update({ stage: 'accepted', provisioned_member_id: newMember.id })
      .eq('id', id)
      .eq('org_id', member.org_id)
      .select('*')
      .single();

    await logOrgAction(service, {
      orgId: member.org_id,
      actorId: member.user_id,
      action: 'applicant_provisioned',
      targetType: 'applicant',
      targetId: id,
      detail: { member_id: newMember.id, cohort_id: applicant.cohort_id, role },
    });

    return NextResponse.json({ member: newMember, applicant: updatedApplicant });
  },
  { requireAuth: true },
);

import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];
const LIFECYCLE = ['onboarding', 'active', 'on_leave', 'graduating', 'alumni', 'departed'];

async function resolveParams(context) {
  return (await context?.params) || {};
}

/* PATCH /api/org/cohorts/:id/lifecycle — move a member through the lifecycle
   (Promote · Mark on leave · Begin graduation · Depart) and/or pair a mentor.
   Manager only. Setting 'graduating' flips is_graduating so the existing archive
   flow graduates them; 'departed' stamps departed_at + deactivates. */
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
    const memberId = body?.member_id;
    if (!memberId) return NextResponse.json({ error: 'member_id required' }, { status: 400 });

    // Target must belong to this org + cohort.
    const { data: target } = await supabase
      .from('org_members')
      .select('id')
      .eq('id', memberId)
      .eq('org_id', member.org_id)
      .eq('cohort_id', id)
      .maybeSingle();
    if (!target) {
      return NextResponse.json({ error: 'Member not found in this cohort' }, { status: 404 });
    }

    const update = {};

    if ('lifecycle_status' in body) {
      const status = body.lifecycle_status;
      if (!LIFECYCLE.includes(status)) {
        return NextResponse.json({ error: 'Invalid lifecycle_status' }, { status: 400 });
      }
      update.lifecycle_status = status;
      if (status === 'graduating') {
        update.is_graduating = true;
      } else if (status === 'departed') {
        update.departed_at = new Date().toISOString();
        update.is_active = false;
        update.departure_reason = body?.departure_reason
          ? String(body.departure_reason).slice(0, 400)
          : null;
      } else if (status === 'active' || status === 'onboarding') {
        update.is_active = true;
        update.is_graduating = false;
        update.departed_at = null;
        update.departure_reason = null;
      }
    }

    if ('mentor_member_id' in body) {
      if (body.mentor_member_id) {
        if (body.mentor_member_id === memberId) {
          return NextResponse.json({ error: 'A member cannot mentor themselves' }, { status: 400 });
        }
        const { data: mentor } = await supabase
          .from('org_members')
          .select('id')
          .eq('id', body.mentor_member_id)
          .eq('org_id', member.org_id)
          .maybeSingle();
        if (!mentor) return NextResponse.json({ error: 'Mentor not in your org' }, { status: 400 });
        update.mentor_member_id = body.mentor_member_id;
      } else {
        update.mentor_member_id = null;
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('org_members')
      .update(update)
      .eq('id', memberId)
      .eq('org_id', member.org_id)
      .select(
        'id, display_name, lifecycle_status, is_active, is_graduating, mentor_member_id, departed_at, departure_reason',
      )
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ member: data });
  },
  { requireAuth: true },
);

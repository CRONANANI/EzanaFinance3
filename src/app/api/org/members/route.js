import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROLES = ['executive', 'portfolio_manager', 'analyst'];

/* GET /api/org/members — roster + teams for the caller's org (any active member). */
export const GET = withApiGuard(
  async () => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const orgId = member.org_id;

    const [{ data: members, error: memErr }, { data: teams }, { data: org }] = await Promise.all([
      supabase
        .from('org_members')
        .select('id, user_id, display_name, role, sub_role, tier, team_id, is_active, title')
        .eq('org_id', orgId)
        .order('role')
        .order('display_name'),
      supabase.from('org_teams').select('id, name').eq('org_id', orgId).order('name'),
      supabase.from('organizations').select('name, university_name').eq('id', orgId).maybeSingle(),
    ]);
    if (memErr) return NextResponse.json({ error: memErr.message }, { status: 500 });

    return NextResponse.json({
      orgName: org?.university_name || org?.name || 'Organization',
      members: members || [],
      teams: teams || [],
      viewer: {
        memberId: member.id,
        role: member.role,
        isExecutive: member.role === 'executive',
      },
    });
  },
  { requireAuth: true },
);

/* PATCH /api/org/members — update a member's role / sub_role / team / active state.
   Executive only. Guards against the last active executive demoting or
   deactivating themselves (org lockout). Keeps `tier` in sync with `role`. */
export const PATCH = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!assertOrgRole(member, ['executive'])) {
      return NextResponse.json({ error: 'Executive role required' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const targetId = body?.member_id;
    if (!targetId) return NextResponse.json({ error: 'member_id is required' }, { status: 400 });

    // Target must belong to the caller's org.
    const { data: target } = await supabase
      .from('org_members')
      .select('id, role, is_active, org_id')
      .eq('id', targetId)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!target) {
      return NextResponse.json({ error: 'Member not found in your organization' }, { status: 404 });
    }

    const update = {};
    if ('role' in body) {
      if (!ROLES.includes(body.role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      update.role = body.role;
      update.tier = body.role; // coarse roles are valid tiers — keep the org chart in sync
    }
    if ('sub_role' in body) update.sub_role = body.sub_role || null;
    if ('team_id' in body) update.team_id = body.team_id || null;
    if ('is_active' in body) update.is_active = !!body.is_active;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No changes provided' }, { status: 400 });
    }

    // Last-executive lockout guard: don't let the final active executive lose
    // their seat (role demotion or deactivation).
    const losingExecSeat =
      target.role === 'executive' &&
      target.is_active &&
      ((update.role && update.role !== 'executive') || update.is_active === false);
    if (losingExecSeat) {
      const { count } = await supabase
        .from('org_members')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', member.org_id)
        .eq('role', 'executive')
        .eq('is_active', true);
      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          { error: 'This is the last active executive — assign another executive first.' },
          { status: 409 },
        );
      }
    }

    const { data: updated, error: updErr } = await supabase
      .from('org_members')
      .update(update)
      .eq('id', targetId)
      .eq('org_id', member.org_id)
      .select('id, user_id, display_name, role, sub_role, tier, team_id, is_active, title')
      .single();
    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    return NextResponse.json({ member: updated });
  },
  { requireAuth: true },
);

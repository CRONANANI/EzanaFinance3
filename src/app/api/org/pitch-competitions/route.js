import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';
import { loadCompetitions } from '@/lib/competitions/loaders';
import { canManageCompetition, slugify, COMPETITION_MANAGER_ROLES } from '@/lib/competitions/permissions';
import { DEFAULT_RUBRIC } from '@/lib/competitions/default-rubric';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/org/pitch-competitions — competitions the caller's org hosts or is a
   participant in (RLS-scoped). */
export const GET = withApiGuard(
  async () => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const competitions = await loadCompetitions(supabase, member.org_id);
    return NextResponse.json({
      competitions,
      viewer: { orgId: member.org_id, canManage: assertOrgRole(member, COMPETITION_MANAGER_ROLES) },
    });
  },
  { requireAuth: true },
);

/* POST /api/org/pitch-competitions — create a competition hosted by the caller's
   org (executives/PMs only). Seeds the default rubric + a first round so the host
   starts from something real. */
export const POST = withApiGuard(
  async (request) => {
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    if (!canManageCompetition(member)) {
      return NextResponse.json({ error: 'Manager role required' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const name = String(body?.name || '').trim();
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    const format = ['showcase', 'single_elim', 'round_robin'].includes(body?.format)
      ? body.format
      : 'showcase';
    const slug = `${slugify(name) || 'competition'}-${randomUUID().slice(0, 6)}`;

    const { data: comp, error } = await supabase
      .from('pitch_competitions')
      .insert({
        host_org_id: member.org_id,
        name,
        slug,
        description: body?.description || null,
        format,
        theme: body?.theme || null,
        rules_url: body?.rules_url || null,
        starts_at: body?.starts_at || null,
        ends_at: body?.ends_at || null,
        created_by: member.id,
      })
      .select('id, slug')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Seed the default rubric and a first round. Best-effort — a competition is
    // still valid without them, so don't fail the create if these error.
    await supabase.from('pitch_rubric_criteria').insert(
      DEFAULT_RUBRIC.map((c) => ({ ...c, competition_id: comp.id })),
    );
    await supabase
      .from('pitch_rounds')
      .insert({ competition_id: comp.id, name: 'Round 1', sort_order: 0 });

    return NextResponse.json({ competition: comp }, { status: 201 });
  },
  { requireAuth: true },
);

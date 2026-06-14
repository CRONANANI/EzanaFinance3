import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import {
  createServerSupabaseClient,
  isServerSupabaseConfigured,
} from '@/lib/supabase-service-role';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];
const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

/* GET /api/org/teams — teams + per-team headcount + sector coverage (any member). */
export const GET = withApiGuard(
  async () => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const orgId = member.org_id;

    const [{ data: teams, error }, { data: members }, { data: coverage }] = await Promise.all([
      supabase
        .from('org_teams')
        .select('id, name, slug, description')
        .eq('org_id', orgId)
        .order('name'),
      supabase.from('org_members').select('id, team_id, is_active').eq('org_id', orgId),
      supabase.from('org_sector_coverage').select('sector').eq('org_id', orgId),
    ]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const headcount = new Map();
    for (const m of members || []) {
      if (m.is_active) headcount.set(m.team_id, (headcount.get(m.team_id) || 0) + 1);
    }

    return NextResponse.json({
      teams: (teams || []).map((t) => ({ ...t, memberCount: headcount.get(t.id) || 0 })),
      coverageCount: (coverage || []).length,
      viewer: { canManage: assertOrgRole(member, MANAGER_ROLES) },
    });
  },
  { requireAuth: true },
);

async function requireManager() {
  const supabase = createServerSupabase();
  const member = await getCurrentOrgMember(supabase);
  if (!member) return { error: NextResponse.json({ error: 'Not an org member' }, { status: 403 }) };
  if (!assertOrgRole(member, MANAGER_ROLES)) {
    return { error: NextResponse.json({ error: 'Manager role required' }, { status: 403 }) };
  }
  if (!isServerSupabaseConfigured()) {
    return { error: NextResponse.json({ error: 'Server not configured' }, { status: 503 }) };
  }
  return { member, service: createServerSupabaseClient() };
}

/* POST — create a team (manager). */
export const POST = withApiGuard(
  async (request) => {
    const { error: gate, member, service } = await requireManager();
    if (gate) return gate;
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const name = String(body?.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Team name required' }, { status: 400 });

    const { data, error } = await service
      .from('org_teams')
      .insert({ org_id: member.org_id, name, slug: slugify(name), description: body?.description || null })
      .select('id, name, slug, description')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ team: { ...data, memberCount: 0 } }, { status: 201 });
  },
  { requireAuth: true },
);

/* PATCH — rename / re-describe a team (manager). */
export const PATCH = withApiGuard(
  async (request) => {
    const { error: gate, member, service } = await requireManager();
    if (gate) return gate;
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    if (!body?.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const update = {};
    if ('name' in body) {
      const name = String(body.name || '').trim();
      if (!name) return NextResponse.json({ error: 'Team name required' }, { status: 400 });
      update.name = name;
      update.slug = slugify(name);
    }
    if ('description' in body) update.description = body.description || null;
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No changes' }, { status: 400 });
    }

    const { data, error } = await service
      .from('org_teams')
      .update(update)
      .eq('id', body.id)
      .eq('org_id', member.org_id)
      .select('id, name, slug, description')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ team: data });
  },
  { requireAuth: true },
);

/* DELETE — remove a team (manager). Members on the team are detached (FK SET NULL). */
export const DELETE = withApiGuard(
  async (request) => {
    const { error: gate, member, service } = await requireManager();
    if (gate) return gate;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { error } = await service
      .from('org_teams')
      .delete()
      .eq('id', id)
      .eq('org_id', member.org_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  },
  { requireAuth: true },
);

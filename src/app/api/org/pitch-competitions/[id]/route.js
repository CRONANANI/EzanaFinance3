import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { loadStructure } from '@/lib/competitions/loaders';
import { canManageCompetition, COMPETITION_STATUSES } from '@/lib/competitions/permissions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const COMP_COLUMNS =
  'id, host_org_id, name, slug, description, format, theme, rules_url, status, results_visible, starts_at, ends_at, created_at';

async function loadComp(supabase, id) {
  const { data } = await supabase.from('pitch_competitions').select(COMP_COLUMNS).eq('id', id).maybeSingle();
  return data || null;
}

/* GET /api/org/pitch-competitions/:id — competition + full structure (RLS-scoped). */
export const GET = withApiGuard(
  async (_request, _user, context) => {
    const { id } = await context.params;
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const competition = await loadComp(supabase, id);
    if (!competition) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const structure = await loadStructure(supabase, competition.id);
    return NextResponse.json({
      competition: { ...competition, isHost: competition.host_org_id === member.org_id },
      structure,
      viewer: { orgId: member.org_id, canManage: canManageCompetition(member, competition) },
    });
  },
  { requireAuth: true },
);

/* PATCH /api/org/pitch-competitions/:id — update fields / advance status. Host
   executives/PMs only. */
export const PATCH = withApiGuard(
  async (request, _user, context) => {
    const { id } = await context.params;
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const competition = await loadComp(supabase, id);
    if (!competition) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!canManageCompetition(member, competition)) {
      return NextResponse.json({ error: 'Host manager role required' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const patch = {};
    for (const key of ['name', 'description', 'theme', 'rules_url', 'starts_at', 'ends_at']) {
      if (key in body) patch[key] = body[key] || null;
    }
    if ('format' in body && ['showcase', 'single_elim', 'round_robin'].includes(body.format)) {
      patch.format = body.format;
    }
    if ('status' in body) {
      if (!COMPETITION_STATUSES.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      patch.status = body.status;
    }
    if ('results_visible' in body) patch.results_visible = !!body.results_visible;
    if (patch.name === null) return NextResponse.json({ error: 'name cannot be empty' }, { status: 400 });
    if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

    const { data, error } = await supabase
      .from('pitch_competitions')
      .update(patch)
      .eq('id', competition.id)
      .select(COMP_COLUMNS)
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ competition: data });
  },
  { requireAuth: true },
);

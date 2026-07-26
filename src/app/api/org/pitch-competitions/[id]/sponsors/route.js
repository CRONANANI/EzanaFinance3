import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { canManageCompetition } from '@/lib/competitions/permissions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function loadComp(supabase, id) {
  const { data } = await supabase.from('pitch_competitions').select('id, host_org_id').eq('id', id).maybeSingle();
  return data || null;
}

/* GET /api/org/pitch-competitions/:id/sponsors — the competition's sponsors. */
export const GET = withApiGuard(
  async (_request, _user, context) => {
    const { id } = await context.params;
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const comp = await loadComp(supabase, id);
    if (!comp) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { data } = await supabase
      .from('pitch_sponsors')
      .select('id, name, logo_path, url, tier, sort_order')
      .eq('competition_id', comp.id)
      .order('sort_order', { ascending: true });
    return NextResponse.json({ sponsors: data || [], canManage: canManageCompetition(member, comp) });
  },
  { requireAuth: true },
);

/* POST /api/org/pitch-competitions/:id/sponsors — host managers add or remove a
   sponsor. { action: 'add' | 'remove', ... }. */
export const POST = withApiGuard(
  async (request, _user, context) => {
    const { id } = await context.params;
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const comp = await loadComp(supabase, id);
    if (!comp) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!canManageCompetition(member, comp)) {
      return NextResponse.json({ error: 'Host manager role required' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (body.action === 'remove') {
      const { error } = await supabase.from('pitch_sponsors').delete().eq('id', body.sponsor_id).eq('competition_id', comp.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    const name = String(body?.name || '').trim();
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });
    const { data, error } = await supabase
      .from('pitch_sponsors')
      .insert({
        competition_id: comp.id,
        name,
        url: body?.url || null,
        tier: body?.tier || null,
        logo_path: body?.logo_path || null,
        sort_order: Number.isFinite(Number(body?.sort_order)) ? Number(body.sort_order) : 0,
      })
      .select('id, name, url, tier, logo_path, sort_order')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ sponsor: data }, { status: 201 });
  },
  { requireAuth: true },
);

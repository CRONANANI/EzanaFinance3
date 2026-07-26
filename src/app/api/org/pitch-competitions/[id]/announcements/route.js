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

/* GET /api/org/pitch-competitions/:id/announcements — host + participating orgs
   read (RLS). Reaches exactly the registered teams' members. */
export const GET = withApiGuard(
  async (_request, _user, context) => {
    const { id } = await context.params;
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const comp = await loadComp(supabase, id);
    if (!comp) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { data } = await supabase
      .from('pitch_announcements')
      .select('id, title, body, created_at')
      .eq('competition_id', comp.id)
      .order('created_at', { ascending: false });
    return NextResponse.json({ announcements: data || [], canManage: canManageCompetition(member, comp) });
  },
  { requireAuth: true },
);

/* POST /api/org/pitch-competitions/:id/announcements — host managers post one. */
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
    const title = String(body?.title || '').trim();
    if (!title) return NextResponse.json({ error: 'title is required' }, { status: 400 });
    const { data, error } = await supabase
      .from('pitch_announcements')
      .insert({ competition_id: comp.id, title, body: body?.body || null, posted_by: member.id })
      .select('id, title, body, created_at')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ announcement: data }, { status: 201 });
  },
  { requireAuth: true },
);

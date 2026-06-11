import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember, assertOrgRole } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MANAGER_ROLES = ['executive', 'portfolio_manager'];

async function resolveParams(context) {
  return (await context?.params) || {};
}

export const GET = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await resolveParams(context);

    const { data, error } = await supabase
      .from('org_research_notes')
      .select('*')
      .eq('id', id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ note: data });
  },
  { requireAuth: true },
);

export const PATCH = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await resolveParams(context);

    const { data: note } = await supabase
      .from('org_research_notes')
      .select('id, author_id, org_id')
      .eq('id', id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const isAuthor = note.author_id === member.user_id;
    const isManager = assertOrgRole(member, MANAGER_ROLES);
    if (!isAuthor && !isManager) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const update = { updated_at: new Date().toISOString() };
    // Managers may only pin/unpin a note they don't own; authors may edit content.
    if ('pinned' in body) update.pinned = !!body.pinned;
    if (isAuthor) {
      if ('title' in body) update.title = String(body.title).slice(0, 200);
      if ('body' in body) update.body = String(body.body).slice(0, 20000);
      if ('ticker' in body)
        update.ticker = body.ticker ? String(body.ticker).toUpperCase().slice(0, 12) : null;
      if ('sector' in body) update.sector = body.sector || null;
      if ('tags' in body && Array.isArray(body.tags))
        update.tags = body.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 12);
      if ('visibility' in body && ['org', 'team', 'private'].includes(body.visibility))
        update.visibility = body.visibility;
    }

    const { data, error } = await supabase
      .from('org_research_notes')
      .update(update)
      .eq('id', id)
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ note: data });
  },
  { requireAuth: true },
);

export const DELETE = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { id } = await resolveParams(context);

    const { data: note } = await supabase
      .from('org_research_notes')
      .select('id, author_id')
      .eq('id', id)
      .eq('org_id', member.org_id)
      .maybeSingle();
    if (!note) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (note.author_id !== member.user_id && !assertOrgRole(member, MANAGER_ROLES)) {
      return NextResponse.json({ error: 'Not allowed' }, { status: 403 });
    }

    const { error } = await supabase.from('org_research_notes').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  },
  { requireAuth: true },
);

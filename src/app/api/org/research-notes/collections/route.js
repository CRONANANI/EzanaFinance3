import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET — the caller's saved searches + pinned collections (RLS: owner-only). */
export const GET = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const { data, error } = await supabase
      .from('org_research_collections')
      .select('*')
      .eq('org_id', member.org_id)
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ collections: data || [] });
  },
  { requireAuth: true },
);

/* POST — save a search (kind=saved_search, query=filter state) or a pinned set. */
export const POST = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const name = (body?.name || '').trim();
    const kind = ['saved_search', 'collection'].includes(body?.kind) ? body.kind : 'saved_search';
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

    const noteIds = Array.isArray(body?.note_ids)
      ? body.note_ids.filter(Boolean).slice(0, 200)
      : [];

    const { data, error } = await supabase
      .from('org_research_collections')
      .insert({
        org_id: member.org_id,
        owner_id: member.user_id,
        name: name.slice(0, 120),
        kind,
        query: body?.query && typeof body.query === 'object' ? body.query : null,
        note_ids: noteIds,
      })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ collection: data });
  },
  { requireAuth: true },
);

/* DELETE ?id= — remove one of the caller's collections (RLS: owner-only). */
export const DELETE = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const id = new URL(request.url).searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { error } = await supabase
      .from('org_research_collections')
      .delete()
      .eq('id', id)
      .eq('owner_id', member.user_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  },
  { requireAuth: true },
);

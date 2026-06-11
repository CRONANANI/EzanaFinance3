import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/org/research-notes?ticker=&sector=&tag=&q=&pinned=1 */
export const GET = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const ticker = searchParams.get('ticker');
    const sector = searchParams.get('sector');
    const tag = searchParams.get('tag');
    const q = searchParams.get('q');
    const pinnedOnly = searchParams.get('pinned') === '1';

    let query = supabase
      .from('org_research_notes')
      .select('*')
      .eq('org_id', member.org_id)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200);

    if (ticker) query = query.ilike('ticker', ticker);
    if (sector) query = query.eq('sector', sector);
    if (tag) query = query.contains('tags', [tag]);
    if (pinnedOnly) query = query.eq('pinned', true);
    if (q) {
      // Strip characters that would break out of the PostgREST or() filter syntax.
      const safeQ = q.replace(/[,()*]/g, ' ').trim();
      if (safeQ) query = query.or(`title.ilike.%${safeQ}%,body.ilike.%${safeQ}%`);
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Attach author display names for the org (single lookup, no PII beyond name).
    const authorIds = [...new Set((data || []).map((n) => n.author_id))];
    const { data: members } = await supabase
      .from('org_members')
      .select('user_id, display_name, role')
      .eq('org_id', member.org_id)
      .in('user_id', authorIds.length ? authorIds : ['00000000-0000-0000-0000-000000000000']);
    const nameByUser = new Map((members || []).map((m) => [m.user_id, m]));

    const notes = (data || []).map((n) => ({
      ...n,
      author_name: nameByUser.get(n.author_id)?.display_name || 'Member',
      author_role: nameByUser.get(n.author_id)?.role || null,
    }));

    return NextResponse.json({ notes, viewer: { userId: member.user_id, canManage: ['executive', 'portfolio_manager'].includes(member.role) } });
  },
  { requireAuth: true },
);

/* POST /api/org/research-notes — create own note */
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

    const title = (body?.title || '').trim();
    const noteBody = (body?.body || '').trim();
    if (!title || !noteBody) {
      return NextResponse.json({ error: 'Title and body are required' }, { status: 400 });
    }

    const visibility = ['org', 'team', 'private'].includes(body?.visibility) ? body.visibility : 'org';
    const tags = Array.isArray(body?.tags)
      ? body.tags.map((t) => String(t).trim()).filter(Boolean).slice(0, 12)
      : [];

    const { data, error } = await supabase
      .from('org_research_notes')
      .insert({
        org_id: member.org_id,
        author_id: member.user_id,
        title: title.slice(0, 200),
        body: noteBody.slice(0, 20000),
        ticker: body?.ticker ? String(body.ticker).toUpperCase().slice(0, 12) : null,
        sector: body?.sector || null,
        tags,
        visibility,
        team_id: visibility === 'team' ? member.team_id || null : null,
      })
      .select('*')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ note: data });
  },
  { requireAuth: true },
);

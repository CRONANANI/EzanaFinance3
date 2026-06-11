import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/* GET /api/org/mentions?all=1 — caller's mentions (unseen by default). */
export const GET = withApiGuard(
  async (request, user) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ mentions: [], unseen: 0 });

    const { searchParams } = new URL(request.url);
    const includeSeen = searchParams.get('all') === '1';

    let query = supabase
      .from('org_mentions')
      .select('*')
      .eq('mentioned_user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (!includeSeen) query = query.eq('seen', false);

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Author names for display.
    const authorIds = [...new Set((data || []).map((m) => m.author_id))];
    const { data: members } = await supabase
      .from('org_members')
      .select('user_id, display_name')
      .eq('org_id', member.org_id)
      .in('user_id', authorIds.length ? authorIds : ['00000000-0000-0000-0000-000000000000']);
    const byUser = new Map((members || []).map((m) => [m.user_id, m.display_name]));

    const mentions = (data || []).map((m) => ({
      ...m,
      author_name: byUser.get(m.author_id) || 'Someone',
    }));

    const unseen = mentions.filter((m) => !m.seen).length;
    return NextResponse.json({ mentions, unseen });
  },
  { requireAuth: true },
);

/* PATCH /api/org/mentions { ids?: [] } — mark mentions seen (all unseen if no ids). */
export const PATCH = withApiGuard(
  async (request, user) => {
    const supabase = createServerSupabase();

    let body = {};
    try {
      body = await request.json();
    } catch {
      /* empty body = mark all seen */
    }

    let query = supabase
      .from('org_mentions')
      .update({ seen: true })
      .eq('mentioned_user_id', user.id)
      .eq('seen', false);
    if (Array.isArray(body?.ids) && body.ids.length > 0) {
      query = query.in('id', body.ids);
    }

    const { error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  },
  { requireAuth: true },
);

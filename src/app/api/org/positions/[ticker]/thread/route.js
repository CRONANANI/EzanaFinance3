import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function resolveParams(context) {
  return (await context?.params) || {};
}

/* GET /api/org/positions/:ticker/thread — all comments for the ticker. */
export const GET = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { ticker } = await resolveParams(context);
    const sym = (ticker || '').toUpperCase();

    const { data, error } = await supabase
      .from('org_position_threads')
      .select('*')
      .eq('org_id', member.org_id)
      .eq('ticker', sym)
      .order('created_at', { ascending: true })
      .limit(500);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const authorIds = [...new Set((data || []).map((c) => c.author_id))];
    const { data: members } = await supabase
      .from('org_members')
      .select('user_id, display_name, role')
      .eq('org_id', member.org_id);
    const byUser = new Map((members || []).map((m) => [m.user_id, m]));

    const comments = (data || []).map((c) => ({
      ...c,
      author_name: byUser.get(c.author_id)?.display_name || 'Member',
      author_role: byUser.get(c.author_id)?.role || null,
    }));

    return NextResponse.json({
      ticker: sym,
      comments,
      members: (members || []).map((m) => ({ user_id: m.user_id, display_name: m.display_name, role: m.role })),
      viewer: { userId: member.user_id },
    });
  },
  { requireAuth: true },
);

/* POST /api/org/positions/:ticker/thread — add a comment/reply; resolve @mentions. */
export const POST = withApiGuard(
  async (request, user, context) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const { ticker } = await resolveParams(context);
    const sym = (ticker || '').toUpperCase();

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const text = (body?.body || '').trim();
    if (!text) return NextResponse.json({ error: 'Comment body required' }, { status: 400 });

    const { data: comment, error } = await supabase
      .from('org_position_threads')
      .insert({
        org_id: member.org_id,
        team_id: member.team_id || null,
        ticker: sym,
        author_id: member.user_id,
        body: text.slice(0, 8000),
        parent_id: body?.parent_id || null,
      })
      .select('*')
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Resolve @mentions: prefer explicit ids from the client (MentionInput),
    // then fall back to matching display names / first names found in the text.
    const { data: members } = await supabase
      .from('org_members')
      .select('user_id, display_name')
      .eq('org_id', member.org_id)
      .eq('is_active', true);

    const mentioned = new Set(
      Array.isArray(body?.mention_user_ids) ? body.mention_user_ids : [],
    );
    const lower = text.toLowerCase();
    for (const m of members || []) {
      const name = (m.display_name || '').toLowerCase();
      const first = name.split(' ')[0];
      if (!name) continue;
      if (lower.includes(`@${name}`) || (first && lower.includes(`@${first}`))) {
        mentioned.add(m.user_id);
      }
    }
    mentioned.delete(member.user_id); // never notify yourself

    const validUserIds = new Set((members || []).map((m) => m.user_id));
    const rows = [...mentioned]
      .filter((uid) => validUserIds.has(uid))
      .map((uid) => ({
        org_id: member.org_id,
        mentioned_user_id: uid,
        author_id: member.user_id,
        target_type: 'thread',
        target_id: comment.id,
      }));
    if (rows.length > 0) {
      await supabase.from('org_mentions').insert(rows);
    }

    return NextResponse.json({ comment, mentioned: rows.length });
  },
  { requireAuth: true },
);

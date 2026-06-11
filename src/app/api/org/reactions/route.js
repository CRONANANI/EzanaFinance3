import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { createServerSupabase } from '@/lib/supabase-server';
import { getCurrentOrgMember } from '@/lib/org-trading-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TARGET_TYPES = ['post', 'note', 'thread', 'pitch'];

function summarize(rows, userId) {
  const counts = {};
  const mine = new Set();
  for (const r of rows || []) {
    counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    if (r.user_id === userId) mine.add(r.emoji);
  }
  return { counts, mine: [...mine] };
}

/* GET /api/org/reactions?target_type=&target_id= → counts + viewer's reactions */
export const GET = withApiGuard(
  async (request) => {
    const supabase = createServerSupabase();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const targetType = searchParams.get('target_type');
    const targetId = searchParams.get('target_id');
    if (!TARGET_TYPES.includes(targetType) || !targetId) {
      return NextResponse.json({ error: 'target_type and target_id required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('org_reactions')
      .select('emoji, user_id')
      .eq('org_id', member.org_id)
      .eq('target_type', targetType)
      .eq('target_id', targetId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(summarize(data, member.user_id));
  },
  { requireAuth: true },
);

/* POST /api/org/reactions { target_type, target_id, emoji } → toggle */
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
    const { target_type: targetType, target_id: targetId, emoji } = body || {};
    if (!TARGET_TYPES.includes(targetType) || !targetId || !emoji) {
      return NextResponse.json({ error: 'target_type, target_id, emoji required' }, { status: 400 });
    }

    // Toggle: remove if the same reaction already exists, otherwise add it.
    const { data: existing } = await supabase
      .from('org_reactions')
      .select('id')
      .eq('user_id', member.user_id)
      .eq('target_type', targetType)
      .eq('target_id', targetId)
      .eq('emoji', String(emoji).slice(0, 8))
      .maybeSingle();

    if (existing) {
      await supabase.from('org_reactions').delete().eq('id', existing.id);
    } else {
      await supabase.from('org_reactions').insert({
        org_id: member.org_id,
        user_id: member.user_id,
        target_type: targetType,
        target_id: targetId,
        emoji: String(emoji).slice(0, 8),
      });
    }

    const { data } = await supabase
      .from('org_reactions')
      .select('emoji, user_id')
      .eq('org_id', member.org_id)
      .eq('target_type', targetType)
      .eq('target_id', targetId);

    return NextResponse.json(summarize(data, member.user_id));
  },
  { requireAuth: true },
);

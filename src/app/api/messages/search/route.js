import { NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/messages/search?q=<query>
 *
 * Returns conversations with message content matching the query (RLS-scoped).
 * Response: { results: [{ conversation_id, match_type, matched_messages }] }
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = String(searchParams.get('q') || '').trim();

    if (q.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const { user, supabase } = await getAuthContext(request);
    if (!user || !supabase) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: convos, error: convoErr } = await supabase
      .from('conversations')
      .select('id, participant_a, participant_b')
      .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`);

    if (convoErr) {
      return NextResponse.json({ error: convoErr.message }, { status: 500 });
    }

    const convoIds = (convos || []).map((c) => c.id);
    if (convoIds.length === 0) {
      return NextResponse.json({ results: [] });
    }

    const pattern = `%${q.replace(/[%_]/g, (c) => `\\${c}`)}%`;

    const { data: matchedMessages, error: msgErr } = await supabase
      .from('messages')
      .select('id, conversation_id, sender_id, content, created_at')
      .in('conversation_id', convoIds)
      .ilike('content', pattern)
      .order('created_at', { ascending: false })
      .limit(200);

    if (msgErr) {
      return NextResponse.json({ error: msgErr.message }, { status: 500 });
    }

    const byConvo = new Map();
    for (const m of matchedMessages || []) {
      if (!byConvo.has(m.conversation_id)) {
        byConvo.set(m.conversation_id, []);
      }
      const arr = byConvo.get(m.conversation_id);
      if (arr.length < 5) arr.push(m);
    }

    const results = Array.from(byConvo.entries()).map(([conversation_id, matched_messages]) => ({
      conversation_id,
      match_type: 'content',
      matched_messages,
    }));

    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}

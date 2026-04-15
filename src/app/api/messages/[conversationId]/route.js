/**
 * GET /api/messages/[conversationId]
 * Returns messages in a conversation, newest first, paginated.
 * Query params: limit (default 50), before (cursor: created_at ISO string)
 *
 * PATCH /api/messages/[conversationId]
 * Mark all unread messages in this conversation as read (for the current user).
 */
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/plaid';

export const dynamic = 'force-dynamic';

async function verifyParticipant(conversationId, userId) {
  const { data } = await supabaseAdmin
    .from('conversations')
    .select('id, participant_a, participant_b')
    .eq('id', conversationId)
    .maybeSingle();

  if (!data) return null;
  if (data.participant_a !== userId && data.participant_b !== userId) return null;
  return data;
}

export async function GET(request, { params }) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { conversationId } = params;
    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
    }

    const convo = await verifyParticipant(conversationId, user.id);
    if (!convo) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 200);
    const before = searchParams.get('before');

    let query = supabaseAdmin
      .from('messages')
      .select('id, conversation_id, sender_id, content, created_at, read_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error('[messages/[id] GET] error:', error);
      return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 });
    }

    const otherId =
      convo.participant_a === user.id ? convo.participant_b : convo.participant_a;

    const { data: otherProfile } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, user_settings')
      .eq('id', otherId)
      .maybeSingle();

    const otherName =
      (otherProfile?.full_name || otherProfile?.user_settings?.display_name || '').trim() ||
      'Member';

    const formatted = (messages || []).map((m) => ({
      id: m.id,
      sender_id: m.sender_id,
      content: m.content,
      created_at: m.created_at,
      read_at: m.read_at,
      is_mine: m.sender_id === user.id,
    }));

    return NextResponse.json({
      conversation_id: conversationId,
      other_user: { id: otherId, name: otherName },
      messages: formatted,
      has_more: formatted.length === limit,
    });
  } catch (e) {
    console.error('[messages/[id] GET] exception:', e?.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { conversationId } = params;
    if (!conversationId) {
      return NextResponse.json({ error: 'conversationId required' }, { status: 400 });
    }

    const convo = await verifyParticipant(conversationId, user.id);
    if (!convo) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    const now = new Date().toISOString();

    const { data: updated, error } = await supabaseAdmin
      .from('messages')
      .update({ read_at: now })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .is('read_at', null)
      .select('id');

    if (error) {
      console.error('[messages/[id] PATCH] error:', error);
      return NextResponse.json({ error: 'Failed to mark as read' }, { status: 500 });
    }

    return NextResponse.json({
      marked_read: (updated || []).length,
    });
  } catch (e) {
    console.error('[messages/[id] PATCH] exception:', e?.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

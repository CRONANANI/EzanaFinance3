/**
 * GET /api/messages — list conversations. POST /api/messages — send message (friend-gated).
 */
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/plaid';

export const dynamic = 'force-dynamic';

async function areMutualFollows(userIdA, userIdB) {
  const { data: aToB } = await supabaseAdmin
    .from('user_follows')
    .select('follower_id')
    .eq('follower_id', userIdA)
    .eq('following_id', userIdB)
    .maybeSingle();

  const { data: bToA } = await supabaseAdmin
    .from('user_follows')
    .select('follower_id')
    .eq('follower_id', userIdB)
    .eq('following_id', userIdA)
    .maybeSingle();

  return !!(aToB && bToA);
}

function orderedPair(a, b) {
  return a < b ? [a, b] : [b, a];
}

export async function GET(request) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '30', 10), 1), 100);

    const { data: convos, error: convErr } = await supabaseAdmin
      .from('conversations')
      .select('id, participant_a, participant_b, last_message_at, created_at')
      .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (convErr) {
      console.error('[messages GET] conversations error:', convErr);
      return NextResponse.json({ error: 'Failed to load conversations' }, { status: 500 });
    }

    if (!convos || convos.length === 0) {
      return NextResponse.json({ conversations: [] });
    }

    const otherIds = convos.map((c) =>
      c.participant_a === user.id ? c.participant_b : c.participant_a
    );
    const uniqueOtherIds = [...new Set(otherIds)];

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, user_settings')
      .in('id', uniqueOtherIds);

    const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

    const convoIds = convos.map((c) => c.id);

    const { data: lastMsgs } = await supabaseAdmin
      .from('messages')
      .select('id, conversation_id, sender_id, content, created_at, read_at')
      .in('conversation_id', convoIds)
      .order('created_at', { ascending: false });

    const lastMsgMap = new Map();
    for (const msg of lastMsgs || []) {
      if (!lastMsgMap.has(msg.conversation_id)) {
        lastMsgMap.set(msg.conversation_id, msg);
      }
    }

    const { data: unreadCounts } = await supabaseAdmin
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', convoIds)
      .neq('sender_id', user.id)
      .is('read_at', null);

    const unreadMap = new Map();
    for (const row of unreadCounts || []) {
      unreadMap.set(row.conversation_id, (unreadMap.get(row.conversation_id) || 0) + 1);
    }

    const result = convos.map((c) => {
      const otherId = c.participant_a === user.id ? c.participant_b : c.participant_a;
      const prof = profileMap[otherId];
      const displayName =
        (prof?.full_name || prof?.user_settings?.display_name || '').trim() || 'Member';
      const lastMsg = lastMsgMap.get(c.id);

      return {
        id: c.id,
        other_user: {
          id: otherId,
          name: displayName,
        },
        last_message: lastMsg
          ? {
              content:
                lastMsg.content.length > 100
                  ? `${lastMsg.content.slice(0, 100)}…`
                  : lastMsg.content,
              sender_id: lastMsg.sender_id,
              created_at: lastMsg.created_at,
              is_mine: lastMsg.sender_id === user.id,
            }
          : null,
        unread_count: unreadMap.get(c.id) || 0,
        last_message_at: c.last_message_at,
        created_at: c.created_at,
      };
    });

    return NextResponse.json({ conversations: result });
  } catch (e) {
    console.error('[messages GET] exception:', e?.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const toUserId = typeof body?.to === 'string' ? body.to.trim() : '';
    const content = typeof body?.content === 'string' ? body.content.trim() : '';

    if (!toUserId) {
      return NextResponse.json({ error: '"to" (recipient user_id) is required' }, { status: 400 });
    }
    if (toUserId === user.id) {
      return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }
    if (content.length > 5000) {
      return NextResponse.json({ error: 'Message too long (max 5000 characters)' }, { status: 400 });
    }

    const mutual = await areMutualFollows(user.id, toUserId);
    if (!mutual) {
      return NextResponse.json(
        {
          error: 'You can only message friends (mutual followers). Follow each other first.',
        },
        { status: 403 }
      );
    }

    const [pA, pB] = orderedPair(user.id, toUserId);
    const now = new Date().toISOString();

    let { data: convo } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('participant_a', pA)
      .eq('participant_b', pB)
      .maybeSingle();

    if (!convo) {
      const { data: newConvo, error: createErr } = await supabaseAdmin
        .from('conversations')
        .insert({
          participant_a: pA,
          participant_b: pB,
          last_message_at: now,
        })
        .select('id')
        .single();

      if (createErr) {
        if (createErr.code === '23505') {
          const { data: retry } = await supabaseAdmin
            .from('conversations')
            .select('id')
            .eq('participant_a', pA)
            .eq('participant_b', pB)
            .maybeSingle();
          convo = retry;
        } else {
          console.error('[messages POST] conversation create error:', createErr);
          return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
        }
      } else {
        convo = newConvo;
      }
    }

    if (!convo?.id) {
      return NextResponse.json({ error: 'Failed to resolve conversation' }, { status: 500 });
    }

    const { data: msg, error: msgErr } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: convo.id,
        sender_id: user.id,
        content,
      })
      .select('id, conversation_id, sender_id, content, created_at, read_at')
      .single();

    if (msgErr) {
      console.error('[messages POST] message insert error:', msgErr);
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    await supabaseAdmin
      .from('conversations')
      .update({ last_message_at: msg.created_at })
      .eq('id', convo.id);

    return NextResponse.json({
      message: {
        id: msg.id,
        conversation_id: msg.conversation_id,
        sender_id: msg.sender_id,
        content: msg.content,
        created_at: msg.created_at,
        read_at: msg.read_at,
        is_mine: true,
      },
    });
  } catch (e) {
    console.error('[messages POST] exception:', e?.message);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { requireUser, getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const admin = getAdminClient();

async function tally(callId, viewerId) {
  const { data: votes } = await admin
    .from('creator_call_votes')
    .select('user_id, side')
    .eq('call_id', callId);
  let back = 0;
  let fade = 0;
  let mine = null;
  for (const v of votes || []) {
    if (v.side === 'back') back += 1;
    else if (v.side === 'fade') fade += 1;
    if (v.user_id === viewerId) mine = v.side;
  }
  return { back_count: back, fade_count: fade, my_vote: mine };
}

/**
 * POST /api/community/creator-calls/vote
 * Body: { callId, side: 'back' | 'fade' | 'none' }
 * Back or fade a creator's call; 'none' removes the viewer's vote.
 */
export async function POST(request) {
  try {
    const { user } = await requireUser(request);
    const body = await request.json().catch(() => ({}));
    const callId = typeof body.callId === 'string' ? body.callId : null;
    const side = body.side;
    if (!callId || !['back', 'fade', 'none'].includes(side)) {
      return NextResponse.json({ error: 'callId and a valid side are required' }, { status: 400 });
    }

    const { data: call } = await admin
      .from('creator_calls')
      .select('id')
      .eq('id', callId)
      .maybeSingle();
    if (!call) return NextResponse.json({ error: 'Call not found' }, { status: 404 });

    if (side === 'none') {
      await admin.from('creator_call_votes').delete().eq('call_id', callId).eq('user_id', user.id);
    } else {
      await admin
        .from('creator_call_votes')
        .upsert({ call_id: callId, user_id: user.id, side }, { onConflict: 'call_id,user_id' });
    }

    return NextResponse.json(await tally(callId, user.id));
  } catch (e) {
    if (e?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('creator-calls vote:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { requireUser, getCurrentUser, getAdminClient } from '@/lib/supabase';
import { isAdminUser } from '@/lib/admin-helpers';
import { sanitizeInput } from '@/lib/sanitize';
import { computeTrackRecord, RESOLVABLE_STATUSES } from '@/lib/creator-calls';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const admin = getAdminClient();

// Tally back/fade votes for a set of calls, plus the viewer's own side.
async function attachVotes(calls, viewerId) {
  const ids = calls.map((c) => c.id);
  if (!ids.length) return calls;
  const { data: votes } = await admin
    .from('creator_call_votes')
    .select('call_id, user_id, side')
    .in('call_id', ids);

  const tally = {};
  for (const v of votes || []) {
    tally[v.call_id] = tally[v.call_id] || { back: 0, fade: 0, mine: null };
    if (v.side === 'back') tally[v.call_id].back += 1;
    else if (v.side === 'fade') tally[v.call_id].fade += 1;
    if (viewerId && v.user_id === viewerId) tally[v.call_id].mine = v.side;
  }
  return calls.map((c) => ({
    ...c,
    back_count: tally[c.id]?.back || 0,
    fade_count: tally[c.id]?.fade || 0,
    my_vote: tally[c.id]?.mine || null,
  }));
}

/**
 * GET /api/community/creator-calls
 *   ?creatorId=<uuid>  → that creator's calls + track record
 *   (default)          → recent open calls across creators (discovery rail)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const creatorId = searchParams.get('creatorId');
    const viewer = await getCurrentUser(request);

    if (creatorId) {
      const { data: calls, error } = await admin
        .from('creator_calls')
        .select(
          'id, creator_id, ticker, direction, thesis, target_price, resolves_at, status, resolved_at, created_at',
        )
        .eq('creator_id', creatorId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) return NextResponse.json({ error: 'Server error' }, { status: 500 });

      const withVotes = await attachVotes(calls || [], viewer?.id);
      return NextResponse.json({
        calls: withVotes,
        trackRecord: computeTrackRecord(calls || []),
      });
    }

    // Discovery: recent open calls across creators.
    const { data: calls, error } = await admin
      .from('creator_calls')
      .select(
        'id, creator_id, ticker, direction, thesis, target_price, resolves_at, status, created_at',
      )
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(12);

    if (error) return NextResponse.json({ error: 'Server error' }, { status: 500 });

    const creatorIds = [...new Set((calls || []).map((c) => c.creator_id))];
    let profileMap = {};
    if (creatorIds.length) {
      const { data: profs } = await admin
        .from('profiles')
        .select('id, username, full_name, user_settings, creator_tier')
        .in('id', creatorIds);
      profileMap = Object.fromEntries(
        (profs || []).map((p) => [
          p.id,
          {
            username: p.username || '',
            display_name: p.user_settings?.display_name || p.full_name || 'Creator',
            avatar_url: p.user_settings?.avatar_url || '',
            creator_tier: p.creator_tier || 'creator',
          },
        ]),
      );
    }

    const withVotes = await attachVotes(calls || [], viewer?.id);
    const enriched = withVotes.map((c) => ({ ...c, creator: profileMap[c.creator_id] || null }));
    return NextResponse.json({ calls: enriched });
  } catch (e) {
    console.error('creator-calls GET:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * POST /api/community/creator-calls — create a call (partner-only).
 */
export async function POST(request) {
  try {
    const { user } = await requireUser(request);

    const { data: prof } = await admin
      .from('profiles')
      .select('is_partner')
      .eq('id', user.id)
      .maybeSingle();
    if (!prof?.is_partner) {
      return NextResponse.json({ error: 'Creators only' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));

    const ticker = String(body.ticker || '')
      .toUpperCase()
      .replace(/[^A-Z.]/g, '')
      .slice(0, 8);
    const direction = body.direction === 'bearish' ? 'bearish' : 'bullish';
    if (!ticker) return NextResponse.json({ error: 'Ticker is required' }, { status: 400 });

    const thesis = body.thesis ? sanitizeInput(String(body.thesis).trim()).slice(0, 280) : null;

    let target_price = null;
    if (body.target_price != null && body.target_price !== '') {
      const n = Number(body.target_price);
      if (Number.isFinite(n) && n > 0) target_price = n;
    }

    let resolves_at = null;
    if (body.resolves_at) {
      const d = new Date(body.resolves_at);
      if (!Number.isNaN(d.getTime()) && d.getTime() > Date.now()) resolves_at = d.toISOString();
    }

    const { data: call, error } = await admin
      .from('creator_calls')
      .insert({ creator_id: user.id, ticker, direction, thesis, target_price, resolves_at })
      .select(
        'id, creator_id, ticker, direction, thesis, target_price, resolves_at, status, created_at',
      )
      .single();

    if (error) {
      console.error('creator-calls insert:', error);
      return NextResponse.json({ error: 'Server error' }, { status: 500 });
    }
    return NextResponse.json({ call: { ...call, back_count: 0, fade_count: 0, my_vote: null } });
  } catch (e) {
    if (e?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('creator-calls POST:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/community/creator-calls — resolve a call (owner or admin).
 * Body: { callId, status: 'hit' | 'missed' | 'void' }
 */
export async function PATCH(request) {
  try {
    const { user } = await requireUser(request);
    const body = await request.json().catch(() => ({}));
    const callId = typeof body.callId === 'string' ? body.callId : null;
    const status = body.status;
    if (!callId || !RESOLVABLE_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: 'callId and a valid status are required' },
        { status: 400 },
      );
    }

    const { data: call } = await admin
      .from('creator_calls')
      .select('id, creator_id')
      .eq('id', callId)
      .maybeSingle();
    if (!call) return NextResponse.json({ error: 'Call not found' }, { status: 404 });

    if (call.creator_id !== user.id && !isAdminUser(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: updated, error } = await admin
      .from('creator_calls')
      .update({ status, resolved_at: new Date().toISOString() })
      .eq('id', callId)
      .select('id, status, resolved_at')
      .single();

    if (error) return NextResponse.json({ error: 'Server error' }, { status: 500 });
    return NextResponse.json({ call: updated });
  } catch (e) {
    if (e?.status === 401) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    console.error('creator-calls PATCH:', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

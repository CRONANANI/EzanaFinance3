import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/plaid';

export const dynamic = 'force-dynamic';

function displayNameFromProfile(row) {
  if (!row) return 'Someone';
  const s = row.user_settings || {};
  return (row.full_name || s.display_name || '').trim() || 'Member';
}

/** GET — pending incoming friend requests for current user */
export async function GET() {
  try {
    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: rows, error } = await supabase
      .from('friend_requests')
      .select('id, sender_id, receiver_id, status, created_at')
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('friend_requests GET', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const senderIds = [...new Set((rows || []).map((r) => r.sender_id))];
    let profileMap = {};
    if (senderIds.length > 0) {
      const { data: profs } = await supabaseAdmin.from('profiles').select('id, full_name, user_settings').in('id', senderIds);
      profileMap = Object.fromEntries((profs || []).map((p) => [p.id, p]));
    }

    const requests = (rows || []).map((r) => ({
      id: r.id,
      sender_id: r.sender_id,
      sender_name: displayNameFromProfile(profileMap[r.sender_id]),
      created_at: r.created_at,
    }));

    return NextResponse.json({ requests });
  } catch (e) {
    console.error('GET friend-request', e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}

/** POST — send friend request */
export async function POST(request) {
  try {
    const body = await request.json();
    const receiverId = typeof body.receiver_id === 'string' ? body.receiver_id : '';
    if (!receiverId) {
      return NextResponse.json({ error: 'receiver_id required' }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.id === receiverId) {
      return NextResponse.json({ error: 'Cannot send a request to yourself' }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin.from('profiles').select('id').eq('id', receiverId).maybeSingle();
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { data: inserted, error } = await supabase
      .from('friend_requests')
      .insert({
        sender_id: user.id,
        receiver_id: receiverId,
        status: 'pending',
      })
      .select('id, sender_id, receiver_id, status, created_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Request already exists' }, { status: 409 });
      }
      console.error('friend_requests insert', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ request: inserted });
  } catch (e) {
    console.error('POST friend-request', e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}

/** PATCH — accept or reject (receiver only) */
export async function PATCH(request) {
  try {
    const body = await request.json();
    const requestId = typeof body.id === 'string' ? body.id : '';
    const status = body.status === 'accepted' || body.status === 'rejected' ? body.status : null;
    if (!requestId || !status) {
      return NextResponse.json({ error: 'id and status (accepted|rejected) required' }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: row, error: fetchErr } = await supabase
      .from('friend_requests')
      .select('id, sender_id, receiver_id, status')
      .eq('id', requestId)
      .eq('receiver_id', user.id)
      .maybeSingle();

    if (fetchErr || !row) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    if (row.status !== 'pending') {
      return NextResponse.json({ error: 'Already handled' }, { status: 400 });
    }

    const { error: updErr } = await supabase
      .from('friend_requests')
      .update({ status })
      .eq('id', requestId)
      .eq('receiver_id', user.id);

    if (updErr) {
      console.error('friend_requests patch', updErr);
      return NextResponse.json({ error: updErr.message }, { status: 500 });
    }

    if (status === 'accepted') {
      await supabaseAdmin.from('user_follows').upsert(
        { follower_id: row.receiver_id, following_id: row.sender_id },
        { onConflict: 'follower_id,following_id' }
      );
    }

    return NextResponse.json({ ok: true, status });
  } catch (e) {
    console.error('PATCH friend-request', e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: 500 });
  }
}

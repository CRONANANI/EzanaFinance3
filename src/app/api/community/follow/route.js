import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/** POST { target_user_id, action: 'follow' | 'unfollow' } */
export async function POST(request) {
  try {
    const body = await request.json();
    const target_user_id = body.target_user_id;
    const action = body.action;

    if (!target_user_id || typeof target_user_id !== 'string') {
      return NextResponse.json({ error: 'target_user_id required' }, { status: 400 });
    }
    if (action !== 'follow' && action !== 'unfollow') {
      return NextResponse.json({ error: 'action must be follow or unfollow' }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.id === target_user_id) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 });
    }

    if (action === 'follow') {
      const { error } = await supabase.from('user_follows').insert({
        follower_id: user.id,
        following_id: target_user_id,
      });
      if (error && error.code !== '23505') {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      const { error } = await supabase
        .from('user_follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', target_user_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/** POST { post_id, action: 'like' | 'unlike' } */
export async function POST(request) {
  try {
    const body = await request.json();
    const post_id = body.post_id;
    const action = body.action;

    if (!post_id || typeof post_id !== 'string') {
      return NextResponse.json({ error: 'post_id required' }, { status: 400 });
    }
    if (action !== 'like' && action !== 'unlike') {
      return NextResponse.json({ error: 'action must be like or unlike' }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (action === 'like') {
      const { error } = await supabase.from('post_likes').insert({ user_id: user.id, post_id });
      if (error && !error.message?.includes('duplicate') && error.code !== '23505') {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      const { error } = await supabase.from('post_likes').delete().eq('user_id', user.id).eq('post_id', post_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: row } = await supabase
      .from('community_posts')
      .select('likes_count')
      .eq('id', post_id)
      .single();

    return NextResponse.json({ success: true, likes_count: row?.likes_count ?? 0 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

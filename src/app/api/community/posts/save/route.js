import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/** POST { post_id, action: 'save' | 'unsave' } */
export async function POST(request) {
  try {
    const body = await request.json();
    const post_id = body.post_id;
    const action = body.action;

    if (!post_id || typeof post_id !== 'string') {
      return NextResponse.json({ error: 'post_id required' }, { status: 400 });
    }
    if (action !== 'save' && action !== 'unsave') {
      return NextResponse.json({ error: 'action must be save or unsave' }, { status: 400 });
    }

    const { user, client: supabase } = await requireUser(request);

    if (action === 'save') {
      const { error } = await supabase.from('post_saves').insert({ user_id: user.id, post_id });
      if (error && error.code !== '23505') {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      const { error } = await supabase
        .from('post_saves')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', post_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error?.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

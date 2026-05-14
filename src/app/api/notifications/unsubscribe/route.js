import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { endpoint } = await request.json();

    if (!endpoint || typeof endpoint !== 'string') {
      return NextResponse.json({ error: 'endpoint required' }, { status: 400 });
    }

    const { user, client: supabase } = await requireUser(request);

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint);

    if (error) {
      console.error('push_subscriptions delete:', error);
      return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error?.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('unsubscribe route:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

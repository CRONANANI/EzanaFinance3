import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const body = await request.json();
    const { subscription } = body;

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    const { user, client: supabase } = await requireUser(request);

    const row = {
      user_id: user.id,
      endpoint: subscription.endpoint,
      subscription,
    };

    const { error } = await supabase.from('push_subscriptions').upsert(row, {
      onConflict: 'user_id,endpoint',
    });

    if (error) {
      console.error('push_subscriptions upsert:', error);
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error?.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('subscribe route:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}

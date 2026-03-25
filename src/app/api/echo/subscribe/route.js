/**
 * /api/echo/subscribe
 * POST — subscribe or unsubscribe to an author
 * GET — check if subscribed + get user's subscriptions
 */
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { supabaseAdmin } from '@/lib/plaid';

export const dynamic = 'force-dynamic';


export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) {
    return NextResponse.json(
      { error: 'Sign up for a free account to subscribe to authors', requiresAuth: true },
      { status: 401 }
    );
  }

  const { authorId, action } = await request.json();
  if (!authorId) return NextResponse.json({ error: 'authorId required' }, { status: 400 });

  if (authorId === user.id) {
    return NextResponse.json({ error: 'Cannot subscribe to yourself' }, { status: 400 });
  }

  if (action === 'unsubscribe') {
    await supabaseAdmin
      .from('echo_subscriptions')
      .delete()
      .eq('subscriber_id', user.id)
      .eq('author_id', authorId);

    return NextResponse.json({ subscribed: false });
  }

  const { error } = await supabaseAdmin
    .from('echo_subscriptions')
    .upsert(
      {
        subscriber_id: user.id,
        author_id: authorId,
        subscribed_at: new Date().toISOString(),
      },
      { onConflict: 'subscriber_id,author_id' }
    );

  if (error) {
    console.error('[Echo] Subscribe error:', error);
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
  }

  return NextResponse.json({ subscribed: true });
}

export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) return NextResponse.json({ subscriptions: [], isAuthenticated: false });

  const { searchParams } = new URL(request.url);
  const authorId = searchParams.get('authorId');

  if (authorId) {
    const { data } = await supabaseAdmin
      .from('echo_subscriptions')
      .select('id')
      .eq('subscriber_id', user.id)
      .eq('author_id', authorId)
      .single();

    return NextResponse.json({ subscribed: !!data, isAuthenticated: true });
  }

  const { data: subs } = await supabaseAdmin
    .from('echo_subscriptions')
    .select('author_id, subscribed_at')
    .eq('subscriber_id', user.id)
    .order('subscribed_at', { ascending: false });

  return NextResponse.json({ subscriptions: subs || [], isAuthenticated: true });
}

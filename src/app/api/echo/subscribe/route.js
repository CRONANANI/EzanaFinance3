/**
 * /api/echo/subscribe
 * POST — subscribe or unsubscribe to an author
 * GET — check if subscribed + get user's subscriptions
 */
import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getCurrentUser, getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const admin = getAdminClient();

export const POST = withApiGuard(
  async (request, user) => {
    const { authorId, action } = await request.json();
    if (!authorId) return NextResponse.json({ error: 'authorId required' }, { status: 400 });

    if (authorId === user.id) {
      return NextResponse.json({ error: 'Cannot subscribe to yourself' }, { status: 400 });
    }

    if (action === 'unsubscribe') {
      await admin
        .from('echo_subscriptions')
        .delete()
        .eq('subscriber_id', user.id)
        .eq('author_id', authorId);

      return NextResponse.json({ subscribed: false });
    }

    const { error } = await admin.from('echo_subscriptions').upsert(
      {
        subscriber_id: user.id,
        author_id: authorId,
        subscribed_at: new Date().toISOString(),
      },
      { onConflict: 'subscriber_id,author_id' },
    );

    if (error) {
      console.error('[Echo] Subscribe error:', error);
      return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 });
    }

    return NextResponse.json({ subscribed: true });
  },
  { requireAuth: true },
);

export const GET = withApiGuard(
  async (request, user) => {
    const { searchParams } = new URL(request.url);
    const authorId = searchParams.get('authorId');

    if (authorId) {
      const { data } = await admin
        .from('echo_subscriptions')
        .select('id')
        .eq('subscriber_id', user.id)
        .eq('author_id', authorId)
        .single();

      return NextResponse.json({ subscribed: !!data, isAuthenticated: true });
    }

    const { data: subs } = await admin
      .from('echo_subscriptions')
      .select('author_id, subscribed_at')
      .eq('subscriber_id', user.id)
      .order('subscribed_at', { ascending: false });

    return NextResponse.json({ subscriptions: subs || [], isAuthenticated: true });
  },
  { requireAuth: true },
);

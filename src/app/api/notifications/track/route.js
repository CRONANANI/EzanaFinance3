import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ALLOWED_EVENT_TYPES = new Set([
  'page_view',
  'ticker_view',
  'search',
  'article_open',
  'article_read',
  'article_save',
  'article_share',
  'keyword_click',
  'watchlist_add',
  'watchlist_remove',
  'trade_executed',
  'notification_click',
  'notification_dismiss',
  'course_start',
  'course_complete',
  'post_create',
  'post_like',
  'session_start',
  'dwell_time',
]);

export async function POST(request) {
  let user;
  let client;
  try {
    ({ user, client } = await requireUser(request));
  } catch (err) {
    if (err?.status === 401) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    throw err;
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { event_type, event_data } = body;
  if (!event_type) return NextResponse.json({ ok: false }, { status: 400 });
  if (!ALLOWED_EVENT_TYPES.has(event_type)) {
    return NextResponse.json({ ok: false, error: 'Invalid event_type' }, { status: 400 });
  }

  const { error } = await client.from('activity_breadcrumbs').insert({
    user_id: user.id,
    event_type,
    event_data: event_data || {},
  });

  if (error) {
    console.warn('[notifications/track]', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

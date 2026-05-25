import { NextResponse } from 'next/server';
import { getAdminClient, getCurrentUser } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const ALLOWED_EVENTS = new Set(['article_open', 'article_read', 'keyword_click']);

export async function POST(request) {
  const body = await request.json();
  const { anon_id: anonId, event_type: eventType, event_data: eventData = {} } = body;

  if (!anonId || typeof anonId !== 'string' || anonId.length > 64) {
    return NextResponse.json({ error: 'Invalid anon_id' }, { status: 400 });
  }
  if (!eventType || !ALLOWED_EVENTS.has(eventType)) {
    return NextResponse.json({ error: 'Invalid event_type' }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { error } = await supabase.from('anonymous_breadcrumbs').insert({
    anon_id: anonId,
    event_type: eventType,
    event_data: eventData,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

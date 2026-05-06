import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
  const supabase = createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const { event_type, event_data } = body;
  if (!event_type) return NextResponse.json({ ok: false }, { status: 400 });

  const { error } = await supabase.from('activity_breadcrumbs').insert({
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

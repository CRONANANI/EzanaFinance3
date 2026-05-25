import { NextResponse } from 'next/server';
import { requireUser, getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  let user;
  try {
    ({ user } = await requireUser(request));
  } catch {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json();
  const anonId = typeof body?.anonId === 'string' ? body.anonId.trim() : '';
  if (!anonId) {
    return NextResponse.json({ error: 'anonId required' }, { status: 400 });
  }

  const supabase = getAdminClient();
  const { data: rows, error: fetchErr } = await supabase
    .from('anonymous_breadcrumbs')
    .select('event_type, event_data, created_at')
    .eq('anon_id', anonId);

  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }

  if (rows?.length) {
    const inserts = rows.map((row) => ({
      user_id: user.id,
      event_type: row.event_type,
      event_data: { ...(row.event_data || {}), merged_from_anon: anonId },
      created_at: row.created_at,
    }));

    await supabase.from('activity_breadcrumbs').insert(inserts);
    await supabase.from('anonymous_breadcrumbs').delete().eq('anon_id', anonId);
  }

  return NextResponse.json({ ok: true, merged: rows?.length ?? 0 });
}

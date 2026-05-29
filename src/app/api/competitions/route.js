import { NextResponse } from 'next/server';
import { requireUser, getAdminClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/** GET /api/competitions — list active, upcoming, past */
export async function GET() {
  try {
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('competitions')
      .select('*')
      .order('starts_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    const now = Date.now();
    const grouped = { active: [], upcoming: [], past: [] };
    for (const c of data || []) {
      const start = new Date(c.starts_at).getTime();
      const end = new Date(c.ends_at).getTime();
      if (now < start) grouped.upcoming.push(c);
      else if (now <= end) grouped.active.push(c);
      else grouped.past.push(c);
    }
    return NextResponse.json(grouped);
  } catch (e) {
    console.error('[competitions GET]', e);
    return NextResponse.json({ active: [], upcoming: [], past: [] });
  }
}

/** POST /api/competitions — create competition (auth required) */
export async function POST(request) {
  try {
    const { user } = await requireUser(request);
    const body = await request.json();
    const supabase = getAdminClient();
    const { data, error } = await supabase
      .from('competitions')
      .insert({
        created_by: user.id,
        title: body.title || 'Untitled competition',
        description: body.description || '',
        visibility: body.visibility === 'friends' ? 'friends' : 'platform',
        starts_at: body.starts_at,
        ends_at: body.ends_at,
        conditions: body.conditions || {},
        prize_elo_first: body.prize_elo_first ?? 500,
        prize_elo_second: body.prize_elo_second ?? 300,
        prize_elo_third: body.prize_elo_third ?? 150,
      })
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json(data);
  } catch (e) {
    const status = e.status || 500;
    return NextResponse.json({ error: e.message || 'Failed to create competition' }, { status });
  }
}

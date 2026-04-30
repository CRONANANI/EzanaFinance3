import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-service-role';
import { scoreCompetition } from '@/lib/competition-scoring';

export { scoreCompetition };

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const ADMIN_SECRET = process.env.ADMIN_LOCK_SECRET;

function isAdmin(request) {
  const auth = request.headers.get('authorization') || '';
  const provided = auth.replace(/^Bearer\s+/i, '').trim();
  return ADMIN_SECRET && provided === ADMIN_SECRET;
}

/**
 * POST /api/admin/competitions — create upcoming competition
 */
export async function POST(request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (!body?.name || !body?.starts_at || !body?.ends_at) {
    return NextResponse.json({ error: 'name, starts_at, ends_at required' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();

  const insertRow = {
    name: body.name,
    description: body.description || null,
    starts_at: body.starts_at,
    ends_at: body.ends_at,
    rules: body.rules || {},
    starting_balance: body.starting_balance || 100000,
    elo_top1pct_award: body.elo_top1pct_award ?? 500,
    elo_top10pct_award: body.elo_top10pct_award ?? 200,
    elo_bottom25pct_penalty: body.elo_bottom25pct_penalty ?? -50,
    status: 'upcoming',
  };

  const { data: created, error } = await supabase.from('competitions').insert(insertRow).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, competition: created });
}

/**
 * PATCH /api/admin/competitions — activate | score | cancel
 */
export async function PATCH(request) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const competitionId = body?.competition_id;
  const action = body?.action;
  if (!competitionId || !['activate', 'score', 'cancel'].includes(action)) {
    return NextResponse.json({ error: 'competition_id and valid action required' }, { status: 400 });
  }

  const supabase = createServerSupabaseClient();
  const { data: comp, error: fetchErr } = await supabase
    .from('competitions')
    .select('*')
    .eq('id', competitionId)
    .maybeSingle();

  if (fetchErr || !comp) {
    return NextResponse.json({ error: 'Competition not found' }, { status: 404 });
  }

  if (action === 'activate') {
    if (comp.status !== 'upcoming') {
      return NextResponse.json({ error: `Cannot activate: status is ${comp.status}` }, { status: 409 });
    }
    await supabase.from('competitions').update({ status: 'active' }).eq('id', competitionId);
    return NextResponse.json({ success: true, status: 'active' });
  }

  if (action === 'cancel') {
    if (comp.status === 'scored') {
      return NextResponse.json({ error: 'Cannot cancel a scored competition' }, { status: 409 });
    }
    await supabase.from('competitions').update({ status: 'cancelled' }).eq('id', competitionId);
    return NextResponse.json({ success: true, status: 'cancelled' });
  }

  if (action === 'score') {
    if (comp.status !== 'active' && comp.status !== 'ended') {
      return NextResponse.json({ error: `Cannot score: status is ${comp.status}` }, { status: 409 });
    }
    const result = await scoreCompetition(supabase, comp);
    return NextResponse.json({ success: true, ...result });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

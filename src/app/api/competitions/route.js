import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/plaid';

export const dynamic = 'force-dynamic';

/**
 * GET /api/competitions[?status=...]
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status');

    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let q = supabase
      .from('competitions')
      .select(
        'id, name, description, starts_at, ends_at, rules, starting_balance, status, elo_top1pct_award, elo_top10pct_award, elo_bottom25pct_penalty'
      )
      .order('starts_at', { ascending: false })
      .limit(50);

    if (statusFilter && ['upcoming', 'active', 'ended', 'scored', 'cancelled'].includes(statusFilter)) {
      q = q.eq('status', statusFilter);
    }

    const { data: comps, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const { data: myParticipations } = await supabase
      .from('competition_participants')
      .select('competition_id, rank, return_pct, elo_change')
      .eq('user_id', user.id);

    const myMap = Object.fromEntries((myParticipations || []).map((p) => [p.competition_id, p]));

    return NextResponse.json({
      competitions: (comps || []).map((c) => ({
        ...c,
        userParticipation: myMap[c.id] || null,
      })),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

/**
 * POST /api/competitions — opt-in
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const competitionId = body?.competition_id;
    if (!competitionId) {
      return NextResponse.json({ error: 'competition_id required' }, { status: 400 });
    }

    const supabase = createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: comp } = await supabase
      .from('competitions')
      .select('id, status, starting_balance, ends_at')
      .eq('id', competitionId)
      .maybeSingle();

    if (!comp) {
      return NextResponse.json({ error: 'Competition not found' }, { status: 404 });
    }

    if (comp.status !== 'upcoming' && comp.status !== 'active') {
      return NextResponse.json({ error: `Cannot join: status is ${comp.status}` }, { status: 409 });
    }

    const { data: existing } = await supabase
      .from('competition_participants')
      .select('id')
      .eq('competition_id', competitionId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Already joined' }, { status: 409 });
    }

    const startBal = Number(comp.starting_balance) || 100000;

    const { data: created, error: insErr } = await supabaseAdmin
      .from('competition_participants')
      .insert({
        competition_id: competitionId,
        user_id: user.id,
        starting_balance: startBal,
        current_value: startBal,
      })
      .select()
      .single();

    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, participation: created });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}

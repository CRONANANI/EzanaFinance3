import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { canManageCompetition } from '@/lib/competitions/permissions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ROOM_STATUSES = ['scheduled', 'in_progress', 'running_late', 'done'];
const TEAM_STATUSES = ['upcoming', 'on_deck', 'presenting', 'complete'];

async function loadComp(supabase, id) {
  const { data } = await supabase.from('pitch_competitions').select('id, host_org_id, name, status').eq('id', id).maybeSingle();
  return data || null;
}

/* GET /api/org/pitch-competitions/:id/live — the run-of-show board: every round →
   room (with live_status + offset) → its teams (with presentation_status), plus
   which team ids belong to the caller's org (the "when am I up?" highlight).
   Readable by host + participants via the Phase 1 room/team RLS. */
export const GET = withApiGuard(
  async (_request, _user, context) => {
    const { id } = await context.params;
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const comp = await loadComp(supabase, id);
    if (!comp) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { data: rounds } = await supabase
      .from('pitch_rounds')
      .select('id, name, sort_order')
      .eq('competition_id', comp.id)
      .order('sort_order', { ascending: true });
    const roundIds = (rounds || []).map((r) => r.id);
    const [{ data: rooms }, { data: teams }] = await Promise.all([
      roundIds.length
        ? supabase.from('pitch_rooms').select('id, round_id, name, location, starts_at, ends_at, live_status, running_offset_min').in('round_id', roundIds)
        : Promise.resolve({ data: [] }),
      supabase.from('pitch_teams').select('id, team_name, ticker, room_id, org_id, presentation_status').eq('competition_id', comp.id),
    ]);

    const teamsByRoom = new Map();
    for (const t of teams || []) {
      if (!t.room_id) continue;
      if (!teamsByRoom.has(t.room_id)) teamsByRoom.set(t.room_id, []);
      teamsByRoom.get(t.room_id).push(t);
    }
    const board = (rounds || []).map((rd) => ({
      ...rd,
      rooms: (rooms || [])
        .filter((rm) => rm.round_id === rd.id)
        .map((rm) => ({ ...rm, teams: teamsByRoom.get(rm.id) || [] })),
    }));

    return NextResponse.json({
      competition: { id: comp.id, name: comp.name, status: comp.status },
      board,
      myOrgId: member.org_id,
      canManage: canManageCompetition(member, comp),
    });
  },
  { requireAuth: true },
);

/* POST /api/org/pitch-competitions/:id/live — host managers drive state.
   { action: 'room' | 'team', ... }. One-tap simple. */
export const POST = withApiGuard(
  async (request, _user, context) => {
    const { id } = await context.params;
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return NextResponse.json({ error: 'Not an org member' }, { status: 403 });
    const comp = await loadComp(supabase, id);
    if (!comp) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (!canManageCompetition(member, comp)) {
      return NextResponse.json({ error: 'Host manager role required' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    if (body.action === 'room') {
      const patch = {};
      if ('live_status' in body) {
        if (!ROOM_STATUSES.includes(body.live_status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
        patch.live_status = body.live_status;
      }
      if ('running_offset_min' in body) {
        const n = Number(body.running_offset_min);
        patch.running_offset_min = Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0;
      }
      if (!Object.keys(patch).length) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
      // RLS (host write on rooms via round→competition) enforces ownership.
      const { error } = await supabase.from('pitch_rooms').update(patch).eq('id', body.room_id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'team') {
      if (!TEAM_STATUSES.includes(body.presentation_status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      const { error } = await supabase
        .from('pitch_teams')
        .update({ presentation_status: body.presentation_status })
        .eq('id', body.team_id)
        .eq('competition_id', comp.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  },
  { requireAuth: true },
);

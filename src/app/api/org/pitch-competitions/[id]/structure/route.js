import { NextResponse } from 'next/server';
import { withApiGuard } from '@/lib/api-guard';
import { getUserClient } from '@/lib/supabase';
import { getCurrentOrgMember } from '@/lib/org-trading-server';
import { canManageCompetition } from '@/lib/competitions/permissions';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const ok = (data) => NextResponse.json({ ok: true, ...data });
const bad = (msg, status = 400) => NextResponse.json({ error: msg }, { status });

/* Verify a referenced row belongs to THIS competition before mutating — RLS is
   the backstop, but explicit checks give clean 400s instead of silent no-ops. */
async function roundInComp(supabase, compId, roundId) {
  const { data } = await supabase
    .from('pitch_rounds')
    .select('id')
    .eq('id', roundId)
    .eq('competition_id', compId)
    .maybeSingle();
  return !!data;
}
async function roomInComp(supabase, compId, roomId) {
  const { data } = await supabase
    .from('pitch_rooms')
    .select('id, pitch_rounds!inner(competition_id)')
    .eq('id', roomId)
    .maybeSingle();
  return !!data && data.pitch_rounds?.competition_id === compId;
}
async function rowInComp(supabase, table, compId, id) {
  const { data } = await supabase.from(table).select('id').eq('id', id).eq('competition_id', compId).maybeSingle();
  return !!data;
}

/* POST /api/org/pitch-competitions/:id/structure — one typed mutation on the
   competition's structure (rounds, rooms, teams, judges, assignments). Host
   executives/PMs only. { action, ... }. */
export const POST = withApiGuard(
  async (request, _user, context) => {
    const { id } = await context.params;
    const supabase = getUserClient();
    const member = await getCurrentOrgMember(supabase);
    if (!member) return bad('Not an org member', 403);

    const { data: competition } = await supabase
      .from('pitch_competitions')
      .select('id, host_org_id')
      .eq('id', id)
      .maybeSingle();
    if (!competition) return bad('Not found', 404);
    if (!canManageCompetition(member, competition)) return bad('Host manager role required', 403);
    const compId = competition.id;

    let body;
    try {
      body = await request.json();
    } catch {
      return bad('Invalid JSON');
    }
    const action = body?.action;

    switch (action) {
      case 'add_round': {
        const name = String(body.name || '').trim();
        if (!name) return bad('name is required');
        const { data: last } = await supabase
          .from('pitch_rounds')
          .select('sort_order')
          .eq('competition_id', compId)
          .order('sort_order', { ascending: false })
          .limit(1)
          .maybeSingle();
        const sort_order = (last?.sort_order ?? -1) + 1;
        const { data, error } = await supabase
          .from('pitch_rounds')
          .insert({ competition_id: compId, name, sort_order, starts_at: body.starts_at || null })
          .select('id, name, sort_order, starts_at')
          .single();
        return error ? bad(error.message, 500) : ok({ round: data });
      }
      case 'remove_round': {
        if (!(await roundInComp(supabase, compId, body.round_id))) return bad('round not in competition');
        const { error } = await supabase.from('pitch_rounds').delete().eq('id', body.round_id);
        return error ? bad(error.message, 500) : ok({});
      }
      case 'add_room': {
        if (!(await roundInComp(supabase, compId, body.round_id))) return bad('round not in competition');
        const name = String(body.name || '').trim();
        if (!name) return bad('name is required');
        const { data, error } = await supabase
          .from('pitch_rooms')
          .insert({
            round_id: body.round_id,
            name,
            location: body.location || null,
            starts_at: body.starts_at || null,
            ends_at: body.ends_at || null,
          })
          .select('id, round_id, name, location, starts_at, ends_at')
          .single();
        return error ? bad(error.message, 500) : ok({ room: data });
      }
      case 'remove_room': {
        if (!(await roomInComp(supabase, compId, body.room_id))) return bad('room not in competition');
        const { error } = await supabase.from('pitch_rooms').delete().eq('id', body.room_id);
        return error ? bad(error.message, 500) : ok({});
      }
      case 'add_team': {
        const teamName = String(body.team_name || '').trim();
        if (!teamName) return bad('team_name is required');
        if (body.side && !['long', 'short'].includes(body.side)) return bad('invalid side');
        const { data, error } = await supabase
          .from('pitch_teams')
          .insert({
            competition_id: compId,
            org_id: body.org_id || null,
            team_name: teamName,
            ticker: body.ticker || null,
            side: body.side || null,
            invite_email: body.invite_email || null,
            status: 'invited',
          })
          .select('id, team_name, org_id, ticker, side, status, room_id, invite_email')
          .single();
        return error ? bad(error.message, 500) : ok({ team: data });
      }
      case 'update_team': {
        if (!(await rowInComp(supabase, 'pitch_teams', compId, body.team_id))) return bad('team not in competition');
        const patch = {};
        for (const k of ['team_name', 'ticker']) if (k in body) patch[k] = body[k] || null;
        if ('side' in body) {
          if (body.side && !['long', 'short'].includes(body.side)) return bad('invalid side');
          patch.side = body.side || null;
        }
        if ('status' in body) {
          if (!['invited', 'registered', 'submitted', 'withdrawn'].includes(body.status)) return bad('invalid status');
          patch.status = body.status;
        }
        if (!Object.keys(patch).length) return bad('nothing to update');
        const { data, error } = await supabase
          .from('pitch_teams')
          .update(patch)
          .eq('id', body.team_id)
          .select('id, team_name, org_id, ticker, side, status, room_id, invite_email')
          .single();
        return error ? bad(error.message, 500) : ok({ team: data });
      }
      case 'assign_team': {
        if (!(await rowInComp(supabase, 'pitch_teams', compId, body.team_id))) return bad('team not in competition');
        const roomId = body.room_id || null;
        if (roomId && !(await roomInComp(supabase, compId, roomId))) return bad('room not in competition');
        const { data, error } = await supabase
          .from('pitch_teams')
          .update({ room_id: roomId })
          .eq('id', body.team_id)
          .select('id, room_id')
          .single();
        return error ? bad(error.message, 500) : ok({ team: data });
      }
      case 'remove_team': {
        if (!(await rowInComp(supabase, 'pitch_teams', compId, body.team_id))) return bad('team not in competition');
        const { error } = await supabase.from('pitch_teams').delete().eq('id', body.team_id);
        return error ? bad(error.message, 500) : ok({});
      }
      case 'add_judge': {
        const fullName = String(body.full_name || '').trim();
        const email = String(body.email || '').trim();
        if (!fullName || !email) return bad('full_name and email are required');
        // access_token stays null until Phase 3 (magic-link generation).
        const { data, error } = await supabase
          .from('pitch_judges')
          .insert({
            competition_id: compId,
            full_name: fullName,
            email,
            firm: body.firm || null,
            title: body.title || null,
          })
          .select('id, full_name, email, firm, title')
          .single();
        return error ? bad(error.message, 500) : ok({ judge: data });
      }
      case 'remove_judge': {
        if (!(await rowInComp(supabase, 'pitch_judges', compId, body.judge_id))) return bad('judge not in competition');
        const { error } = await supabase.from('pitch_judges').delete().eq('id', body.judge_id);
        return error ? bad(error.message, 500) : ok({});
      }
      case 'assign_judge': {
        if (!(await roomInComp(supabase, compId, body.room_id))) return bad('room not in competition');
        if (!(await rowInComp(supabase, 'pitch_judges', compId, body.judge_id))) return bad('judge not in competition');
        const { error } = await supabase
          .from('pitch_room_judges')
          .upsert({ room_id: body.room_id, judge_id: body.judge_id }, { onConflict: 'room_id,judge_id' });
        return error ? bad(error.message, 500) : ok({});
      }
      case 'unassign_judge': {
        if (!(await roomInComp(supabase, compId, body.room_id))) return bad('room not in competition');
        const { error } = await supabase
          .from('pitch_room_judges')
          .delete()
          .eq('room_id', body.room_id)
          .eq('judge_id', body.judge_id);
        return error ? bad(error.message, 500) : ok({});
      }
      default:
        return bad('Unknown action');
    }
  },
  { requireAuth: true },
);

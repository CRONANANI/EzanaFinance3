/**
 * Server-side loaders for pitch competitions. Each takes an already-scoped
 * Supabase client (the RLS'd cookie client from createServerSupabase) as the
 * first arg and returns plain data / [] / null — never throws, honest-empty like
 * the rest of the org app. RLS does the cross-org scoping: a host sees their
 * competitions, a visiting member sees ones they have a team in (and only their
 * own team's private rows).
 */

const COMPETITION_COLUMNS =
  'id, host_org_id, name, slug, description, format, theme, rules_url, status, results_visible, starts_at, ends_at, created_at, is_public, public_blurb';

/** Competitions visible to the caller, newest first. Each is tagged isHost. */
export async function loadCompetitions(supabase, orgId) {
  const { data, error } = await supabase
    .from('pitch_competitions')
    .select(COMPETITION_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error || !data) return [];
  return data.map((c) => ({ ...c, isHost: c.host_org_id === orgId }));
}

/** One competition by slug, or null. */
export async function loadCompetition(supabase, slug) {
  const { data, error } = await supabase
    .from('pitch_competitions')
    .select(COMPETITION_COLUMNS)
    .eq('slug', slug)
    .maybeSingle();
  if (error || !data) return null;
  return data;
}

/**
 * The full structure of one competition: rounds → rooms (with assigned teams and
 * judges), plus the flat team/judge rosters and the rubric. RLS scopes what comes
 * back; a visiting viewer sees the schedule but only their own team's private row.
 */
export async function loadStructure(supabase, competitionId) {
  const [roundsRes, roomsRes, teamsRes, judgesRes, roomJudgesRes, rubricRes] = await Promise.all([
    supabase
      .from('pitch_rounds')
      .select('id, competition_id, name, sort_order, starts_at')
      .eq('competition_id', competitionId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('pitch_rooms')
      .select('id, round_id, name, location, starts_at, ends_at')
      .order('starts_at', { ascending: true, nullsFirst: true }),
    supabase
      .from('pitch_teams')
      .select('id, competition_id, org_id, team_name, ticker, side, status, room_id, invite_email, created_at')
      .eq('competition_id', competitionId)
      .order('created_at', { ascending: true }),
    supabase
      .from('pitch_judges')
      .select('id, competition_id, full_name, email, firm, title, created_at')
      .eq('competition_id', competitionId)
      .order('created_at', { ascending: true }),
    supabase.from('pitch_room_judges').select('room_id, judge_id'),
    supabase
      .from('pitch_rubric_criteria')
      .select('id, competition_id, label, description, weight, max_score, sort_order')
      .eq('competition_id', competitionId)
      .order('sort_order', { ascending: true }),
  ]);

  const rounds = roundsRes.data || [];
  const roundIds = new Set(rounds.map((r) => r.id));
  // Rooms come back unscoped-by-round from the query above; keep only this
  // competition's rooms (those whose round belongs to it).
  const rooms = (roomsRes.data || []).filter((rm) => roundIds.has(rm.round_id));
  const teams = teamsRes.data || [];
  const judges = judgesRes.data || [];
  const roomJudges = roomJudgesRes.data || [];
  const rubric = rubricRes.data || [];

  const judgeById = new Map(judges.map((j) => [j.id, j]));
  const teamsByRoom = new Map();
  for (const t of teams) {
    if (!t.room_id) continue;
    if (!teamsByRoom.has(t.room_id)) teamsByRoom.set(t.room_id, []);
    teamsByRoom.get(t.room_id).push(t);
  }
  const judgesByRoom = new Map();
  for (const rj of roomJudges) {
    const j = judgeById.get(rj.judge_id);
    if (!j) continue;
    if (!judgesByRoom.has(rj.room_id)) judgesByRoom.set(rj.room_id, []);
    judgesByRoom.get(rj.room_id).push(j);
  }

  const roomsByRound = new Map();
  for (const rm of rooms) {
    const withKids = {
      ...rm,
      teams: teamsByRoom.get(rm.id) || [],
      judges: judgesByRoom.get(rm.id) || [],
    };
    if (!roomsByRound.has(rm.round_id)) roomsByRound.set(rm.round_id, []);
    roomsByRound.get(rm.round_id).push(withKids);
  }

  const structuredRounds = rounds.map((r) => ({ ...r, rooms: roomsByRound.get(r.id) || [] }));

  return {
    rounds: structuredRounds,
    teams,
    judges,
    rubric,
    counts: {
      rounds: rounds.length,
      rooms: rooms.length,
      teams: teams.length,
      teamsRegistered: teams.filter((t) => t.status === 'registered' || t.status === 'submitted').length,
      teamsSubmitted: teams.filter((t) => t.status === 'submitted').length,
      judges: judges.length,
      unassignedTeams: teams.filter((t) => !t.room_id).length,
    },
  };
}

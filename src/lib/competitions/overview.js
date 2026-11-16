/**
 * The Competitions landing payload (GET /api/org/pitch-competitions/overview
 * and the server page): events the council entered, events it hosts, events
 * open to join, its fund challenges and its trophies this season.
 *
 * Every council read goes through the signed-in member's RLS'd client, so a
 * visiting council sees only its own team, its own deliverables and its own
 * result (and that only after the host reveals). The one service-role read is
 * the existing "open to join" list (`loadJoinableCompetitions`), which returns
 * only the public shape of other councils' open events, with their entry
 * rules (the same rules the join page already shows).
 *
 * Each section loads on its own: a failed read marks that section in
 * `errors` and leaves the others standing. Never throws.
 */
import { loadCompetitions, loadJoinableCompetitions, loadStructure } from './loaders.js';
import { loadConfig } from './onboarding.js';
import { loadFundChallenges } from './fund-challenges.js';
import { COMPETITION_MANAGER_ROLES } from './permissions.js';
import { readinessOf, seasonStart } from '../org-competitions-model.js';

const settle = async (fn) => {
  try {
    return { ok: true, value: await fn() };
  } catch {
    return { ok: false, value: null };
  }
};
const must = (res) => {
  if (res?.error) throw new Error('read failed');
  return res?.data || [];
};

async function loadEntered(supabase, orgId, competitions) {
  const events = competitions.filter((c) => !c.isHost && c.status !== 'draft');
  if (!events.length) return [];
  const ids = events.map((c) => c.id);
  const teams = must(
    await supabase
      .from('pitch_teams')
      .select('id, competition_id, team_name, ticker, side, room_id, status')
      .eq('org_id', orgId)
      .in('competition_id', ids),
  );
  const teamIds = teams.map((t) => t.id);
  const roomIds = [...new Set(teams.map((t) => t.room_id).filter(Boolean))];
  const none = Promise.resolve({ data: [] });
  const [configs, deliverables, rooms, results] = await Promise.all([
    Promise.all(ids.map((id) => loadConfig(supabase, id))),
    teamIds.length
      ? supabase.from('pitch_deliverables').select('team_id, kind').in('team_id', teamIds)
      : none,
    roomIds.length
      ? supabase.from('pitch_rooms').select('id, name, starts_at').in('id', roomIds)
      : none,
    teamIds.length
      ? supabase
          .from('pitch_results')
          .select('team_id, rank, weighted_total')
          .in('team_id', teamIds)
      : none,
  ]);
  const roomById = new Map(must(rooms).map((r) => [r.id, r]));
  const resultByTeam = new Map(must(results).map((r) => [r.team_id, r]));
  const kindsByTeam = new Map();
  for (const d of must(deliverables)) {
    if (!kindsByTeam.has(d.team_id)) kindsByTeam.set(d.team_id, new Set());
    kindsByTeam.get(d.team_id).add(d.kind);
  }

  return events.map((c, i) => {
    const team = teams.find((t) => t.competition_id === c.id) || null;
    const room = team?.room_id ? roomById.get(team.room_id) : null;
    const result = team ? resultByTeam.get(team.id) : null;
    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      status: c.status,
      format: c.format,
      theme: c.theme,
      results_visible: Boolean(c.results_visible),
      starts_at: c.starts_at,
      ends_at: c.ends_at,
      config: configs[i],
      team: team ? { team_name: team.team_name, ticker: team.ticker, side: team.side } : null,
      submittedKinds: team ? [...(kindsByTeam.get(team.id) || [])] : [],
      slot: room ? { room: room.name, starts_at: room.starts_at } : null,
      result:
        result && c.results_visible
          ? { rank: result.rank, weighted_total: result.weighted_total }
          : null,
    };
  });
}

async function loadHosted(supabase, competitions) {
  const events = competitions.filter((c) => c.isHost && c.status !== 'archived');
  return Promise.all(
    events.map(async (c) => {
      const [structure, config] = await Promise.all([
        loadStructure(supabase, c.id),
        loadConfig(supabase, c.id),
      ]);
      const counts = structure?.counts || {};
      const rubricCount = (structure?.rubric || []).length;
      return {
        id: c.id,
        slug: c.slug,
        name: c.name,
        status: c.status,
        format: c.format,
        theme: c.theme,
        results_visible: Boolean(c.results_visible),
        starts_at: c.starts_at,
        ends_at: c.ends_at,
        counts,
        rubricCount,
        readiness: readinessOf(counts, rubricCount),
        config,
      };
    }),
  );
}

async function loadOpen(supabase, admin, orgId, visibleIds) {
  const list = await loadJoinableCompetitions(admin, orgId, visibleIds);
  if (!list.length) return [];
  const [configs, pending] = await Promise.all([
    Promise.all(list.map((c) => loadConfig(admin, c.id))),
    supabase
      .from('pitch_join_requests')
      .select('competition_id')
      .eq('org_id', orgId)
      .eq('status', 'pending')
      .in(
        'competition_id',
        list.map((c) => c.id),
      ),
  ]);
  const requested = new Set((pending?.data || []).map((r) => r.competition_id));
  return list.map((c, i) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    status: c.status,
    format: c.format,
    theme: c.theme,
    starts_at: c.starts_at,
    requested: requested.has(c.id),
    config: {
      admission_mode: configs[i].admission_mode,
      registration_opens_at: configs[i].registration_opens_at,
      registration_closes_at: configs[i].registration_closes_at,
      side_constraint: configs[i].side_constraint,
    },
  }));
}

async function loadBadges(supabase, orgId, nowIso) {
  return must(
    await supabase
      .from('org_competition_badges')
      .select('org_member_id, badge_key, awarded_at, org_members!inner(org_id)')
      .eq('org_members.org_id', orgId)
      .gte('awarded_at', `${seasonStart(nowIso)}T00:00:00Z`),
  ).map(({ org_member_id, badge_key, awarded_at }) => ({ org_member_id, badge_key, awarded_at }));
}

/**
 * @param supabase the member's RLS'd client
 * @param admin service-role client, used only for the public "open to join" list
 * @param member the caller's org membership (getCurrentOrgMember)
 */
export async function loadCompetitionsOverview(
  supabase,
  admin,
  member,
  nowIso = new Date().toISOString(),
) {
  const orgId = member.org_id;
  const list = await settle(() => loadCompetitions(supabase, orgId));
  const competitions = list.ok ? list.value : [];

  const [entered, hosted, joinable, fund, badges] = await Promise.all([
    list.ok ? settle(() => loadEntered(supabase, orgId, competitions)) : { ok: false },
    list.ok ? settle(() => loadHosted(supabase, competitions)) : { ok: false },
    settle(() =>
      loadOpen(
        supabase,
        admin,
        orgId,
        competitions.map((c) => c.id),
      ),
    ),
    settle(async () => {
      const out = await loadFundChallenges(supabase, orgId);
      if (out.error) throw new Error('fund');
      return { competitions: out.competitions, boards: out.boards };
    }),
    settle(() => loadBadges(supabase, orgId, nowIso)),
  ]);

  return {
    viewer: { canManage: COMPETITION_MANAGER_ROLES.includes(member.role), role: member.role },
    entered: entered.value || [],
    hosted: hosted.value || [],
    joinable: joinable.value || [],
    fund: {
      competitions: fund.value?.competitions || [],
      boards: fund.value?.boards || {},
      canEnter: COMPETITION_MANAGER_ROLES.includes(member.role),
    },
    badges: badges.value || [],
    errors: {
      entered: !entered.ok,
      hosted: !hosted.ok,
      joinable: !joinable.ok,
      fund: !fund.ok,
      trophies: !badges.ok,
    },
  };
}

/**
 * Fund challenges (inter-university fund return competitions), read as the
 * signed-in member through the RLS'd client. Shared by the challenge list
 * route, the leaderboard route and the Competitions landing loader, so every
 * surface ranks the same way and none of them ever returns a fund value in
 * dollars (only rank, return since entry and councils entered).
 *
 * Never throws: a failed read returns { error: true } for the caller to show
 * an inline error with Retry.
 */
import { rankStandings } from '../org-competitions-model.js';

const COMP_COLUMNS = 'id, name, description, starts_at, ends_at, status, is_inter_org';

/** Org display names for a set of org ids (organizations are public-readable). */
async function orgNames(supabase, orgIds) {
  if (!orgIds.length) return new Map();
  const { data } = await supabase
    .from('organizations')
    .select('id, university_name, name')
    .in('id', orgIds);
  return new Map((data || []).map((o) => [o.id, o.university_name || o.name || 'University']));
}

/** Standings for one challenge, ranked, with no dollar figure. */
export async function loadChallengeStandings(supabase, competitionId, myOrgId) {
  const { data: entries, error } = await supabase
    .from('competition_org_entries')
    .select('org_id, current_value, return_pct, rank, status')
    .eq('competition_id', competitionId);
  if (error) return { error: true, standings: [] };
  const names = await orgNames(supabase, [...new Set((entries || []).map((e) => e.org_id))]);
  return { error: false, standings: rankStandings(entries || [], names, myOrgId) };
}

/**
 * Every fund challenge with the council's own entry, plus standings for the
 * ones it entered (keyed by challenge id).
 */
export async function loadFundChallenges(supabase, orgId, { withBoards = true } = {}) {
  const { data: comps, error } = await supabase
    .from('competitions')
    .select(COMP_COLUMNS)
    .eq('is_inter_org', true)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return { error: true, competitions: [], boards: {} };

  const { data: mine } = await supabase
    .from('competition_org_entries')
    .select('competition_id, status, rank, return_pct')
    .eq('org_id', orgId);
  const byComp = new Map((mine || []).map((e) => [e.competition_id, e]));
  const competitions = (comps || []).map((c) => ({ ...c, myEntry: byComp.get(c.id) || null }));

  const boards = {};
  if (withBoards) {
    const entered = competitions.filter((c) => c.myEntry && c.myEntry.status !== 'withdrawn');
    const loaded = await Promise.all(
      entered.map((c) => loadChallengeStandings(supabase, c.id, orgId)),
    );
    entered.forEach((c, i) => {
      boards[c.id] = loaded[i].standings;
    });
  }
  return { error: false, competitions, boards };
}

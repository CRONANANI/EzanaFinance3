/**
 * Fund Analytics: the server side of `GET /api/org/analytics/fund` and of the
 * page's first render. This file only reads; every calculation lives in
 * `org-fund-analytics-model.js`, which the sample bundle and the tests share,
 * so the three can never drift apart.
 *
 * HONEST-EMPTY CONTRACT: every block is null or [] when the underlying data
 * does not exist. No placeholder rows and no placeholder figures: a brand-new
 * fund renders empty states.
 *
 * Positions come from `org_positions` through `getOrgPositionBook` (the same
 * source as `computeFundPerformance`), so weights and contributions reconcile
 * with the fund value. A holding has no analyst column, so the analyst is
 * found through the pitches for its ticker.
 */

import { assertOrgRole } from '@/lib/org-trading-server';
import { getOrgPositionBook } from '@/lib/org-position-book';
import {
  computeFundPerformance,
  attributionByAnalyst,
  attributionBySector,
  attributionByPitch,
} from '@/lib/org-attribution';
import {
  FUND_PERIOD_VALUES,
  concentrationOf,
  contributorsOf,
  leaderboardOf,
  pipelineOf,
  resolveMemberName,
  scopeFundSeries,
  sectorRows,
} from '@/lib/org-fund-analytics-model';

export { resolveMemberName };

const finite = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

async function getTeams(supabase, orgId) {
  /* A team has no sector of its own: it is read from the team's holdings
     (teamSectorMap in the model). */
  const { data } = await supabase.from('org_teams').select('id, name, slug').eq('org_id', orgId);
  return data || [];
}

async function getMembers(supabase, orgId) {
  const { data } = await supabase
    .from('org_members')
    .select('id, user_id, display_name, title, role, sub_role, is_active, team_id')
    .eq('org_id', orgId);
  return data || [];
}

async function getPitches(supabase, orgId) {
  const { data: pitches } = await supabase
    .from('org_pitches')
    .select('id, ticker, company_name, analyst_member_id, team_id, decision, stage, status')
    .eq('org_id', orgId);
  const ids = (pitches || []).map((p) => p.id);
  let hindsight = [];
  if (ids.length > 0) {
    const { data } = await supabase
      .from('org_pitch_hindsight')
      .select('pitch_id, return_pct, alpha_pct, current_state')
      .in('pitch_id', ids);
    hindsight = data || [];
  }
  return { pitches: pitches || [], hByPitch: new Map(hindsight.map((h) => [h.pitch_id, h])) };
}

async function getSnapshotRows(supabase, orgId) {
  const { data } = await supabase
    .from('org_fund_snapshots')
    .select('snapshot_date, total_value, total_cost, return_pct, benchmark_return_pct, alpha_pct')
    .eq('org_id', orgId)
    .order('snapshot_date', { ascending: true });
  return data || [];
}

async function getSectorCapPct(supabase, orgId) {
  const { data } = await supabase
    .from('org_ips_rules')
    .select('rule_type, rule_value, is_active')
    .eq('org_id', orgId)
    .eq('rule_type', 'max_sector_pct')
    .eq('is_active', true)
    .limit(1);
  const rule = (data || [])[0];
  if (!rule) return null;
  const v = rule.rule_value || {};
  return finite(v.pct) ?? finite(v.max) ?? finite(v.limit) ?? null;
}

/** What changed since the council last met. Null when there are no meetings. */
async function sinceLastMeeting(supabase, orgId, rows) {
  const { data: meetings } = await supabase
    .from('org_meetings')
    .select('id, title, started_at, created_at')
    .eq('org_id', orgId)
    .order('started_at', { ascending: false, nullsFirst: false })
    .limit(1);
  const meeting = (meetings || [])[0];
  const sinceIso = meeting?.started_at || meeting?.created_at;
  if (!sinceIso) return null;

  const sinceDate = sinceIso.slice(0, 10);
  const days = Math.max(0, Math.round((Date.now() - Date.parse(sinceIso)) / 86400000));

  /* Fund value and return change, from the daily records either side of the
     meeting date. */
  const before = [...rows].reverse().find((r) => r.snapshot_date <= sinceDate) || rows[0] || null;
  const latest = rows[rows.length - 1] || null;
  const valueDelta =
    before && latest && finite(latest.total_value) != null && finite(before.total_value) != null
      ? finite(latest.total_value) - finite(before.total_value)
      : null;
  const returnDelta =
    before && latest && finite(latest.return_pct) != null && finite(before.return_pct) != null
      ? finite(latest.return_pct) - finite(before.return_pct)
      : null;

  const [{ count: positionsAdded }, { count: pitchesDecided }] = await Promise.all([
    supabase
      .from('org_positions')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .gte('created_at', sinceIso),
    supabase
      .from('org_pitches')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .not('decision', 'is', null)
      .gte('decision_at', sinceIso),
  ]);

  return {
    since_date: sinceDate,
    days_ago: days,
    fund_value_delta: valueDelta,
    return_delta_pct: returnDelta,
    positions_added: positionsAdded || 0,
    positions_closed: null, // closing a holding is not recorded
    pitches_decided: pitchesDecided || 0,
    flags_raised: null, // not recorded against a meeting
  };
}

/**
 * The page's own blocks. `performance` and `attribution` are added by the
 * caller. Each source is read once and shared by every block.
 */
export async function buildFundAnalytics(supabase, orgId, period = 'semester') {
  const [positions, teams, members, { pitches, hByPitch }, capPct, rows] = await Promise.all([
    getOrgPositionBook(supabase, orgId),
    getTeams(supabase, orgId),
    getMembers(supabase, orgId),
    getPitches(supabase, orgId),
    getSectorCapPct(supabase, orgId),
    getSnapshotRows(supabase, orgId),
  ]);
  const slm = await sinceLastMeeting(supabase, orgId, rows);
  const scoped = scopeFundSeries(rows, period);

  return {
    period,
    series: scoped.series,
    seriesLatest: scoped.latest,
    periodStats: scoped.periodStats,
    sinceLastMeeting: slm,
    concentration: concentrationOf(positions, capPct),
    sectorVsTarget: sectorRows({ positions, teams, members, capPct }),
    analystLeaderboard: leaderboardOf({
      members,
      teams,
      positions,
      pitches,
      hindsightByPitch: hByPitch,
    }),
    contributors: contributorsOf({ positions, pitches, members }),
    pipeline: pipelineOf({ pitches, positions }),
    holdingsCount: positions.length,
    // No cash figure is recorded for a fund, so the page shows none.
    cash: null,
  };
}

/**
 * Assemble the FULL `GET /api/org/analytics/fund` response payload for an
 * already-resolved active member. Shared verbatim by the GET route and the
 * page's first render, so the two never drift. Returns
 * `{ payload, performance, byAnalyst, bySector, byPitch }`; the route reuses
 * the raw pieces for its (manager-only, opt-in) daily record.
 */
export async function loadFundAnalytics(supabase, member, requestedPeriod) {
  const orgId = member.org_id;
  const period = FUND_PERIOD_VALUES.includes(requestedPeriod) ? requestedPeriod : 'semester';

  const [performance, byAnalyst, bySector, byPitch, extended] = await Promise.all([
    computeFundPerformance(supabase, orgId),
    attributionByAnalyst(supabase, orgId),
    attributionBySector(supabase, orgId),
    attributionByPitch(supabase, orgId),
    buildFundAnalytics(supabase, orgId, period),
  ]);

  const payload = {
    performance,
    attribution: { byAnalyst, bySector, byPitch },
    ...extended,
    viewer: {
      memberId: member.id,
      role: member.role,
      canReport: assertOrgRole(member, ['executive', 'portfolio_manager']),
    },
  };

  return { payload, performance, byAnalyst, bySector, byPitch };
}

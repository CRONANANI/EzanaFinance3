/**
 * Sample content for the Org chart (/org-team-hub/org-chart).
 *
 * Served ONLY to master admin and demo accounts by
 * GET /api/org/chart/sample, so the page can be reviewed and presented from
 * a council with few members. Real councils never receive it, and the page
 * labels it "Sample content" while it shows. Nothing here is read from or
 * written to the database: a rank change, a member edit or a coverage
 * assignment made while it shows stays on the page and is gone on reload.
 *
 * It is the same sample council as the Command Center, the Trading Desk,
 * Fund Analytics and Assignments: the same nine members and the viewer, the
 * same four sector teams, the same sleeves and fund totals (taken from the
 * Trading Desk bundle, not typed again) and the same scorecards (taken from
 * the Fund Analytics bundle). What this file adds is what only this page
 * shows: ranks, reporting lines, sector coverage, term dates and a short
 * rank change log.
 *
 * The bundle mirrors the live payloads exactly (the chart from
 * GET /api/org/chart and the summary from GET /api/org/team-hub/summary), so
 * the page draws it with the same code, and edit rights come from the same
 * rules the rank route enforces.
 *
 * Pure: no React, no fetch, no server imports. Every row carries is_demo.
 */
import { ORG_TIERS, tierOf } from './org-hierarchy.js';
import { GICS_SECTORS, withEditRights } from './org-chart-model.js';
import { buildFundAnalyticsSample } from './org-fund-analytics-sample.js';
import { buildTradingDeskSample } from './org-trading-desk-sample.js';

const DAY = 86400000;
const id = (prefix, n) => `sample-${prefix}-${String(n).padStart(3, '0')}`;
const memberOf = (n) => id('member', n);
const teamOf = (n) => id('team', n);

/* Member numbers and teams as the other org samples assign them, with the
   rank each member's label there stands for. */
const RANKS = {
  1: ['senior_analyst', 1], // Amara Tesfaye
  2: ['analyst', 2], // Mikael Bekele
  3: ['senior_portfolio_manager', 3], // Selam Haile
  4: ['portfolio_manager', 1], // Chidi Okoye
  5: ['portfolio_manager', 2], // Ingrid Lindqvist
  6: ['portfolio_manager', 4], // Daniel Park
  7: ['senior_analyst', 3], // Elena Rossi
  8: ['analyst', 4], // Jonas Weber
  9: ['junior_analyst', 2], // Tomas Alvarez
};
/* The team each sample portfolio manager heads. */
const PM_OF_TEAM = { 1: 4, 2: 5, 3: 3, 4: 6 };
/* Sector coverage on file: four of the eleven sectors, one analyst each. */
const COVERAGE = {
  1: ['Financials'],
  2: ['Health Care'],
  7: ['Information Technology'],
  8: ['Industrials'],
};
/* Members finishing this academic year. */
const GRADUATING = new Set([1, 3]);
/* Term end on file without the graduating marker. */
const TERM_ONLY = new Set([4, 7]);

const DEFAULT_TIER = {
  executive: 'executive',
  portfolio_manager: 'portfolio_manager',
  analyst: 'analyst',
};

/**
 * @param {{ userId: string, memberId: string, role: string, tier?: string,
 *           displayName?: string, title?: string, subRole?: string,
 *           now?: number }} viewer the signed-in member
 */
export function buildOrgChartSample({
  userId,
  memberId,
  role,
  tier,
  displayName,
  title,
  subRole,
  now = Date.now(),
}) {
  const who = { userId, memberId, role, displayName, title, subRole, now };
  const desk = buildTradingDeskSample(who);
  const fa = buildFundAnalyticsSample(who);
  const me = memberId || 'sample-member-me';
  const isExec = role === 'executive';
  const myTier = ORG_TIERS.some((t) => t.id === tier && t.role === role)
    ? tier
    : DEFAULT_TIER[role] || 'analyst';

  /* The academic year in progress: September to the following May. */
  const d = new Date(now);
  const startYear = d.getUTCMonth() >= 7 ? d.getUTCFullYear() : d.getUTCFullYear() - 1;
  const termStart = `${startYear}-09-01`;
  const termEnd = `${startYear + 1}-05-15`;

  const person = (m) => {
    const n = Number(String(m.id).slice(-3));
    const [rank, team] = RANKS[n];
    const isPm = tierOf({ tier: rank }).role === 'portfolio_manager';
    return {
      id: m.id,
      user_id: m.user_id,
      display_name: m.display_name,
      title: tierOf({ tier: rank }).label,
      role: m.role,
      sub_role: m.sub_role || null,
      tier: rank,
      team_id: teamOf(team),
      /* Analysts report to their team's portfolio manager. Portfolio managers
         report to the viewer when the viewer is an executive, otherwise to
         the senior portfolio manager. */
      reports_to: isPm ? (isExec ? me : n === 3 ? null : memberOf(3)) : memberOf(PM_OF_TEAM[team]),
      term_start: n === 9 ? `${startYear}-10-01` : termStart,
      term_end: GRADUATING.has(n) || TERM_ONLY.has(n) ? termEnd : null,
      is_graduating: GRADUATING.has(n),
      sectors: (COVERAGE[n] || [])
        .filter((s) => GICS_SECTORS.includes(s))
        .map((sector) => ({ sector, isPrimary: true })),
      is_demo: true,
    };
  };
  const people = desk.roster.members.filter((m) => m.id !== me).map(person);
  const viewerRow = {
    id: me,
    user_id: userId,
    display_name: displayName || 'You',
    title: title || tierOf({ tier: myTier }).label,
    role,
    sub_role: subRole || null,
    tier: myTier,
    /* As in the other org samples: an executive has no team, anyone else sits
       on the Technology team. */
    team_id: isExec ? null : teamOf(3),
    reports_to: isExec ? null : memberOf(3),
    term_start: termStart,
    term_end: null,
    is_graduating: false,
    sectors: [],
    is_demo: true,
  };
  /* Join order: an executive viewer founded the council; anyone else joined
     after the nine. */
  const ordered = isExec ? [viewerRow, ...people] : [...people, viewerRow];
  const rights = withEditRights(ordered, me);

  const iso = (days) => new Date(now + days * DAY).toISOString();
  const change = (n, target, by, from, to, daysAgo) => ({
    id: id('rank-change', n),
    target_member_id: memberOf(target),
    changed_by_member_id: by === 'me' ? me : memberOf(by),
    old_tier: from,
    new_tier: to,
    created_at: iso(-daysAgo),
    is_demo: true,
  });
  const lead = isExec ? 'me' : 3;
  const changes = [
    change(1, 7, 3, 'analyst', 'senior_analyst', 12),
    change(2, 1, 4, 'analyst', 'senior_analyst', 40),
    change(3, 8, 6, 'junior_analyst', 'analyst', 65),
    change(4, 3, lead === 'me' ? 'me' : 4, 'portfolio_manager', 'senior_portfolio_manager', 96),
  ].filter((c) => c.changed_by_member_id !== c.target_member_id);

  const chart = {
    universityName: fa.fundName,
    orgId: 'sample',
    sectors: GICS_SECTORS,
    tiers: ORG_TIERS,
    viewer: rights.viewer,
    members: rights.members,
    teams: desk.roster.teams.map((t) => ({ id: t.id, name: t.name })),
    changes,
    is_demo: true,
  };

  /* One finished competition on file, for one member. */
  const badges = {
    [memberOf(1)]: [
      {
        id: id('badge', 1),
        badge_key: 'finalist',
        placement: 2,
        competition_name: 'Sample fall stock pitch',
        role_at_event: 'analyst',
        is_demo: true,
      },
    ],
  };

  return {
    chart,
    summary: desk.summary,
    scorecards: fa.scorecards,
    badges,
    is_demo: true,
  };
}

/**
 * Sample content for Fund Analytics (/org-team-hub/fund-analytics).
 *
 * Served ONLY to master admin and demo accounts who are council members, by
 * GET /api/org/analytics/sample, so the page can be reviewed and presented
 * from a council with little activity. Real councils never receive it, and
 * the page labels it "Sample content" while it shows. Nothing here is read
 * from or written to the database.
 *
 * The fund is the same sample fund the Command Center and the Trading Desk
 * show: the people, the four sector teams, the twelve positions, the daily
 * records and the totals are taken from the Trading Desk bundle (which takes
 * its summary from the Command Center bundle). Only what those pages do not
 * carry is added here: the pitches behind the holdings, the sector cap, the
 * last meeting, a competition entry and the attention map. Every figure the
 * page draws is then computed by the same model the live page uses, so the
 * sample obeys the real rules and nothing is typed in twice.
 *
 * Pure: no React, no fetch, no server imports. Every row carries is_demo.
 */
import { buildTradingDeskSample } from './org-trading-desk-sample.js';
import { SAMPLE_PITCHES, SAMPLE_PITCH_AUTHORS } from './org-sample-pitches.js';
import {
  FUND_PERIOD_VALUES,
  concentrationOf,
  contributorsOf,
  leaderboardOf,
  pipelineOf,
  resolveMemberName,
  scopeFundSeries,
  sectorRows,
} from './org-fund-analytics-model.js';

const DAY = 86400000;
const id = (prefix, n) => `sample-${prefix}-${String(n).padStart(3, '0')}`;
const memberOf = (n) => id('member', n);

/* The council's one sector cap (its investment policy). */
const SECTOR_CAP_PCT = 35;

/* The pitches behind the book, and the ones still in the pipeline: the same
   list the Pitch Pipeline sample shows (org-sample-pitches.js). */
const WHO = SAMPLE_PITCH_AUTHORS;
const PITCHES = SAMPLE_PITCHES;

/* Votes cast and research notes written, per member (scorecard only). */
const PARTICIPATION = {
  tesfaye: [14, 9],
  bekele: [12, 7],
  rossi: [15, 11],
  weber: [9, 4],
  alvarez: [8, 5],
};

/* More than 5 points either way is a clear result; inside that is in line. */
const stateOf = (alpha) =>
  alpha > 5 ? 'outperforming' : alpha < -5 ? 'underperforming' : 'roughly_inline';

/* What members have been reading about. Each topic meets the 3 member floor. */
const ATTENTION = {
  sector: [
    ['Financials', 92, 11],
    ['Healthcare', 81, 9],
    ['Technology', 77, 10],
    ['Industrials', 38, 4],
  ],
  theme: [
    ['Interest rates', 88, 12],
    ['AI capital spending', 74, 9],
    ['Drug pricing', 51, 6],
    ['Reshoring', 29, 3],
  ],
  entity: [
    ['NVIDIA', 83, 10],
    ['JPMorgan Chase', 69, 8],
    ['Eli Lilly', 64, 7],
    ['UnitedHealth', 47, 5],
  ],
  industry: [
    ['Banks', 79, 9],
    ['Semiconductors', 72, 8],
    ['Pharmaceuticals', 58, 6],
  ],
  geo: [
    ['United States', 95, 14],
    ['China', 41, 5],
    ['European Union', 27, 3],
  ],
  asset_class: [
    ['Equities', 97, 15],
    ['Fixed income', 33, 4],
  ],
};

/**
 * @param {{ userId: string, memberId: string, role: string, displayName?: string,
 *           title?: string, subRole?: string, canAttention?: boolean,
 *           canHealth?: boolean, now?: number }} viewer the signed-in member
 */
export function buildFundAnalyticsSample({
  userId,
  memberId,
  role,
  displayName,
  title,
  subRole,
  canAttention = false,
  canHealth = false,
  now = Date.now(),
}) {
  const desk = buildTradingDeskSample({
    userId,
    memberId,
    role,
    displayName,
    title,
    subRole,
    now,
  });
  const summary = desk.summary;
  const perf = summary.performance;
  const members = desk.roster.members;
  const teams = desk.roster.teams;
  const teamName = new Map(teams.map((t) => [t.id, t.name]));
  const iso = (days) => new Date(now + days * DAY).toISOString();

  /* The book, with each holding under its sector team's sector. */
  const positions = desk.book.positions.map((p) => ({
    ...p,
    industry: p.sector,
    sector: teamName.get(p.team_id) || p.sector,
  }));

  /* ── Pitches and their readings ── */
  const pitches = PITCHES.map(([ticker, company, who, decision, daysAgo], i) => ({
    id: id('pitch', i + 1),
    ticker,
    company_name: company,
    analyst_member_id: memberOf(WHO[who]),
    decision,
    decision_at: daysAgo == null ? null : iso(-daysAgo),
    stage: decision ? 'decided' : 'committee',
    status: decision || 'submitted',
    is_demo: true,
  }));
  const hindsightByPitch = new Map();
  PITCHES.forEach(([, , , , , ret, alpha], i) => {
    if (ret == null || alpha == null) return;
    hindsightByPitch.set(pitches[i].id, {
      pitch_id: pitches[i].id,
      return_pct: ret,
      alpha_pct: alpha,
      current_state: stateOf(alpha),
    });
  });
  const byMember = new Map(members.map((m) => [m.id, m]));

  const byPitch = pitches
    .map((p) => {
      const h = hindsightByPitch.get(p.id);
      return {
        pitch_id: p.id,
        ticker: p.ticker,
        company_name: p.company_name,
        analyst: resolveMemberName(byMember.get(p.analyst_member_id)),
        analyst_member_id: p.analyst_member_id,
        decision: p.decision || p.stage,
        return_pct: h ? h.return_pct : null,
        alpha_pct: h ? h.alpha_pct : null,
        current_state: h ? h.current_state : null,
        has_outcome: Boolean(h),
        is_demo: true,
      };
    })
    .sort((a, b) => (b.alpha_pct ?? -Infinity) - (a.alpha_pct ?? -Infinity));

  /* ── Daily records, in the shape the fund's records are stored ── */
  const rows = summary.snapshots.map((s) => {
    const ret = (s.value / perf.total_cost - 1) * 100;
    const bench = s.benchmarkValue == null ? null : (s.benchmarkValue / perf.total_cost - 1) * 100;
    return {
      snapshot_date: s.date,
      total_value: s.value,
      total_cost: perf.total_cost,
      return_pct: ret,
      benchmark_return_pct: bench,
      alpha_pct: bench == null ? null : ret - bench,
    };
  });
  const byPeriod = {};
  for (const period of FUND_PERIOD_VALUES) {
    const scoped = scopeFundSeries(rows, period);
    byPeriod[period] = {
      period,
      series: scoped.series,
      seriesLatest: scoped.latest,
      periodStats: scoped.periodStats,
    };
  }

  /* ── Since the last meeting (nine days ago) ── */
  const meetingIso = iso(-9);
  const meetingDay = meetingIso.slice(0, 10);
  const before = [...rows].reverse().find((r) => r.snapshot_date <= meetingDay) || rows[0];
  const latest = rows[rows.length - 1];
  const sinceLastMeeting = {
    since_date: meetingDay,
    days_ago: 9,
    fund_value_delta: latest.total_value - before.total_value,
    return_delta_pct: latest.return_pct - before.return_pct,
    positions_added: positions.filter((p) => p.added_at >= meetingIso).length,
    positions_closed: null,
    pitches_decided: pitches.filter((p) => p.decision_at && p.decision_at >= meetingIso).length,
    flags_raised: null,
    is_demo: true,
  };

  /* ── Scorecards, by the scorecard's own rules ── */
  const scorecards = {};
  for (const m of members) {
    const key = Object.keys(WHO).find((k) => memberOf(WHO[k]) === m.id);
    const calls = pitches
      .filter((p) => p.analyst_member_id === m.id)
      .map((p) => {
        const h = hindsightByPitch.get(p.id);
        return {
          ticker: p.ticker,
          company_name: p.company_name,
          return_pct: h ? h.return_pct : null,
          alpha_pct: h ? h.alpha_pct : null,
          current_state: h ? h.current_state : null,
          has_outcome: Boolean(h),
        };
      });
    const done = calls.filter((c) => c.has_outcome);
    const mean = (k) => (done.length ? done.reduce((s, c) => s + c[k], 0) / done.length : null);
    const [votes, notes] = key ? PARTICIPATION[key] : [0, 0];
    scorecards[m.id] = {
      member_id: m.id,
      name: resolveMemberName(m),
      role: m.role,
      sub_role: m.sub_role,
      pitch_count: calls.length,
      outcomes: done.length,
      hit_rate: done.length
        ? (done.filter((c) => c.alpha_pct > 0).length / done.length) * 100
        : null,
      avg_return: mean('return_pct'),
      avg_alpha: mean('alpha_pct'),
      votes_participated: votes,
      notes_authored: notes,
      calls,
      is_demo: true,
    };
  }

  /* ── Council standing: entered 60 days ago, return measured since then ── */
  const entryDay = iso(-60).slice(0, 10);
  const entryRow = [...rows].reverse().find((r) => r.snapshot_date <= entryDay) || rows[0];
  const standing = {
    id: id('competition', 1),
    name: 'Sample intercollegiate fund challenge',
    status: 'active',
    ends_at: iso(45),
    rank: 3,
    field: 12,
    ranked: 12,
    return_pct: (latest.total_value / entryRow.total_value - 1) * 100,
    is_demo: true,
  };

  /* ── Data health, counted from the book itself ── */
  const priced = positions.filter((p) => p.priced).length;
  const lastPriced =
    positions
      .map((p) => p.last_priced_at)
      .filter(Boolean)
      .sort()
      .pop() || null;
  const unpriced = positions.length - priced;
  const health = {
    positions: {
      total: positions.length,
      priced,
      unpriced,
      missing_sector: positions.filter((p) => !p.sector).length,
      missing_team: positions.filter((p) => !p.team_id).length,
    },
    pricing: {
      last_priced_at: lastPriced,
      stale_hours: lastPriced ? Math.floor((now - Date.parse(lastPriced)) / 3600000) : null,
    },
    snapshot: { last_date: latest.snapshot_date, days_since: 0, count_30d: 30 },
    benchmark: { symbol: perf.benchmark_symbol, source: perf.benchmark_source },
    brokerage: null,
    status: unpriced > 0 ? 'attention' : 'ok',
    is_demo: true,
  };

  const attention = {
    k: 3,
    computedAt: iso(-0.4),
    dimensions: Object.fromEntries(
      Object.entries(ATTENTION).map(([dim, list]) => [
        dim,
        list.map(([value, score, memberCount]) => ({ value, score, memberCount, is_demo: true })),
      ]),
    ),
    is_demo: true,
  };

  const fund = {
    performance: { ...perf, positions: positions.length },
    attribution: { byAnalyst: [], bySector: [], byPitch },
    sinceLastMeeting,
    concentration: concentrationOf(positions, SECTOR_CAP_PCT),
    sectorVsTarget: sectorRows({ positions, teams, members, capPct: SECTOR_CAP_PCT }),
    analystLeaderboard: leaderboardOf({ members, teams, positions, pitches, hindsightByPitch }),
    contributors: contributorsOf({ positions, pitches, members }),
    pipeline: pipelineOf({ pitches, positions }),
    holdingsCount: positions.length,
    cash: null,
    viewer: {
      memberId: desk.viewer.memberId,
      role,
      canReport: role === 'executive' || role === 'portfolio_manager',
    },
    is_demo: true,
  };

  return {
    is_demo: true,
    fundName: 'Sample council fund',
    fund,
    byPeriod,
    scorecards,
    standing,
    /* Only for members who can already see these on the live page. */
    attention: canAttention ? attention : null,
    health: canHealth ? health : null,
  };
}

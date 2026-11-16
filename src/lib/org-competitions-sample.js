/**
 * Sample content for Competitions (/org-competitions and the sample event
 * workspaces under it).
 *
 * Served ONLY to master admin and demo accounts who are council members, by
 * GET /api/org/pitch-competitions/sample, so the page can be reviewed and
 * presented from a council with no competition activity. Real councils never
 * receive it, the page labels it "Sample content" while it shows, and
 * nothing done to it (joining, entering, revealing, recomputing, advancing a
 * stage) is sent anywhere: it is applied on the page and gone on reload.
 *
 * The council is the same sample council every rebuilt Team Hub page shows:
 * the people come from the Trading Desk bundle, and the fund challenge
 * standing is the Fund Analytics bundle's ("Sample intercollegiate fund
 * challenge", 3 of 12), with a second challenge measured from the same daily
 * records. Other councils, events and judges are invented.
 *
 * The bundle obeys the real rules: scores are weighted 0 to 100 totals from
 * the rubric (the same `weightedTotal` the judges' scorecards use), an
 * entrant sees only its own team's rank (no field size, no other team's
 * score), feedback carries no judge label, trophies follow the award rule
 * (team members plus the council's active portfolio managers), and no dollar
 * figure appears in fund challenge standing.
 *
 * Pure: no React, no fetch, no server imports. Every row carries is_demo.
 */
import { buildTradingDeskSample } from './org-trading-desk-sample.js';
import { buildFundAnalyticsSample } from './org-fund-analytics-sample.js';
import { weightedTotal } from './competitions/scoring.js';
import { badgeForRank } from './competitions/badges.js';
import { readinessOf } from './org-competitions-model.js';

const DAY = 86400000;
const id = (prefix, n) => `sample-${prefix}-${String(n).padStart(3, '0')}`;

const RUBRIC = [
  { id: 'c-thesis', label: 'Thesis', weight: 3, max_score: 30 },
  { id: 'c-analysis', label: 'Analysis', weight: 3, max_score: 30 },
  { id: 'c-presentation', label: 'Presentation', weight: 2, max_score: 20 },
  { id: 'c-qa', label: 'Q&A', weight: 2, max_score: 20 },
];
const total = (s) =>
  weightedTotal(RUBRIC, {
    'c-thesis': s[0],
    'c-analysis': s[1],
    'c-presentation': s[2],
    'c-qa': s[3],
  }).total;
const breakdown = (s) =>
  RUBRIC.map((c, i) => ({
    id: c.id,
    label: c.label,
    max_score: c.max_score,
    weight: c.weight,
    avg: s[i],
  }));

/* Invented councils that host or enter events beside the sample council. */
const COUNCILS = [
  'Harborview Capital Society',
  'Northlake Student Fund',
  'Lakeside Capital Group',
  'Granite Peak Investment Club',
  'Riverbend Value Fund',
  'Westfield Equity Council',
  'Summit Hall Fund',
  'Pinecrest Student Investors',
  'Bayside Capital Council',
  'Oakmont Growth Fund',
  'Cedar Ridge Finance Society',
];

/** Fund challenge standings for `field` councils with the sample council at `rank`. */
function board(field, rank, myReturn, step) {
  const rows = [];
  for (let i = 1; i <= field; i += 1) {
    const mine = i === rank;
    rows.push({
      org_id: mine ? 'sample-org-self' : id('org', i),
      rank: i,
      university: mine ? 'Sample council' : COUNCILS[(i - 1) % COUNCILS.length],
      return_pct: mine ? myReturn : myReturn + (rank - i) * step,
      isMine: mine,
      is_demo: true,
    });
  }
  return rows;
}

export function buildCompetitionsSample({
  userId = 'sample-viewer',
  memberId = null,
  role = 'executive',
  displayName = null,
  now = Date.now(),
} = {}) {
  const iso = (days, hour = null, minute = 0) => {
    const d = new Date(now + days * DAY);
    if (hour != null) d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };
  const desk = buildTradingDeskSample({ userId, memberId, role, displayName, now });
  const people = desk.roster.members;
  const byName = (n) => people.find((p) => (p.display_name || p.name || '').startsWith(n));
  const pms = people.filter((p) => p.role === 'portfolio_manager' && p.is_active !== false);
  const canManage = role === 'executive' || role === 'portfolio_manager';

  const team = (names) =>
    names.map((n, i) => {
      const p = byName(n);
      return {
        id: p?.id || id('member', i + 1),
        name: p?.display_name || p?.name || n,
        lead: i === 0,
        consent: i !== 2 ? 'judges' : 'none',
        is_demo: true,
      };
    });

  /* ── Events the council entered ── */
  const config = (o) => ({
    admission_mode: 'application',
    max_teams: 12,
    max_teams_per_org: 1,
    registration_opens_at: iso(-46),
    registration_closes_at: iso(-6),
    ticker_assignment: 'team_choice',
    side_constraint: 'either',
    deliverable_deck: true,
    deliverable_thesis: false,
    deliverable_model: false,
    deliverable_due_at: null,
    eligibility_note: null,
    ...o,
  });

  const entered = [
    {
      id: id('event', 1),
      slug: 'sample-north-shore-spring-invitational',
      name: 'North Shore spring invitational',
      host: 'Harborview Capital Society',
      status: 'in_progress',
      format: 'single_elim',
      theme: 'Long or short, any sector',
      results_visible: false,
      config: config({
        deliverable_thesis: true,
        deliverable_due_at: iso(2, 23, 59),
        side_constraint: 'long_only',
      }),
      submittedKinds: ['thesis'],
      files: { thesis: 'SampleCouncil_NorthShore_Thesis.pdf' },
      slot: { room: 'Room B', starts_at: iso(16, 14, 30) },
      team: { team_name: 'Sample council', ticker: 'LLY', side: 'long' },
      members: team(['Amara', 'Elena', 'Jonas', 'Mikael']),
      result: null,
      is_demo: true,
    },
    {
      id: id('event', 2),
      slug: 'sample-maple-street-pitch-cup',
      name: 'Maple Street capital pitch cup',
      host: 'Northlake Student Fund',
      status: 'open',
      format: 'showcase',
      theme: 'Consumer and retail',
      results_visible: false,
      config: config({
        admission_mode: 'open_signup',
        registration_closes_at: iso(9),
        deliverable_deck: false,
        deliverable_thesis: true,
        deliverable_due_at: iso(4, 23, 59),
      }),
      submittedKinds: [],
      files: {},
      slot: null,
      team: { team_name: 'Sample council', ticker: 'COST', side: 'long' },
      members: team(['Tomas', 'Mikael', 'Elena']),
      result: null,
      is_demo: true,
    },
    {
      id: id('event', 3),
      slug: 'sample-cedar-point-equity-challenge',
      name: 'Cedar Point equity challenge',
      host: 'Lakeside Capital Group',
      status: 'in_progress',
      format: 'round_robin',
      theme: null,
      results_visible: false,
      config: config({ deliverable_due_at: iso(-3, 23, 59) }),
      submittedKinds: ['deck'],
      files: { deck: 'SampleCouncil_CedarPoint_Deck.pdf' },
      slot: { room: 'Room A', starts_at: iso(18, 10, 0) },
      team: { team_name: 'Sample council', ticker: 'JPM', side: 'long' },
      members: team(['Jonas', 'Tomas']),
      result: null,
      is_demo: true,
    },
  ];

  /* Two events from earlier this season, results revealed. */
  const past = [
    {
      n: 4,
      slug: 'sample-northgate-fall-stock-pitch',
      name: 'Northgate fall stock pitch',
      host: 'Granite Peak Investment Club',
      rank: 1,
      scores: [28, 26, 17, 16],
      names: ['Amara', 'Elena', 'Jonas'],
      ticker: 'MSFT',
      daysAgo: 38,
      feedback: [
        'Clear thesis and a well framed catalyst. The valuation section could be tighter.',
        'Excellent sector framing and team execution. Questions were handled with care.',
      ],
    },
    {
      n: 5,
      slug: 'sample-harbor-valley-pitch-day',
      name: 'Harbor valley pitch day',
      host: 'Riverbend Value Fund',
      rank: 3,
      scores: [24, 23, 16, 15],
      names: ['Mikael', 'Tomas'],
      ticker: 'NVO',
      daysAgo: 21,
      feedback: ['Strong downside case. The model assumptions needed more support.'],
    },
  ].map((p) => ({
    id: id('event', p.n),
    slug: p.slug,
    name: p.name,
    host: p.host,
    status: 'complete',
    format: 'showcase',
    theme: null,
    results_visible: true,
    config: config({
      registration_closes_at: iso(-p.daysAgo - 20),
      deliverable_due_at: iso(-p.daysAgo - 5),
    }),
    submittedKinds: ['deck'],
    files: { deck: `SampleCouncil_${p.ticker}_Deck.pdf` },
    slot: null,
    team: { team_name: 'Sample council', ticker: p.ticker, side: 'long' },
    members: team(p.names),
    result: {
      rank: p.rank,
      weighted_total: total(p.scores),
      judge_count: 3,
      breakdown: breakdown(p.scores),
      feedback: [...p.feedback].sort((a, b) => a.localeCompare(b)).map((comment) => ({ comment })),
    },
    awarded_at: iso(-p.daysAgo),
    is_demo: true,
  }));
  entered.push(...past);

  /* ── Events the council hosts ── */
  const hostTeams = [
    ['Harborview Capital Society', 'AAPL', [29, 28, 18, 17]],
    ['Northlake Student Fund', 'XOM', [26, 25, 18, 15]],
    ['Lakeside Capital Group', 'UNH', [25, 24, 17, 16]],
    ['Granite Peak Investment Club', 'V', [24, 25, 16, 15]],
    ['Westfield Equity Council', 'NEE', [23, 22, 17, 14]],
    ['Summit Hall Fund', 'PG', [22, 23, 15, 15]],
    ['Bayside Capital Council', 'AMZN', [21, 20, 16, 13]],
    ['Oakmont Growth Fund', 'TSLA', [20, 19, 14, 12]],
  ];
  const judges = ['Priya Raman', 'Marcus Holt', 'Leah Brennan', 'Omar Siddiq'].map((name, i) => ({
    id: id('judge', i + 1),
    full_name: name,
    firm: ['Crestline Partners', 'Alder Street Capital', 'Northpier Advisors', 'Kestrel Research'][
      i
    ],
    is_demo: true,
  }));
  const scoreboard = hostTeams
    .map(([name, ticker, s], i) => ({
      id: id('hteam', i + 1),
      team_name: name,
      ticker,
      judgeCount: 2,
      submittedCount: 2,
      mean: total(s),
      breakdown: breakdown(s),
      is_demo: true,
    }))
    .sort((a, b) => b.mean - a.mean);
  const liveRounds = [
    {
      id: id('round', 1),
      name: 'Round 1',
      rooms: [
        { id: id('room', 1), name: 'Room A', starts: [-5, 9, 0] },
        { id: id('room', 2), name: 'Room B', starts: [-5, 9, 0] },
      ].map((rm, ri) => ({
        id: rm.id,
        name: rm.name,
        live_status: 'done',
        teams: hostTeams.slice(ri * 4, ri * 4 + 4).map(([name, ticker], ti) => ({
          id: id('hteam', ri * 4 + ti + 1),
          team_name: name,
          ticker,
          starts_at: iso(-5, 9 + ti, ri * 15),
          presentation_status: 'complete',
        })),
      })),
    },
  ];

  const hosted = [
    {
      id: id('hosted', 1),
      slug: 'sample-council-investment-summit',
      name: 'Sample council investment summit',
      status: 'judging',
      format: 'single_elim',
      theme: 'Long-only, large cap',
      results_visible: false,
      starts_at: iso(-5),
      ends_at: iso(-5),
      counts: { rounds: 1, rooms: 2, teams: 8, teamsRegistered: 8, teamsSubmitted: 8, judges: 4 },
      rubricCount: RUBRIC.length,
      config: config({ registration_closes_at: iso(-12), max_teams: 8 }),
      rubric: RUBRIC,
      judges,
      scoreboard,
      live: liveRounds,
      requests: [],
      announcements: [
        {
          id: id('ann', 1),
          title: 'Scores are in. Results follow once judging closes.',
          created_at: iso(-4),
        },
      ],
      is_demo: true,
    },
    {
      id: id('hosted', 2),
      slug: 'sample-council-spring-pitch',
      name: 'Sample council spring pitch',
      status: 'draft',
      format: 'showcase',
      theme: 'Small and mid cap',
      results_visible: false,
      starts_at: null,
      ends_at: null,
      counts: { rounds: 2, rooms: 2, teams: 6, teamsRegistered: 0, teamsSubmitted: 0, judges: 3 },
      rubricCount: 0,
      config: config({
        admission_mode: 'request_approval',
        registration_opens_at: iso(20),
        registration_closes_at: iso(50),
      }),
      rubric: [],
      judges: judges.slice(0, 3),
      scoreboard: [],
      live: [],
      requests: [
        {
          id: id('req', 1),
          team_name: 'Riverbend Value Fund',
          contact_email: 'team@riverbend.sample.edu',
          application_thesis: 'Long a regional rail operator on pricing power.',
          created_at: iso(-1),
        },
        {
          id: id('req', 2),
          team_name: 'Cedar Ridge Finance Society',
          contact_email: 'fund@cedarridge.sample.edu',
          application_thesis: 'Short a specialty retailer on inventory build.',
          created_at: iso(-2),
        },
      ],
      announcements: [],
      is_demo: true,
    },
  ].map((h) => ({ ...h, readiness: readinessOf(h.counts, h.rubricCount) }));

  /* ── Open to join (other councils' open events) ── */
  const joinable = [
    ['Aurora partners showcase', 'Westfield Equity Council', 'application', -15, 12, 'showcase'],
    ['Lakeside equity forum', 'Lakeside Capital Group', 'open_signup', -5, 19, 'single_elim'],
    [
      'Pinecrest student investment cup',
      'Pinecrest Student Investors',
      'request_approval',
      0,
      24,
      'round_robin',
    ],
  ].map(([name, host, mode, opens, closes, format], i) => ({
    id: id('open', i + 1),
    slug: `sample-open-${i + 1}`,
    name,
    host,
    status: 'open',
    format,
    config: config({
      admission_mode: mode,
      registration_opens_at: iso(opens),
      registration_closes_at: iso(closes),
      side_constraint: i === 1 ? 'long_only' : 'either',
      deliverable_thesis: i !== 1,
    }),
    is_demo: true,
  }));

  /* ── Fund challenges ── */
  const fa = buildFundAnalyticsSample({ userId, memberId, role, displayName, now });
  const first = fa.standing;
  const snaps = desk.summary.snapshots;
  const entry2 = new Date(now - 30 * DAY).toISOString().slice(0, 10);
  const base2 = [...snaps].reverse().find((s) => s.date <= entry2) || snaps[0];
  const ret2 = (snaps[snaps.length - 1].value / base2.value - 1) * 100;
  const fundCompetitions = [
    {
      id: first.id,
      name: first.name,
      description: 'Councils ranked by fund return since entry.',
      status: 'active',
      starts_at: iso(-60),
      ends_at: first.ends_at,
      myEntry: { status: 'active', rank: first.rank, return_pct: first.return_pct },
      is_demo: true,
    },
    {
      id: id('competition', 2),
      name: 'Fall long/short challenge',
      description: 'Councils ranked by fund return since entry.',
      status: 'active',
      starts_at: iso(-30),
      ends_at: iso(25),
      myEntry: { status: 'active', rank: 2, return_pct: ret2 },
      is_demo: true,
    },
    {
      id: id('competition', 3),
      name: 'Winter value challenge',
      description: 'Councils ranked by fund return since entry.',
      status: 'active',
      starts_at: iso(-2),
      ends_at: iso(88),
      myEntry: null,
      is_demo: true,
    },
  ];
  const boards = {
    [first.id]: board(first.field, first.rank, first.return_pct, 0.37),
    [id('competition', 2)]: board(9, 2, ret2, 0.52),
  };

  /* ── Trophies this season, by the award rule ── */
  const badges = [];
  for (const e of past) {
    const key = badgeForRank(e.result.rank);
    const holders = new Set([...e.members.map((m) => m.id), ...pms.map((p) => p.id)]);
    for (const m of holders) {
      badges.push({ org_member_id: m, badge_key: key, awarded_at: e.awarded_at, is_demo: true });
    }
  }

  return {
    is_demo: true,
    viewer: { canManage, role },
    entered,
    hosted,
    joinable,
    fund: { competitions: fundCompetitions, boards, canEnter: canManage },
    badges,
  };
}

/**
 * Apply an action to the sample bundle on the page (never sent anywhere).
 * Returns { ok, bundle, error }.
 */
export function applySampleAction(bundle, action) {
  if (!bundle) return { ok: false, error: 'No sample content.' };
  const next = structuredClone(bundle);
  switch (action?.type) {
    case 'enter_fund': {
      const c = next.fund.competitions.find((x) => x.id === action.id);
      if (!c || c.status !== 'active' || c.myEntry)
        return { ok: false, error: 'This challenge is not open to enter.' };
      if (!next.viewer.canManage)
        return { ok: false, error: 'Executives and portfolio managers enter the council.' };
      c.myEntry = { status: 'active', rank: null, return_pct: null };
      return { ok: true, bundle: next };
    }
    case 'join': {
      const j = next.joinable.find((x) => x.id === action.id);
      if (!j) return { ok: false, error: 'This competition is not open to join.' };
      j.requested = true;
      return { ok: true, bundle: next };
    }
    case 'create': {
      const name = String(action.form?.name || '').trim();
      if (!name) return { ok: false, error: 'Give the competition a name.' };
      if (!next.viewer.canManage)
        return { ok: false, error: 'Executives and portfolio managers create competitions.' };
      const n = next.hosted.length + 1;
      const counts = { rounds: 0, rooms: 0, teams: 0, judges: 0 };
      next.hosted.unshift({
        id: id('hosted', 100 + n),
        slug: `sample-new-${n}`,
        name,
        status: 'draft',
        format: action.form.format || 'showcase',
        theme: action.form.theme || null,
        results_visible: false,
        starts_at: action.form.starts_at || null,
        ends_at: action.form.ends_at || null,
        counts,
        rubricCount: 0,
        readiness: readinessOf(counts, 0),
        config: null,
        rubric: [],
        judges: [],
        scoreboard: [],
        live: [],
        requests: [],
        announcements: [],
        is_demo: true,
        local: true,
      });
      return { ok: true, bundle: next };
    }
    case 'host': {
      const h = next.hosted.find((x) => x.slug === action.slug);
      if (!h) return { ok: false, error: 'Not found.' };
      if (action.patch) Object.assign(h, action.patch);
      if (action.declineRequest)
        h.requests = h.requests.filter((r) => r.id !== action.declineRequest);
      return { ok: true, bundle: next };
    }
    default:
      return { ok: false, error: 'Unknown action.' };
  }
}

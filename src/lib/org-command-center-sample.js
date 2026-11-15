/**
 * Sample content for the Command Center (Team Hub home).
 *
 * Served ONLY to master admin and demo accounts by
 * GET /api/org/team-hub/sample, so the page can be reviewed and presented
 * from a council with little activity. Real councils never receive it, and
 * the page labels it "Sample content" while it shows. Nothing here is read
 * from or written to the database: while it shows, a status change or a new
 * task stays on the page and is gone on reload.
 *
 * The bundle mirrors the live payloads exactly (summary, digest, tasks,
 * meetings, assignments, setup status, fund data health), so the page draws
 * it with the same code. Figures are not typed in twice: the fund total, the
 * return, alpha, every count and the chart's last point are derived from the
 * sector sleeves and rows below, so the sample obeys the real rules.
 *
 * Pure: no React, no fetch, no server imports. Every row carries is_demo.
 */

const DAY = 86400000;
const iso = (now, days) => new Date(now + days * DAY).toISOString();
const dayOf = (now, days) => iso(now, days).slice(0, 10);

const id = (prefix, n) => `sample-${prefix}-${String(n).padStart(3, '0')}`;

/* Sector sleeves: cost and value per team. Returns follow from these. */
const SLEEVES = [
  { n: 1, name: 'Financials', cost: 59943, value: 96210, tickers: ['JPM', 'SCHW', 'BAC'] },
  { n: 2, name: 'Healthcare', cost: 48826, value: 72360, tickers: ['LLY', 'UNH', 'MRK'] },
  { n: 3, name: 'Technology', cost: 38293, value: 51810, tickers: ['NVDA', 'MSFT', 'AAPL'] },
  { n: 4, name: 'Industrials', cost: 16543, value: 19670, tickers: ['CAT', 'GE', 'HON'] },
];
const BENCHMARK = { symbol: 'SPY', returnPct: 10.08 };

const PEOPLE = {
  tesfaye: { n: 1, name: 'Amara Tesfaye', role: 'analyst', team: 1 },
  bekele: { n: 2, name: 'Mikael Bekele', role: 'analyst', team: 2 },
  haile: { n: 3, name: 'Selam Haile', role: 'portfolio_manager', team: 3 },
  okoye: { n: 4, name: 'Chidi Okoye', role: 'portfolio_manager', team: 1 },
  lindqvist: { n: 5, name: 'Ingrid Lindqvist', role: 'portfolio_manager', team: 2 },
  park: { n: 6, name: 'Daniel Park', role: 'portfolio_manager', team: 4 },
  rossi: { n: 7, name: 'Elena Rossi', role: 'analyst', team: 3 },
};
const userOf = (key) => id('user', PEOPLE[key].n);
const teamOf = (n) => id('team', n);

/* Deterministic wobble so the sample chart is the same on every load. */
const wobble = (i) => Math.sin(i * 0.61) * 0.006 + Math.sin(i * 0.17) * 0.009;

function buildSnapshots(now, totalCost, totalValue) {
  const days = 137;
  const out = [];
  for (let i = 0; i <= days; i += 1) {
    const p = i / days;
    /* A fast early climb that levels off, like a fund that deployed its cash. */
    const curve = 1 - Math.exp(-p * 7);
    const drift = i === days ? 0 : wobble(i);
    const value = totalCost + (totalValue - totalCost) * (curve / (1 - Math.exp(-7))) * (1 + drift);
    const benchPct = BENCHMARK.returnPct * p * (1 + (i === days ? 0 : wobble(i + 40) * 6));
    out.push({
      date: dayOf(now, i - days),
      value: Math.round(value * 100) / 100,
      benchmarkValue: Math.round(totalCost * (1 + benchPct / 100) * 100) / 100,
    });
  }
  return out;
}

/**
 * @param {{ userId: string, role: string, displayName?: string, title?: string,
 *           teamId?: string|null, now?: number }} viewer the signed-in member
 */
export function buildCommandCenterSample({
  userId,
  role,
  displayName,
  title,
  teamId = null,
  now = Date.now(),
}) {
  const canManage = role === 'executive' || role === 'portfolio_manager';
  const me = userId;
  const myTeam = teamId || teamOf(3);

  const totalCost = SLEEVES.reduce((s, x) => s + x.cost, 0);
  const totalValue = SLEEVES.reduce((s, x) => s + x.value, 0);
  const returnPct = (totalValue / totalCost - 1) * 100;

  const sectors = SLEEVES.map((s) => ({
    teamId: teamOf(s.n),
    name: s.name,
    value: s.value,
    roiPct: (s.value / s.cost - 1) * 100,
    tickers: s.tickers,
    is_demo: true,
  })).sort((a, b) => b.roiPct - a.roiPct);

  /* ── Tasks ── */
  const task = (n, o) => ({
    id: id('task', n),
    org_id: 'sample',
    team_id: o.team ? teamOf(o.team) : null,
    assigned_to: o.to,
    assigned_by: o.by || userOf('okoye'),
    title: o.title,
    description: o.description || null,
    due_date: o.due == null ? null : iso(now, o.due),
    status: o.status || 'pending',
    priority: o.priority || 'medium',
    created_at: iso(now, -12),
    updated_at: iso(now, o.updated ?? -1),
    assignee_name: o.name,
    assigner_name: o.byName || PEOPLE.okoye.name,
    mine: o.to === me,
    overdue: o.due != null && o.due < 0 && o.status !== 'completed',
    is_demo: true,
  });
  const P = PEOPLE;
  const tasks = [
    task(1, {
      to: userOf('tesfaye'),
      name: P.tesfaye.name,
      team: 1,
      title: 'Update sector coverage',
      description: 'Refresh the financials coverage list after the bank earnings round.',
      due: -5,
      priority: 'urgent',
    }),
    task(2, {
      to: me,
      name: displayName || 'You',
      team: null,
      title: 'Approve the healthcare pitch for committee',
      description: 'Read the model and sign off before the council meeting.',
      due: 1,
      priority: 'high',
      by: me,
      byName: displayName || 'You',
    }),
    task(3, {
      to: userOf('rossi'),
      name: P.rossi.name,
      team: 3,
      title: 'Update pitch tracking',
      description: 'Log committee votes against each open pitch.',
      due: 5,
    }),
    task(4, {
      to: userOf('haile'),
      name: P.haile.name,
      team: 3,
      title: 'Rebalance the technology sleeve',
      description: 'Trim the largest position back inside the policy limit.',
      due: 3,
      status: 'in_progress',
      priority: 'high',
    }),
    task(5, {
      to: me,
      name: displayName || 'You',
      team: null,
      title: 'Draft the semester report outline',
      due: 9,
      status: 'in_progress',
      by: me,
      byName: displayName || 'You',
    }),
    task(6, {
      to: userOf('bekele'),
      name: P.bekele.name,
      team: 2,
      title: 'Healthcare comparables table',
      description: 'Peer multiples for the three largest holdings.',
      due: 6,
      status: 'review',
    }),
    task(7, {
      to: userOf('park'),
      name: P.park.name,
      team: 4,
      title: 'Record benchmark choice in the policy file',
      due: 12,
      priority: 'low',
    }),
    task(8, {
      to: userOf('lindqvist'),
      name: P.lindqvist.name,
      team: 2,
      title: 'Schedule analyst onboarding',
      due: 15,
      priority: 'low',
    }),
    task(9, {
      to: userOf('okoye'),
      name: P.okoye.name,
      team: 1,
      title: 'Close out the October trade log',
      due: -9,
      status: 'completed',
      updated: -8,
    }),
    task(10, {
      to: me,
      name: displayName || 'You',
      team: null,
      title: 'Confirm faculty advisor sign-off',
      due: -3,
      status: 'completed',
      updated: -4,
      by: me,
      byName: displayName || 'You',
    }),
  ];

  /* ── Meetings ── */
  const meeting = (n, o) => ({
    id: id('meeting', n),
    title: o.title,
    category: o.category || 'general',
    status: 'scheduled',
    scheduled_at: iso(now, o.in),
    ended_at: null,
    location: null,
    team_id: o.team ? teamOf(o.team) : null,
    created_at: iso(now, -6),
    is_demo: true,
  });
  const meetings = [
    meeting(1, { title: 'Weekly executive sync', in: 2 }),
    meeting(2, { title: 'Council meeting', in: 4 }),
    meeting(3, { title: 'Technology team review', in: 11, team: 3 }),
  ];

  /* ── Assignments ── */
  const assignment = (n, o) => ({
    id: id('assignment', n),
    title: o.title,
    status: o.status || 'assigned',
    type: 'research',
    assignment_type: 'research',
    due_date: o.due == null ? null : iso(now, o.due),
    team_id: o.team ? teamOf(o.team) : null,
    assigned_to: o.to,
    assignee_name: o.name,
    archived: false,
    overdue: o.due != null && o.due < 0,
    mine: o.to === me,
    is_demo: true,
  });
  const assignments = [
    assignment(1, {
      to: userOf('bekele'),
      name: P.bekele.name,
      team: 2,
      title: 'Healthcare sector note',
      due: 3,
    }),
    assignment(2, {
      to: me,
      name: displayName || 'You',
      team: null,
      title: 'Policy statement review',
      due: 6,
    }),
    assignment(3, {
      to: userOf('rossi'),
      name: P.rossi.name,
      team: 3,
      title: 'Coverage refresh',
      due: 20,
    }),
    assignment(4, {
      to: userOf('tesfaye'),
      name: P.tesfaye.name,
      team: 1,
      title: 'Bank earnings recap',
      due: 8,
      status: 'submitted',
    }),
  ];
  const awaitingReview = assignments.filter((a) =>
    ['submitted', 'under_review'].includes(a.status),
  ).length;

  /* ── Roster counts ── */
  const counts = { executives: 3, pms: 4, analysts: 17 };
  const members = counts.executives + counts.pms + counts.analysts;
  const pmPeople = ['okoye', 'lindqvist', 'haile', 'park'].map((k) => ({
    name: P[k].name,
    role: 'portfolio_manager',
  }));
  const oversee =
    role === 'executive'
      ? pmPeople
      : role === 'portfolio_manager'
        ? [
            { name: P.rossi.name, role: 'analyst' },
            { name: 'Jonas Weber', role: 'analyst' },
            { name: 'Priya Raman', role: 'analyst' },
            { name: 'Tomas Alvarez', role: 'analyst' },
          ]
        : [
            { name: P.rossi.name, role: 'analyst' },
            { name: P.haile.name, role: 'portfolio_manager' },
            { name: 'Jonas Weber', role: 'analyst' },
          ];

  const openViolations = 2;
  const summary = {
    org: { name: 'Sample council' },
    viewer: { userId: me, role, displayName, title: title || null },
    performance: {
      total_value: totalValue,
      total_cost: totalCost,
      return_pct: returnPct,
      benchmark_return_pct: BENCHMARK.returnPct,
      benchmark_symbol: BENCHMARK.symbol,
      benchmark_source: 'index',
      alpha_pct: returnPct - BENCHMARK.returnPct,
    },
    counts: {
      members,
      teams: SLEEVES.length,
      openTasks: tasks.filter((t) => t.status !== 'completed').length,
    },
    statStrip: {
      cohort: `${new Date(now).getUTCFullYear()} analyst class`,
      myAssignments: assignments.filter((a) => a.mine && a.status === 'assigned').length,
      openViolations,
    },
    sectors,
    snapshots: buildSnapshots(now, totalCost, totalValue),
    organization: {
      you: { name: displayName, title: title || null, role },
      oversee,
      pmCount: counts.pms,
      analystCount: counts.analysts,
    },
    is_demo: true,
  };

  const digest = {
    since: iso(now, -7),
    newPitches: [],
    votes: [],
    positions: [],
    notes: [],
    recognitions: [],
    movers: [
      { ticker: 'NVDA', company_name: 'NVIDIA Corporation', alpha_pct: 12.48, return_pct: 21.9 },
      { ticker: 'LLY', company_name: 'Eli Lilly and Company', alpha_pct: 8.11, return_pct: 15.4 },
      { ticker: 'CAT', company_name: 'Caterpillar Inc.', alpha_pct: -3.26, return_pct: 4.2 },
    ],
    counts: { pitches: 3, votes: 12, positions: 2, notes: 6, recognitions: 1 },
    is_demo: true,
  };

  const setupSteps = [
    ['positions', 'Add or import positions', 12, true, '/org-trading', true],
    ['teams', 'Create sector teams', SLEEVES.length, true, '/settings', true],
    ['members', 'Invite members', members, true, '/settings', false],
    ['coverage', 'Assign sector coverage', 0, false, '/org-team-hub/org-chart', false],
    ['ips', 'Set IPS rules', 0, false, '/org-team-hub/compliance', true],
  ].map(([key, label, count, done, href, managerOnly]) => ({
    key,
    label,
    count,
    done,
    href,
    manager_only: managerOnly,
  }));
  const doneCount = setupSteps.filter((s) => s.done).length;

  return {
    summary,
    digest,
    tasks: {
      tasks,
      openCount: tasks.filter((t) => t.status !== 'completed').length,
      overdueCount: tasks.filter((t) => t.overdue).length,
      viewer: {
        userId: me,
        canManage,
        statuses: ['pending', 'in_progress', 'review', 'completed'],
        priorities: ['low', 'medium', 'high', 'urgent'],
      },
      is_demo: true,
    },
    meetings: { meetings, is_demo: true },
    assignments: {
      assignments,
      metrics: { awaiting_review: awaitingReview },
      is_demo: true,
    },
    setup: {
      steps: setupSteps,
      complete: false,
      done_count: doneCount,
      is_demo: true,
    },
    health: {
      positions: { total: 12, priced: 12, unpriced: 0, missing_sector: 0, missing_team: 0 },
      pricing: { last_priced_at: iso(now, -0.75), stale_hours: 18 },
      snapshot: { last_date: dayOf(now, 0), days_since: 0, count_30d: 30 },
      benchmark: { symbol: BENCHMARK.symbol, source: 'index' },
      brokerage: null,
      status: 'ok',
      is_demo: true,
    },
    /* The members a sample task can be given to (the New task dialog). */
    roster: [
      { user_id: me, display_name: displayName || 'You', team_id: myTeam },
      ...Object.values(P).map((p) => ({
        user_id: id('user', p.n),
        display_name: p.name,
        team_id: teamOf(p.team),
      })),
    ],
  };
}

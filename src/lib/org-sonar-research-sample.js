/**
 * Sample content for Sonar Research (/org-team-hub/sonar).
 *
 * Served ONLY to master admin and demo accounts by
 * GET /api/org/sonar-reports/sample, so the page can be reviewed and
 * presented from a council with little research. Real councils never receive
 * it, and the page labels it "Sample content" while it shows. Nothing here is
 * read from or written to the database: while it shows, a status change, a
 * comment or a budget change stays on the page and is gone on reload.
 *
 * The same sample council as the other Team Hub pages (members and sector
 * teams from the Trading Desk sample, pitches from org-sample-pitches.js).
 * The bundle mirrors the live payloads, and it is shaped by the real rules:
 * which reports a viewer may read (canReadReport), status moves
 * (canTransition), analytics (computeAnalytics, ownView) and the budget
 * (usageSummary, monthlyHistory). Reports describe a saved run in neutral,
 * descriptive words only; they carry no figures and no advice.
 *
 * Pure: no React, no fetch, no server imports. Every row carries is_demo.
 */
import { buildTradingDeskSample } from './org-trading-desk-sample.js';
import { SAMPLE_PITCHES } from './org-sample-pitches.js';
import {
  REPORT_VISIBILITY,
  anchorsOf,
  canReadReport,
  canTransition,
  isManager,
} from './org-sonar/reports.js';
import { computeAnalytics, ownView } from './org-sonar/analytics.js';
import { DEEP_PREFIX, monthlyHistory, usageSummary } from './org-sonar/budget.js';
import { rightsFor } from './org-sonar-research-model.js';

const DAY = 86400000;
const id = (prefix, n) => `sample-${prefix}-${String(n).padStart(3, '0')}`;
const userOf = (n) => id('user', n);
const teamOf = (n) => id('team', n);

/* The sample council's people by key (numbers as the Trading Desk sample assigns them). */
const PEOPLE = {
  tesfaye: 1,
  bekele: 2,
  haile: 3,
  okoye: 4,
  lindqvist: 5,
  park: 6,
  rossi: 7,
  weber: 8,
  alvarez: 9,
};
const TEAM_OF = { tesfaye: 1, bekele: 2, haile: 3, okoye: 1, lindqvist: 2, park: 4, rossi: 3 };
TEAM_OF.weber = 4;
TEAM_OF.alvarez = 2;
const SECTOR_OF_TEAM = { 1: 'Financials', 2: 'Healthcare', 3: 'Technology', 4: 'Industrials' };

const PITCH_ID = Object.fromEntries(SAMPLE_PITCHES.map(([t], i) => [t, id('pitch', i + 1)]));
const COMPANY = Object.fromEntries(SAMPLE_PITCHES.map(([t, c]) => [t, c]));

/*
 * The reports. Days are days ago. `by` and `rev` are people keys ('me' is the
 * viewer). `fit` is the stored mandate fit of a fund fit run.
 */
const REPORTS = [
  {
    n: 1,
    kind: 'fund_fit',
    ticker: 'AVGO',
    by: 'rossi',
    status: 'under_review',
    vis: 'org',
    versions: 2,
    pitch: true,
    claims: [22, 24],
    fit: 'partial',
    created: 19,
    submitted: 2,
    updated: 2,
    conclusion:
      'The saved run reviews the company against the fund mandate. Most checks pass; the single-name weight limit and customer concentration are listed for the committee to review.',
    findings: [
      ['Revenue mix', 'The run describes how revenue splits between semiconductors and software.'],
      ['Customer concentration', 'The run lists the largest customers named in the filings.'],
      ['Mandate checks', 'The run marks the position size check as one to review.'],
    ],
  },
  {
    n: 2,
    kind: 'fund_fit',
    ticker: 'TMO',
    by: 'bekele',
    status: 'under_review',
    vis: 'executives',
    versions: 1,
    pitch: true,
    claims: [18, 20],
    fit: 'fits',
    created: 9,
    submitted: 3,
    updated: 3,
    conclusion:
      'The saved run checks the company against the mandate and the policy statement. Every check the run could test passes; two sources were not available for the most recent quarter.',
    findings: [
      ['Segment trends', 'The run describes the direction of each reporting segment.'],
      ['Policy checks', 'The run lists each policy check and the record behind it.'],
      ['Data gaps', 'The run names the sources it could not read for the latest quarter.'],
    ],
  },
  {
    n: 3,
    kind: 'research',
    ticker: 'ETN',
    title: 'How exposed is Eaton to data center electrical demand?',
    by: 'weber',
    status: 'under_review',
    vis: 'org',
    versions: 1,
    pitch: true,
    claims: [16, 19],
    created: 6,
    submitted: 4,
    updated: 4,
    conclusion:
      'The saved run describes where data center demand appears in the company filings and which segments report it. It notes that the filings do not break the figure out on its own.',
    findings: [
      ['Segment reporting', 'The run describes which segments mention data center orders.'],
      ['Order backlog', 'The run describes how the backlog is reported over recent quarters.'],
      ['Limits', 'The run notes the filings do not separate data center revenue.'],
    ],
  },
  {
    n: 4,
    kind: 'fund_fit',
    ticker: 'AXP',
    by: 'me',
    status: 'draft',
    vis: 'team',
    versions: 1,
    pitch: true,
    rev: 'okoye',
    note: 'Add the card loss trend from the latest filings and cite it, then save a new version.',
    claims: [14, 18],
    fit: 'fits',
    created: 12,
    submitted: 8,
    reviewed: 5,
    updated: 5,
  },
  {
    n: 5,
    kind: 'research',
    ticker: 'LIN',
    title: 'What drives Linde pricing in industrial gases?',
    by: 'weber',
    status: 'draft',
    vis: 'org',
    versions: 1,
    pitch: true,
    rev: 'park',
    note: 'The conclusion needs the sources for the contract terms.',
    claims: [11, 15],
    created: 15,
    submitted: 11,
    reviewed: 7,
    updated: 7,
  },
  {
    n: 6,
    kind: 'fund_fit',
    ticker: 'ABT',
    by: 'alvarez',
    status: 'draft',
    vis: 'private',
    versions: 1,
    pitch: true,
    claims: [12, 14],
    fit: 'fits',
    created: 3,
    updated: 3,
  },
  {
    n: 7,
    kind: 'fund_fit',
    ticker: 'NVDA',
    by: 'rossi',
    status: 'approved',
    vis: 'org',
    versions: 3,
    approvedVersion: 3,
    pitch: true,
    rev: 'haile',
    note: 'Well sourced. Approved for the committee reading list.',
    claims: [30, 30],
    fit: 'fits',
    created: 64,
    submitted: 24,
    reviewed: 21,
    approved: 21,
    updated: 21,
    conclusion:
      'The saved run reviews the company against the fund mandate and the policy statement. Every check passes, and the run lists the export rules and supply limits as items to monitor.',
    findings: [
      ['Data center demand', 'The run describes how the filings report data center revenue.'],
      ['Export rules', 'The run lists the export rules that apply to its products.'],
      ['Supply', 'The run describes the supply commitments named in the filings.'],
    ],
  },
  {
    n: 8,
    kind: 'fund_fit',
    ticker: 'JPM',
    by: 'tesfaye',
    status: 'approved',
    vis: 'org',
    versions: 1,
    approvedVersion: 1,
    pitch: true,
    rev: 'okoye',
    claims: [26, 28],
    fit: 'fits',
    created: 170,
    submitted: 156,
    reviewed: 151,
    approved: 151,
    updated: 151,
  },
  {
    n: 9,
    kind: 'fund_fit',
    ticker: 'LLY',
    by: 'bekele',
    status: 'approved',
    vis: 'org',
    versions: 2,
    approvedVersion: 2,
    pitch: true,
    rev: 'lindqvist',
    claims: [24, 25],
    fit: 'fits',
    created: 110,
    submitted: 66,
    reviewed: 62,
    approved: 62,
    updated: 62,
  },
  {
    n: 10,
    kind: 'research',
    ticker: 'UNH',
    title: 'What are the main risks to UnitedHealth medical cost trend?',
    by: 'alvarez',
    status: 'approved',
    vis: 'org',
    versions: 1,
    approvedVersion: 1,
    pitch: true,
    rev: 'lindqvist',
    claims: [19, 23],
    created: 190,
    submitted: 176,
    reviewed: 171,
    approved: 171,
    updated: 171,
  },
  {
    n: 11,
    kind: 'fund_fit',
    ticker: 'CAT',
    by: 'weber',
    status: 'approved',
    vis: 'team',
    versions: 1,
    approvedVersion: 1,
    pitch: true,
    rev: 'park',
    claims: [21, 24],
    fit: 'partial',
    created: 150,
    submitted: 140,
    reviewed: 136,
    approved: 136,
    updated: 136,
  },
  {
    n: 12,
    kind: 'fund_fit',
    ticker: 'MSFT',
    by: 'rossi',
    status: 'superseded',
    vis: 'org',
    versions: 1,
    approvedVersion: 1,
    pitch: true,
    rev: 'haile',
    claims: [27, 29],
    fit: 'fits',
    created: 120,
    submitted: 100,
    reviewed: 96,
    approved: 96,
    updated: 30,
  },
  {
    n: 13,
    kind: 'challenge',
    ticker: 'NVDA',
    title: 'Challenge: NVIDIA fund fit',
    by: 'bekele',
    status: 'draft',
    vis: 'org',
    versions: 1,
    challengeOf: 7,
    verdict: 'holds',
    claims: [17, 18],
    created: 10,
    updated: 10,
    conclusion:
      'The challenge researched the same question again. The records it read support the original conclusion; it adds one supply item to monitor.',
  },
  {
    n: 14,
    kind: 'challenge',
    ticker: 'UNH',
    title: 'Challenge: UnitedHealth medical cost trend',
    by: 'lindqvist',
    status: 'under_review',
    vis: 'org',
    versions: 1,
    challengeOf: 10,
    verdict: 'weakened',
    claims: [15, 19],
    created: 13,
    submitted: 6,
    updated: 6,
    conclusion:
      'The challenge read newer filings. They describe a cost trend that differs from the one in the original run, so the original conclusion is weaker on that point.',
  },
  {
    n: 15,
    kind: 'fund_fit',
    ticker: 'GS',
    by: 'me',
    status: 'draft',
    vis: 'private',
    versions: 1,
    pitch: true,
    claims: [13, 16],
    fit: 'partial',
    created: 1,
    updated: 1,
  },
  {
    n: 16,
    kind: 'research',
    ticker: 'V',
    title: 'How do Visa cross-border volumes compare with domestic volumes?',
    by: 'tesfaye',
    status: 'approved',
    vis: 'org',
    versions: 1,
    approvedVersion: 1,
    pitch: true,
    rev: 'okoye',
    claims: [20, 21],
    created: 50,
    submitted: 44,
    reviewed: 41,
    approved: 41,
    updated: 41,
  },
  {
    n: 17,
    kind: 'fund_fit',
    ticker: 'MRK',
    by: 'bekele',
    status: 'approved',
    vis: 'org',
    versions: 1,
    approvedVersion: 1,
    pitch: true,
    rev: 'lindqvist',
    claims: [22, 26],
    fit: 'partial',
    created: 140,
    submitted: 131,
    reviewed: 127,
    approved: 127,
    updated: 127,
  },
  {
    n: 18,
    kind: 'fund_fit',
    ticker: 'ORCL',
    by: 'me',
    status: 'under_review',
    vis: 'org',
    versions: 1,
    pitch: true,
    claims: [19, 22],
    fit: 'partial',
    created: 8,
    submitted: 2,
    updated: 2,
  },
];

/* Deep research runs per person per month ago (0 is this month), oldest month first. */
const RUNS = {
  rossi: [3, 4, 3, 5, 6, 4],
  bekele: [2, 3, 3, 2, 4, 3],
  tesfaye: [3, 2, 4, 3, 2, 2],
  weber: [1, 2, 2, 3, 3, 3],
  alvarez: [1, 1, 2, 1, 2, 1],
  haile: [1, 1, 0, 1, 1, 0],
  okoye: [0, 1, 1, 0, 1, 1],
  lindqvist: [1, 0, 1, 1, 1, 1],
  park: [0, 1, 0, 1, 0, 0],
  me: [1, 2, 1, 2, 2, 3],
};

const COMMENTS = {
  1: [
    [
      'c1',
      'haile',
      'report',
      2,
      1.6,
      'Is the position size check against the current book or the target weight?',
      false,
      null,
    ],
    [
      'c2',
      'rossi',
      'report',
      2,
      1.4,
      'The current book. The run names the record it used.',
      false,
      'c1',
    ],
    ['c3', 'okoye', 'f1', 1, 9, 'Please add the software segment to the revenue mix.', true, null],
  ],
  7: [
    [
      'c4',
      'okoye',
      'conclusion',
      3,
      22,
      'The supply items read clearly. Ready for the committee list.',
      true,
      null,
    ],
    [
      'c5',
      'bekele',
      'f2',
      3,
      12,
      'A challenge on the export rules is saved beside this report.',
      false,
      null,
    ],
  ],
  4: [
    ['c6', 'okoye', 'f1', 1, 5, 'The card loss trend is missing from the findings.', false, null],
  ],
};

function conclusionFor(r) {
  if (r.conclusion) return r.conclusion;
  const company = COMPANY[r.ticker] || r.ticker;
  if (r.kind === 'fund_fit')
    return `The saved run checks ${company} against the fund mandate and the policy statement, and lists the records behind each check for the committee.`;
  return `The saved run describes what the records say about the question and lists the sources it read for ${company}.`;
}

function findingsFor(r) {
  if (r.findings) return r.findings;
  if (r.kind === 'fund_fit')
    return [
      ['Business overview', 'The run describes the business and its reporting segments.'],
      ['Mandate checks', 'The run lists each mandate check and the record behind it.'],
      ['Items to monitor', 'The run lists the items the committee may want to follow.'],
    ];
  return [
    ['What the records show', 'The run describes the records that answer the question.'],
    ['Sources', 'The run lists the filings and datasets it read.'],
  ];
}

function snapshotFor(r) {
  const report = {
    executiveConclusion: { text: conclusionFor(r) },
    keyFindings: findingsFor(r).map(([title, text], i) => ({ id: `f${i + 1}`, title, text })),
    confidence: 'medium',
  };
  if (r.fit) report.thesisFit = { fit: r.fit };
  if (r.verdict) report.challenge = { verdict: r.verdict };
  return {
    v: 1,
    sample: true,
    report,
    run: {
      researchQuestion: r.question,
      methodology: { plan: { tasks: [], excluded: [] }, evidence: { retrieved: 0, selected: 0 } },
      followOnResearch: [],
      evidence: [],
      limitations: ['Sample content: a shortened answer written for the preview, with no figures.'],
    },
  };
}

/**
 * @param {{ userId: string, memberId?: string, role: string, displayName?: string,
 *   subRole?: string, now?: number }} viewer the signed-in member
 */
export function buildSonarResearchSample({
  userId,
  memberId,
  role,
  displayName,
  subRole,
  now = Date.now(),
}) {
  const desk = buildTradingDeskSample({ userId, memberId, role, displayName, subRole, now });
  const at = (days) => (days == null ? null : new Date(now - days * DAY).toISOString());
  const uid = (key) => (key === 'me' ? userId : userOf(PEOPLE[key]));
  const viewerTeam = desk.viewer.teamId;
  const teamOfKey = (key) => (key === 'me' ? viewerTeam : teamOf(TEAM_OF[key]));
  const nameOf = new Map(desk.roster.members.map((m) => [m.user_id, m.display_name]));
  const roleOf = new Map(desk.roster.members.map((m) => [m.user_id, m.role]));

  const reports = REPORTS.map((r) => {
    const company = COMPANY[r.ticker] || r.ticker;
    const title =
      r.title || (r.kind === 'fund_fit' ? `Fund fit: ${company}` : `Research: ${company}`);
    const question =
      r.kind === 'fund_fit' ? `Should our fund invest in ${company}?` : r.title || title;
    const full = { ...r, question };
    const team = teamOfKey(r.by);
    const teamN = team ? Number(team.slice(-3)) : null;
    const [kept, claims] = r.claims;
    const summary = {
      question,
      ticker: r.ticker,
      subjectLabel: company,
      format: 'report',
      memoKind: r.kind === 'fund_fit' ? 'fund_fit' : null,
      conclusion: conclusionFor(full),
      confidence: 'medium',
      stance: null,
      thesisFit: r.fit || null,
      challengeVerdict: r.verdict || null,
      stats: {
        claims,
        kept,
        claimSupportRate: claims ? kept / claims : null,
        citationCoverage: claims ? Math.min(1, (kept + 1) / claims) : null,
        evidence: claims + 6,
        sources: Math.max(4, Math.round(claims / 3)),
      },
    };
    return {
      id: id('sonar', r.n),
      org_id: 'sample',
      author_id: uid(r.by),
      author_member_id: null,
      team_id: team,
      kind: r.kind,
      title,
      question,
      ticker: r.ticker,
      sector: teamN ? SECTOR_OF_TEAM[teamN] : null,
      visibility: r.vis,
      shared_with: [],
      status: r.status,
      current_version: r.versions,
      approved_version: r.approvedVersion || null,
      summary,
      pitch_id: r.pitch ? PITCH_ID[r.ticker] || null : null,
      challenge_of: r.challengeOf ? id('sonar', r.challengeOf) : null,
      submitted_at: at(r.submitted),
      reviewed_by: r.rev ? uid(r.rev) : null,
      reviewed_at: at(r.reviewed),
      review_note: r.note || null,
      approved_at: at(r.approved),
      created_at: at(r.created),
      updated_at: at(r.updated),
      author_name: nameOf.get(uid(r.by)) || displayName || 'You',
      author_role: r.by === 'me' ? role : roleOf.get(uid(r.by)) || null,
      reviewer_name: r.rev ? nameOf.get(uid(r.rev)) || 'Member' : null,
      is_demo: true,
      _snap: snapshotFor(full),
      _vdays: Array.from({ length: r.versions }, (_, i) =>
        Math.round(r.created - ((r.created - r.updated) * i) / Math.max(1, r.versions - 1)),
      ),
    };
  });

  const comments = [];
  for (const [n, list] of Object.entries(COMMENTS)) {
    for (const [cid, by, anchor, version, days, body, resolved, parent] of list) {
      comments.push({
        id: `sample-comment-${cid}`,
        report_id: id('sonar', Number(n)),
        author_id: uid(by),
        author_name: nameOf.get(uid(by)) || 'Member',
        version,
        anchor,
        body,
        parent_id: parent ? `sample-comment-${parent}` : null,
        resolved,
        resolved_by: resolved ? uid('okoye') : null,
        resolved_at: resolved ? at(days - 0.5) : null,
        created_at: at(days),
        is_demo: true,
      });
    }
  }

  /* Deep runs: one ledger row and one run row per run, spread across each month. */
  const ledger = [];
  const runs = [];
  const nowD = new Date(now);
  for (const [key, months] of Object.entries(RUNS)) {
    months.forEach((count, i) => {
      const monthsAgo = months.length - 1 - i;
      for (let k = 0; k < count; k += 1) {
        const start = Date.UTC(nowD.getUTCFullYear(), nowD.getUTCMonth() - monthsAgo, 1);
        const span = monthsAgo === 0 ? Math.max(1, now - start) : 27 * DAY;
        const t = new Date(start + ((k + 1) / (count + 1)) * span).toISOString();
        ledger.push({ user_id: uid(key), version: `${DEEP_PREFIX}sample`, created_at: t });
        runs.push({ user_id: uid(key), depth: 'deep', status: 'complete', created_at: t });
      }
    });
  }

  const members = desk.roster.members.map((m) => ({
    user_id: m.user_id,
    display_name: m.display_name,
    role: m.role,
    team_id: m.team_id,
    is_active: true,
  }));
  const pitches = SAMPLE_PITCHES.map(([ticker, company], i) => ({
    id: id('pitch', i + 1),
    ticker,
    company_name: company,
    stage: i < 12 ? 'in_portfolio' : 'deep_dive',
    sector: null,
    is_demo: true,
  }));
  const allocations = [
    { user_id: uid('rossi'), monthly_deep_runs: 12 },
    { user_id: uid('alvarez'), monthly_deep_runs: 6 },
    ...(role === 'analyst' ? [{ user_id: userId, monthly_deep_runs: 8 }] : []),
  ];

  return {
    is_demo: true,
    raw: {
      now,
      viewer: {
        userId,
        role,
        teamId: viewerTeam,
        canApprove: role === 'executive' || role === 'portfolio_manager',
      },
      reports,
      comments,
      ledger,
      runs,
      members,
      teams: desk.roster.teams,
      pitches,
      pool: 100,
      allocations,
      collections: [
        {
          id: 'sample-col-001',
          name: 'Committee reading',
          owner_id: userId,
          report_ids: [id('sonar', 7)],
        },
        { id: 'sample-col-002', name: 'Semiconductors', owner_id: userId, report_ids: [] },
      ],
    },
  };
}

/* ── Views of the bundle, in the live routes' shapes ────────────────────────── */

const viewerRow = (v) => ({
  user_id: v.userId,
  org_id: 'sample',
  role: v.role,
  team_id: v.teamId,
  is_active: true,
});
const visible = (raw) => raw.reports.filter((r) => canReadReport(r, viewerRow(raw.viewer)));
const strip = ({ _snap, _vdays, ...r }) => r;

/** GET /api/org/sonar-reports, newest first, as the viewer may read them. */
export function sampleReports(raw) {
  return {
    reports: visible(raw)
      .map(strip)
      .sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at))),
    viewer: {
      userId: raw.viewer.userId,
      role: raw.viewer.role,
      teamId: raw.viewer.teamId,
      canApprove: raw.viewer.canApprove,
    },
    is_demo: true,
  };
}

/** GET /api/org/sonar-reports/:id?v= for one sample report, or null. */
export function sampleDetail(raw, reportId, v = null) {
  const r = visible(raw).find((x) => x.id === reportId);
  if (!r) return null;
  const version = Number.isInteger(v) && v > 0 && v <= r.current_version ? v : r.current_version;
  const snapshot = r._snap;
  const manager = isManager(viewerRow(raw.viewer));
  const original = r.challenge_of ? raw.reports.find((x) => x.id === r.challenge_of) : null;
  const pitch = r.pitch_id ? raw.pitches.find((p) => p.id === r.pitch_id) : null;
  return {
    report: strip(r),
    versions: r._vdays
      .map((d, i) => ({
        version: i + 1,
        run_id: null,
        summary: r.summary,
        created_by: r.author_id,
        created_at: new Date(raw.now - d * DAY).toISOString(),
      }))
      .reverse(),
    version,
    snapshot,
    anchors: anchorsOf(snapshot),
    challenges: raw.reports.filter((x) => x.challenge_of === r.id).map(strip),
    original: original ? strip(original) : null,
    pitch: pitch ? { id: pitch.id, ticker: pitch.ticker, company_name: pitch.company_name } : null,
    collections: raw.collections
      .filter((c) => c.report_ids.includes(r.id))
      .map((c) => ({ id: c.id, name: c.name })),
    myCollections: raw.collections
      .filter((c) => c.owner_id === raw.viewer.userId || manager)
      .map((c) => ({ id: c.id, name: c.name, has: c.report_ids.includes(r.id) })),
    rights: rightsFor(r, raw.viewer),
    viewer: { userId: raw.viewer.userId, role: raw.viewer.role, canApprove: raw.viewer.canApprove },
    is_demo: true,
  };
}

export function sampleComments(raw, reportId) {
  return {
    comments: raw.comments.filter((c) => c.report_id === reportId),
    viewer: { userId: raw.viewer.userId },
  };
}

/** GET /api/org/sonar-budget */
export function sampleBudget(raw) {
  const nowD = new Date(raw.now);
  const summary = usageSummary({
    pool: raw.pool,
    rows: raw.ledger,
    allocations: raw.allocations,
    members: raw.members,
    now: nowD,
  });
  const exec = raw.viewer.role === 'executive';
  const me = summary.members.find((m) => m.userId === raw.viewer.userId) || {
    userId: raw.viewer.userId,
    deepRuns: 0,
    allocation: null,
    left: null,
  };
  return {
    pool: raw.pool,
    isDefault: false,
    maxPool: 500,
    used: summary.used,
    remaining: summary.remaining,
    resetsOn: summary.resetsOn,
    history: monthlyHistory(raw.ledger, { now: nowD }),
    me,
    members: exec ? summary.members : null,
    viewer: { canManage: exec },
    is_demo: true,
  };
}

/** GET /api/org/sonar-analytics?days= */
export function sampleAnalytics(raw, days = '90') {
  const d = days === 'all' ? null : Number(days) || 90;
  const result = computeAnalytics({
    members: raw.members,
    reports: raw.reports,
    comments: raw.comments,
    runs: raw.runs,
    pitches: raw.pitches,
    days: d,
    now: new Date(raw.now),
  });
  const manager = isManager(viewerRow(raw.viewer));
  return {
    ...(manager ? result : ownView(result, raw.viewer.userId)),
    viewer: { userId: raw.viewer.userId, seesEveryone: manager },
    is_demo: true,
  };
}

export function samplePitches(raw) {
  return { pitches: raw.pitches };
}

/**
 * Apply one action to the bundle with the routes' rules. Returns
 * { ok, raw, error }. The input is never mutated.
 */
export function applySampleAction(input, action) {
  const raw = {
    ...input,
    reports: input.reports.map((r) => ({ ...r })),
    comments: input.comments.map((c) => ({ ...c })),
    collections: input.collections.map((c) => ({ ...c, report_ids: [...c.report_ids] })),
    allocations: input.allocations.map((a) => ({ ...a })),
  };
  const v = raw.viewer;
  const nowIso = new Date().toISOString();
  const r = action.reportId ? raw.reports.find((x) => x.id === action.reportId) : null;
  const fail = (error) => ({ ok: false, raw: input, error });

  switch (action.type) {
    case 'status': {
      if (!r) return fail('Report not found.');
      const t = canTransition(r, action.status, viewerRow(v), { canApprove: v.canApprove });
      if (!t.ok) return fail(t.reason);
      const from = r.status;
      r.status = action.status;
      if (typeof action.reviewNote === 'string') r.review_note = action.reviewNote.trim() || null;
      if (action.status === 'under_review') r.submitted_at = nowIso;
      if (action.status === 'approved') {
        r.reviewed_by = v.userId;
        r.reviewed_at = nowIso;
        r.approved_at = nowIso;
        r.approved_version = r.current_version;
        r.reviewer_name = 'You';
      }
      if (action.status === 'draft' && from === 'under_review' && r.author_id !== v.userId) {
        r.reviewed_by = v.userId;
        r.reviewed_at = nowIso;
        r.reviewer_name = 'You';
      }
      r.updated_at = nowIso;
      return { ok: true, raw };
    }
    case 'settings': {
      if (!r) return fail('Report not found.');
      if (!(r.author_id === v.userId || isManager(viewerRow(v))))
        return fail('Only the author or a manager can change this report.');
      const p = action.patch || {};
      const vis = REPORT_VISIBILITY.includes(p.visibility) ? p.visibility : r.visibility;
      const shared = Array.isArray(p.sharedWith) ? p.sharedWith : r.shared_with;
      if (vis === 'members' && !shared.length)
        return fail('Choose at least one member to share with.');
      if (p.title && String(p.title).trim()) r.title = String(p.title).trim().slice(0, 160);
      r.visibility = vis;
      r.shared_with = vis === 'members' ? shared : [];
      if ('pitchId' in p) r.pitch_id = p.pitchId || null;
      r.updated_at = nowIso;
      return { ok: true, raw };
    }
    case 'collection': {
      const c = raw.collections.find((x) => x.id === action.collectionId);
      if (!c || !r) return fail('Unknown collection.');
      const ids = new Set(c.report_ids);
      if (action.inCollection === false) ids.delete(r.id);
      else ids.add(r.id);
      c.report_ids = [...ids];
      return { ok: true, raw };
    }
    case 'delete': {
      if (!r) return fail('Report not found.');
      if (r.author_id !== v.userId || r.status !== 'draft')
        return fail('Only the author deletes a draft.');
      raw.reports = raw.reports.filter((x) => x.id !== r.id);
      return { ok: true, raw };
    }
    case 'comment': {
      if (!r) return fail('Report not found.');
      const text = String(action.body || '').trim();
      if (!text) return fail('Write a comment first.');
      raw.comments.push({
        id: `sample-comment-new-${raw.comments.length + 1}`,
        report_id: r.id,
        author_id: v.userId,
        author_name: 'You',
        version: action.version || null,
        anchor: action.anchor || 'report',
        body: text.slice(0, 4000),
        parent_id: action.parentId || null,
        resolved: false,
        resolved_by: null,
        resolved_at: null,
        created_at: nowIso,
        is_demo: true,
      });
      return { ok: true, raw };
    }
    case 'resolve': {
      const c = raw.comments.find((x) => x.id === action.commentId);
      if (!c) return fail('Unknown comment.');
      const rep = raw.reports.find((x) => x.id === c.report_id);
      const allowed =
        c.author_id === v.userId || v.canApprove || (rep && rep.author_id === v.userId);
      if (!allowed) return fail('You cannot resolve that comment.');
      c.resolved = action.resolved !== false;
      return { ok: true, raw };
    }
    case 'budget': {
      if (v.role !== 'executive') return fail('Executive role required');
      if (Number.isInteger(action.pool)) raw.pool = Math.max(0, Math.min(500, action.pool));
      for (const a of action.allocations || []) {
        raw.allocations = raw.allocations.filter((x) => x.user_id !== a.userId);
        if (a.monthlyDeepRuns != null)
          raw.allocations.push({ user_id: a.userId, monthly_deep_runs: a.monthlyDeepRuns });
      }
      return { ok: true, raw };
    }
    default:
      return fail('Unknown action');
  }
}

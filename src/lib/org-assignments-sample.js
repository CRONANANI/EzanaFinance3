/**
 * Sample content for Assignments (/org-team-hub/assignments).
 *
 * Served ONLY to master admin and demo accounts by
 * GET /api/org/assignments/sample, so the page can be reviewed and presented
 * from a council with little activity. Real councils never receive it, and
 * the page labels it "Sample content" while it shows. Nothing here is read
 * from or written to the database: starting, submitting, returning, grading,
 * commenting, uploading and assigning on sample rows stay on the page.
 *
 * It is the same sample council as the Command Center, the Trading Desk and
 * Fund Analytics: the same members, the same four sector teams and the same
 * analyst class. The four assignments the Command Center lists (Healthcare
 * sector note, Policy statement review, Coverage refresh, Bank earnings
 * recap) are here with the same ids, people, dates and statuses.
 *
 * The bundle mirrors the live payloads exactly (the board from
 * GET /api/org/assignments, each detail from GET /api/org/assignments/:id
 * plus its files), so the page draws it with the same code. Counts are not
 * typed twice: file, comment and submission counts come from the rows below,
 * and the metrics and tab counts come from the page model.
 *
 * Pure: no React, no fetch, no server imports. Every row carries is_demo.
 */
import {
  ASSIGNMENT_TYPES,
  TERMINAL_STATUSES,
  computeAssignmentMetrics,
  deriveOverdue,
  tabCounts,
  targetMatches,
} from './org-assignments-model.js';

const HOUR = 3600000;
const DAY = 24 * HOUR;
const id = (prefix, n) => `sample-${prefix}-${String(n).padStart(3, '0')}`;
const teamOf = (n) => id('team', n);
const memberOf = (n) => id('member', n);
const userOf = (n) => id('user', n);

/* The people the other three org samples name. */
const PEOPLE = {
  tesfaye: { n: 1, name: 'Amara Tesfaye', role: 'analyst', sub: 'Senior Analyst', team: 1 },
  bekele: { n: 2, name: 'Mikael Bekele', role: 'analyst', sub: 'Analyst', team: 2 },
  haile: { n: 3, name: 'Selam Haile', role: 'portfolio_manager', sub: 'Senior PM', team: 3 },
  okoye: { n: 4, name: 'Chidi Okoye', role: 'portfolio_manager', sub: 'PM', team: 1 },
  lindqvist: { n: 5, name: 'Ingrid Lindqvist', role: 'portfolio_manager', sub: 'PM', team: 2 },
  park: { n: 6, name: 'Daniel Park', role: 'portfolio_manager', sub: 'PM', team: 4 },
  rossi: { n: 7, name: 'Elena Rossi', role: 'analyst', sub: 'Senior Analyst', team: 3 },
  weber: { n: 8, name: 'Jonas Weber', role: 'analyst', sub: 'Analyst', team: 4 },
  alvarez: { n: 9, name: 'Tomas Alvarez', role: 'analyst', sub: 'Junior Analyst', team: 2 },
};
const TEAMS = [
  { n: 1, name: 'Financials' },
  { n: 2, name: 'Healthcare' },
  { n: 3, name: 'Technology' },
  { n: 4, name: 'Industrials' },
];

/*
 * The work. `to` is a list of targets: a person key, 'me', 'student' (the
 * viewer when they are an analyst, otherwise Elena Rossi, so every role has a
 * full page), 'team:N', 'cohort', 'role:Title' or 'org'. `by` is who assigned
 * it ('lead' is the viewer when they are a manager, otherwise Selam Haile).
 * due is in days from now. subs: [who, days ago, note]. comments: [who, hours
 * ago, text, returned?]. files: [name, bytes, who, days ago].
 */
const WORK = [
  {
    n: 1,
    type: 'research',
    title: 'Healthcare sector note',
    to: ['bekele'],
    by: 'lindqvist',
    due: 3,
    instructions:
      'Two pages on the healthcare sleeve: what moved since the last council meeting and why.',
  },
  {
    n: 2,
    type: 'reading',
    title: 'Policy statement review',
    to: ['me'],
    by: 'okoye',
    due: 6,
    instructions: 'Read the investment policy statement and note any limit the fund is close to.',
  },
  {
    n: 3,
    type: 'coverage',
    title: 'Coverage refresh',
    sector: 'Technology',
    to: ['rossi'],
    by: 'haile',
    due: 20,
    instructions: 'Refresh the coverage list for the technology sleeve before the next review.',
  },
  {
    n: 23,
    type: 'coverage',
    title: 'Technology holdings review',
    sector: 'Technology',
    to: ['team:3'],
    by: 'haile',
    due: 12,
    status: 'in_progress',
    progress: 40,
    recurring: 'monthly',
    instructions:
      'Review the notes for every technology holding: thesis, key figures, what changed.',
    comments: [['rossi', 30, 'NVDA and MSFT are updated. AAPL is next.']],
    files: [['Technology_holdings_notes.docx', 418000, 'rossi', 2]],
  },
  {
    n: 4,
    type: 'research',
    title: 'Bank earnings recap',
    to: ['tesfaye'],
    by: 'okoye',
    due: 8,
    status: 'submitted',
    upload: true,
    instructions:
      'Summarise the quarter for JPM, SCHW and BAC: net interest income, fees and credit costs.',
    subs: [['tesfaye', 1, 'Recap attached. Credit costs are the open question.']],
    comments: [['tesfaye', 26, 'Submitted early so there is time for a second pass.']],
    files: [
      ['Bank_earnings_recap.pdf', 1240000, 'tesfaye', 1],
      ['Bank_figures.xlsx', 86000, 'tesfaye', 1],
    ],
  },
  {
    n: 5,
    type: 'pitch',
    title: 'Investment pitch: NVDA follow-on',
    ticker: 'NVDA',
    sector: 'Technology',
    to: ['student'],
    by: 'lead',
    due: 2,
    status: 'in_progress',
    progress: 60,
    upload: true,
    instructions:
      'Make the case for adding to the position: thesis, valuation, catalysts and the main risks.',
    comments: [['haile', 50, 'Keep the valuation section to one page.']],
    files: [['NVDA_follow_on_draft.pptx', 2310000, 'student', 1]],
  },
  {
    n: 6,
    type: 'model',
    title: 'Three-statement model: JPM',
    to: ['tesfaye'],
    by: 'okoye',
    due: -2,
    status: 'in_progress',
    progress: 25,
    instructions: 'Roll the model forward one quarter and reconcile it to the reported figures.',
  },
  {
    n: 7,
    type: 'other',
    title: 'Semester onboarding checklist',
    to: ['cohort'],
    by: 'lead',
    due: 10,
    instructions:
      'Complete the onboarding steps: platform tour, policy statement, first coverage note.',
  },
  {
    n: 8,
    type: 'meeting_prep',
    title: 'Council meeting prep: sector updates',
    to: ['org'],
    by: 'lead',
    due: 4,
    recurring: 'weekly',
    instructions: 'One slide per sector team: performance, changes to the book, open questions.',
    comments: [['park', 20, 'Industrials will bring the HON pricing question.']],
  },
  {
    n: 9,
    type: 'model',
    title: 'LLY valuation refresh',
    to: ['bekele', 'alvarez'],
    by: 'lindqvist',
    due: -1,
    status: 'under_review',
    upload: true,
    instructions: 'Update the discounted cash flow and the peer multiples for Eli Lilly.',
    subs: [
      ['alvarez', 3, 'First pass.'],
      ['bekele', 1, 'Second pass with the revised growth case.'],
    ],
    comments: [
      ['alvarez', 80, 'Peer set is in the second sheet.'],
      ['lindqvist', 60, 'Check the terminal growth rate against the policy range.'],
      ['bekele', 28, 'Revised and resubmitted.'],
      ['lindqvist', 6, 'Reading it now.'],
    ],
    files: [
      ['LLY_dcf_v2.xlsx', 540000, 'bekele', 1],
      ['LLY_peer_multiples.xlsx', 212000, 'alvarez', 3],
      ['LLY_summary.pdf', 930000, 'bekele', 1],
    ],
  },
  {
    n: 10,
    type: 'coverage',
    title: 'Industrials coverage check-in',
    sector: 'Industrials',
    to: ['team:4'],
    by: 'park',
    due: 1,
    status: 'submitted',
    instructions: 'Short check-in on CAT, GE and HON: thesis intact or not, and what to watch.',
    subs: [['weber', 0.5, 'Check-in for all three names.']],
    comments: [['weber', 13, 'HON still has no price on the book.']],
    files: [['Industrials_check_in.docx', 301000, 'weber', 0.5]],
  },
  {
    n: 11,
    type: 'pitch',
    title: 'Investment pitch: CAT',
    ticker: 'CAT',
    sector: 'Industrials',
    to: ['weber'],
    by: 'park',
    due: -4,
    status: 'returned',
    instructions: 'Pitch Caterpillar for the industrials sleeve.',
    subs: [['weber', 6, 'First version.']],
    comments: [
      ['weber', 150, 'Draft is up.'],
      ['park', 96, 'The cycle risk section needs figures, not adjectives.', true],
      ['weber', 40, 'Working on the order backlog data.'],
    ],
    files: [['CAT_pitch_v1.pptx', 1870000, 'weber', 6]],
  },
  {
    n: 12,
    type: 'reading',
    title: 'Reading: sector caps and the policy statement',
    to: ['role:Junior Analyst'],
    by: 'lead',
    due: 14,
    instructions: 'Read the sector cap rule and explain in a paragraph how it is measured.',
  },
  {
    n: 13,
    type: 'pitch',
    title: 'Investment pitch: AAPL',
    ticker: 'AAPL',
    sector: 'Technology',
    to: ['student'],
    by: 'haile',
    due: -1,
    status: 'returned',
    upload: true,
    instructions: 'Pitch Apple as a hold or a trim for the technology sleeve.',
    subs: [['student', 3, 'Pitch deck and model.']],
    comments: [
      ['student', 75, 'Submitted.'],
      ['haile', 44, 'Valuation leans on one multiple. Add a second method and resubmit.', true],
    ],
    files: [
      ['AAPL_pitch.pptx', 2050000, 'student', 3],
      ['AAPL_model.xlsx', 390000, 'student', 3],
    ],
  },
  {
    n: 14,
    type: 'research',
    title: 'Semiconductor comparables',
    to: ['student'],
    by: 'haile',
    due: 5,
    status: 'submitted',
    instructions: 'Comparable multiples for the five largest semiconductor names.',
    subs: [['student', 0.8, null]],
    files: [['Semiconductor_comparables.xlsx', 164000, 'student', 0.8]],
  },
  {
    n: 15,
    type: 'pitch',
    title: 'Investment pitch: LLY',
    ticker: 'LLY',
    sector: 'Healthcare',
    to: ['bekele'],
    by: 'lindqvist',
    due: -12,
    status: 'graded',
    score: [44, 50, 'Clear thesis and a careful downside case.'],
    instructions: 'Pitch Eli Lilly for the healthcare sleeve.',
    subs: [['bekele', 14, 'Final deck.']],
    comments: [['lindqvist', 300, 'Approved for committee.']],
    files: [['LLY_pitch.pptx', 2240000, 'bekele', 14]],
  },
  {
    n: 16,
    type: 'reading',
    title: 'Bank sector primer',
    to: ['tesfaye'],
    by: 'okoye',
    due: -20,
    status: 'complete',
    instructions: 'Read the primer and list three figures that matter most for a bank.',
    subs: [['tesfaye', 22, null]],
  },
  {
    n: 17,
    type: 'reading',
    title: 'Reading: valuation basics',
    to: ['student'],
    by: 'haile',
    due: -16,
    status: 'graded',
    score: [18, 20, 'Good summary. The worked example had one slip.'],
    instructions: 'Read the valuation chapter and work the example at the end.',
    subs: [['student', 17, 'Worked example attached.']],
    files: [['Valuation_worked_example.pdf', 220000, 'student', 17]],
  },
  {
    n: 18,
    type: 'meeting_prep',
    title: 'Mid-term review prep',
    to: ['org'],
    by: 'lead',
    due: -25,
    status: 'complete',
    instructions: 'Bring one page per sector team to the mid-term review.',
  },
  {
    n: 19,
    type: 'coverage',
    title: 'Financials coverage check-in',
    sector: 'Financials',
    to: ['team:1'],
    by: 'okoye',
    due: -9,
    status: 'graded',
    score: [27, 30, null],
    instructions: 'Check-in on JPM, SCHW and BAC.',
    subs: [['tesfaye', 10, null]],
    files: [['Financials_check_in.docx', 276000, 'tesfaye', 10]],
  },
  /* Last term: two finished, one never resubmitted. */
  {
    n: 20,
    prior: true,
    type: 'pitch',
    title: 'Investment pitch: MSFT',
    ticker: 'MSFT',
    sector: 'Technology',
    to: ['rossi'],
    by: 'haile',
    due: -190,
    status: 'graded',
    score: [46, 50, 'Strong pitch. The position is on the book.'],
    instructions: 'Pitch Microsoft for the technology sleeve.',
    subs: [['rossi', 192, null]],
  },
  {
    n: 21,
    prior: true,
    type: 'research',
    title: 'Rate cycle note',
    to: ['tesfaye'],
    by: 'okoye',
    due: -205,
    status: 'complete',
    instructions: 'What a slower rate path means for the financials sleeve.',
    subs: [['tesfaye', 206, null]],
  },
  {
    n: 22,
    prior: true,
    type: 'model',
    title: 'GE segment model',
    to: ['weber'],
    by: 'park',
    due: -180,
    status: 'returned',
    instructions: 'Build a segment model for GE.',
    subs: [['weber', 184, null]],
    comments: [['park', 4300, 'Segment margins do not tie to the filing. Please rework.', true]],
  },
];

const TEMPLATES = [
  {
    n: 1,
    name: 'Pitch memo',
    type: 'pitch',
    title: 'Investment pitch',
    upload: true,
    instructions:
      'Thesis, fundamentals, valuation with two methods, catalysts and the main risks. Ten slides at most.',
  },
  {
    n: 2,
    name: 'Sector coverage check-in',
    type: 'coverage',
    title: 'Coverage check-in',
    upload: false,
    instructions: 'For each holding: is the thesis intact, what changed, and what to watch next.',
  },
  {
    n: 3,
    name: 'Model update',
    type: 'model',
    title: 'Model update',
    upload: true,
    instructions: 'Roll the model forward one quarter and reconcile it to the reported figures.',
  },
];

/**
 * @param {{ userId: string, memberId?: string, role: string, displayName?: string,
 *           title?: string, subRole?: string, now?: number }} viewer the signed-in member
 */
export function buildAssignmentsSample({
  userId,
  memberId,
  role,
  displayName,
  title,
  subRole,
  now = Date.now(),
}) {
  const canAssign = role === 'executive' || role === 'portfolio_manager';
  const me = userId;
  const myMember = memberId || 'sample-member-me';
  const myName = displayName || 'You';
  /* As in the Trading Desk sample: the viewer sits on the Technology team,
     except an executive, who has no team. */
  const myTeam = role === 'executive' ? null : teamOf(3);
  const year = new Date(now).getUTCFullYear();
  const cohorts = [
    { id: id('cohort', 1), name: `${year} analyst class`, is_current: true },
    { id: id('cohort', 2), name: `${year - 1} analyst class`, is_current: false },
  ];
  const teams = TEAMS.map((t) => ({ id: teamOf(t.n), name: t.name })).sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const mySub = subRole || title || null;
  const roster = [
    {
      member_id: myMember,
      user_id: me,
      display_name: myName,
      role,
      title: mySub,
      sub_role: mySub,
      team_id: myTeam,
      cohort_id: role === 'analyst' ? cohorts[0].id : null,
    },
    ...Object.values(PEOPLE).map((p) => ({
      member_id: memberOf(p.n),
      user_id: userOf(p.n),
      display_name: p.name,
      role: p.role,
      title: p.sub,
      sub_role: p.sub,
      team_id: teamOf(p.team),
      cohort_id: p.role === 'analyst' ? cohorts[0].id : null,
    })),
  ];
  const meRow = roster[0];
  const person = (key) => {
    if (key === 'me') return meRow;
    if (key === 'student') return role === 'analyst' ? meRow : person('rossi');
    if (key === 'lead') return canAssign ? meRow : person('haile');
    return roster.find((m) => m.member_id === memberOf(PEOPLE[key].n));
  };
  const target = (key) => {
    if (key === 'org') return { target_type: 'org', target_id: null, target_role: null };
    if (key === 'cohort') {
      return { target_type: 'cohort', target_id: cohorts[0].id, target_role: null };
    }
    if (key.startsWith('team:')) {
      return { target_type: 'team', target_id: teamOf(Number(key.slice(5))), target_role: null };
    }
    if (key.startsWith('role:')) {
      return { target_type: 'role', target_id: null, target_role: key.slice(5) };
    }
    return { target_type: 'member', target_id: person(key).member_id, target_role: null };
  };
  const iso = (days) => new Date(now + days * DAY).toISOString();

  const details = {};
  const all = WORK.map((w) => {
    const targets = w.to.map(target);
    const people = roster.filter((m) => targets.some((t) => targetMatches(t, m)));
    const by = person(w.by);
    const aid = id('assignment', w.n);
    const submissions = (w.subs || [])
      .map(([who, daysAgo, note], i) => ({
        id: `${aid}-sub-${i + 1}`,
        submitted_by: person(who).user_id,
        submitter_name: person(who).display_name,
        version: i + 1,
        note: note || null,
        created_at: iso(-daysAgo),
        is_demo: true,
      }))
      .reverse();
    const comments = (w.comments || []).map(([who, hoursAgo, body, isReturn], i) => ({
      id: `${aid}-comment-${i + 1}`,
      author_id: person(who).user_id,
      author_name: person(who).display_name,
      body,
      is_return: Boolean(isReturn),
      created_at: new Date(now - hoursAgo * HOUR).toISOString(),
      is_demo: true,
    }));
    const attachments = (w.files || []).map(([file, bytes, who, daysAgo], i) => ({
      id: `${aid}-file-${i + 1}`,
      file_name: file,
      size_bytes: bytes,
      uploaded_by: person(who).user_id,
      uploader_name: person(who).display_name,
      submission_id: null,
      created_at: iso(-daysAgo),
      signed_url: null,
      is_demo: true,
    }));
    const status = w.status || 'assigned';
    const row = {
      id: aid,
      org_id: 'sample',
      cohort_id: w.prior ? cohorts[1].id : cohorts[0].id,
      title: w.title,
      instructions: w.instructions || null,
      type: w.type,
      assignment_type: w.type,
      ticker: w.ticker || null,
      sector: w.sector || null,
      due_date: iso(w.due),
      status,
      progress_pct: w.progress || 0,
      require_upload: Boolean(w.upload),
      recurring: w.recurring || null,
      template_id: null,
      rubric_score: w.score ? w.score[0] : null,
      rubric_max: w.score ? w.score[1] : null,
      rubric_comment: w.score ? w.score[2] : null,
      assigned_to: people[0]?.user_id || by.user_id,
      assigned_by: by.user_id,
      assigner_name: by.display_name,
      created_at: iso(w.due - 14),
      assignees: people.map((m) => ({
        member_id: m.member_id,
        user_id: m.user_id,
        name: m.display_name,
        role: m.role,
      })),
      assignee_targets: targets,
      assignee_name: people[0]?.display_name || null,
      attachment_count: attachments.length,
      comment_count: comments.length,
      version: submissions.length,
      mine: people.some((m) => m.user_id === me),
      by_me: by.user_id === me,
      team:
        Boolean(myTeam) &&
        (people.some((m) => m.team_id === myTeam) ||
          targets.some((t) => t.target_type === 'team' && t.target_id === myTeam)),
      archived: TERMINAL_STATUSES.includes(status),
      is_demo: true,
    };
    row.overdue = deriveOverdue(row, now);
    details[aid] = { assignment: row, submissions, comments, attachments };
    return row;
  });

  /* The live rule: a manager sees their own work, what they assigned and
     their direct reports' work; everyone else sees only what is assigned to
     them. In the sample every member reports to a manager viewer. */
  const assignments = (canAssign ? all : all.filter((a) => a.mine)).sort(
    (a, b) => new Date(a.due_date) - new Date(b.due_date),
  );
  for (const key of Object.keys(details)) {
    if (!assignments.some((a) => a.id === key)) delete details[key];
  }

  const templates = canAssign
    ? TEMPLATES.map((t) => ({
        id: id('template', t.n),
        name: t.name,
        assignment_type: t.type,
        title: t.title,
        instructions: t.instructions,
        sector: null,
        require_upload: t.upload,
        is_demo: true,
      }))
    : [];

  const roles = [...new Set(roster.flatMap((m) => [m.title, m.sub_role]).filter(Boolean))].sort();

  return {
    now,
    board: {
      orgName: 'Sample council',
      assignments,
      metrics: computeAssignmentMetrics(assignments, cohorts),
      tab_counts: tabCounts(assignments),
      scope_label: canAssign
        ? "Your assignments and those you've delegated to your direct reports."
        : 'Your assignments.',
      roster: roster.map(({ sub_role: _sub, ...m }) => m),
      teams,
      cohorts,
      roles,
      templates,
      viewer: {
        userId: me,
        memberId: myMember,
        displayName: myName,
        canAssign,
        teamId: myTeam,
        types: ASSIGNMENT_TYPES,
      },
      is_demo: true,
    },
    details,
  };
}

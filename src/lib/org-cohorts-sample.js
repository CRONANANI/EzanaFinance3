/**
 * Sample content for Cohorts (/org-team-hub/cohorts).
 *
 * Served ONLY to master admin and demo accounts who are council members, by
 * GET /api/org/cohorts/sample, so the page can be reviewed and presented from
 * a council with no classes on file. Real councils never receive it, and the
 * page labels it "Sample content" while it shows. Nothing here is read from or
 * written to the database: while it shows, every read and write the page
 * makes is answered by `sampleRespond` on the page, with the same role checks
 * and the same rules the routes apply (graduation scoped to the cohort,
 * blind screening redacted, notes locked until the viewer submits), and is
 * gone on reload.
 *
 * The council is the same sample council every rebuilt Team Hub page shows:
 * the nine people of the Trading Desk bundle (same ids and roles), their
 * ratings worked out by the Recognition bundle from the shared sample pitches
 * (every one under ten rated ideas, so every live rating is provisional), the
 * sector coverage and graduation flags of the Org Chart bundle. The analysts
 * are this year's analyst class and the portfolio managers last year's, as on
 * Grades and Assignments. What this file adds is what only this page shows:
 * next year's recruiting class with its applicants and two accepted
 * applicants in onboarding, onboarding tasks, and an archived class from two
 * years ago with four alumni. Those people are invented.
 *
 * Pure: no React, no fetch, no server imports. Every row carries is_demo.
 */
import { buildRecognitionSample } from './org-recognition-sample.js';
import { SAMPLE_PITCHES, SAMPLE_PITCH_AUTHORS } from './org-sample-pitches.js';
import {
  ATS_STAGES,
  MANAGER_ROLES,
  RUBRIC_CRITERIA,
  aggregateStar,
  scoresView,
  shapeApplicant,
  submittedInterviewerCount,
} from './org-ats.js';
import { graduatesOf, handoffStatus, sameMemberSet } from './org-cohort-graduation.js';
import { FINANCE_INDUSTRIES, effectiveLifecycle } from './org-cohorts-model.js';

const DAY = 86400000;
const id = (prefix, n) => `sample-${prefix}-${String(n).padStart(3, '0')}`;
const memberOf = (n) => id('member', n);
const userOf = (n) => id('user', n);
/* Applicant ids are uuid shaped, so the blind ID (the last four characters)
   reads like a real one. */
const applicantId = (n) => `00000000-0000-4000-a000-${String(n).padStart(12, '0')}`;

/* Org Chart sample: sector coverage and the graduation flag. */
const COVERAGE = {
  1: 'Financials',
  2: 'Health Care',
  7: 'Information Technology',
  8: 'Industrials',
};
const GRADUATING = new Set([1, 3]);
const TITLES = {
  1: 'Senior Analyst',
  2: 'Analyst',
  3: 'Senior Portfolio Manager',
  4: 'Portfolio Manager',
  5: 'Portfolio Manager',
  6: 'Portfolio Manager',
  7: 'Senior Analyst',
  8: 'Analyst',
  9: 'Junior Analyst',
};
const MENTOR = { 1: 4, 2: 5, 7: 3, 8: 6, 9: 5 };

/* Next year's class: [n, name, program, year, source, stage, reason,
   email, [interviewer member n, [tech, comm, culture, prior], submitted, notes][]]. */
const APPLICANTS = [
  [1, 'Leah Okonkwo', 'Economics', 'Second year', 'Campus events', 'accepted', null, true, []],
  [2, 'Mateo Ruiz', 'Finance', 'Second year', 'Referrals', 'accepted', null, true, []],
  [
    3,
    'Priya Natarajan',
    'Finance',
    'Third year',
    'Referrals',
    'offer',
    null,
    true,
    [
      [3, [5, 4, 5, 4], true, 'Strong valuation work in the pitch.'],
      [4, [4, 5, 4, 4], true, 'Clear and concise under questions.'],
    ],
  ],
  [
    4,
    'Jonah Feld',
    'Computer science',
    'Second year',
    'Campus events',
    'pitch',
    null,
    true,
    [
      [4, [5, 4, 4, 5], true, 'Built a screening model for the pitch.'],
      [5, [4, 4, 5, 4], false, null],
    ],
  ],
  [
    5,
    'Amira Haddad',
    'Economics',
    'First year',
    'Info session',
    'pitch',
    null,
    true,
    [[3, [4, 4, 4, 4], true, 'Thoughtful risk section.']],
  ],
  [
    6,
    'Tobias Grant',
    'Economics',
    'Second year',
    'Campus events',
    'interview',
    null,
    true,
    [
      [5, [4, 4, 5, 4], true, 'Relevant pitch preparation.'],
      [6, [4, 5, 4, 3], true, 'Good questions about the process.'],
    ],
  ],
  [7, 'Hanna Sato', 'Mathematics', 'Second year', 'Other', 'interview', null, true, []],
  [
    8,
    'Felix Moreau',
    'Finance',
    'First year',
    'Info session',
    'screened',
    null,
    true,
    [[4, [4, 4, 4, 4], true, 'Solid written answers.']],
  ],
  [
    9,
    'Grace Lindo',
    'Health economics',
    'Second year',
    'Referrals',
    'screened',
    null,
    true,
    [[6, [4, 4, 3, 4], true, 'Healthcare interest is clear.']],
  ],
  [
    10,
    'Omar Siddiqui',
    'Computer science',
    'First year',
    'Campus events',
    'screened',
    null,
    true,
    [],
  ],
  [11, 'Clara Weiss', 'Economics', 'First year', 'Campus events', 'applied', null, true, []],
  [12, 'Daniel Osei', 'Finance', 'Second year', 'Other', 'applied', null, true, []],
  [13, 'Iris Novak', 'Accounting', 'First year', 'Info session', 'applied', null, true, []],
  [14, 'Ravi Menon', 'Engineering', 'Third year', 'Campus events', 'applied', null, false, []],
  [15, 'Sofia Brandt', 'Economics', 'First year', 'Referrals', 'applied', null, true, []],
  [
    16,
    'Kenji Mori',
    'Finance',
    'Second year',
    'Campus events',
    'rejected',
    'Applied after the deadline.',
    true,
    [],
  ],
  [
    17,
    'Lena Fischer',
    'Mathematics',
    'Third year',
    'Other',
    'rejected',
    'Schedule conflicts with committee meetings.',
    true,
    [],
  ],
  [
    18,
    'Marcus Bell',
    'Finance',
    'Second year',
    'Campus events',
    'declined',
    'Accepted another offer.',
    true,
    [],
  ],
];
/* The two accepted applicants, provisioned into next year's class. */
const NEW_MEMBERS = [
  [21, 'Leah Okonkwo', 1, 7],
  [22, 'Mateo Ruiz', 2, null],
];
/* Two years ago: [n, name, former title, final rating, final pitches,
   employer, industry, role, placed within 6 months, flags]. Invented. */
const ALUMNI = [
  [
    101,
    'Ria Kapoor',
    'Portfolio Manager',
    1490,
    11,
    'Northlake Capital',
    'am',
    'Investment analyst',
    true,
    ['mentor'],
  ],
  [
    102,
    'Jordan Vale',
    'Senior Analyst',
    1347,
    12,
    'Cedar Advisory',
    'consulting',
    'Associate',
    true,
    ['guest_speaker'],
  ],
  [
    103,
    'Avery Park',
    'Analyst',
    1402,
    10,
    'Meridian Securities',
    'ib',
    'Analyst',
    true,
    ['recruiter'],
  ],
  [104, 'Noor Rahman', 'Analyst', null, 3, null, null, null, null, []],
];
const FINANCIALS_OF = { 101: 'Financials', 102: 'Industrials', 103: 'Health Care' };

/**
 * @param {{ userId: string, memberId: string, role: string, displayName?: string,
 *           title?: string, subRole?: string, now?: number }} viewer
 */
export function buildCohortsSample({
  userId,
  memberId,
  role,
  displayName,
  title,
  subRole,
  now = Date.now(),
}) {
  const me = memberId || 'sample-member-me';
  const rec = buildRecognitionSample({
    userId,
    memberId: me,
    role,
    displayName,
    title,
    subRole,
    now,
  });
  const year = new Date(now).getUTCFullYear();
  const iso = (days) => new Date(now - days * DAY).toISOString();
  const startYear = new Date(now).getUTCMonth() >= 7 ? year : year - 1;
  const termStart = `${startYear}-09-02T15:00:00.000Z`;

  const cohorts = [
    {
      id: id('cohort', 3),
      name: `${year + 1} analyst class`,
      term_type: 'year',
      status: 'recruiting',
      entry_term: `Fall ${year + 1}`,
      expected_grad_term: `Spring ${year + 3}`,
      is_current: false,
      onboarding_gate: true,
      archived: false,
      created_at: iso(40),
    },
    {
      id: id('cohort', 1),
      name: `${year} analyst class`,
      term_type: 'year',
      status: 'active',
      entry_term: `Fall ${year}`,
      expected_grad_term: `Spring ${year + 2}`,
      is_current: true,
      onboarding_gate: true,
      archived: false,
      created_at: iso(420),
    },
    {
      id: id('cohort', 2),
      name: `${year - 1} analyst class`,
      term_type: 'year',
      status: 'active',
      entry_term: `Fall ${year - 1}`,
      expected_grad_term: `Spring ${year + 1}`,
      is_current: false,
      onboarding_gate: true,
      archived: false,
      created_at: iso(780),
    },
    {
      id: id('cohort', 4),
      name: `${year - 2} analyst class`,
      term_type: 'year',
      status: 'alumni',
      entry_term: `Fall ${year - 2}`,
      expected_grad_term: `Spring ${year}`,
      is_current: false,
      onboarding_gate: true,
      archived: true,
      archived_at: iso(180),
      archived_snapshot: {
        archived_at: iso(180),
        roster: ALUMNI.map(([n, name, t]) => ({
          display_name: name,
          role: t.includes('Portfolio') ? 'portfolio_manager' : 'analyst',
          title: t,
          graduated: true,
        })),
        fund: {
          total_value: 412850.37,
          positions: 14,
          pitch_count: 9,
          hit_rate: 5 / 9,
          avg_alpha_pct: 1.84,
        },
        pitch_track_record: [
          ['MSFT', 'accepted', 14.21, 4.02],
          ['JNJ', 'accepted', 3.15, -2.48],
          ['HD', 'accepted', 9.8, 2.11],
          ['XOM', 'rejected', -6.3, -11.2],
          ['PG', 'accepted', 5.44, 0.37],
          ['KO', 'accepted', 2.07, -3.05],
          ['GS', 'accepted', 11.9, 5.61],
          ['DIS', 'rejected', -2.4, -7.9],
          ['ABBV', 'accepted', 8.75, 3.08],
        ].map(([ticker, decision, ret, alpha]) => ({
          ticker,
          decision,
          return_pct: ret,
          alpha_pct: alpha,
        })),
      },
      created_at: iso(1150),
    },
  ];
  const cohortOfRole = (r) => (r === 'analyst' ? id('cohort', 1) : id('cohort', 2));

  /* ── Members ── */
  const ratingOf = new Map(rec.ratings.map((r) => [r.member_id, r]));
  const council = rec.members
    .filter((m) => m.id !== me)
    .map((m) => {
      const n = Number(String(m.id).slice(-3));
      return {
        id: m.id,
        user_id: m.user_id,
        display_name: m.display_name,
        role: m.role,
        title: TITLES[n] || null,
        cohort_id: cohortOfRole(m.role),
        lifecycle_status: n === 9 ? 'onboarding' : 'active',
        is_active: true,
        is_graduating: GRADUATING.has(n),
        joined_at: n === 9 ? `${startYear}-10-01T15:00:00.000Z` : termStart,
        mentor_member_id: MENTOR[n] ? memberOf(MENTOR[n]) : null,
        departed_at: null,
        departure_reason: null,
        is_demo: true,
      };
    });
  const newcomers = NEW_MEMBERS.map(([n, name, app, mentor]) => ({
    id: memberOf(n),
    user_id: app === 2 ? null : userOf(n),
    display_name: name,
    role: 'analyst',
    title: 'Junior Analyst',
    cohort_id: id('cohort', 3),
    lifecycle_status: 'onboarding',
    is_active: true,
    is_graduating: false,
    joined_at: iso(app === 1 ? 6 : 3),
    mentor_member_id: mentor ? memberOf(mentor) : null,
    departed_at: null,
    departure_reason: null,
    is_demo: true,
  }));
  const formerMembers = ALUMNI.map(([n, name, t]) => ({
    id: memberOf(n),
    user_id: userOf(n),
    display_name: name,
    role: t.includes('Portfolio') ? 'portfolio_manager' : 'analyst',
    title: t,
    cohort_id: id('cohort', 4),
    lifecycle_status: 'alumni',
    is_active: false,
    is_graduating: false,
    joined_at: `${startYear - 2}-09-02T15:00:00.000Z`,
    mentor_member_id: null,
    departed_at: null,
    departure_reason: null,
    is_demo: true,
  }));
  const members = [...council, ...newcomers, ...formerMembers];

  const coverage = [
    ...Object.entries(COVERAGE).map(([n, sector]) => ({ member_id: memberOf(Number(n)), sector })),
    ...Object.entries(FINANCIALS_OF).map(([n, sector]) => ({
      member_id: memberOf(Number(n)),
      sector,
    })),
  ];
  const pitchCount = {};
  for (const [, , author] of SAMPLE_PITCHES) {
    const mid = memberOf(SAMPLE_PITCH_AUTHORS[author]);
    pitchCount[mid] = (pitchCount[mid] || 0) + 1;
  }
  const ratings = council.map((m) => {
    const r = ratingOf.get(m.id);
    return {
      member_id: m.id,
      rating: r ? r.rating : null,
      tier: r?.tier || null,
      rated_thesis_count: r?.rated_thesis_count ?? 0,
      is_provisional: r ? (r.rated_thesis_count ?? 0) < 10 : null,
    };
  });

  /* ── Recruiting ── */
  const applicants = APPLICANTS.map(([n, name, program, yr, source, stage, reason, email]) => ({
    id: applicantId(n),
    org_id: 'sample',
    cohort_id: id('cohort', 3),
    full_name: name,
    email: email ? `${name.split(' ')[0].toLowerCase()}@example.edu` : null,
    program,
    year: yr,
    source,
    stage,
    rejected_reason: reason,
    responses: {
      'Why this council': 'I want to learn to defend a thesis in front of a committee.',
      'Sector of interest': program === 'Health economics' ? 'Health Care' : 'Financials',
    },
    resume_url: null,
    sample_pitch_url: null,
    applied_at: iso(38 - n),
    provisioned_member_id: n === 1 ? memberOf(21) : n === 2 ? memberOf(22) : null,
    is_demo: true,
  }));
  const scores = [];
  for (const [n, , , , , , , , panel] of APPLICANTS) {
    for (const [who, vals, submitted, notes] of panel) {
      RUBRIC_CRITERIA.forEach((criterion, i) =>
        scores.push({
          applicant_id: applicantId(n),
          interviewer_id: memberOf(who),
          criterion,
          score: vals[i],
          weight: 1,
          notes: i === 0 ? notes : null,
          submitted_at: submitted ? iso(4) : null,
        }),
      );
    }
  }
  const forms = [
    {
      id: id('form', 1),
      cohort_id: id('cohort', 3),
      fields: [
        { kind: 'short_text', label: 'Why this council', required: true, options: [] },
        {
          kind: 'dropdown',
          label: 'Sector of interest',
          required: true,
          options: ['Financials', 'Health Care', 'Information Technology', 'Industrials'],
        },
        { kind: 'file', label: 'Resume link', required: false, options: [] },
        { kind: 'ticker', label: 'A stock you would pitch', required: false, options: [] },
      ],
      public_slug: null,
      is_open: false,
      blind_screening: true,
      created_at: iso(40),
    },
  ];

  /* ── Onboarding (tasks are assignments; a submission marks one done) ── */
  const task = (n, cohort, title_, gate, order) => ({
    id: id('onb-task', n),
    cohort_id: id('cohort', cohort),
    assignment_id: id('onb-assignment', n),
    title: title_,
    is_gate: gate,
    sort_order: order,
  });
  const tasks = [
    task(1, 1, 'Fund orientation', false, 0),
    task(2, 1, 'Investment policy statement quiz', true, 1),
    task(3, 1, 'Compliance orientation', true, 2),
    task(4, 1, 'Research Library orientation', false, 3),
    task(5, 3, 'Fund orientation', false, 0),
    task(6, 3, 'Investment policy statement quiz', true, 1),
    task(7, 3, 'Compliance orientation', true, 2),
    task(8, 3, 'Shadow one committee meeting', false, 3),
  ];
  const done = (n, user) => ({ assignment_id: id('onb-assignment', n), user_id: user });
  const submissions = [
    done(1, userOf(9)),
    done(2, userOf(9)),
    done(3, userOf(9)),
    done(5, userOf(21)),
    done(6, userOf(21)),
    done(7, userOf(21)),
    done(8, userOf(21)),
  ];

  /* ── Alumni and handoff documents ── */
  const alumni = ALUMNI.map(
    ([n, , , rating, pitches, employer, industry, roleTitle, placed, flags]) => ({
      id: id('alumni', n),
      member_id: memberOf(n),
      cohort_id: id('cohort', 4),
      grad_term: `Spring ${year}`,
      final_rating: rating,
      final_pitch_count: pitches,
      employer,
      employer_industry: industry,
      role_title: roleTitle,
      linkedin_url: null,
      placed_within_6mo: placed,
      engagement_flags: flags,
      created_at: iso(180),
      is_demo: true,
    }),
  );
  /* Selam Haile covers no sector; Amara Tesfaye's Financials handoff is not
     published yet, so graduating this year's class shows the override. */
  const notes = [];

  return {
    sample: true,
    viewer: {
      memberId: me,
      userId,
      role,
      isExecutive: role === 'executive',
      canManage: MANAGER_ROLES.includes(role),
      isAdvisor: role === 'executive' && subRole === 'Faculty Advisor',
    },
    viewerName: displayName || 'You',
    cohorts,
    members,
    coverage,
    pitchCount,
    ratings,
    applicants,
    scores,
    forms,
    tasks,
    submissions,
    alumni,
    notes,
    seq: 1,
  };
}

/* ── Answering the page's requests ──────────────────────────────────────── */
const ok = (json, bundle) => ({ status: 200, json, bundle });
const fail = (status, error) => ({ status, json: { error } });
const clone = (b) =>
  typeof structuredClone === 'function' ? structuredClone(b) : JSON.parse(JSON.stringify(b));

function rosterPayload(b, cohortId) {
  const rows = b.members.filter((m) => m.cohort_id === cohortId);
  const nameById = new Map(b.members.map((m) => [m.id, m.display_name]));
  const ratingOf = new Map(b.ratings.map((r) => [r.member_id, r]));
  const shaped = rows.map((m) => {
    const r = ratingOf.get(m.id) || null;
    return {
      id: m.id,
      display_name: m.display_name,
      role: m.role,
      title: m.title,
      lifecycle_status: effectiveLifecycle(m),
      is_graduating: !!m.is_graduating,
      is_active: m.is_active,
      joined_at: m.joined_at,
      departed_at: m.departed_at,
      departure_reason: m.departure_reason,
      mentor_member_id: m.mentor_member_id,
      mentor_name: m.mentor_member_id ? nameById.get(m.mentor_member_id) || null : null,
      sectors: b.coverage
        .filter((c) => c.member_id === m.id)
        .map((c) => ({ sector: c.sector, isPrimary: true })),
      rating: r && r.rating != null ? r.rating : null,
      rating_tier: r?.tier || null,
      rating_provisional: r && r.rating != null ? !!r.is_provisional : null,
      pitch_count: b.pitchCount[m.id] || 0,
      is_demo: true,
    };
  });
  const departed = shaped.filter((m) => m.lifecycle_status === 'departed').length;
  const rated = shaped.filter((m) => m.rating != null && !m.rating_provisional);
  return {
    members: shaped,
    stats: {
      active: shaped.filter((m) => m.lifecycle_status === 'active').length,
      retention_pct: shaped.length
        ? Math.round(((shaped.length - departed) / shaped.length) * 100)
        : null,
      avg_rating: rated.length
        ? Math.round(rated.reduce((s, m) => s + m.rating, 0) / rated.length)
        : null,
      sectors_covered: new Set(shaped.flatMap((m) => m.sectors.map((s) => s.sector))).size,
    },
    viewer: { memberId: b.viewer.memberId, canManage: b.viewer.canManage },
  };
}

function blindOf(b, cohortId) {
  const f = b.forms.filter((x) => x.cohort_id === cohortId).slice(-1)[0];
  return !!f?.blind_screening;
}

function visibleApplicants(b, cohortId) {
  const list = b.applicants.filter((a) => a.cohort_id === cohortId);
  if (b.viewer.canManage) return list;
  /* An analyst sees only the applicants they have scored (as the row rules do). */
  const mine = new Set(
    b.scores.filter((s) => s.interviewer_id === b.viewer.memberId).map((s) => s.applicant_id),
  );
  return list.filter((a) => mine.has(a.id));
}

function applicantsPayload(b, cohortId) {
  const blind = blindOf(b, cohortId);
  const shaped = visibleApplicants(b, cohortId).map((a) => {
    const rows = b.scores.filter((s) => s.applicant_id === a.id);
    return {
      ...shapeApplicant(a, { blind }),
      aggregate_star: aggregateStar(rows),
      scores_in: submittedInterviewerCount(rows),
      interviewer_count: new Set(rows.map((r) => r.interviewer_id)).size,
      is_demo: true,
    };
  });
  const stageCounts = Object.fromEntries(ATS_STAGES.map((s) => [s, 0]));
  for (const a of shaped) stageCounts[a.stage] += 1;
  const offers = shaped.filter((a) => ['offer', 'accepted'].includes(a.stage)).length;
  return {
    applicants: shaped,
    stageCounts,
    blind,
    stats: {
      applicants: shaped.length,
      interviewed: shaped.filter((a) =>
        ['interview', 'pitch', 'offer', 'accepted'].includes(a.stage),
      ).length,
      offers,
      yield_pct: offers > 0 ? Math.round((stageCounts.accepted / offers) * 100) : null,
    },
    viewer: { memberId: b.viewer.memberId, canManage: b.viewer.canManage },
  };
}

function funnelPayload(b, cohortId) {
  const rows = visibleApplicants(b, cohortId);
  const RANK = { applied: 0, screened: 1, interview: 2, pitch: 3, offer: 4, accepted: 5 };
  const total = rows.length;
  const accepted = rows.filter((r) => r.stage === 'accepted').length;
  const bySource = new Map();
  for (const r of rows) {
    const k = r.source || 'Unknown';
    const s = bySource.get(k) || { total: 0, accepted: 0 };
    s.total += 1;
    if (r.stage === 'accepted') s.accepted += 1;
    bySource.set(k, s);
  }
  return {
    funnel: Object.keys(RANK).map((stage) => {
      const count = rows.filter((r) => (RANK[r.stage] ?? 0) >= RANK[stage]).length;
      return { stage, count, conversion_pct: total ? Math.round((count / total) * 100) : null };
    }),
    total,
    accepted,
    conversion_pct: total ? Math.round((accepted / total) * 100) : null,
    sources: [...bySource.entries()]
      .map(([source, v]) => ({
        source,
        total: v.total,
        accepted: v.accepted,
        conversion_pct: v.total ? Math.round((v.accepted / v.total) * 100) : null,
      }))
      .sort((x, y) => y.total - x.total),
  };
}

function onboardingPayload(b, cohortId) {
  const cohort = b.cohorts.find((c) => c.id === cohortId);
  const roster = b.members.filter((m) => m.is_active);
  const cohortMembers = roster.filter(
    (m) => m.lifecycle_status === 'onboarding' && m.cohort_id === cohortId,
  );
  const links = b.tasks
    .filter((t) => t.cohort_id === cohortId)
    .sort((x, y) => x.sort_order - y.sort_order);
  const isDone = (aid, uid) =>
    !!uid && b.submissions.some((s) => s.assignment_id === aid && s.user_id === uid);
  const nameById = new Map(b.members.map((m) => [m.id, m.display_name]));
  const tasks = links.map((t) => ({
    id: t.id,
    assignment_id: t.assignment_id,
    title: t.title,
    is_gate: t.is_gate,
    sort_order: t.sort_order,
    done_count: cohortMembers.filter((m) => isDone(t.assignment_id, m.user_id)).length,
    total: cohortMembers.length,
    outstanding: cohortMembers
      .filter((m) => !isDone(t.assignment_id, m.user_id))
      .map((m) => ({ member_id: m.id, display_name: m.display_name })),
  }));
  const gateIds = tasks.filter((t) => t.is_gate).map((t) => t.assignment_id);
  const members = cohortMembers.map((m) => {
    const completed = links
      .filter((t) => isDone(t.assignment_id, m.user_id))
      .map((t) => t.assignment_id);
    const missingGate = gateIds.filter((aid) => !isDone(aid, m.user_id));
    return {
      id: m.id,
      display_name: m.display_name,
      role: m.role,
      title: m.title,
      user_linked: !!m.user_id,
      mentor_member_id: m.mentor_member_id,
      mentor_name: m.mentor_member_id ? nameById.get(m.mentor_member_id) || null : null,
      completed_assignment_ids: completed,
      completed_count: completed.length,
      task_total: tasks.length,
      blocked: !!cohort?.onboarding_gate && missingGate.length > 0,
      missing_gate_count: missingGate.length,
    };
  });
  const load = {};
  for (const m of roster)
    if (m.mentor_member_id) load[m.mentor_member_id] = (load[m.mentor_member_id] || 0) + 1;
  const seniors = roster
    .filter((m) => m.lifecycle_status !== 'onboarding')
    .map((m) => ({
      id: m.id,
      display_name: m.display_name,
      role: m.role,
      title: m.title,
      mentee_count: load[m.id] || 0,
    }));
  const enrolled = members.length;
  return {
    gateEnabled: !!cohort?.onboarding_gate,
    tasks,
    members,
    seniors,
    stats: {
      enrolled,
      avg_completion_pct:
        enrolled && tasks.length
          ? Math.round(
              (members.reduce((s, m) => s + m.completed_count, 0) / (enrolled * tasks.length)) *
                100,
            )
          : enrolled
            ? 100
            : null,
      fully_onboarded: members.filter((m) => tasks.length && m.completed_count === tasks.length)
        .length,
      blocked: members.filter((m) => m.blocked).length,
    },
    viewer: { memberId: b.viewer.memberId, canManage: b.viewer.canManage },
  };
}

function graduationPayload(b, cohortId) {
  const cohort = b.cohorts.find((c) => c.id === cohortId);
  const showHandoffs = b.viewer.canManage;
  const grads = graduatesOf(b.members, cohortId);
  const gate = handoffStatus({ grads, coverage: b.coverage, notes: b.notes, showHandoffs });
  return {
    archived: !!cohort?.archived,
    members: gate.members,
    required: showHandoffs ? gate.required : null,
    published: showHandoffs ? gate.published : null,
    missing: showHandoffs ? gate.missing : null,
    handoffs_visible: showHandoffs,
  };
}

function alumniPayload(b, query) {
  const cohortId = query.get('cohort_id');
  const rows = b.alumni.filter((r) => !cohortId || r.cohort_id === cohortId);
  const byId = new Map(b.members.map((m) => [m.id, m]));
  const alumni = rows.map((r) => {
    const m = byId.get(r.member_id) || {};
    return {
      id: r.id,
      member_id: r.member_id,
      display_name: m.display_name || 'Alum',
      was_role: m.title || m.role || null,
      cohort_id: r.cohort_id,
      grad_term: r.grad_term,
      final_rating: r.final_rating,
      final_pitch_count: r.final_pitch_count,
      employer: r.employer,
      employer_industry: r.employer_industry,
      role_title: r.role_title,
      linkedin_url: r.linkedin_url,
      placed_within_6mo: r.placed_within_6mo,
      engagement_flags: r.engagement_flags || [],
      sectors: b.coverage.filter((c) => c.member_id === r.member_id).map((c) => c.sector),
      is_demo: true,
    };
  });
  const placed = alumni.filter(
    (a) => a.placed_within_6mo && FINANCE_INDUSTRIES.includes(a.employer_industry),
  ).length;
  return {
    alumni,
    stats: {
      total: alumni.length,
      placement_rate_pct: alumni.length ? Math.round((placed / alumni.length) * 100) : null,
      top_sector: null,
      engaged: alumni.filter((a) => a.engagement_flags.length > 0).length,
    },
    viewer: { memberId: b.viewer.memberId, canManage: b.viewer.canManage },
  };
}

/**
 * Answer one request from the page against the bundle. Writes return the next
 * bundle; nothing leaves the page.
 * @returns {{ status: number, json: object, bundle?: object }}
 */
export function sampleRespond(bundle, { method = 'GET', url, body = null }) {
  const u = new URL(url, 'http://sample.local');
  const parts = u.pathname.replace(/^\/api\/org\//, '').split('/');
  const q = u.searchParams;
  const v = bundle.viewer;
  const isExec = v.role === 'executive';
  const isManager = MANAGER_ROLES.includes(v.role);
  const b = method === 'GET' ? bundle : clone(bundle);
  const nextId = (prefix) => {
    b.seq += 1;
    return id(`${prefix}-new`, b.seq);
  };

  if (parts[0] === 'chart' && method === 'GET') {
    return ok({
      members: b.members
        .filter((m) => m.is_active)
        .map((m) => ({ id: m.id, display_name: m.display_name, title: m.title })),
    });
  }

  if (parts[0] === 'cohorts') {
    const cid = parts[1];
    const sub = parts[2];
    if (!cid) {
      if (method === 'GET') return ok({ cohorts: b.cohorts, viewer: v });
      if (!isExec) return fail(403, 'Executive role required');
      if (method === 'POST') {
        const name = String(body?.name || '').trim();
        if (!name) return fail(400, 'Cohort name required');
        if (body?.is_current) b.cohorts.forEach((c) => (c.is_current = false));
        const row = {
          id: nextId('cohort'),
          name: name.slice(0, 120),
          term_type: ['semester', 'quarter', 'year'].includes(body?.term_type)
            ? body.term_type
            : 'semester',
          status: 'recruiting',
          entry_term: body?.entry_term || null,
          expected_grad_term: body?.expected_grad_term || null,
          onboarding_gate: body?.onboarding_gate !== false,
          is_current: !!body?.is_current,
          archived: false,
          created_at: new Date().toISOString(),
        };
        b.cohorts.unshift(row);
        return ok({ cohort: row }, b);
      }
      if (method === 'PATCH') {
        const row = b.cohorts.find((c) => c.id === body?.cohort_id);
        if (!row) return fail(404, 'Cohort not found');
        if (body?.is_current) b.cohorts.forEach((c) => (c.is_current = false));
        if ('is_current' in body) row.is_current = !!body.is_current;
        return ok({ cohort: row }, b);
      }
    }
    const cohort = b.cohorts.find((c) => c.id === cid);
    if (!cohort) return fail(404, 'Cohort not found');
    if (sub === 'roster' && method === 'GET') return ok(rosterPayload(b, cid));
    if (sub === 'graduation' && method === 'GET') return ok(graduationPayload(b, cid));
    if (sub === 'onboarding' && method === 'GET') return ok(onboardingPayload(b, cid));
    if (sub === 'forms' && method === 'GET') {
      return ok({
        forms: b.forms.filter((f) => f.cohort_id === cid).reverse(),
        canManage: isManager,
      });
    }
    if (sub === 'lifecycle' && method === 'PATCH') {
      if (!isManager) return fail(403, 'Manager role required');
      const m = b.members.find((x) => x.id === body?.member_id && x.cohort_id === cid);
      if (!m) return fail(404, 'Member not found in this cohort');
      if ('lifecycle_status' in body) {
        const s = body.lifecycle_status;
        m.lifecycle_status = s;
        if (s === 'graduating') m.is_graduating = true;
        if (s === 'departed') {
          m.departed_at = new Date().toISOString();
          m.is_active = false;
          m.departure_reason = body.departure_reason || null;
        }
        if (s === 'active' || s === 'onboarding') {
          m.is_active = true;
          m.is_graduating = false;
          m.departed_at = null;
          m.departure_reason = null;
        }
      }
      if ('mentor_member_id' in body) {
        if (body.mentor_member_id === m.id) return fail(400, 'A member cannot mentor themselves');
        m.mentor_member_id = body.mentor_member_id || null;
      }
      return ok({ member: m }, b);
    }
    if (sub === 'archive' && method === 'POST') {
      if (!isExec) return fail(403, 'Executive role required');
      if (cohort.archived) return fail(400, 'Cohort already archived');
      const grads = graduatesOf(b.members, cid);
      const gate = handoffStatus({ grads, coverage: b.coverage, notes: b.notes });
      if (
        Array.isArray(body?.expected_member_ids) &&
        !sameMemberSet(
          body.expected_member_ids,
          grads.map((m) => m.id),
        )
      ) {
        return {
          status: 409,
          json: {
            error: 'The members flagged to graduate changed. Review the list again.',
            gate: 'roster_changed',
            members: gate.members,
          },
        };
      }
      if (gate.missing.length && body?.force !== true) {
        return {
          status: 409,
          json: {
            error: 'Handoff docs incomplete',
            gate: 'handoff_docs',
            required: gate.required,
            published: gate.published,
            missing: gate.missing,
          },
        };
      }
      const at = new Date().toISOString();
      const rosterRows = b.members.filter((m) => m.cohort_id === cid && m.is_active);
      const gradIds = new Set(grads.map((m) => m.id));
      Object.assign(cohort, {
        archived: true,
        archived_at: at,
        is_current: false,
        status: 'alumni',
        archived_snapshot: {
          archived_at: at,
          roster: rosterRows.map((m) => ({
            display_name: m.display_name,
            role: m.role,
            title: m.title,
            graduated: gradIds.has(m.id),
          })),
          fund: {
            total_value: null,
            positions: null,
            pitch_count: null,
            hit_rate: null,
            avg_alpha_pct: null,
          },
          pitch_track_record: [],
        },
      });
      const ratingOf = new Map(b.ratings.map((r) => [r.member_id, r.rating]));
      for (const m of grads) {
        m.is_active = false;
        m.lifecycle_status = 'alumni';
        if (!b.alumni.some((a) => a.member_id === m.id)) {
          b.alumni.unshift({
            id: nextId('alumni'),
            member_id: m.id,
            cohort_id: cid,
            grad_term: cohort.expected_grad_term || cohort.name,
            final_rating: ratingOf.get(m.id) ?? null,
            final_pitch_count: b.pitchCount[m.id] || 0,
            employer: null,
            employer_industry: null,
            role_title: null,
            linkedin_url: null,
            placed_within_6mo: null,
            engagement_flags: [],
            created_at: at,
            is_demo: true,
          });
        }
      }
      return ok({ cohort, graduated: grads.length, handoffGate: gate }, b);
    }
    if (sub === 'onboarding' && method === 'POST') {
      if (body?.action === 'complete' || body?.action === 'uncomplete') {
        const m = b.members.find((x) => x.id === body.member_id && x.cohort_id === cid);
        if (!m) return fail(404, 'Member not in cohort');
        if (!isManager && m.id !== v.memberId) return fail(403, 'Not permitted');
        if (!m.user_id)
          return fail(400, 'Member has no linked account yet, cannot record completion.');
        if (!b.tasks.some((t) => t.cohort_id === cid && t.assignment_id === body.assignment_id)) {
          return fail(404, 'Task not in cohort');
        }
        b.submissions = b.submissions.filter(
          (s) => !(s.assignment_id === body.assignment_id && s.user_id === m.user_id),
        );
        if (body.action === 'complete')
          b.submissions.push({ assignment_id: body.assignment_id, user_id: m.user_id });
        return ok({ ok: true, done: body.action === 'complete' }, b);
      }
      if (!isManager) return fail(403, 'Manager role required');
      const t = String(body?.title || '').trim();
      if (!t) return fail(400, 'title required');
      const tid = nextId('onb-task');
      b.tasks.push({
        id: tid,
        cohort_id: cid,
        assignment_id: `${tid}-a`,
        title: t.slice(0, 200),
        is_gate: !!body?.is_gate,
        sort_order: b.tasks.length,
      });
      return ok({ task: { id: tid, title: t } }, b);
    }
    if (sub === 'onboarding' && method === 'DELETE') {
      if (!isManager) return fail(403, 'Manager role required');
      b.tasks = b.tasks.filter((t) => !(t.id === q.get('task_id') && t.cohort_id === cid));
      return ok({ ok: true }, b);
    }
    if (sub === 'forms' && (method === 'POST' || method === 'PATCH')) {
      if (!isManager) return fail(403, 'Manager role required');
      let f =
        method === 'PATCH'
          ? b.forms.find((x) => x.id === body?.form_id && x.cohort_id === cid)
          : null;
      if (method === 'PATCH' && !f) return fail(404, 'Form not found');
      if (!f) {
        f = {
          id: nextId('form'),
          cohort_id: cid,
          fields: [],
          public_slug: null,
          is_open: false,
          blind_screening: false,
          created_at: new Date().toISOString(),
        };
        b.forms.push(f);
      }
      if ('fields' in (body || {})) f.fields = (body.fields || []).slice(0, 40);
      if ('is_open' in (body || {})) f.is_open = !!body.is_open;
      if ('blind_screening' in (body || {})) f.blind_screening = !!body.blind_screening;
      return ok({ form: f }, b);
    }
  }

  if (parts[0] === 'applicants') {
    const aid = parts[1];
    if (!aid || aid === 'funnel') {
      const cid = q.get('cohort_id');
      if (method === 'GET' && !cid) return fail(400, 'cohort_id required');
      if (aid === 'funnel') return ok(funnelPayload(b, cid));
      if (method === 'GET') return ok(applicantsPayload(b, cid));
      if (method === 'POST') {
        if (!isManager) return fail(403, 'Manager role required');
        const name = String(body?.full_name || '').trim();
        if (!name) return fail(400, 'full_name required');
        b.seq += 1;
        const row = {
          id: applicantId(900 + b.seq),
          cohort_id: body.cohort_id,
          full_name: name,
          email: body.email || null,
          program: body.program || null,
          year: body.year || null,
          source: body.source || null,
          stage: 'applied',
          rejected_reason: null,
          responses: {},
          applied_at: new Date().toISOString(),
          provisioned_member_id: null,
          is_demo: true,
        };
        b.applicants.push(row);
        return { status: 201, json: { applicant: row }, bundle: b };
      }
    }
    const a = b.applicants.find((x) => x.id === aid);
    if (!a) return fail(404, 'Applicant not found');
    const sub = parts[2];
    if (sub === 'scores' && method === 'GET') {
      const nameById = new Map(b.members.map((m) => [m.id, m.display_name]));
      nameById.set(v.memberId, b.viewerName);
      return ok(
        scoresView(
          b.scores.filter((s) => s.applicant_id === aid),
          { memberId: v.memberId, role: v.role, nameById },
        ),
      );
    }
    if (sub === 'scores' && method === 'POST') {
      const list = Array.isArray(body?.scores) ? body.scores : [];
      if (!list.length) return fail(400, 'scores array required');
      for (const s of list) {
        if (!RUBRIC_CRITERIA.includes(s.criterion))
          return fail(400, `Invalid criterion: ${s.criterion}`);
        const n = Number(s.score);
        if (!Number.isFinite(n) || n < 0 || n > 5)
          return fail(400, 'score must be between 0 and 5');
        b.scores = b.scores.filter(
          (x) =>
            !(
              x.applicant_id === aid &&
              x.interviewer_id === v.memberId &&
              x.criterion === s.criterion
            ),
        );
        b.scores.push({
          applicant_id: aid,
          interviewer_id: v.memberId,
          criterion: s.criterion,
          score: n,
          weight: 1,
          notes: s.notes || null,
          submitted_at: body.submit ? new Date().toISOString() : null,
        });
      }
      return ok({ ok: true, submitted: body.submit === true }, b);
    }
    if (sub === 'provision' && method === 'POST') {
      if (!isManager) return fail(403, 'Manager role required');
      if (a.stage !== 'offer') return fail(400, 'Only an applicant with an offer can be accepted.');
      if (!a.email)
        return fail(400, 'Applicant has no email, cannot create an account to provision.');
      const mid = nextId('member');
      b.members.push({
        id: mid,
        user_id: `${mid}-user`,
        display_name: a.full_name,
        role: 'analyst',
        title: body?.title || 'Junior Analyst',
        cohort_id: a.cohort_id,
        lifecycle_status: 'onboarding',
        is_active: true,
        is_graduating: false,
        joined_at: new Date().toISOString(),
        mentor_member_id: body?.mentor_member_id || null,
        departed_at: null,
        departure_reason: null,
        is_demo: true,
      });
      a.stage = 'accepted';
      a.provisioned_member_id = mid;
      return ok(
        { member: { id: mid }, applicant: a, welcomeEmail: { sent: false, sample: true } },
        b,
      );
    }
    if (!sub && method === 'PATCH') {
      if (!isManager) return fail(403, 'Manager role required');
      const st = body?.stage;
      if (st) {
        if (!ATS_STAGES.includes(st)) return fail(400, 'Invalid stage');
        if (st === 'accepted' && !a.provisioned_member_id)
          return fail(400, 'Use POST /provision to accept, it creates the member row.');
        a.stage = st;
        a.rejected_reason =
          st === 'rejected' || st === 'declined' ? body.rejected_reason || null : null;
      }
      return ok({ applicant: shapeApplicant(a, { blind: blindOf(b, a.cohort_id) }) }, b);
    }
  }

  if (parts[0] === 'alumni') {
    if (method === 'GET') return ok(alumniPayload(b, q));
    if (method === 'PATCH') {
      if (!isManager) return fail(403, 'Manager role required');
      const r = b.alumni.find((x) => x.id === body?.id);
      if (!r) return fail(404, 'Record not found');
      for (const k of ['employer', 'employer_industry', 'role_title', 'linkedin_url'])
        if (k in body) r[k] = body[k] || null;
      if ('placed_within_6mo' in body) r.placed_within_6mo = !!body.placed_within_6mo;
      if (Array.isArray(body.engagement_flags))
        r.engagement_flags = [...new Set(body.engagement_flags)];
      return ok({ record: r }, b);
    }
  }

  return fail(404, 'Not available in sample content');
}

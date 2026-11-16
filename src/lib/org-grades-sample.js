/**
 * Sample content for Grades (/org-team-hub/grades).
 *
 * Served ONLY to master admin and demo accounts who are council members, by
 * GET /api/org/grades/sample, so the page can be reviewed and presented from
 * a council with few grades. Real councils never receive it, and the page
 * labels it "Sample content" while it shows. Nothing here is read from or
 * written to the database: while it shows, entering or changing a grade is
 * applied on the page by `applySampleAction` (the same checks the route
 * applies) and is gone on reload.
 *
 * The council is the same sample council every rebuilt Team Hub page shows
 * (the nine people of the Trading Desk bundle, same ids and roles; the
 * analysts are the current analyst class, the portfolio managers last
 * year's). Graders are executives only: an invented faculty advisor, Hana
 * Girma, and the viewer when the viewer is an executive (otherwise an
 * invented council president, Rahel Mensah). Names are invented.
 *
 * Grades are sensitive. A viewer who is not an executive receives ONLY their
 * own sample grades, in the member shape (`memberGradeView`): no roster, no
 * cohort list and nobody else's entry, exactly what the live route sends.
 *
 * Pure: no React, no fetch, no server imports. Every row carries is_demo.
 */
import { memberGradeView } from './org-grades-model.js';

const DAY = 86400000;
const id = (prefix, n) => `sample-${prefix}-${String(n).padStart(3, '0')}`;
const userOf = (n) => id('user', n);

/* The Trading Desk sample's people (same numbers, so the ids match). */
const PEOPLE = {
  tesfaye: { n: 1, name: 'Amara Tesfaye', role: 'analyst' },
  bekele: { n: 2, name: 'Mikael Bekele', role: 'analyst' },
  haile: { n: 3, name: 'Selam Haile', role: 'portfolio_manager' },
  okoye: { n: 4, name: 'Chidi Okoye', role: 'portfolio_manager' },
  lindqvist: { n: 5, name: 'Ingrid Lindqvist', role: 'portfolio_manager' },
  park: { n: 6, name: 'Daniel Park', role: 'portfolio_manager' },
  rossi: { n: 7, name: 'Elena Rossi', role: 'analyst' },
  weber: { n: 8, name: 'Jonas Weber', role: 'analyst' },
  alvarez: { n: 9, name: 'Tomas Alvarez', role: 'analyst' },
};

const ADVISOR = { user_id: 'sample-user-advisor', name: 'Hana Girma' };
const PRESIDENT = { user_id: 'sample-user-president', name: 'Rahel Mensah' };

const PITCH_RUBRIC = [
  { name: 'Thesis clarity', points: 18, max: 20 },
  { name: 'Evidence', points: 18, max: 20 },
  { name: 'Valuation', points: 19, max: 20 },
  { name: 'Risk framing', points: 18, max: 20 },
  { name: 'Delivery', points: 18, max: 20 },
];

/*
 * One entry per grade: [who, kind, score, max, letter, grader, days ago
 * entered, days ago last changed (null when never changed), feedback,
 * rubric]. `adv` is the faculty advisor, `exec` the second executive.
 */
const GRADES = [
  [
    'tesfaye',
    'pitch',
    91,
    100,
    'A-',
    'adv',
    2,
    null,
    'Clear thesis and setup. Strong support and thoughtful risks.',
    PITCH_RUBRIC,
  ],
  [
    'tesfaye',
    'overall',
    89,
    100,
    'A-',
    'adv',
    2,
    null,
    'Consistent work across pitches, notes and coverage this term.',
    null,
  ],
  [
    'tesfaye',
    'research_note',
    88,
    100,
    'B+',
    'exec',
    9,
    null,
    'Well sourced. The margin bridge could be shown step by step.',
    null,
  ],
  [
    'tesfaye',
    'coverage',
    88,
    100,
    'B+',
    'exec',
    13,
    null,
    'Solid coverage. Comparables were well chosen.',
    null,
  ],
  [
    'tesfaye',
    'participation',
    90,
    100,
    'A-',
    'adv',
    16,
    null,
    'Active and thoughtful in committee discussion.',
    null,
  ],
  [
    'tesfaye',
    'coverage',
    87,
    100,
    'B+',
    'adv',
    19,
    null,
    'Balanced analysis of both sides of the debate.',
    null,
  ],
  [
    'bekele',
    'research_note',
    88,
    100,
    'B+',
    'exec',
    3,
    null,
    'Solid analysis and sources.',
    [
      { name: 'Analysis', points: 34, max: 40 },
      { name: 'Clarity', points: 26, max: 30 },
      { name: 'Sourcing', points: 28, max: 30 },
    ],
  ],
  [
    'bekele',
    'pitch',
    84,
    100,
    'B',
    'adv',
    20,
    6,
    'Good thesis. The bear case needs numbers behind it.',
    null,
  ],
  [
    'haile',
    'coverage',
    84,
    100,
    'B',
    'adv',
    4,
    null,
    'Thoughtful coverage of the sector, with a clear catalyst list.',
    null,
  ],
  [
    'okoye',
    'participation',
    95,
    100,
    'A',
    'exec',
    5,
    null,
    'Consistently engaged and prepared for every vote.',
    null,
  ],
  [
    'lindqvist',
    'pitch',
    88,
    100,
    'B+',
    'adv',
    6,
    null,
    'Well structured valuation. Sizing was argued clearly.',
    [
      { name: 'Thesis clarity', points: 17, max: 20 },
      { name: 'Evidence', points: 18, max: 20 },
      { name: 'Valuation', points: 19, max: 20 },
      { name: 'Risk framing', points: 17, max: 20 },
      { name: 'Delivery', points: 17, max: 20 },
    ],
  ],
  ['lindqvist', 'research_note', 45, 50, 'A-', 'exec', 12, null, 'Concise and well argued.', null],
  [
    'rossi',
    'research_note',
    92,
    100,
    'A-',
    'exec',
    8,
    null,
    'Strong research and a clear point of view.',
    null,
  ],
  [
    'rossi',
    'coverage',
    86,
    100,
    'B',
    'adv',
    15,
    4,
    'Good initiation. Update the model after earnings.',
    null,
  ],
  ['weber', 'participation', 85, 100, 'B', 'adv', 10, null, '', null],
  ['weber', 'coverage', null, 100, null, 'adv', 11, null, '', null],
];

/* The viewer's own grades when the viewer is an analyst or portfolio manager. */
const OWN = [
  [
    'pitch',
    91,
    100,
    'A-',
    'adv',
    2,
    null,
    'Clear thesis and setup. Strong support and thoughtful risks.',
    PITCH_RUBRIC,
  ],
  [
    'overall',
    89,
    100,
    'A-',
    'adv',
    2,
    null,
    'Consistent work across pitches, notes and coverage this term.',
    null,
  ],
  [
    'research_note',
    88,
    100,
    'B+',
    'exec',
    9,
    null,
    'Well sourced. The margin bridge could be shown step by step.',
    null,
  ],
  ['coverage', 88, 100, 'B+', 'exec', 13, 5, 'Solid coverage. Comparables were well chosen.', null],
  [
    'participation',
    90,
    100,
    'A-',
    'adv',
    16,
    null,
    'Active and thoughtful in committee discussion.',
    null,
  ],
];

/**
 * @param {{ userId: string, role: string, displayName?: string, now?: number }} viewer
 */
export function buildGradesSample({ userId, role, displayName, now = Date.now() }) {
  const canGrade = role === 'executive';
  const ago = (days, hour = 15) => {
    const d = new Date(now - days * DAY);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };
  const exec = canGrade ? { user_id: userId, name: displayName || 'You' } : PRESIDENT;
  const graderOf = (k) => (k === 'adv' ? ADVISOR : exec);
  const year = new Date(now).getFullYear();
  const cohorts = [
    { id: id('cohort', 1), name: `${year} analyst class` },
    { id: id('cohort', 2), name: `${year - 1} analyst class` },
  ];
  const cohortFor = (role_) => (role_ === 'analyst' ? cohorts[0].id : cohorts[1].id);
  const viewer = { userId, canGrade, name: displayName || 'You' };

  if (!canGrade) {
    const grades = OWN.map(([kind, score, max, letter, by, days, changed, feedback, rubric], i) =>
      memberGradeView({
        id: id('grade-own', i + 1),
        work_type: kind,
        score,
        max_score: max,
        letter,
        feedback: feedback || null,
        rubric,
        grader_name: graderOf(by).name,
        created_at: ago(days),
        updated_at: ago(changed ?? days),
        is_demo: true,
      }),
    );
    return {
      viewer,
      visibility: 'visible',
      gradingHidden: false,
      grades,
      roster: [],
      cohorts: [],
      sample: true,
    };
  }

  const roster = Object.values(PEOPLE).map((p) => ({
    user_id: userOf(p.n),
    display_name: p.name,
    role: p.role,
    cohort_id: cohortFor(p.role),
    is_demo: true,
  }));
  const grades = GRADES.map(
    ([who, kind, score, max, letter, by, days, changed, feedback, rubric], i) => {
      const p = PEOPLE[who];
      const g = graderOf(by);
      return {
        id: id('grade', i + 1),
        student_id: userOf(p.n),
        student_name: p.name,
        cohort_id: cohortFor(p.role),
        work_type: kind,
        score,
        max_score: max,
        letter,
        feedback: feedback || null,
        rubric,
        graded_by: g.user_id,
        grader_name: g.name,
        created_at: ago(days),
        updated_at: ago(changed ?? days),
        is_demo: true,
      };
    },
  );
  return {
    viewer,
    visibility: 'visible',
    gradingHidden: false,
    grades,
    roster,
    cohorts,
    sample: true,
  };
}

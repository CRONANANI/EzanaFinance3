/**
 * Council learning on the Learning Center (/learning-center).
 *   npm run test:council-learning
 *
 * The model's counting rules, the sample council (agrees with the Grades,
 * Assignments, Cohorts and Recognition samples), the routes' access rules
 * (own grades only, never another member's; managers only for team progress;
 * RLS-scoped reads) and the page's gating (the hub unchanged for everyone
 * else, the band only for council members once membership is known).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  NA,
  advisorQueue,
  assignedRows,
  contextFigures,
  fmtDay,
  gradeRows,
  onboardingView,
  pathItems,
  statusKey,
  teamRows,
} from '../src/lib/org-learning-model.js';
import { buildLearningCouncilSample } from '../src/lib/org-learning-sample.js';
import { buildGradesSample } from '../src/lib/org-grades-sample.js';
import { buildAssignmentsSample } from '../src/lib/org-assignments-sample.js';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const NOW = Date.UTC(2026, 10, 16, 15);
const DAY = 86400000;
const iso = (d) => new Date(NOW + d * DAY).toISOString();

test('status words: done, handed in, overdue, due soon, assigned', () => {
  assert.equal(statusKey({ status: 'graded', due_date: iso(-5) }, NOW), 'done');
  assert.equal(statusKey({ status: 'completed', due_date: null }, NOW), 'done');
  assert.equal(statusKey({ status: 'submitted', due_date: iso(-5) }, NOW), 'submitted');
  assert.equal(statusKey({ status: 'assigned', due_date: iso(-1) }, NOW), 'overdue');
  assert.equal(statusKey({ status: 'assigned', due_date: iso(2) }, NOW), 'due_soon');
  assert.equal(statusKey({ status: 'in_progress', due_date: iso(9) }, NOW), 'in_progress');
  assert.equal(statusKey({ status: 'assigned', due_date: null }, NOW), 'assigned');
  assert.equal(fmtDay(null), NA);
});

test('assigned to me: own reading work and council items, open first, others counted', () => {
  const a = assignedRows(
    {
      assignments: [
        {
          id: '1',
          title: 'Read',
          type: 'reading',
          status: 'assigned',
          due_date: iso(5),
          mine: true,
        },
        {
          id: '2',
          title: 'Pitch',
          type: 'pitch',
          status: 'assigned',
          due_date: iso(5),
          mine: true,
        },
        {
          id: '3',
          title: 'Theirs',
          type: 'reading',
          status: 'assigned',
          due_date: iso(1),
          mine: false,
        },
        {
          id: '4',
          title: 'Old',
          type: 'reading',
          status: 'complete',
          due_date: iso(-9),
          mine: true,
        },
      ],
      learningItems: [{ id: 'l', title: 'Video', status: 'assigned', due_date: iso(-1) }],
    },
    NOW,
  );
  assert.deepEqual(
    a.rows.map((r) => r.title),
    ['Video', 'Read', 'Old'],
  );
  assert.equal(a.open, 2);
  assert.equal(a.overdue, 1);
  assert.equal(a.others, 1);
});

test('onboarding gate: ready only when every gate task is done', () => {
  const v = onboardingView({
    cohortName: 'C',
    gateEnabled: true,
    tasks: [
      { id: 'a', title: 'A', is_gate: false, done: true },
      { id: 'b', title: 'B', is_gate: true, done: false },
    ],
  });
  assert.equal(v.remaining, 1);
  assert.equal(v.gateMissing, 1);
  assert.equal(v.ready, false);
  assert.equal(onboardingView({ tasks: [] }), null);
});

test('grades: newest participation and overall, N/A when missing, never weighted', () => {
  const g = gradeRows([
    { work_type: 'overall', score: 80, max_score: 100, letter: 'B', created_at: iso(-9) },
    { work_type: 'overall', score: 84, max_score: 100, letter: 'B+', created_at: iso(-1) },
    { work_type: 'pitch', score: 90, max_score: 100, letter: 'A-', created_at: iso(-1) },
  ]);
  assert.equal(g.rows[0].score, NA);
  assert.equal(g.rows[1].score, '84 / 100');
  assert.equal(g.rows[1].letter, 'B+');
  assert.equal(g.more, 2);
});

test('team progress and advisor queue count from assignments; no course progress', () => {
  const roster = [
    { member_id: 'm1', user_id: 'u1', display_name: 'Viewer', role: 'portfolio_manager' },
    { member_id: 'm2', user_id: 'u2', display_name: 'Ana', role: 'analyst' },
  ];
  const assignments = [
    {
      id: 'x',
      title: 'X',
      status: 'complete',
      due_date: iso(-3),
      assignees: [{ member_id: 'm2', name: 'Ana' }],
    },
    {
      id: 'y',
      title: 'Y',
      status: 'assigned',
      due_date: iso(-1),
      assignees: [{ member_id: 'm2', name: 'Ana' }],
    },
    {
      id: 'z',
      title: 'Z',
      status: 'submitted',
      due_date: iso(4),
      assignees: [{ member_id: 'm2', name: 'Ana' }],
    },
  ];
  const rows = teamRows(
    { assignments, roster, learningScores: { m2: 61.2 }, viewerUserId: 'u1' },
    NOW,
  );
  assert.equal(rows.length, 1);
  assert.deepEqual(
    [rows[0].done, rows[0].total, rows[0].overdue, rows[0].dueWeek, rows[0].learning],
    [1, 3, 1, 1, 61.2],
  );
  const q = advisorQueue(assignments, NOW);
  assert.deepEqual(
    q.rows.map((r) => [r.title, r.status]),
    [
      ['Y', 'overdue'],
      ['Z', 'submitted'],
    ],
  );
  const src = read('src/lib/org-learning-model.js');
  assert.doesNotMatch(src, /user_learning_progress|user_elo|quiz_score/);
});

test('context strip is learning context only, never fund figures', () => {
  const f = contextFigures({ council: { name: 'C' }, viewer: { role: 'analyst' } }, null);
  assert.deepEqual(Object.keys(f).sort(), [
    'cohort',
    'council',
    'nextDue',
    'open',
    'role',
    'university',
  ]);
  assert.equal(f.open, NA);
  const ui = read('src/components/learning/council/CouncilLearning.jsx');
  assert.doesNotMatch(ui, /Fund value|Since inception|SPY|Positions/);
});

test('sample: same council, own grades only, managers-only parts, labelled rows', () => {
  const viewer = { userId: 'u-1', memberId: 'm-1', displayName: 'Viewer', now: NOW };
  const analyst = buildLearningCouncilSample({ ...viewer, role: 'analyst' });
  assert.equal(analyst.roster, null);
  assert.equal(analyst.learningScores, null);
  assert.ok(analyst.assignments.every((a) => a.mine && !('assignees' in a) && a.is_demo));
  assert.ok(analyst.grades.grades.every((g) => !('student_id' in g) && !('student_name' in g)));
  const own = buildGradesSample({ userId: 'u-1', role: 'analyst', now: NOW }).grades;
  assert.deepEqual(
    analyst.grades.grades.map((g) => [g.work_type, g.score, g.letter]),
    own.map((g) => [g.work_type, g.score, g.letter]),
  );
  const exec = buildLearningCouncilSample({ ...viewer, role: 'executive' });
  assert.ok(exec.roster.length > 0);
  assert.ok(exec.grades.grades.every((g) => !('student_id' in g)));
  const board = buildAssignmentsSample({ ...viewer, role: 'executive' }).board;
  assert.equal(exec.assignments.length, board.assignments.length);
  const titles = new Set(board.assignments.map((a) => a.title));
  assert.ok(exec.assignments.every((a) => titles.has(a.title)));
  assert.equal(exec.council.name, 'Sample council');
  const onb = onboardingView(exec.onboarding);
  assert.deepEqual([onb.done, onb.remaining, onb.gateMissing, onb.ready], [1, 3, 2, false]);
  assert.equal(pathItems(exec.content).length, 4);
  /* Invented names only: the shared sample council. */
  const text = JSON.stringify(exec);
  for (const n of ['Amara Tesfaye', 'Selam Haile']) assert.ok(text.includes(n));
});

test('routes: RLS-scoped, own grades only, sample only for demo viewers', () => {
  const loader = read('src/app/api/org/learning/_loader.js');
  const route = read('src/app/api/org/learning/route.js');
  const sample = read('src/app/api/org/learning/sample/route.js');
  for (const src of [loader, route, sample])
    assert.doesNotMatch(src, /getAdminClient|service_role/);
  assert.match(route, /getUserClient\(\)/);
  assert.match(route, /requireAuth: true/);
  assert.match(route, /status: 403/);
  assert.match(loader, /g\.student_id === member\.user_id/);
  assert.match(loader, /\.map\(memberGradeView\)/);
  assert.match(loader, /gradingHidden\) return \{ hidden: true, grades: \[\] \}/);
  assert.match(loader, /\.eq\('submitted_by', member\.user_id\)/);
  assert.match(loader, /\.eq\('assigned_to', member\.user_id\)/);
  assert.match(loader, /manager \? learningScoresPart/);
  assert.match(loader, /roster: manager \? asg\.roster : null/);
  assert.doesNotMatch(loader, /user_learning_progress|user_elo/);
  assert.match(sample, /isCommunityDemoViewer\(user\)/);
  assert.match(sample, /\{ sample: null \}/);
});

test('page gating: hub unchanged for everyone else; band for council members only', () => {
  const hub = read('src/components/learning/hub/LearningHub.jsx');
  assert.match(hub, /const councilReady = Boolean\(isOrgUser && !orgLoading\)/);
  assert.match(hub, /\{councilReady \? \(\s*<CouncilLearning/);
  const hook = read('src/components/learning/council/useCouncilLearning.js');
  assert.match(hook, /if \(!enabled\) return/);
  assert.doesNotMatch(hook, /method: '(POST|PATCH|DELETE)'/);
  const ui = read('src/components/learning/council/CouncilLearning.jsx');
  assert.doesNotMatch(ui, /lh-primary|fetch\(/);
  assert.match(ui, /Sample content/);
  assert.match(ui, /Private course progress is not shown/);
  const css = read('src/components/learning/council/council-learning.css').replace(
    /\/\*[\s\S]*?\*\//g,
    '',
  );
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgba?\(|box-shadow|inset 2px/i);
});

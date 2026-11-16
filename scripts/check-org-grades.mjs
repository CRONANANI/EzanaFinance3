/**
 * Grades (/org-team-hub/grades, Nov 2026 redesign).
 *   npm run test:org-grades
 *
 * Pure checks on the page model and the sample bundle, and source guards for
 * the rules that are easy to regress: a member receives only their own
 * grades (in real and sample mode) and nothing while visibility is paused,
 * Overall is left out of averages, scores are checked, there is no
 * score-to-letter fill, only executives write, and the dialog is the ds Modal.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  applySampleAction,
  averageOf,
  cohortSummary,
  councilMetrics,
  filterGrades,
  fmtScore,
  isRecent,
  memberGradeView,
  memberRecord,
  membersWithoutGrades,
  rubricRows,
  validateGrade,
} from '../src/lib/org-grades-model.js';
import { buildGradesSample } from '../src/lib/org-grades-sample.js';

const read = (p) => fs.readFileSync(p, 'utf8');
const NOW = Date.UTC(2026, 10, 15, 12);
const DAY = 86400000;

test('average leaves out Overall and blank scores, and is unweighted by maximum', () => {
  const rows = [
    { work_type: 'pitch', score: 90, max_score: 100 },
    { work_type: 'research_note', score: 5, max_score: 10 },
    { work_type: 'overall', score: 10, max_score: 100 },
    { work_type: 'coverage', score: null, max_score: 100 },
  ];
  assert.equal(averageOf(rows).value, 70);
  assert.equal(averageOf(rows).n, 2);
  assert.equal(averageOf([{ work_type: 'overall', score: 80, max_score: 100 }]).value, null);
  assert.equal(fmtScore({ score: null }), 'N/A');
  assert.equal(fmtScore({ score: 45, max_score: 50 }), '45/50');
});

test('validation refuses negative, above-maximum and zero-maximum scores', () => {
  const base = { student_id: 'u', work_type: 'pitch', max_score: '100', letter: '', feedback: '' };
  assert.ok(validateGrade({ ...base, score: '' }).score);
  assert.ok(validateGrade({ ...base, score: '-1' }).score);
  assert.ok(validateGrade({ ...base, score: '101' }).score);
  assert.ok(validateGrade({ ...base, score: '5', max_score: '0' }).max_score);
  assert.ok(validateGrade({ ...base, score: '5', student_id: '' }).student_id);
  assert.ok(validateGrade({ ...base, score: '5', work_type: 'exam' }).work_type);
  assert.ok(validateGrade({ ...base, score: '5', letter: 'ABCDE' }).letter);
  assert.deepEqual(validateGrade({ ...base, score: '100' }), {});
  assert.deepEqual(validateGrade({ score: 5, max_score: 10 }, { mode: 'edit' }), {});
});

test('recently changed uses only the last-changed date', () => {
  assert.equal(
    isRecent(
      {
        created_at: new Date(NOW - 40 * DAY).toISOString(),
        updated_at: new Date(NOW - 3 * DAY).toISOString(),
      },
      NOW,
    ),
    true,
  );
  assert.equal(isRecent({ created_at: new Date(NOW - 40 * DAY).toISOString() }, NOW), false);
});

test('rubric rows accept the stored free-form shapes', () => {
  assert.deepEqual(rubricRows({ thesis: 28 }), [{ name: 'Thesis', points: 28, max: null }]);
  assert.deepEqual(rubricRows([{ name: 'Evidence', points: 18, max: 20 }]), [
    { name: 'Evidence', points: 18, max: 20 },
  ]);
  assert.deepEqual(rubricRows(null), []);
});

test('executive sample: shared council, executive graders, consistent counts', () => {
  const b = buildGradesSample({ userId: 'me', role: 'executive', displayName: 'Exec', now: NOW });
  assert.equal(b.viewer.canGrade, true);
  assert.equal(b.roster.length, 9);
  const names = b.roster.map((m) => m.display_name).sort();
  assert.deepEqual(names, [
    'Amara Tesfaye',
    'Chidi Okoye',
    'Daniel Park',
    'Elena Rossi',
    'Ingrid Lindqvist',
    'Jonas Weber',
    'Mikael Bekele',
    'Selam Haile',
    'Tomas Alvarez',
  ]);
  const graders = new Set(b.grades.map((g) => g.grader_name));
  assert.deepEqual([...graders].sort(), ['Exec', 'Hana Girma']);
  const m = councilMetrics(b.roster, b.grades);
  assert.equal(m.gradedMembers, 7);
  assert.equal(m.noGrade, 2);
  assert.deepEqual(
    membersWithoutGrades(b.roster, b.grades)
      .map((x) => x.display_name)
      .sort(),
    ['Daniel Park', 'Tomas Alvarez'],
  );
  const cs = cohortSummary(b.roster, b.grades, b.cohorts);
  assert.deepEqual(
    cs.map((c) => `${c.graded}/${c.size}`),
    ['4/5', '3/4'],
  );
  assert.ok(b.grades.every((g) => g.is_demo));
  assert.equal(filterGrades(b.grades, { tab: 'feedback', now: NOW }).length, 2);
  const rec = memberRecord(b.grades.filter((g) => g.student_name === 'Amara Tesfaye'));
  assert.equal(rec.entries.length, 6);
  assert.ok(rec.byKind.some((k) => k.key === 'overall'));
});

test('member sample carries only the viewer’s own grades, in the member shape', () => {
  for (const role of ['analyst', 'portfolio_manager']) {
    const b = buildGradesSample({ userId: 'me', role, displayName: 'Me', now: NOW });
    assert.equal(b.viewer.canGrade, false);
    assert.deepEqual(b.roster, []);
    assert.deepEqual(b.cohorts, []);
    const text = JSON.stringify(b);
    for (const other of [
      'Tesfaye',
      'Bekele',
      'Haile',
      'Okoye',
      'Lindqvist',
      'Park',
      'Rossi',
      'Weber',
      'Alvarez',
    ]) {
      assert.ok(!text.includes(other), `${role} sample leaks ${other}`);
    }
    for (const g of b.grades) {
      assert.equal(g.student_id, undefined);
      assert.equal(g.graded_by, undefined);
      assert.equal(g.cohort_id, undefined);
    }
    assert.equal(
      applySampleAction(b, {
        type: 'create',
        form: { student_id: 'me', work_type: 'pitch', score: '1', max_score: '10' },
      }).ok,
      false,
    );
  }
});

test('memberGradeView drops other people’s ids and links', () => {
  const v = memberGradeView({
    id: 'g',
    student_id: 's',
    graded_by: 'x',
    cohort_id: 'c',
    work_id: 'w',
    org_id: 'o',
    work_type: 'pitch',
    score: 1,
  });
  for (const k of ['student_id', 'graded_by', 'cohort_id', 'work_id', 'org_id'])
    assert.equal(k in v, false);
});

test('sample actions apply locally with the route’s checks', () => {
  const b = buildGradesSample({ userId: 'me', role: 'executive', displayName: 'Exec', now: NOW });
  const bad = applySampleAction(b, {
    type: 'create',
    form: { student_id: 'sample-user-009', work_type: 'pitch', score: '120', max_score: '100' },
  });
  assert.equal(bad.ok, false);
  const ok = applySampleAction(
    b,
    {
      type: 'create',
      form: {
        student_id: 'sample-user-009',
        work_type: 'pitch',
        score: '80',
        max_score: '100',
        letter: '',
      },
    },
    NOW,
  );
  assert.equal(ok.ok, true);
  const row = ok.bundle.grades.find((g) => g.id === ok.id);
  assert.equal(row.letter, null, 'no letter is filled in from the score');
  const outsider = applySampleAction(b, {
    type: 'create',
    form: { student_id: 'nobody', work_type: 'pitch', score: '80', max_score: '100' },
  });
  assert.equal(outsider.ok, false);
  const upd = applySampleAction(
    b,
    { type: 'update', id: b.grades[0].id, form: { score: '50', max_score: '100' } },
    NOW + DAY,
  );
  assert.equal(upd.bundle.grades[0].score, 50);
  assert.equal(upd.bundle.grades[0].student_id, b.grades[0].student_id);
});

test('source guards: loader scopes members, routes check executives and scores', () => {
  const loader = read('src/app/api/org/grades/_loader.js');
  assert.match(loader, /\.eq\('student_id', member\.user_id\)/);
  assert.match(loader, /gradingHidden: true,\s+grades: \[\],\s+roster: \[\]/);
  assert.match(loader, /memberGradeView/);
  const route = read('src/app/api/org/grades/route.js');
  assert.equal((route.match(/assertOrgRole\(member, \['executive'\]\)/g) || []).length, 2);
  assert.equal((route.match(/validateGrade\(/g) || []).length, 2);
  assert.match(route, /GRADED_ROLES\.includes\(student\.role\)/);
  const sampleRoute = read('src/app/api/org/grades/sample/route.js');
  assert.match(sampleRoute, /isCommunityDemoViewer\(user\)/);
  const dialog = read('src/components/org/grades/GradeDialog.jsx');
  assert.match(dialog, /<Modal/);
  const css = read('src/components/org/grades/grades.css');
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b/i);
  assert.doesNotMatch(css, /rgba?\(/);
  assert.doesNotMatch(css, /surface-card-hover/);
});

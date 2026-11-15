/**
 * Assignments (/org-team-hub/assignments, Nov 2026 redesign).
 *   npm run test:org-assignments
 *
 * Pure checks on the page model and the sample bundle, plus source guards for
 * the rules that are easy to regress: a tab count equals the rows it shows, a
 * row only offers a step on the status path, everyone a piece of work was
 * given to can start and submit it, a return needs written feedback, the
 * sample council is the Command Center's, and the page claims nothing the
 * data cannot say (no per-person delivery, one score per grade).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  ALLOWED_FROM,
  TAB_KEYS,
  applySampleAction,
  assigneeSummary,
  canMove,
  computeAssignmentMetrics,
  createBody,
  exportRows,
  filterByTab,
  groupAssignments,
  nextAction,
  progressText,
  reviewQueue,
  searchAssignments,
  tabCounts,
  targetMatches,
  toCsv,
  toggleTarget,
  validateForm,
  workloadRows,
  EMPTY_FORM,
} from '../src/lib/org-assignments-model.js';
import { buildAssignmentsSample } from '../src/lib/org-assignments-sample.js';
import { buildCommandCenterSample } from '../src/lib/org-command-center-sample.js';
import { buildTradingDeskSample } from '../src/lib/org-trading-desk-sample.js';
import { targetMatchesMember } from '../src/lib/org-assignment-submit.js';

const read = (p) => fs.readFileSync(p, 'utf8');
const NOW = Date.UTC(2026, 10, 15, 12);
const sample = (role) =>
  buildAssignmentsSample({ userId: 'me', memberId: 'm-me', role, displayName: 'Viewer', now: NOW });

test('tabs: every count equals the rows the tab shows, and Archive is exclusive', () => {
  for (const role of ['executive', 'portfolio_manager', 'analyst']) {
    const { board } = sample(role);
    const counts = tabCounts(board.assignments);
    assert.deepEqual(board.tab_counts, counts);
    for (const k of TAB_KEYS) {
      const rows = filterByTab(board.assignments, k);
      assert.equal(counts[k], rows.length);
      const grouped = groupAssignments(rows, board.viewer).reduce((n, g) => n + g.rows.length, 0);
      assert.equal(grouped, rows.length, `${role}/${k}: every row is in exactly one group`);
      if (k === 'archive') assert.ok(rows.every((a) => a.archived));
      else assert.ok(rows.every((a) => !a.archived));
    }
  }
});

test('groups lead with what the viewer acts on', () => {
  const exec = sample('executive').board;
  const an = sample('analyst').board;
  assert.equal(
    groupAssignments(filterByTab(exec.assignments, 'all'), exec.viewer)[0].key,
    'review',
  );
  assert.equal(groupAssignments(filterByTab(an.assignments, 'all'), an.viewer)[0].key, 'returned');
});

test('next action: only steps on the status path, only for people the server accepts', () => {
  const manager = { canAssign: true };
  const analyst = { canAssign: false };
  const a = (status, mine = false, extra = {}) => ({ status, mine, ...extra });
  assert.equal(nextAction(a('assigned', true), analyst).run, 'start');
  assert.equal(nextAction(a('in_progress', true), analyst).key, 'submit');
  assert.equal(nextAction(a('returned', true), analyst).key, 'resubmit');
  assert.equal(nextAction(a('submitted', true), analyst), null);
  assert.equal(nextAction(a('assigned', false), analyst), null);
  assert.equal(nextAction(a('submitted'), manager).run, 'review');
  assert.equal(nextAction(a('under_review'), manager).key, 'grade');
  assert.equal(nextAction(a('returned'), manager), null);
  assert.equal(nextAction(a('graded', false, { rubric_score: 4, rubric_max: 5 }), manager), null);
  assert.equal(
    nextAction(a('assigned'), manager),
    null,
    'a manager who is not an assignee has no row step',
  );
  /* Each step that is sent from a row is a legal move. */
  assert.ok(canMove('assigned', 'in_progress') && canMove('submitted', 'under_review'));
  assert.ok(!canMove('assigned', 'under_review') && !canMove('graded', 'returned'));
  assert.deepEqual(Object.keys(ALLOWED_FROM).sort(), [
    'complete',
    'graded',
    'in_progress',
    'returned',
    'submitted',
    'under_review',
  ]);
});

test('bug fix: work given through a team, cohort, role or the whole council offers Start and Submit', () => {
  const { board } = sample('analyst');
  const byTitle = (t) => board.assignments.find((x) => x.title.startsWith(t));
  for (const [title, type] of [
    ['Technology holdings review', 'team'],
    ['Semester onboarding checklist', 'cohort'],
    ['Council meeting prep', 'org'],
  ]) {
    const row = byTitle(title);
    assert.ok(row, title);
    assert.equal(row.assignee_targets[0].target_type, type);
    assert.equal(row.mine, true);
    assert.ok(nextAction(row, board.viewer), `${title}: a next step is offered`);
  }
  /* The page, the server and the database agree on who a target reaches. */
  const m = {
    id: 'm1',
    member_id: 'm1',
    team_id: 't1',
    cohort_id: 'c1',
    role: 'analyst',
    title: 'Junior Analyst',
  };
  for (const t of [
    { target_type: 'org' },
    { target_type: 'member', target_id: 'm1' },
    { target_type: 'team', target_id: 't1' },
    { target_type: 'team', target_id: 't2' },
    { target_type: 'cohort', target_id: 'c1' },
    { target_type: 'role', target_role: 'junior analyst' },
    { target_type: 'role', target_role: 'PM' },
  ]) {
    assert.equal(targetMatches(t, m), targetMatchesMember(t, m), JSON.stringify(t));
  }
  /* The loader and the detail route treat a readable row as the member's own. */
  const loader = read('src/app/api/org/assignments/_loader.js');
  assert.match(loader, /if \(!canAssign\) return true;/);
  assert.match(loader, /const mine =\s*\n?\s*!canAssign \|\|/);
  const detail = read('src/app/api/org/assignments/[id]/route.js');
  assert.match(detail, /assignment\.assigned_to === member\.user_id \|\| targeted \|\| !isManager/);
  assert.doesNotMatch(detail, /isAssignee: assignment\.assigned_to === member\.user_id/);
});

test('the server route and the page share one status path', () => {
  const route = read('src/app/api/org/assignments/route.js');
  assert.match(
    route,
    /import \{ ALLOWED_FROM, ASSIGNEE_STATUSES, MANAGER_STATUSES \} from '@\/lib\/org-assignments-model'/,
  );
  assert.doesNotMatch(route, /const ALLOWED_FROM/);
  assert.match(route, /A comment is required when returning for revision/);
});

test('sample writes follow the real rules and stay in the bundle', () => {
  let b = sample('executive');
  const id = (t) => b.board.assignments.find((x) => x.title === t).id;
  const frozen = JSON.stringify(b);
  let r = applySampleAction(
    b,
    { type: 'return', id: id('Bank earnings recap'), comment: '  ' },
    NOW,
  );
  assert.equal(r.ok, false, 'a return needs written feedback');
  assert.equal(JSON.stringify(b), frozen, 'a refused action changes nothing');
  r = applySampleAction(b, { type: 'approve', id: id('Healthcare sector note') }, NOW);
  assert.equal(r.ok, false, 'approve is not on the path from assigned');
  r = applySampleAction(
    b,
    { type: 'return', id: id('Bank earnings recap'), comment: 'Add a table.' },
    NOW,
  );
  assert.ok(r.ok);
  b = r.bundle;
  const row = b.board.assignments.find((x) => x.title === 'Bank earnings recap');
  assert.equal(row.status, 'returned');
  const d = b.details[row.id];
  assert.equal(d.comments.at(-1).is_return, true);
  assert.equal(row.comment_count, d.comments.length);
  assert.deepEqual(b.board.metrics, computeAssignmentMetrics(b.board.assignments, b.board.cohorts));
  r = applySampleAction(
    b,
    { type: 'grade', id: id('LLY valuation refresh'), score: '41', max: '50' },
    NOW,
  );
  assert.ok(r.ok);
  const graded = r.bundle.board.assignments.find((x) => x.title === 'LLY valuation refresh');
  assert.equal(graded.status, 'graded');
  assert.equal(graded.archived, true);
  assert.equal(graded.overdue, false, 'graded work is never overdue');

  let an = sample('analyst');
  const mine = an.board.assignments.find((x) => x.title === 'Technology holdings review');
  r = applySampleAction(an, { type: 'review', id: mine.id }, NOW);
  assert.equal(r.ok, false, 'an analyst cannot review');
  r = applySampleAction(an, { type: 'submit', id: mine.id, note: 'Done.' }, NOW);
  assert.ok(r.ok);
  an = r.bundle;
  assert.equal(an.details[mine.id].submissions[0].version, 1);
  assert.equal(an.board.assignments.find((x) => x.id === mine.id).status, 'submitted');
  r = applySampleAction(
    an,
    { type: 'create', form: { ...EMPTY_FORM, title: 'x' }, targets: [{ target_type: 'org' }] },
    NOW,
  );
  assert.equal(r.ok, false, 'an analyst cannot assign');
});

test('new assignment: title and one assignee are required; due date and instructions are not', () => {
  assert.deepEqual(Object.keys(validateForm(EMPTY_FORM, [])).sort(), ['targets', 'title']);
  const form = { ...EMPTY_FORM, title: ' Pitch ARM ', ticker: 'arm', sector: 'Tech' };
  const targets = [{ target_type: 'team', target_id: 't1', label: 'x' }];
  assert.deepEqual(validateForm(form, targets), {});
  const body = createBody(form, targets);
  assert.equal(body.title, 'Pitch ARM');
  assert.equal(body.ticker, 'ARM');
  assert.equal(body.due_date, null);
  assert.equal(body.instructions, null);
  assert.deepEqual(body.assignees, [{ target_type: 'team', target_id: 't1', target_role: null }]);
  assert.equal(
    createBody({ ...form, type: 'reading' }, targets).ticker,
    null,
    'ticker is for pitches',
  );
  assert.equal(createBody({ ...form, type: 'reading' }, targets).sector, null);
  /* Whole council stands alone. */
  const org = { target_type: 'org', target_id: null, target_role: null };
  assert.deepEqual(toggleTarget(targets, org), [org]);
  assert.equal(toggleTarget([org], targets[0]).length, 1);
  assert.equal(toggleTarget([org], targets[0])[0].target_type, 'team');
  /* A pitch with a ticker still seeds the Pitch Pipeline (server side). */
  assert.match(read('src/app/api/org/assignments/route.js'), /from\('org_pitches'\)/);
});

test('delivery is never shown per person', () => {
  const row = {
    status: 'submitted',
    version: 2,
    assignees: [{ name: 'A B' }, { name: 'C D' }, { name: 'E F' }],
  };
  assert.equal(progressText(row), 'Submitted');
  assert.equal(progressText({ status: 'in_progress', progress_pct: 40 }), 'In progress 40%');
  assert.equal(progressText({ status: 'in_progress', progress_pct: 0 }), 'In progress');
  const src = ['AssignmentList.jsx', 'AssignmentDetail.jsx', 'SideColumn.jsx']
    .map((f) => read(`src/components/org/assignments/${f}`))
    .join('\n');
  assert.doesNotMatch(src, /of \{[^}]*\} submitted|\} of \{/);
  assert.match(src, /Delivery is not tracked per person/);
  assert.doesNotMatch(src, /Download all|criterion|Criterion/);
});

test('assignee summary reads the stored targets', () => {
  const refs = { teams: [{ id: 't1', name: 'Technology' }], cohorts: [], roster: [] };
  const s = assigneeSummary(
    {
      assignees: [{ name: 'A B' }, { name: 'C D' }],
      assignee_targets: [{ target_type: 'team', target_id: 't1' }],
    },
    refs,
  );
  assert.equal(s.text, 'Technology (team)');
  assert.equal(s.group, true);
  assert.equal(s.count, 2);
  assert.equal(assigneeSummary({ assignees: [{ name: 'Amara Tesfaye' }] }).text, 'A. Tesfaye');
  assert.equal(assigneeSummary({ assignees: [] }).text, 'N/A');
});

test('search, review queue, workload and export', () => {
  const { board } = sample('executive');
  const refs = board;
  assert.equal(searchAssignments(board.assignments, 'nvda', refs).length, 1);
  assert.ok(searchAssignments(board.assignments, 'tesfaye', refs).length >= 3);
  assert.ok(searchAssignments(board.assignments, 'technology (team)', refs).length >= 1);
  const q = reviewQueue(board.assignments);
  assert.equal(q.length, board.metrics.awaiting_review);
  const wl = workloadRows(board.assignments, refs);
  assert.ok(wl.length >= 4);
  assert.ok(wl.every((r) => r.open > 0 && r.overdue <= r.open && r.awaiting_review <= r.open));
  const current = wl.find((r) => r.key === `cohort:${board.cohorts[0].id}`);
  assert.equal(
    current.open,
    board.assignments.filter((a) => !a.archived && a.cohort_id === board.cohorts[0].id).length,
  );
  const rows = exportRows(board.assignments);
  assert.equal(rows.length, board.assignments.length, 'export ignores the tab');
  assert.deepEqual(Object.keys(rows[0]), [
    'Title',
    'Type',
    'Status',
    'Assignees',
    'Due date',
    'Progress %',
    'Grade',
  ]);
  assert.ok(toCsv([{ Title: '=1+1' }]).includes(`"'=1+1"`), 'formula cells are neutralised');
});

test('metrics: counted from visible work; the change needs two terms', () => {
  const { board } = sample('executive');
  const m = board.metrics;
  assert.equal(m.open, board.assignments.filter((a) => !a.archived).length);
  assert.equal(m.overdue, board.assignments.filter((a) => a.overdue).length);
  assert.ok(m.completion_delta_pct != null);
  const one = computeAssignmentMetrics(board.assignments, [board.cohorts[0]]);
  assert.equal(one.completion_delta_pct, null);
  assert.equal(computeAssignmentMetrics([], []).completion_rate_pct, null);
  assert.match(
    read('src/app/api/org/assignments/_loader.js'),
    /computeAssignmentMetrics\(enriched/,
  );
});

test('the sample council is the Command Center and Trading Desk council', () => {
  const args = {
    userId: 'me',
    memberId: 'm-me',
    role: 'executive',
    displayName: 'Viewer',
    now: NOW,
  };
  const cc = buildCommandCenterSample(args);
  const desk = buildTradingDeskSample(args);
  const { board, details } = sample('executive');
  assert.equal(board.orgName, cc.summary.org.name);
  assert.equal(board.cohorts[0].name, cc.summary.statStrip.cohort);
  assert.deepEqual(
    board.teams.map((t) => `${t.id}:${t.name}`).sort(),
    cc.summary.sectors.map((s) => `${s.teamId}:${s.name}`).sort(),
  );
  const names = new Map(desk.members ? desk.members.map((x) => [x.user_id, x.display_name]) : []);
  for (const m of board.roster) {
    if (names.size && m.user_id !== 'me') assert.equal(names.get(m.user_id), m.display_name);
  }
  for (const a of cc.assignments.assignments) {
    const mine = board.assignments.find((x) => x.id === a.id);
    assert.ok(mine, a.title);
    assert.equal(mine.title, a.title);
    assert.equal(mine.status, a.status);
    assert.equal(mine.due_date, a.due_date);
    assert.equal(mine.assignee_name, a.assignee_name);
  }
  for (const a of board.assignments) {
    assert.equal(a.is_demo, true);
    const d = details[a.id];
    assert.equal(a.attachment_count, d.attachments.length);
    assert.equal(a.comment_count, d.comments.length);
    assert.equal(a.version, d.submissions.length);
    if (a.status === 'returned')
      assert.ok(
        d.comments.some((c) => c.is_return),
        `${a.title}: returned with feedback`,
      );
    if (a.ticker) assert.equal(a.type, 'pitch');
  }
  /* An analyst only receives their own work, and no templates. */
  const an = sample('analyst');
  assert.ok(an.board.assignments.length > 0 && an.board.assignments.every((a) => a.mine));
  assert.equal(an.board.templates.length, 0);
  assert.deepEqual(Object.keys(an.details).sort(), an.board.assignments.map((a) => a.id).sort());
});

test('sample content is gated and labelled; the page keeps the shell and the canvas rules', () => {
  const route = read('src/app/api/org/assignments/sample/route.js');
  assert.match(route, /isCommunityDemoViewer\(user\)/);
  assert.match(route, /sample: null/);
  assert.doesNotMatch(route, /getAdminClient/);
  const page = read('src/components/org/assignments/AssignmentsPage.jsx');
  assert.match(page, /Sample content/);
  assert.match(page, /Show council data/);
  assert.match(page, /dashboard-page-inset ez-canvas tcc-page oas-page/);
  assert.doesNotMatch(page, /TeamHubSidebar|TeamHubShell[^ (]/);
  const hook = read('src/components/org/assignments/useAssignmentsData.js');
  assert.match(hook, /ezana:org-nav-counts-refresh/);
  const css = read('src/components/org/assignments/assignments.css');
  assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  assert.doesNotMatch(css, /box-shadow:(?! none)/);
  const all = fs
    .readdirSync('src/components/org/assignments')
    .map((f) => read(`src/components/org/assignments/${f}`))
    .join('\n');
  assert.doesNotMatch(all, /—/);
  assert.doesNotMatch(all, /real-time|Supabase/i);
});

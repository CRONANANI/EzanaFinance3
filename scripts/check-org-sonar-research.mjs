/**
 * Sonar Research page (Nov 2026): the page model, the sample bundle and a
 * few source guards.
 *   npm run test:org-sonar-research
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as M from '../src/lib/org-sonar-research-model.js';
import * as S from '../src/lib/org-sonar-research-sample.js';

const at = (d) => new Date(Date.UTC(2026, 10, d)).toISOString();
const sample = (role) =>
  S.buildSonarResearchSample({
    userId: 'me',
    memberId: 'm-me',
    role,
    displayName: 'Sample Viewer',
  });

test('returned means back to draft after a review, not a new version of an approved report', () => {
  const base = { status: 'draft', author_id: 'a', reviewed_by: 'r' };
  assert.equal(M.isReturned({ ...base, submitted_at: at(1), reviewed_at: at(2) }), true);
  assert.equal(M.isReturned({ ...base, reviewed_at: at(2), approved_at: at(2) }), false);
  assert.equal(M.isReturned({ ...base, submitted_at: at(3), reviewed_at: at(2) }), false);
  assert.equal(M.isReturned({ ...base, status: 'under_review', reviewed_at: at(2) }), false);
  assert.equal(M.isReturned({ ...base, reviewed_at: null }), false);
});

test('needs you: reviewers see others under review, never their own', () => {
  const rows = [
    { id: '1', status: 'under_review', author_id: 'x', updated_at: at(1) },
    { id: '2', status: 'under_review', author_id: 'me', updated_at: at(2) },
    { id: '3', status: 'draft', author_id: 'me', updated_at: at(3) },
  ];
  const pm = M.needsYou(rows, { userId: 'me', role: 'portfolio_manager' });
  assert.deepEqual(
    pm.review.map((r) => r.id),
    ['1'],
  );
  const an = M.needsYou(rows, { userId: 'me', role: 'analyst', canApprove: false });
  assert.equal(an.review.length, 0);
  assert.deepEqual(
    an.mineUnderReview.map((r) => r.id),
    ['2'],
  );
  assert.deepEqual(
    an.drafts.map((r) => r.id),
    ['3'],
  );
  const granted = M.needsYou(rows, { userId: 'me', role: 'analyst', canApprove: true });
  assert.deepEqual(
    granted.review.map((r) => r.id),
    ['1'],
  );
});

test('rights mirror the server: authors never approve their own report', () => {
  const r = { author_id: 'me', status: 'under_review', kind: 'research' };
  const own = M.rightsFor(r, { userId: 'me', role: 'executive' });
  assert.equal(own.canApprove, false);
  assert.equal(own.canWithdraw, true);
  const other = M.rightsFor(r, { userId: 'pm', role: 'portfolio_manager' });
  assert.equal(other.canApprove, true);
  assert.equal(other.canWithdraw, false);
  const analyst = M.rightsFor(r, { userId: 'an', role: 'analyst' });
  assert.equal(analyst.canApprove, false);
  assert.equal(
    M.rightsFor({ ...r, status: 'draft' }, { userId: 'me', role: 'analyst' }).canDelete,
    true,
  );
  assert.equal(
    M.rightsFor({ ...r, status: 'superseded' }, { userId: 'x', role: 'analyst' }).canChallenge,
    false,
  );
  const src = fs.readFileSync('src/lib/org-sonar/server.js', 'utf8');
  for (const k of [
    'canSubmit',
    'canWithdraw',
    'canApprove',
    'canReturn',
    'canSupersede',
    'canChallenge',
    'canDelete',
  ])
    assert.match(src, new RegExp(`${k}:`));
});

test('mandate screen describes the screen, from the stored fit first', () => {
  assert.equal(M.mandateScreen({ thesisFit: 'fits', stance: 'pass' }).label, 'Within mandate');
  assert.equal(M.mandateScreen({ stance: 'watch' }).label, 'Review');
  assert.equal(M.mandateScreen({ stance: 'pass' }).label, 'Outside mandate');
  assert.equal(M.mandateScreen({}), null);
});

test('resolve is offered only to whom the row policy allows', () => {
  const c = { author_id: 'c' };
  assert.equal(M.canResolve(c, { userId: 'c', role: 'analyst' }, {}), true);
  assert.equal(M.canResolve(c, { userId: 'x', role: 'portfolio_manager' }, {}), true);
  assert.equal(M.canResolve(c, { userId: 'x', role: 'analyst' }, { isAuthor: true }), true);
  assert.equal(
    M.canResolve(c, { userId: 'x', role: 'analyst', canApprove: false }, { isAuthor: false }),
    false,
  );
});

test('comment threads keep replies under their comment and follow the version', () => {
  const rows = [
    { id: 'a', version: 1, created_at: at(1), resolved: false },
    { id: 'b', version: 2, created_at: at(2), resolved: false },
    { id: 'c', version: 2, parent_id: 'b', created_at: at(3), resolved: false },
    { id: 'd', version: 2, created_at: at(4), resolved: true },
  ];
  const v2 = M.commentThreads(rows, { version: 2 });
  assert.deepEqual(
    v2.threads.map((t) => t.id),
    ['b'],
  );
  assert.deepEqual(
    v2.threads[0].replies.map((t) => t.id),
    ['c'],
  );
  assert.equal(v2.resolved, 1);
  assert.equal(
    M.commentThreads(rows, { version: 2, scope: 'all', showResolved: true }).threads.length,
    3,
  );
});

test('filters come from the address, sanitized; visibility stays on the page', () => {
  const f = M.cleanFilters({
    status: 'approved',
    kind: 'nope',
    ticker: 'nvda;',
    mine: '1',
    visibility: 'org',
  });
  assert.deepEqual(f, {
    q: '',
    status: 'approved',
    kind: '',
    visibility: 'org',
    ticker: 'NVDA',
    mine: true,
  });
  assert.equal(M.serverQuery(f), 'status=approved&ticker=NVDA&mine=1');
  assert.equal(M.cleanTab('budget'), 'reports');
  assert.equal(M.cleanWindow('7'), '90');
});

test('the run form is not offered when the pool or the allocation is used', () => {
  assert.equal(M.runAllowance({ remaining: 0, me: {} }).reason, 'pool');
  assert.equal(
    M.runAllowance({ remaining: 5, me: { allocation: 3, deepRuns: 3 } }).reason,
    'allocation',
  );
  assert.equal(M.runAllowance({ remaining: 5, me: { allocation: null, deepRuns: 9 } }).ok, true);
});

test('sample: the same council, readable reports by the real rules, analysts see their own line', () => {
  const names = new Set([
    'Amara Tesfaye',
    'Mikael Bekele',
    'Selam Haile',
    'Chidi Okoye',
    'Ingrid Lindqvist',
    'Daniel Park',
    'Elena Rossi',
    'Jonas Weber',
    'Tomas Alvarez',
    'Sample Viewer',
  ]);
  const exec = sample('executive').raw;
  for (const r of exec.reports) {
    assert.ok(names.has(r.author_name), r.author_name);
    assert.equal(r.is_demo, true);
    assert.doesNotMatch(r.summary.conclusion, /\d/);
  }
  const execList = S.sampleReports(exec).reports.map((r) => r.ticker);
  const an = sample('analyst').raw;
  const anList = S.sampleReports(an).reports.map((r) => r.ticker);
  assert.ok(execList.includes('TMO'));
  assert.ok(!anList.includes('TMO'), 'executives-only report hidden from an analyst');
  assert.ok(!execList.includes('ABT'), "another member's private draft is hidden");
  assert.equal(S.sampleAnalytics(an).members.length, 1);
  assert.equal(S.sampleBudget(an).members, null);
  assert.ok(S.sampleBudget(exec).members.length > 1);
});

test('sample actions follow the routes and never mutate the bundle', () => {
  const raw = sample('portfolio_manager').raw;
  const before = JSON.stringify(raw);
  const own = S.applySampleAction(raw, {
    type: 'status',
    reportId: 'sample-sonar-018',
    status: 'approved',
  });
  assert.equal(own.ok, false);
  const ok = S.applySampleAction(raw, {
    type: 'status',
    reportId: 'sample-sonar-001',
    status: 'approved',
  });
  assert.equal(ok.ok, true);
  const r = ok.raw.reports.find((x) => x.id === 'sample-sonar-001');
  assert.equal(r.approved_version, r.current_version);
  assert.equal(
    S.applySampleAction(raw, { type: 'delete', reportId: 'sample-sonar-005' }).ok,
    false,
  );
  assert.equal(S.applySampleAction(raw, { type: 'delete', reportId: 'sample-sonar-015' }).ok, true);
  assert.equal(S.applySampleAction(raw, { type: 'budget', pool: 10 }).ok, false, 'executives only');
  assert.equal(JSON.stringify(raw), before);
  const an = sample('analyst').raw;
  assert.equal(
    S.applySampleAction(an, { type: 'status', reportId: 'sample-sonar-003', status: 'approved' })
      .ok,
    false,
  );
});

const read = (f) => fs.readFileSync(f, 'utf8');
const PAGE_FILES = [
  'src/components/org/sonar/SonarResearchPage.jsx',
  'src/components/org/sonar/SonarReportPage.jsx',
  'src/components/org/sonar/ReportsTab.jsx',
  'src/components/org/sonar/ResearchTab.jsx',
  'src/components/org/sonar/AnalyticsTab.jsx',
  'src/components/org/sonar/SidePanels.jsx',
  'src/components/org/sonar/BudgetSettingsDialog.jsx',
  'src/components/org/sonar/parts.jsx',
  'src/lib/org-sonar-research-model.js',
  'src/lib/org-sonar-research-sample.js',
];

test('copy: no advice wording, no assigned reviewers, no em dashes', () => {
  for (const f of PAGE_FILES) {
    const s = read(f);
    assert.doesNotMatch(s, /—/, f);
    assert.doesNotMatch(s, /Sonar view/, f);
    assert.doesNotMatch(s, /Assigned to me/i, f);
    assert.doesNotMatch(s, /'Invest'|'Watch'|'Pass'/, f);
  }
});

test('destructive and closing actions are confirmed; the answer is rendered unchanged', () => {
  const s = read('src/components/org/sonar/SonarReportPage.jsx');
  for (const k of ['withdraw', 'supersede', 'delete'])
    assert.match(s, new RegExp(`open\\('${k}'\\)`));
  assert.match(s, /<ResearchReport state=\{state\} \/>/);
  assert.match(s, /Approve \{fmtVersion\(report\.current_version\)\}/);
  assert.doesNotMatch(s, />\s*Edit\s*</);
});

test('the sample route serves master admin and demo accounts only', () => {
  const s = read('src/app/api/org/sonar-reports/sample/route.js');
  assert.match(s, /isCommunityDemoViewer\(user\)/);
  assert.match(s, /\{ sample: null \}/);
  assert.match(s, /getCurrentOrgMember/);
});

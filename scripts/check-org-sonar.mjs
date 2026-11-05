/**
 * Sonar for organizations (Nov 2026).
 *   npm run test:org-sonar
 *
 * Part 1, research reports: who can read a report, the review rules, the
 * saved snapshot (the exact state the analyst saw) and the research route
 * keeping it for org members only. Fixtures are test data in the real
 * shapes.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const R = await import('@/lib/org-sonar/reports');
const { reduceEvent, EMPTY_RESEARCH_STATE } = await import('@/lib/sonar/research-state');
const { recordRun } = await import('@/lib/sonar/engine/telemetry');

const ORG = '11111111-1111-1111-1111-111111111111';
const OTHER_ORG = '22222222-2222-2222-2222-222222222222';
const A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'; // analyst, author
const B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'; // analyst, same desk
const C = 'cccccccc-cccc-cccc-cccc-cccccccccccc'; // analyst, other desk
const PM = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
const DESK1 = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
const DESK2 = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

const viewer = (user_id, role = 'analyst', team_id = DESK1, org_id = ORG) => ({
  user_id,
  role,
  team_id,
  org_id,
  is_active: true,
});
const report = (o = {}) => ({
  id: '99999999-9999-9999-9999-999999999999',
  org_id: ORG,
  author_id: A,
  team_id: DESK1,
  visibility: 'private',
  shared_with: [],
  status: 'draft',
  kind: 'research',
  current_version: 1,
  ...o,
});

test('a private draft is read by its author only', () => {
  const r = report();
  assert.equal(R.canReadReport(r, viewer(A)), true);
  assert.equal(R.canReadReport(r, viewer(B)), false);
  assert.equal(R.canReadReport(r, viewer(PM, 'portfolio_manager')), false);
});

test('a submitted report is readable by managers whatever its visibility', () => {
  const r = report({ status: 'under_review' });
  assert.equal(R.canReadReport(r, viewer(PM, 'portfolio_manager', DESK2)), true);
  assert.equal(R.canReadReport(r, viewer(B)), false);
});

test('visibility: team, executives, members, org', () => {
  assert.equal(R.canReadReport(report({ visibility: 'team' }), viewer(B)), true);
  assert.equal(R.canReadReport(report({ visibility: 'team' }), viewer(C, 'analyst', DESK2)), false);
  assert.equal(R.canReadReport(report({ visibility: 'executives' }), viewer(B)), false);
  assert.equal(
    R.canReadReport(report({ visibility: 'executives' }), viewer(PM, 'executive', DESK2)),
    true,
  );
  assert.equal(
    R.canReadReport(
      report({ visibility: 'members', shared_with: [C] }),
      viewer(C, 'analyst', DESK2),
    ),
    true,
  );
  assert.equal(
    R.canReadReport(report({ visibility: 'members', shared_with: [C] }), viewer(B)),
    false,
  );
  assert.equal(R.canReadReport(report({ visibility: 'org' }), viewer(C, 'analyst', DESK2)), true);
});

test('never across organizations, never for inactive members', () => {
  const r = report({ visibility: 'org', status: 'approved' });
  assert.equal(R.canReadReport(r, viewer(PM, 'executive', DESK1, OTHER_ORG)), false);
  assert.equal(R.canReadReport(r, { ...viewer(B), is_active: false }), false);
});

test('review rules: only the author submits, never self-approval', () => {
  const draft = report();
  assert.equal(R.canTransition(draft, 'under_review', viewer(A)).ok, true);
  assert.equal(R.canTransition(draft, 'under_review', viewer(PM, 'portfolio_manager')).ok, false);
  assert.equal(R.canTransition(draft, 'approved', viewer(PM, 'portfolio_manager')).ok, false);

  const review = report({ status: 'under_review' });
  assert.equal(R.canTransition(review, 'approved', viewer(PM, 'portfolio_manager')).ok, true);
  assert.equal(R.canTransition(review, 'approved', viewer(B)).ok, false);
  assert.equal(R.canTransition(review, 'approved', viewer(B), { canApprove: true }).ok, true);
  const selfPm = report({ status: 'under_review', author_id: PM });
  assert.equal(R.canTransition(selfPm, 'approved', viewer(PM, 'portfolio_manager')).ok, false);
  assert.equal(R.canTransition(review, 'draft', viewer(A)).ok, true);
  assert.equal(R.canTransition(review, 'draft', viewer(PM, 'executive')).ok, true);
  assert.equal(R.canTransition(review, 'draft', viewer(B)).ok, false);

  const approved = report({ status: 'approved' });
  assert.equal(R.canTransition(approved, 'superseded', viewer(A)).ok, true);
  assert.equal(R.canTransition(approved, 'draft', viewer(A)).ok, false);
  assert.equal(R.canTransition(approved, 'under_review', viewer(A)).ok, false);
});

test('settings and comments are sanitized', () => {
  const s = R.cleanSettings({
    title: '  NVDA\u0007 risks  ',
    visibility: 'everyone',
    sharedWith: [B, B, 'not-a-uuid', C],
    pitchId: 'x',
  });
  assert.equal(s.title, 'NVDA risks');
  assert.equal('visibility' in s, false);
  assert.deepEqual(s.shared_with, [B, C]);
  assert.equal(s.pitch_id, null);
  assert.equal(R.cleanComment({ body: '   ' }).error, 'Write a comment first.');
  const c = R.cleanComment({ body: 'Source?', anchor: 'risk_1', version: 2 });
  assert.deepEqual(c.row, { body: 'Source?', anchor: 'risk_1', version: 2, parent_id: null });
  assert.equal(R.cleanComment({ body: 'x', anchor: '<script>' }).row.anchor, 'report');
});

/* A run's events, folded the way the browser folds them. */
function foldRun() {
  const events = [
    [
      'plan',
      {
        runId: 'r1',
        subject: { kind: 'company', id: 'NVDA', label: 'NVIDIA' },
        spec: { question: 'q' },
      },
    ],
    ['stage', { stage: 'retrieving' }],
    ['task', { id: 't1', source: 'company_financials', status: 'done', items: 4 }],
    ['panel', { source: 'company_financials', layout: { financials: { ticker: 'NVDA' } } }],
    ['analysis', { metrics: [], visualizations: [] }],
    [
      'findings',
      {
        report: {
          format: 'investment_memo',
          memoKind: 'risk',
          executiveConclusion: { text: 'Concentration is the main risk.' },
          keyFindings: [{ id: 'finding_1', title: 'Customer concentration' }],
          risks: [{ id: 'risk_1', title: 'Customer concentration' }],
          confidence: 'medium',
          validation: {
            stats: { claims: 10, kept: 9, claimSupportRate: 0.9, citationCoverage: 0.8 },
          },
        },
        brief: 'Concentration is the main risk.',
      },
    ],
    [
      'report',
      {
        runId: 'r1',
        researchQuestion: 'What are the biggest risks to NVIDIA?',
        researchScope: { subject: { kind: 'company', id: 'nvda', label: 'NVIDIA' } },
        evidence: [
          { id: 'e1', source: 'company_financials' },
          { id: 'e2', source: 'disclosures' },
        ],
        layout: { big: true },
        understood: { raw: 'x' },
        researchMetadata: { trace: [1, 2], validationLog: [1], validation: { claims: 10 } },
      },
    ],
  ];
  return events.reduce((s, e) => reduceEvent(s, e), EMPTY_RESEARCH_STATE);
}

test('the snapshot is the folded state without live-only parts', () => {
  const snap = R.snapshotFromState(foldRun());
  assert.equal(snap.v, 1);
  assert.equal(snap.report.executiveConclusion.text, 'Concentration is the main risk.');
  assert.equal(snap.run.layout, undefined);
  assert.equal(snap.run.understood, undefined);
  assert.equal(snap.run.researchMetadata.trace, undefined);
  assert.deepEqual(snap.panels, { financials: { ticker: 'NVDA' } });
  assert.equal('status' in snap, false);
  const state = R.stateFromSnapshot(snap);
  assert.equal(state.status, 'done');
  assert.equal(state.report.risks[0].id, 'risk_1');
  assert.equal(R.snapshotFromState({ ...EMPTY_RESEARCH_STATE }), null);
});

test('an oversized snapshot drops panels first', () => {
  const s = foldRun();
  const big = { ...s, panels: { blob: 'x'.repeat(R.SNAPSHOT_MAX) } };
  const snap = R.snapshotFromState(big);
  assert.deepEqual(snap.panels, {});
  assert.deepEqual(snap.trimmed, ['panels']);
});

test('the summary stored beside a version', () => {
  const sum = R.summarizeSnapshot(R.snapshotFromState(foldRun()));
  assert.equal(sum.ticker, 'NVDA');
  assert.equal(sum.conclusion, 'Concentration is the main risk.');
  assert.equal(sum.confidence, 'medium');
  assert.equal(sum.stats.claimSupportRate, 0.9);
  assert.equal(sum.stats.evidence, 2);
  assert.equal(sum.stats.sources, 2);
  assert.equal(R.defaultTitle(sum, 'fund_fit'), 'Fund fit: NVIDIA');
});

test('comment anchors follow the report', () => {
  const ids = R.anchorsOf(R.snapshotFromState(foldRun())).map((a) => a.id);
  assert.deepEqual(ids, ['report', 'conclusion', 'finding_1', 'risk_1']);
});

function fakeAdmin({ failColumns = false } = {}) {
  const calls = [];
  return {
    calls,
    from(table) {
      return {
        upsert: async (row) => {
          calls.push({ table, row });
          if (
            table === 'sonar_research_runs' &&
            failColumns &&
            ('snapshot' in row || 'org_id' in row)
          )
            return { error: { message: 'column "snapshot" does not exist' } };
          return { error: null };
        },
        insert: async () => ({ error: null }),
      };
    },
  };
}
const RUN = {
  runId: '12345678-1234-1234-1234-123456789012',
  researchQuestion: 'q',
  researchScope: { domains: [] },
  methodology: {},
  researchMetadata: { trace: [] },
};

test('recordRun keeps an org run snapshot, and degrades before the migration', async () => {
  const ok = fakeAdmin();
  const r1 = await recordRun(ok, RUN, { orgId: ORG, snapshot: { v: 1 } });
  assert.equal(r1.snapshotStored, true);
  assert.equal(ok.calls[0].row.org_id, ORG);

  const old = fakeAdmin({ failColumns: true });
  const r2 = await recordRun(old, RUN, { orgId: ORG, snapshot: { v: 1 } });
  assert.equal(r2.snapshotStored, false);
  assert.equal(old.calls.length, 2);
  assert.equal('snapshot' in old.calls[1].row, false);

  const retail = fakeAdmin();
  const r3 = await recordRun(retail, RUN, {});
  assert.equal(r3.snapshotStored, false);
  assert.equal('org_id' in retail.calls[0].row, false);
});

test('the research route keeps a snapshot for org members only', () => {
  const src = fs.readFileSync('src/app/api/sonar/research/route.js', 'utf8');
  assert.match(src, /let snap = orgId \? EMPTY_RESEARCH_STATE : null;/);
  assert.match(src, /snap = reduceEvent\(snap, \[event, data\]\)/);
  assert.match(src, /org: saved \? \{ canSave: true, runId \} : null/);
  const hook = fs.readFileSync('src/components/sonar/research/useResearchStream.js', 'utf8');
  assert.match(hook, /from '@\/lib\/sonar\/research-state'/);
});

test("saving reads the snapshot from the caller's own run, in this org", () => {
  const src = fs.readFileSync('src/app/api/org/sonar-reports/route.js', 'utf8');
  assert.match(src, /from\('sonar_research_runs'\)/);
  assert.match(src, /run\.user_id !== viewer\.user_id/);
  assert.match(src, /run\.org_id !== viewer\.org_id/);
  assert.doesNotMatch(src, /body\??\.snapshot/);
});

test('the migration guards the review rules in the database', () => {
  const sql = fs.readFileSync('supabase/migrations/20261107120000_org_sonar_reports.sql', 'utf8');
  assert.match(sql, /create trigger org_sonar_reports_guard/);
  assert.match(
    sql,
    /v_uid = old\.author_id then\s+raise exception 'A report under review is approved by a reviewer other than its author'/,
  );
  assert.match(sql, /create trigger org_sonar_versions_frozen/);
  assert.match(sql, /enable row level security/);
});

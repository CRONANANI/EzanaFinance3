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
  assert.match(
    src,
    /org: saved\s*\?\s*\{ canSave: true, runId, challengeOf: challenge\?\.reportId \|\| null \}/,
  );
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

/* ── Part 2: the pooled deep research budget ───────────────────────── */
const Bu = await import('@/lib/org-sonar/budget');
const { reserveOrgDeep } = await import('@/lib/sonar/quota');

test('budget changes are validated and capped', () => {
  assert.deepEqual(Bu.cleanBudgetPatch({ monthlyDeepRuns: 120 }, { max: 500 }).patch, {
    pool: 120,
  });
  assert.match(Bu.cleanBudgetPatch({ monthlyDeepRuns: 900 }, { max: 500 }).error, /at most 500/);
  assert.match(Bu.cleanBudgetPatch({ monthlyDeepRuns: -1 }).error, /whole number/);
  const p = Bu.cleanBudgetPatch(
    {
      allocations: [
        { userId: A, monthlyDeepRuns: 10 },
        { userId: A, monthlyDeepRuns: 3 },
        { userId: B, monthlyDeepRuns: null },
        { userId: 'x', monthlyDeepRuns: 1 },
      ],
    },
    { max: 500 },
  ).patch;
  assert.deepEqual(p.allocations, [
    { userId: A, runs: 10 },
    { userId: B, runs: null },
  ]);
  assert.equal(Bu.cleanBudgetPatch({}).error, 'Nothing to change.');
  assert.equal(Bu.defaultOrgPool({}), 100);
  assert.equal(Bu.defaultOrgPool({ ORG_SONAR_MONTHLY_DEEP: '40' }), 40);
  assert.equal(Bu.maxOrgPool({}), 500);
});

test('usage this month: most used first, allocations and what is left', () => {
  const now = new Date('2026-11-20T12:00:00Z');
  const rows = [
    { user_id: A, version: 'research:deep:org', created_at: '2026-11-02T10:00:00Z' },
    { user_id: A, version: 'research:deep:org', created_at: '2026-11-03T10:00:00Z' },
    { user_id: A, version: 'research:deep:org', created_at: '2026-11-04T10:00:00Z' },
    { user_id: B, version: 'research:deep:org', created_at: '2026-11-05T10:00:00Z' },
    { user_id: B, version: 'research:standard:org', created_at: '2026-11-05T10:00:00Z' },
    { user_id: C, version: 'research:deep:org', created_at: '2026-10-30T10:00:00Z' },
  ];
  const s = Bu.usageSummary({
    pool: 10,
    rows,
    allocations: [{ user_id: A, monthly_deep_runs: 5 }],
    members: [
      { user_id: A, display_name: 'Ana', role: 'analyst' },
      { user_id: B, display_name: 'Ben', role: 'analyst' },
      { user_id: PM, display_name: 'Pat', role: 'portfolio_manager' },
    ],
    now,
  });
  assert.equal(s.used, 4);
  assert.equal(s.remaining, 6);
  assert.equal(s.resetsOn, '2026-12-01');
  assert.deepEqual(
    s.members.map((m) => [m.name, m.deepRuns, m.allocation, m.left]),
    [
      ['Ana', 3, 5, 2],
      ['Ben', 1, null, null],
      ['Pat', 0, null, null],
    ],
  );
  assert.equal(s.members[0].share, 0.75);
  const h = Bu.monthlyHistory(rows, { now });
  assert.deepEqual(h.slice(-2), [
    { month: '2026-10', runs: 1 },
    { month: '2026-11', runs: 4 },
  ]);
  assert.equal(h.length, 6);
});

test('budget messages name the reset date', () => {
  const now = new Date('2026-11-20T12:00:00Z');
  assert.match(
    Bu.budgetMessage('org_pool', { pool: 100, now }),
    /this month's 100 deep research runs\. They reset on December 1\./,
  );
  assert.match(
    Bu.budgetMessage('org_allocation', { allocation: 5, now }),
    /your 5 deep research runs/,
  );
  assert.doesNotMatch(Bu.budgetMessage('org_pool', { now }), /\s{2}/);
});

function rpcAdmin(responses) {
  const calls = [];
  return {
    calls,
    rpc: async (name, args) => {
      calls.push({ name, args });
      return responses[name] || { data: null, error: { code: 'PGRST202', message: 'missing' } };
    },
  };
}

test('an org deep run reserves against the pool', async () => {
  const ok = rpcAdmin({
    reserve_sonar_ping_org_deep: {
      data: [{ id: 'q1', reason: null, used: 2, pool: 100, org_used: 41, allocation: null }],
      error: null,
    },
  });
  const r = await reserveOrgDeep(ok, {
    userId: A,
    orgId: ORG,
    query: 'q',
    version: 'research:deep:org',
    defaultPool: 100,
  });
  assert.deepEqual([r.ok, r.id, r.pool, r.orgUsed, r.pooled], [true, 'q1', 100, 41, true]);
  assert.equal(ok.calls[0].args.p_default_pool, 100);

  const full = rpcAdmin({
    reserve_sonar_ping_org_deep: {
      data: [{ id: null, reason: 'org_pool', used: 2, pool: 100, org_used: 100, allocation: null }],
      error: null,
    },
  });
  const f = await reserveOrgDeep(full, {
    userId: A,
    orgId: ORG,
    query: 'q',
    version: 'v',
    defaultPool: 100,
  });
  assert.deepEqual([f.ok, f.reason, f.pool], [false, 'org_pool', 100]);

  /* Before the migration: the member's own deep cap. */
  const old = rpcAdmin({
    reserve_sonar_ping_deep: { data: [{ id: 'q2', used: 0 }], error: null },
  });
  const o = await reserveOrgDeep(old, {
    userId: A,
    orgId: ORG,
    query: 'q',
    version: 'v',
    defaultPool: 100,
    fallbackDeepLimit: 2,
  });
  assert.deepEqual([o.ok, o.pooled], [true, false]);
  assert.equal(old.calls[1].name, 'reserve_sonar_ping_deep');
  assert.equal(old.calls[1].args.p_deep_limit, 2);
});

test('the research route draws org deep runs from the pool', () => {
  const src = fs.readFileSync('src/app/api/sonar/research/route.js', 'utf8');
  assert.match(src, /const orgDeep = deepMode && !isGuest && Boolean\(access\.scope\?\.orgId\);/);
  assert.match(src, /reserveOrgDeep\(admin, \{/);
  assert.match(src, /res\.reason === 'org_pool' \|\| res\.reason === 'org_allocation'/);
  const hook = fs.readFileSync('src/lib/sonar/research-state.js', 'utf8');
  assert.ok(hook);
  const sql = fs.readFileSync('supabase/migrations/20261107130000_org_sonar_budget.sql', 'utf8');
  assert.match(sql, /pg_advisory_xact_lock\(hashtext\('sonar:org:' \|\| p_org::text\)\)/);
  assert.match(
    sql,
    /grant execute on function public\.reserve_sonar_ping_org_deep[\s\S]*to service_role;/,
  );
});

/* ── Part 3: "Should our fund invest?" and challenge mode ──────────── */
const F = await import('@/lib/org-sonar/fund-fit');
const { buildResearchSpec } = await import('@/lib/sonar/engine/research-spec');
const { understandQuery } = await import('@/lib/sonar/understand');
const M = await import('@/lib/sonar/engine/investment-memo');
const Ch = await import('@/lib/sonar/engine/challenge');
const { toEvidence, withMarkers } = await import('@/lib/sonar/engine/evidence');

const FUND = {
  fundName: 'DFIC Fund',
  thesis: 'Quality compounders with durable advantages, held three to five years.',
  style: 'Long-only fundamental',
  horizon: '3 to 5 years',
  benchmark: 'XIU.TO',
  focusSectors: ['Technology', 'Healthcare'],
  excludedSectors: ['Tobacco'],
  minMarketCapMusd: 2000,
  ips: [
    { type: 'prohibited_ticker', value: { ticker: 'TSLA', severity: 'block' } },
    { type: 'max_positions', value: { max: 3, severity: 'warning' } },
    { type: 'max_position_pct', value: { pct: 5, severity: 'warning' } },
  ],
  holdings: [
    { ticker: 'MSFT', sector: 'Technology', weightPct: 4.2 },
    { ticker: 'JNJ', sector: 'Healthcare', weightPct: 3.1 },
    { ticker: 'RY', sector: 'Financial Services', weightPct: 2.5 },
  ],
};
const NVDA = {
  ticker: 'NVDA',
  sector: 'Technology',
  industry: 'Semiconductors',
  marketCap: 4.3e12,
};

test('fund fit questions are recognised', () => {
  for (const q of [
    'Should our fund invest in NVIDIA?',
    'should the fund buy AMD stock',
    'Does Shopify fit our mandate?',
    'Would our portfolio add Costco at these levels?',
    'fund fit for UNH',
  ])
    assert.equal(F.isFundFitQuestion(q), true, q);
  for (const q of [
    'What are the biggest risks to NVIDIA?',
    'Which funds invest in NVIDIA?',
    'Should I buy NVDA?',
  ])
    assert.equal(F.isFundFitQuestion(q), false, q);
});

test('mandate checks: a company inside the mandate', () => {
  const checks = F.mandateChecks(FUND, NVDA);
  const by = Object.fromEntries(checks.map((c) => [c.id, c]));
  assert.equal(by.mandate_excluded.status, 'pass');
  assert.equal(by.mandate_focus.status, 'pass');
  assert.equal(by.mandate_min_cap.status, 'pass');
  assert.match(by.mandate_min_cap.detail, /\$4\.30T against a minimum of \$2\.0B/);
  /* Three positions held of at most three: a new one needs an exit first. */
  assert.equal(by.ips_max_positions.status, 'warn');
  assert.equal(by.ips_max_position_pct.status, 'info');
  assert.equal(F.fitFromChecks(checks), 'partial');
  assert.equal(
    checks.some((c) => c.blocking),
    false,
  );
});

test('mandate checks: the IPS blocks a prohibited security', () => {
  const checks = F.mandateChecks(FUND, {
    ticker: 'TSLA',
    sector: 'Consumer Cyclical',
    marketCap: 1e12,
  });
  const block = checks.find((c) => c.id === 'ips_prohibited_TSLA');
  assert.equal(block.status, 'fail');
  assert.equal(block.blocking, true);
  assert.equal(F.fitFromChecks(checks), 'outside');
  const focus = checks.find((c) => c.id === 'mandate_focus');
  assert.equal(focus.status, 'warn');
});

test('mandate checks: excluded sector, size, unknown data, current holding', () => {
  const tob = F.mandateChecks(FUND, {
    ticker: 'MO',
    sector: 'Consumer Defensive',
    industry: 'Tobacco',
    marketCap: 9e10,
  });
  assert.equal(tob.find((c) => c.id === 'mandate_excluded').blocking, true);
  const small = F.mandateChecks(FUND, { ticker: 'XYZ', sector: 'Technology', marketCap: 5e8 });
  assert.equal(small.find((c) => c.id === 'mandate_min_cap').status, 'fail');
  const unknown = F.mandateChecks(FUND, { ticker: 'ABC' });
  assert.equal(unknown.find((c) => c.id === 'mandate_min_cap').status, 'unknown');
  assert.equal(unknown.find((c) => c.id === 'mandate_excluded').status, 'unknown');
  const held = F.mandateChecks(FUND, { ticker: 'MSFT', sector: 'Technology', marketCap: 3e12 });
  assert.match(
    held.find((c) => c.id === 'held').detail,
    /already holds MSFT \(4\.2% of the fund\)/,
  );
  assert.equal(held.find((c) => c.id === 'ips_max_positions').status, 'pass');
  assert.deepEqual(F.mandateChecks({}, NVDA), []);
  assert.equal(F.fitFromChecks([]), 'fits');
});

test('the mandate record carries the thesis and every check', () => {
  const checks = F.mandateChecks(FUND, NVDA);
  const rec = F.mandateRecord(FUND, NVDA, checks);
  assert.match(rec.title, /DFIC Fund: mandate and IPS check for NVDA/);
  assert.match(rec.text, /Investment thesis: Quality compounders/);
  assert.match(rec.text, /IPS: number of positions: warn/);
  assert.equal(rec.data.fit, 'partial');
});

test('mandate fields from an executive are cleaned', () => {
  const m = F.cleanMandate({
    investment_thesis: '  Quality  ',
    focus_sectors: 'Technology, Healthcare, , Technology',
    excluded_sectors: ['Tobacco'],
    min_market_cap_musd: '2000',
  });
  assert.deepEqual(m, {
    investment_thesis: 'Quality',
    focus_sectors: ['Technology', 'Healthcare'],
    excluded_sectors: ['Tobacco'],
    min_market_cap_musd: 2000,
  });
  assert.equal(F.cleanMandate({ min_market_cap_musd: '' }).min_market_cap_musd, null);
  assert.equal(F.cleanMandate({ min_market_cap_musd: -5 }).min_market_cap_musd, null);
});

const NVDA_SUBJECT = { kind: 'company', id: 'NVDA', label: 'NVIDIA Corporation' };

test('a fund fit run is a fund fit memo about the company', () => {
  const q = 'Should our fund invest in NVIDIA?';
  const spec = buildResearchSpec(understandQuery(q), {
    query: q,
    resolution: { subject: NVDA_SUBJECT },
    depth: 'deep',
    fund: F.fundSpec(FUND),
  });
  assert.equal(spec.format, 'investment_memo');
  assert.equal(spec.memoKind, 'fund_fit');
  assert.equal(spec.objective.primary, 'assess_fund_fit');
  assert.equal(spec.reportComponents[0], 'fund_verdict');
  assert.ok(spec.angles.some((a) => a.id === 'financials'));
  assert.equal(spec.fund.name, 'DFIC Fund');
  /* No fund context (a retail member): not a fund fit memo. */
  const retail = buildResearchSpec(understandQuery(q), {
    query: q,
    resolution: { subject: NVDA_SUBJECT },
    depth: 'deep',
  });
  assert.notEqual(retail.memoKind, 'fund_fit');
  assert.equal(retail.fund, null);
  /* A fund context but no company: not a fund fit memo. */
  const noCo = buildResearchSpec(understandQuery('Should our fund invest in semiconductors?'), {
    query: 'Should our fund invest in semiconductors?',
    resolution: { subject: null },
    fund: F.fundSpec(FUND),
  });
  assert.notEqual(noCo.memoKind, 'fund_fit');
});

test('the fund fit prompt gives a stance for the committee, never a target or size', () => {
  assert.equal(M.memoSystem({ memoKind: 'fund_fit' }), M.FUND_FIT_SYSTEM);
  assert.match(M.FUND_FIT_SYSTEM, /"stance": "invest" \| "watch" \| "pass"/);
  assert.match(M.FUND_FIT_SYSTEM, /the committee decides\. Never a price target, a position size/);
  assert.doesNotMatch(M.FUND_FIT_SYSTEM, /no buy, sell or hold call/);
  assert.match(M.MEMO_SYSTEM, /no buy, sell or hold call/);
  assert.ok(!M.FUND_FIT_SYSTEM.includes(String.fromCharCode(8212)), 'no em dash');
});

function fitEvidence() {
  const checks = F.mandateChecks(FUND, NVDA);
  const items = [
    toEvidence(F.mandateRecord(FUND, NVDA, checks), { source: 'fund_mandate' }),
    toEvidence(
      {
        title: 'NVIDIA 10-Q, quarter ended July 27, 2026',
        text: 'Data Center revenue was $41.1 billion, up 56% from a year ago.',
        entities: ['NVDA'],
      },
      { source: 'company_financials' },
    ),
    toEvidence(
      {
        title: 'BIS rule, January 2025',
        text: 'Export licence requirements apply to advanced computing items shipped to China.',
        entities: ['NVDA'],
      },
      { source: 'export_controls' },
    ),
  ];
  return {
    checks,
    marked: withMarkers(items.map((evidence) => ({ evidence, score: 0.9, why: ['test'] }))),
  };
}

test('validating a fund fit memo: stance, criteria, catalysts, headwinds', () => {
  const { checks, marked } = fitEvidence();
  const parsed = {
    centralQuestion: 'Should the DFIC Fund invest in NVIDIA?',
    executiveConclusion: {
      text: 'Data Center revenue was $41.1 billion, up 56% from a year ago.',
      classification: 'verified_fact',
      evidence: ['S2'],
    },
    verdict: {
      stance: 'invest',
      text: 'The company is inside the mandate and Data Center revenue was $41.1 billion.',
      evidence: ['S1', 'S2'],
    },
    thesisFit: {
      fit: 'fits',
      text: 'This suggests the company matches the quality part of the thesis.',
      evidence: ['S1'],
      criteria: [
        {
          criterion: 'Focus sector',
          status: 'met',
          text: 'The mandate check shows Technology is a focus sector.',
          classification: 'verified_fact',
          evidence: ['S1'],
        },
      ],
    },
    catalysts: [
      {
        title: 'Data Center growth',
        timing: 'Next earnings',
        claim: {
          text: 'Data Center revenue was $41.1 billion, up 56% from a year ago.',
          classification: 'verified_fact',
          evidence: ['S2'],
        },
      },
      {
        title: 'Invented',
        timing: null,
        claim: {
          text: 'Revenue will reach $90 billion next year.',
          classification: 'verified_fact',
          evidence: ['S2'],
        },
      },
    ],
    headwinds: [
      {
        title: 'Export controls',
        priority: 'high',
        claim: {
          text: 'Export licence requirements apply to advanced computing items shipped to China.',
          classification: 'verified_fact',
          evidence: ['S3'],
        },
      },
    ],
    committeeQuestions: ['How much China revenue is at risk?', 'What would reach $90 billion?'],
    confidence: 'medium',
  };
  const r = M.validateMemo(parsed, {
    marked,
    metrics: [],
    kind: 'fund_fit',
    mandate: { checks, fit: F.fitFromChecks(checks) },
  });
  assert.equal(r.memoKind, 'fund_fit');
  assert.equal(r.verdict.stance, 'invest');
  /* The deterministic checks say partial (positions at the IPS limit), so the
     written "fits" cannot be better than that. */
  assert.equal(r.thesisFit.fit, 'partial');
  assert.equal(r.thesisFit.criteria[0].status, 'met');
  assert.equal(r.catalysts.length, 1, 'the invented $90 billion catalyst is removed');
  assert.equal(r.headwinds[0].priority, 'high');
  assert.deepEqual(r.committeeQuestions, ['How much China revenue is at risk?']);
  assert.equal(r.keyFindings[0].title, 'Data Center growth');
  assert.match(M.renderMemoBrief(r), /^Sonar view for the fund: invest\./);
});

test('a blocking IPS check makes the stance pass, whatever was written', () => {
  const { marked } = fitEvidence();
  const checks = F.mandateChecks(FUND, {
    ticker: 'TSLA',
    sector: 'Consumer Cyclical',
    marketCap: 1e12,
  });
  const r = M.validateMemo(
    {
      executiveConclusion: {
        text: 'Data Center revenue was $41.1 billion.',
        classification: 'verified_fact',
        evidence: ['S2'],
      },
      verdict: {
        stance: 'invest',
        text: 'Data Center revenue was $41.1 billion.',
        evidence: ['S2'],
      },
    },
    { marked, metrics: [], kind: 'fund_fit', mandate: { checks, fit: 'outside' } },
  );
  assert.equal(r.verdict.stance, 'pass');
  assert.deepEqual(r.verdict.overriddenBy, ['ips_prohibited_TSLA']);
  assert.match(r.verdict.text, /prohibited list/);
  assert.equal(r.thesisFit.fit, 'outside');
});

test('the fallback fund fit memo has no stance but keeps the mandate checks', () => {
  const { marked } = fitEvidence();
  const r = M.deterministicMemo({
    spec: { memoKind: 'fund_fit', question: 'q' },
    marked,
    metrics: [],
  });
  assert.equal(r.memoKind, 'fund_fit');
  assert.equal(r.verdict, null);
  assert.equal(r.thesisFit.fit, 'partial');
  assert.match(r.limitations[0], /mandate checks/);
});

test('challenge mode: the prompt and the validated verdict', () => {
  const add = Ch.challengeAddendum("NVIDIA's growth is durable.");
  assert.match(add, /The fund's team concluded: "NVIDIA's growth is durable\."/);
  assert.match(add, /"verdict": "holds" \| "weakened" \| "refuted" \| "unclear"/);
  assert.ok(!add.includes(String.fromCharCode(8212)), 'no em dash');
  const { marked } = fitEvidence();
  const v = Ch.validateChallenge(
    {
      verdict: 'weakened',
      text: 'Export licence requirements apply to advanced computing items shipped to China.',
      evidence: ['S3'],
      survives: ['Data Center demand is strong.'],
      doesNotSurvive: ['China demand is unaffected.', 'Margins reach 90% next year.'],
    },
    { marked, metrics: [], claim: 'Growth is durable.' },
  );
  assert.equal(v.verdict, 'weakened');
  assert.deepEqual(v.assessment.markers, ['S3']);
  assert.deepEqual(v.doesNotSurvive, ['China demand is unaffected.']);
  assert.equal(Ch.validateChallenge(null, { claim: 'x' }).verdict, 'unclear');
  assert.equal(Ch.validateChallenge({ verdict: 'refuted' }, { claim: 'x' }).verdict, 'unclear');
});

test('the route takes fund context and the challenged claim from the org, never the body', () => {
  const src = fs.readFileSync('src/app/api/sonar/research/route.js', 'utf8');
  assert.match(
    src,
    /deepMode && orgId && \(body\?\.fundFit === true \|\| isFundFitQuestion\(query\)\)/,
  );
  assert.match(src, /loadFundContext\(admin, orgId\)/);
  assert.match(src, /canReadReport\(report, viewer\)/);
  assert.match(src, /const claim = String\(report\.summary\?\.conclusion/);
  assert.match(src, /runQuery = t\.question;/);
  assert.doesNotMatch(src, /body\?\.challenge\?\.claim/);
  const engine = fs.readFileSync('src/lib/sonar/engine/engine.js', 'utf8');
  assert.match(engine, /source: 'fund_mandate'/);
  assert.match(engine, /mandate: layout\.fundFit \|\| null/);
  assert.match(engine, /challengeAddendum\(spec\.challenge\.claim\)/);
});

/* ── Part 4: Sonar Analytics ───────────────────────────────────────── */
const An = await import('@/lib/org-sonar/analytics');

test('per-member analytics from reports, reviews, challenges, comments and runs', () => {
  const now = new Date('2026-11-20T12:00:00Z');
  const sum = (o = {}) => ({
    stats: { claimSupportRate: 0.9, citationCoverage: 0.8, sources: 6 },
    ...o,
  });
  const reports = [
    {
      id: 'r1',
      author_id: A,
      kind: 'research',
      status: 'approved',
      ticker: 'NVDA',
      pitch_id: 'p1',
      approved_version: 1,
      submitted_at: '2026-11-01T00:00:00Z',
      approved_at: '2026-11-03T00:00:00Z',
      summary: sum(),
      created_at: '2026-10-30T00:00:00Z',
    },
    {
      id: 'r2',
      author_id: A,
      kind: 'fund_fit',
      status: 'under_review',
      ticker: 'AMD',
      submitted_at: '2026-11-10T00:00:00Z',
      summary: sum({
        stance: 'watch',
        stats: { claimSupportRate: 0.7, citationCoverage: 0.6, sources: 4 },
      }),
      created_at: '2026-11-09T00:00:00Z',
    },
    {
      id: 'r3',
      author_id: B,
      kind: 'research',
      status: 'draft',
      ticker: 'XOM',
      summary: sum(),
      created_at: '2026-11-11T00:00:00Z',
    },
    {
      id: 'c1',
      author_id: B,
      kind: 'challenge',
      status: 'draft',
      challenge_of: 'r1',
      summary: { challengeVerdict: 'holds' },
      created_at: '2026-11-12T00:00:00Z',
    },
    {
      id: 'c2',
      author_id: PM,
      kind: 'challenge',
      status: 'draft',
      challenge_of: 'r1',
      summary: { challengeVerdict: 'weakened' },
      created_at: '2026-11-13T00:00:00Z',
    },
    {
      id: 'old',
      author_id: A,
      kind: 'research',
      status: 'approved',
      ticker: 'MSFT',
      approved_version: 1,
      approved_at: '2025-01-05T00:00:00Z',
      summary: sum(),
      created_at: '2025-01-01T00:00:00Z',
    },
  ];
  const comments = [
    { report_id: 'r1', author_id: PM, resolved: true, created_at: '2026-11-02T00:00:00Z' },
    { report_id: 'r1', author_id: B, resolved: false, created_at: '2026-11-02T00:00:00Z' },
    { report_id: 'r1', author_id: A, resolved: false, created_at: '2026-11-02T00:00:00Z' },
  ];
  const runs = [
    { user_id: A, depth: 'deep', status: 'complete', created_at: '2026-11-01T00:00:00Z' },
    { user_id: A, depth: 'deep', status: 'failed', created_at: '2026-11-01T00:00:00Z' },
    { user_id: A, depth: 'standard', status: 'partial', created_at: '2026-11-02T00:00:00Z' },
  ];
  const out = An.computeAnalytics({
    members: [
      { user_id: A, display_name: 'Ana', role: 'analyst' },
      { user_id: B, display_name: 'Ben', role: 'analyst' },
      { user_id: PM, display_name: 'Pat', role: 'portfolio_manager' },
    ],
    reports,
    comments,
    runs,
    pitches: [{ id: 'p1', stage: 'in_portfolio', sector: 'Technology', ticker: 'NVDA' }],
    tickerSectors: { XOM: 'Energy', MSFT: 'Technology' },
    days: 90,
    now,
  });
  const ana = out.members.find((m) => m.userId === A);
  assert.equal(ana.reports, 2, 'the 2025 report is outside the window');
  assert.equal(ana.submitted, 2);
  assert.equal(ana.approved, 1);
  assert.equal(ana.approvalRate, 0.5);
  assert.equal(ana.reviewDays, 2);
  assert.equal(ana.claimSupport, 0.8);
  assert.equal(ana.challengesFaced, 2);
  assert.equal(ana.heldRate, 0.5);
  assert.equal(ana.commentsReceived, 2, 'own comments do not count as received');
  assert.equal(ana.commentsResolved, 0.5);
  assert.equal(ana.onPitches, 1);
  assert.equal(ana.pitchesAdvanced, 1);
  assert.deepEqual(ana.fundFit, { invest: 0, watch: 1, pass: 0 });
  assert.deepEqual(ana.tickers, ['AMD', 'NVDA']);
  assert.deepEqual(ana.sectors, ['Technology']);
  assert.equal(ana.deepRuns, 1, 'failed runs are not counted');
  assert.equal(ana.standardRuns, 1);
  const ben = out.members.find((m) => m.userId === B);
  assert.equal(ben.challengesRun, 1);
  assert.equal(ben.reports, 1);
  assert.equal(out.members[0].userId, A, 'most approved first');
  assert.equal(out.totals.challenges, 2);
  assert.equal(out.totals.approved, 1);
  /* Coverage counts approved research all time, with staleness. */
  const msft = out.coverage.find((c) => c.ticker === 'MSFT');
  assert.equal(msft.sector, 'Technology');
  assert.ok(msft.staleDays > 600);
  assert.equal(out.coverage.find((c) => c.ticker === 'NVDA').approved, 1);
  /* A member who does not manage others sees only their own line. */
  assert.deepEqual(
    An.ownView(out, B).members.map((m) => m.userId),
    [B],
  );
});

test('analytics returns counts only, and managers alone see everyone', () => {
  const src = fs.readFileSync('src/app/api/org/sonar-analytics/route.js', 'utf8');
  assert.match(src, /assertOrgRole\(member, \['executive', 'portfolio_manager'\]\)/);
  assert.match(src, /manager \? result : ownView\(result, member\.user_id\)/);
  assert.doesNotMatch(src, /snapshot/);
  assert.doesNotMatch(src, /'id, author_id[^']*title/);
});

/* ---- Phase 4b (Nov 2026): archived positions and the five IPS rule types ---- */

const { loadFundContext } = await import('@/lib/org-sonar/fund-context');
const { createMockSupabase } = await import('./lib/mock-supabase.mjs');

test('loadFundContext reads active positions only (archived ones never inflate weights or counts)', async () => {
  const pos = (ticker, shares, price, is_active, org_id = ORG) => ({
    org_id,
    ticker,
    shares,
    current_price: price,
    avg_cost: price,
    sector: 'Technology',
    is_active,
  });
  const db = createMockSupabase({
    seed: {
      org_fund_config: [{ org_id: ORG, fund_display_name: 'Test Fund' }],
      organizations: [{ id: ORG, name: 'Test Org' }],
      org_ips_rules: [
        { org_id: ORG, rule_type: 'max_positions', rule_value: { max: 2 }, is_active: true },
        { org_id: ORG, rule_type: 'min_positions', rule_value: { min: 9 }, is_active: false },
      ],
      org_positions: [
        pos('MSFT', 10, 100, true),
        pos('AAPL', 10, 100, true),
        pos('NVDA', 1000, 100, false), // archived: would be 98% of the fund
        pos('AMZN', 10, 100, true, OTHER_ORG), // another org
      ],
    },
  });
  const fund = await loadFundContext(db, ORG);
  assert.deepEqual(fund.holdings.map((h) => h.ticker).sort(), ['AAPL', 'MSFT']);
  assert.equal(fund.holdings.find((h) => h.ticker === 'MSFT').weightPct, 50);
  assert.deepEqual(
    fund.ips.map((r) => r.type),
    ['max_positions'],
  );
  const checks = F.mandateChecks(fund, { ticker: 'AMD', sector: 'Technology', marketCap: 2e11 });
  assert.match(checks.find((c) => c.id === 'ips_max_positions').detail, /has 2 of at most 2/);
  const src = fs.readFileSync('src/lib/org-sonar/fund-context.js', 'utf8');
  assert.match(src, /getOrgPositionBook\(admin, orgId\)/);
});

const IPS_FUND = (rules, holdings = FUND.holdings) => ({ ...FUND, ips: rules, holdings });

test('mandate checks: prohibited_sector follows the IPS severity', () => {
  const hard = F.mandateChecks(
    IPS_FUND([{ type: 'prohibited_sector', value: { sector: 'Energy', severity: 'block' } }]),
    { ticker: 'XOM', sector: 'Energy', marketCap: 4e11 },
  );
  const c = hard.find((x) => x.id === 'ips_prohibited_sector_energy');
  assert.equal(c.status, 'fail');
  assert.equal(c.blocking, true);
  assert.equal(F.fitFromChecks(hard), 'outside');
  const soft = F.mandateChecks(
    IPS_FUND([{ type: 'prohibited_sector', value: { sector: 'Energy' } }]),
    {
      ticker: 'XOM',
      sector: 'Energy',
      marketCap: 4e11,
    },
  );
  assert.equal(soft.find((x) => x.id === 'ips_prohibited_sector_energy').status, 'warn');
  assert.equal(soft.find((x) => x.id === 'ips_prohibited_sector_energy').blocking, false);
  const clear = F.mandateChecks(
    IPS_FUND([{ type: 'prohibited_sector', value: { sector: 'Energy', severity: 'block' } }]),
    NVDA,
  );
  assert.equal(clear.find((x) => x.id === 'ips_prohibited_sector_energy').status, 'pass');
  const unread = F.mandateChecks(
    IPS_FUND([{ type: 'prohibited_sector', value: { sector: 'Energy', severity: 'block' } }]),
    { ticker: 'ABC' },
  );
  assert.equal(unread.find((x) => x.id === 'ips_prohibited_sector_energy').status, 'unknown');
});

test('mandate checks: min_market_cap from the IPS (dollars), unknown when the cap is missing', () => {
  const rule = [{ type: 'min_market_cap', value: { value: 10e9, severity: 'block' } }];
  const small = F.mandateChecks(IPS_FUND(rule), {
    ticker: 'SM',
    sector: 'Technology',
    marketCap: 3e9,
  });
  const c = small.find((x) => x.id === 'ips_min_market_cap');
  assert.equal(c.status, 'fail');
  assert.equal(c.blocking, true);
  assert.match(c.detail, /\$3\.0B against an IPS minimum of \$10\.0B/);
  assert.equal(
    F.mandateChecks(IPS_FUND(rule), NVDA).find((x) => x.id === 'ips_min_market_cap').status,
    'pass',
  );
  /* sources-fund sets marketCap: null when the profile has none; that is
     unknown, never a $0 company. */
  const none = F.mandateChecks(IPS_FUND(rule), {
    ticker: 'NA',
    sector: 'Technology',
    marketCap: null,
  });
  assert.equal(none.find((x) => x.id === 'ips_min_market_cap').status, 'unknown');
  assert.equal(none.find((x) => x.id === 'mandate_min_cap').status, 'unknown');
  assert.equal(
    none.some((x) => x.blocking),
    false,
  );
});

test('mandate checks: min_positions, max_single_trade_pct and the uncheckable cash floor', () => {
  const checks = F.mandateChecks(
    IPS_FUND([
      { type: 'min_positions', value: { min: 15, severity: 'block' } },
      { type: 'max_single_trade_pct', value: { pct: 3, severity: 'block' } },
      { type: 'cash_floor_pct', value: { pct: 2, severity: 'block' } },
    ]),
    NVDA,
  );
  const by = Object.fromEntries(checks.map((c) => [c.id, c]));
  assert.equal(by.ips_min_positions.status, 'info');
  assert.match(
    by.ips_min_positions.detail,
    /3 positions against a minimum of 15; a new position moves it toward the minimum/,
  );
  assert.equal(by.ips_max_single_trade_pct.status, 'info');
  assert.match(by.ips_max_single_trade_pct.detail, /capped at 3% of the fund/);
  assert.equal(by.ips_cash_floor_pct.status, 'info');
  assert.equal(by.ips_cash_floor_pct.checkable, false);
  assert.match(by.ips_cash_floor_pct.detail, /^Not checkable/);
  /* None of the three blocks or downgrades the fit on its own. */
  assert.equal(
    checks.some((c) => c.blocking),
    false,
  );
  assert.equal(
    F.fitFromChecks(
      checks.filter((c) => c.id.startsWith('ips_m') || c.id === 'ips_cash_floor_pct'),
    ),
    'fits',
  );
  const enough = F.mandateChecks(IPS_FUND([{ type: 'min_positions', value: { min: 2 } }]), NVDA);
  assert.equal(enough.find((c) => c.id === 'ips_min_positions').status, 'pass');
});

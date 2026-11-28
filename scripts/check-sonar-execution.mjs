/**
 * Sonar 6.2 execution evals (Nov 28 2026).
 *
 * The analyst evals check routing; these check that a question is actually computed:
 * question -> canonical intent -> composer attachment -> executor on frozen data ->
 * fulfillment contract. Every expected number below is worked out by hand from the
 * fixtures, so a wrong calculation fails, not only a wrong route.
 *
 * Also: the confidence audit, the partners drift check, the plan-dataset gate and the
 * deadline (partial-result) recovery.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { fakeSupabase } from './lib/fake-supabase.mjs';
import { inferComposition } from '../src/lib/sonar/composer/intents.js';
import {
  runScreen,
  runComparison,
  runGovDependence,
} from '../src/lib/sonar/composer/analytics-server.js';
import { fulfillmentContract } from '../src/lib/sonar/composer/fulfillment.js';
import { analyticsDatasets, PUBLIC_ANALYTICS } from '../src/lib/sonar/composer/registry.js';
import { auditConfidence } from '../src/lib/sonar/engine/confidence.js';
import { PARTNERS } from '../src/lib/sonar/analysts/partners.js';
import { derivePartners } from './gen-sonar-partners.mjs';
import { getSonarEntitlements } from '../src/lib/sonar/entitlements.js';

const NOW = new Date('2026-11-28T12:00:00Z');

/* Annual filed figures: revenue (2 years), operating income, net income, OCF, capex,
   plus instant equity and long-term debt. */
function filed(
  ticker,
  {
    rev,
    revPrev,
    opInc,
    ni,
    niPrev,
    ocf,
    capex,
    equity,
    debt,
    end = '2025-12-31',
    prevEnd = '2024-12-31',
  },
) {
  const a = (concept, value, period_end) => ({
    ticker,
    concept,
    value,
    period_end,
    period_type: 'annual',
    entity_name: `${ticker} Corp`,
  });
  const rows = [
    a('revenue', rev, end),
    a('revenue', revPrev, prevEnd),
    a('operating_income', opInc, end),
    a('net_income', ni, end),
    a('net_income', niPrev, prevEnd),
    a('operating_cash_flow', ocf, end),
    a('capex', capex, end),
  ];
  if (equity != null)
    rows.push({
      ticker,
      concept: 'equity',
      value: equity,
      period_end: end,
      period_type: 'instant',
      entity_name: `${ticker} Corp`,
    });
  if (debt != null)
    rows.push({
      ticker,
      concept: 'long_term_debt',
      value: debt,
      period_end: end,
      period_type: 'instant',
      entity_name: `${ticker} Corp`,
    });
  return rows;
}

const FIXTURES = {
  ticker_sectors: [
    { ticker: 'AAA', sector: 'Energy' },
    { ticker: 'BBB', sector: 'Energy' },
    { ticker: 'CCC', sector: 'Energy' },
    { ticker: 'DDD', sector: 'Energy' }, // no filings
    { ticker: 'TTT', sector: 'Information Technology' },
  ],
  sec_fundamentals: [
    // AAA: growth 25%, op margin 20%
    ...filed('AAA', {
      rev: 1250,
      revPrev: 1000,
      opInc: 250,
      ni: 150,
      niPrev: 100,
      ocf: 300,
      capex: -100,
      equity: 1000,
      debt: 500,
    }),
    // BBB: growth 10%, op margin 16%
    ...filed('BBB', {
      rev: 1100,
      revPrev: 1000,
      opInc: 176,
      ni: 90,
      niPrev: 100,
      ocf: 200,
      capex: 50,
      equity: 800,
      debt: 200,
    }),
    // CCC: growth 30%, op margin 5% (fails a 15% margin filter)
    ...filed('CCC', {
      rev: 1300,
      revPrev: 1000,
      opInc: 65,
      ni: -10,
      niPrev: 20,
      ocf: 50,
      capex: 80,
      equity: 500,
      debt: 900,
    }),
    ...filed('TTT', {
      rev: 2000,
      revPrev: 1600,
      opInc: 600,
      ni: 400,
      niPrev: 300,
      ocf: 700,
      capex: 200,
      equity: 3000,
      debt: 0,
      end: '2025-06-30',
      prevEnd: '2024-06-30',
    }),
  ],
  sec_insider_transactions: [
    {
      issuer_ticker: 'AAA',
      value_usd: 100000,
      transaction_code: 'P',
      transaction_date: '2026-10-01',
      accession_no: 'a1',
    },
    {
      issuer_ticker: 'BBB',
      value_usd: 400000,
      transaction_code: 'P',
      transaction_date: '2026-11-01',
      accession_no: 'a2',
    },
    {
      issuer_ticker: 'BBB',
      value_usd: 900000,
      transaction_code: 'S',
      transaction_date: '2026-11-02',
      accession_no: 'a3',
    }, // a sale: excluded
    {
      issuer_ticker: 'AAA',
      value_usd: 5000000,
      transaction_code: 'P',
      transaction_date: '2025-01-01',
      accession_no: 'a4',
    }, // outside 90 days
  ],
  company_contract_history: [
    {
      ticker: 'AAA',
      fiscal_year: 2025,
      awarding_agency: 'Department of Defense',
      award_count: 3,
      total_amount: 300,
    },
    {
      ticker: 'AAA',
      fiscal_year: 2025,
      awarding_agency: 'Department of Energy',
      award_count: 1,
      total_amount: 100,
    },
    {
      ticker: 'AAA',
      fiscal_year: 2024,
      awarding_agency: 'Department of Defense',
      award_count: 2,
      total_amount: 200,
    },
  ],
  congress_trades: [],
};

test('E2E screen: energy companies with operating margin above 15%, ranked by insider buying', async () => {
  const q =
    'Which energy companies with operating margins above 15% did insiders buy the most over the last 90 days?';
  const { attachments } = inferComposition(q);
  assert.equal(attachments.length, 1);
  const att = attachments[0];
  assert.equal(att.capability, 'financial-screen');
  assert.equal(att.status, 'supported');
  assert.deepEqual(att.params.filters, [{ metric: 'margin', op: '>', value: 15, unit: 'pct' }]);
  assert.equal(att.params.rank_by, 'insider_buying');
  assert.equal(att.params.window_days, 90);

  const res = await runScreen(fakeSupabase(FIXTURES), att, { now: NOW });
  /* Universe 4 energy names, 3 with filings; AAA (20%) and BBB (16%) pass; ranked by
     purchases in the window: BBB 400,000 then AAA 100,000 (the sale and the old
     purchase are excluded). */
  assert.deepEqual(
    res.table.map((r) => r.ticker),
    ['BBB', 'AAA'],
  );
  assert.equal(res.table[0].insider, 400000);
  assert.equal(res.table[1].insider, 100000);
  assert.equal(res.funnel[0].count, 4);
  assert.ok(res.columns.some((c) => c.key === 'operating_margin'));
  const f = fulfillmentContract({
    plan: [{ id: 'analysis:financial-screen', label: 'Financial screen' }],
    results: [{ ...res, capability: 'financial-screen', key: 'financial-screen', status: 'done' }],
    failedTasks: [],
  });
  const obj = f.objectives.find((o) => o.id === 'analysis:financial-screen');
  assert.ok(obj, 'the screen is a required objective');
  assert.notEqual(obj.status, 'failed');
});

test('E2E screen: an unsupported measure is reported, never substituted', () => {
  const { attachments, intent } = inferComposition('Find bank stocks with a P/E below 10.');
  assert.equal(attachments.length, 0);
  assert.match(intent.unsupported || '', /P\/E/);
});

test('E2E comparison: named companies on revenue growth and operating margin', async () => {
  const { attachments } = inferComposition(
    'Compare AAA, BBB and TTT on revenue growth and operating margin',
  );
  const att = attachments[0];
  assert.equal(att.capability, 'company-comparison');
  assert.deepEqual(att.params.metrics, ['revenue_growth', 'operating_margin']);
  /* The route resolves names server side; here the tickers are given directly. */
  const res = await runComparison(
    fakeSupabase(FIXTURES),
    { ...att, params: { ...att.params, tickers: ['AAA', 'BBB', 'TTT'] } },
    { now: NOW },
  );
  const by = Object.fromEntries(res.table.map((r) => [r.ticker, r]));
  assert.ok(Math.abs(by.AAA.revenue_growth - 0.25) < 1e-9);
  assert.ok(Math.abs(by.BBB.operating_margin - 0.16) < 1e-9);
  assert.ok(Math.abs(by.TTT.operating_margin - 0.3) < 1e-9);
  assert.equal(res.leaders.operating_margin, 'TTT');
  assert.equal(res.leaders.revenue_growth, 'AAA');
  /* TTT closes its year in June: the periods only partly overlap, and that is said. */
  assert.equal(res.aligned, false);
  assert.ok(res.limitations.some((l) => /different months/.test(l)));
});

test('E2E comparison: fewer than two resolved companies fails instead of guessing', async () => {
  await assert.rejects(
    runComparison(
      fakeSupabase(FIXTURES),
      { capability: 'company-comparison', params: { tickers: ['AAA'] } },
      { now: NOW },
    ),
    /at least two/,
  );
});

test('E2E government dependence: obligations, growth, ratio to revenue and agency mix', async () => {
  const { attachments } = inferComposition('How dependent is AAA on government revenue?');
  assert.equal(attachments[0].capability, 'government-dependence');
  const res = await runGovDependence(
    fakeSupabase(FIXTURES),
    { ...attachments[0], subject: { kind: 'company', id: 'AAA' } },
    { now: NOW },
  );
  const d = res.dependence;
  assert.equal(d.latestFiscalYear, 2025);
  assert.equal(d.latestObligations, 400);
  assert.ok(Math.abs(d.obligationGrowth - 1.0) < 1e-9); // 400 vs 200
  assert.ok(Math.abs(d.obligationsToRevenue - 400 / 1250) < 1e-9);
  assert.equal(d.topAgencies[0].agency, 'Department of Defense');
  assert.ok(Math.abs(d.topAgencies[0].share - 0.75) < 1e-9);
});

test('government dependence with no contract history fails with the reason', async () => {
  await assert.rejects(
    runGovDependence(
      fakeSupabase(FIXTURES),
      { capability: 'government-dependence', subject: { kind: 'company', id: 'BBB' }, params: {} },
      { now: NOW },
    ),
    /No federal contract history/,
  );
});

test('plan datasets gate every public analytics attachment', () => {
  const free = new Set(getSonarEntitlements({ planTier: 0 }).datasets);
  const pro = new Set(getSonarEntitlements({ planTier: 2 }).datasets);
  const screen = {
    capability: 'financial-screen',
    params: { sector: 'energy', filters: [{ metric: 'margin' }], rank_by: 'institutional_breadth' },
  };
  assert.deepEqual(analyticsDatasets(screen).sort(), ['13f', 'sec-filings']);
  assert.ok(
    analyticsDatasets(screen).some((d) => !free.has(d)),
    'free plan cannot run it',
  );
  assert.ok(
    analyticsDatasets(screen).every((d) => pro.has(d)),
    'tier 2 can',
  );
  for (const cap of PUBLIC_ANALYTICS)
    assert.ok(analyticsDatasets({ capability: cap, params: {} }).length);
});

test('confidence audit: high needs coverage, validation and complete calculations', () => {
  const good = {
    claimed: 'high',
    citationCoverage: 0.95,
    claimSupportRate: 0.95,
    evidenceCount: 8,
    audit: { passed: 9, total: 10 },
    fulfillmentState: 'complete',
  };
  assert.equal(auditConfidence(good).level, 'high');
  assert.equal(auditConfidence({ ...good, writerTruncated: true }).level, 'medium');
  assert.equal(auditConfidence({ ...good, deterministic: true }).level, 'medium');
  assert.equal(auditConfidence({ ...good, fulfillmentState: 'limited' }).level, 'medium');
  assert.equal(auditConfidence({ ...good, fulfillmentState: 'failed' }).level, 'low');
  assert.equal(auditConfidence({ ...good, citationCoverage: 0.3 }).level, 'low');
  assert.equal(auditConfidence({ ...good, evidenceCount: 1 }).level, 'medium');
  /* Never raised. */
  assert.equal(auditConfidence({ ...good, claimed: 'low' }).level, 'low');
  assert.ok(auditConfidence({ ...good, writerTruncated: true }).reasons.length);
});

test('partners.js matches the SKILL.md "Support when" sections (drift check)', async () => {
  assert.deepEqual(PARTNERS, await derivePartners(), 'run: node scripts/gen-sonar-partners.mjs');
});

test('deadline recovery: a step that cannot start in time is reported as not run', async () => {
  const { runResearchComposition } = await import('../src/lib/sonar/composer/execute.js');
  const { attachments } = inferComposition('Rank energy companies by insider buying.');
  const out = await runResearchComposition(
    {
      question: 'Rank energy companies by insider buying.',
      attachments,
      deadlineAt: Date.now() + 50,
    },
    fakeSupabase(FIXTURES),
  );
  const f = fulfillmentContract(out);
  assert.equal(f.objectives.find((o) => o.id === 'analysis:financial-screen')?.status, 'failed');
  const r = out.results.find((x) => x.capability === 'financial-screen');
  assert.equal(r.timedOut, true);
  assert.match(r.failed, /time limit/);
});

test('without a deadline the same composition completes on the fixtures', async () => {
  const { runResearchComposition } = await import('../src/lib/sonar/composer/execute.js');
  const { attachments } = inferComposition('Rank energy companies by insider buying.');
  const out = await runResearchComposition(
    { question: 'Rank energy companies by insider buying.', attachments },
    fakeSupabase(FIXTURES),
  );
  const a = (out.results || []).find((r) => r.capability === 'financial-screen');
  assert.equal(a?.status, 'done');
  assert.deepEqual(a.table.map((r) => r.ticker).slice(0, 2), ['BBB', 'AAA']);
});

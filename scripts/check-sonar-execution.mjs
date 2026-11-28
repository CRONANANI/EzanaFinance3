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

import { NOW, FIXTURES } from './lib/sonar-exec-fixtures.mjs';

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
  const { attachments, intent } = inferComposition('Find bank stocks with an EV/EBITDA below 10.');
  assert.equal(attachments.length, 0);
  assert.match(intent.unsupported || '', /EV\/EBITDA/);
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
  assert.ok(res.limitations.some((l) => /different dates/.test(l)));
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

test('E2E government dependence: award vintages, paired periods, agency mix, no recognized share', async () => {
  const { attachments } = inferComposition('How dependent is AAA on government revenue?');
  assert.equal(attachments[0].capability, 'government-dependence');
  const res = await runGovDependence(
    fakeSupabase(FIXTURES),
    { ...attachments[0], subject: { kind: 'company', id: 'AAA' } },
    { now: NOW, fetchMix: async () => null },
  );
  const d = res.dependence;
  assert.equal(d.latestFiscalYear, 2026);
  assert.equal(d.latestObligations, 400);
  assert.ok(Math.abs(d.obligationGrowth - 1.0) < 1e-9); // 400 vs 200
  /* Revenue for the year ending Dec 2025 pairs with federal FY2025 (Oct 2024 to Sep 2025,
     9 shared months), not with the latest award year. */
  assert.equal(d.pairedFiscalYear, 2025);
  assert.equal(d.pairedOverlapMonths, 9);
  assert.ok(Math.abs(d.obligationsToRevenue - 200 / 1250) < 1e-9);
  /* Never derived from contracts. */
  assert.equal(d.recognizedGovernmentShare, null);
  assert.match(res.text, /not recognized government revenue/);
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
  /* Production runs on Nov 28 stated high with 2 and 3 of 7 claims surviving validation. */
  assert.equal(auditConfidence({ ...good, claimSupportRate: 2 / 7 }).level, 'low');
  assert.equal(auditConfidence({ ...good, claimSupportRate: 0.7 }).level, 'medium');
  /* Sonar 6.4: a report the verifier had to rewrite is not high. */
  assert.equal(auditConfidence({ ...good, rewritten: 1 }).level, 'medium');
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

test('company names resolve to whole-word filer names only', async () => {
  const { resolveCompany } = await import('../src/lib/sonar/composer/execute.js');
  const rows = [
    ['INTEL CORPORATION', 'INTC'],
    ['Intellicheck, Inc.', 'IDN'],
    ['AMDOCS LIMITED', 'DOX'],
    ['QUALCOMM INC/DE', 'QCOM'],
  ].map(([entity_name, ticker]) => ({ entity_name, ticker, concept: 'revenue' }));
  const db = fakeSupabase({ sec_fundamentals: rows });
  assert.equal((await resolveCompany('Intel', db)).id, 'INTC');
  assert.equal((await resolveCompany('Qualcomm', db)).id, 'QCOM');
  /* "AMD" is not AMDOCS: unresolved, and the comparison says so. */
  assert.equal((await resolveCompany('AMD', db)).kind, 'unresolved');
});

test('federal year pairing follows the months shared with the company year', async () => {
  const { federalFyForCompanyYear } = await import('../src/lib/sonar/composer/screen.js');
  assert.deepEqual(federalFyForCompanyYear('2025-12-31', [2024, 2025, 2026]), {
    fy: 2025,
    months: 9,
  });
  assert.deepEqual(federalFyForCompanyYear('2025-09-30', [2025, 2026]), { fy: 2025, months: 12 });
  assert.deepEqual(federalFyForCompanyYear('2026-01-31', [2025, 2026]), { fy: 2025, months: 8 });
  assert.equal(federalFyForCompanyYear(null, [2025]), null);
});

test('13F public preview exposes only allow-listed aggregate fields', async () => {
  const P = await import('../src/lib/sonar/composer/ownership-preview.js');
  const full = {
    key: 'institutional-ownership',
    capability: 'institutional-ownership',
    status: 'done',
    title: 'Institutional Ownership Analysis',
    coverage: { selected: 10, withData: 9, complete: 9 },
    ownership: {
      period: '2026-09-30',
      prior: '2026-06-30',
      metric: 'managers',
      universe: { total: 12, eligible: 10, excluded: 2, source: 'member disclosures' },
      coverage: { filers: 5000, comparable: 4800 },
      rows: [
        {
          rank: 2,
          ticker: 'MSFT',
          issuer: 'Microsoft',
          managers: 4100,
          value: 9e11,
          weight: 0.12,
          change: 30,
          top: [{ name: 'Vanguard' }],
        },
        {
          rank: 1,
          ticker: 'AAPL',
          issuer: 'Apple',
          managers: 4300,
          value: 1e12,
          weight: 0.2,
          change: 12,
          top: [{ name: 'BlackRock' }],
        },
        {
          rank: 3,
          ticker: 'NVDA',
          issuer: 'Nvidia',
          managers: 3900,
          value: 8e11,
          weight: 0.1,
          change: -5,
        },
        {
          rank: 4,
          ticker: 'AMZN',
          issuer: 'Amazon',
          managers: 3800,
          value: 7e11,
          weight: 0.05,
          change: 1,
        },
        { rank: null, ticker: 'XYZ', issuer: 'Private', managers: 0 },
      ],
    },
    text: 'FULL TABLE with values 1000000000000',
  };
  const p = P.ownershipPreview(full);
  assert.deepEqual(
    p.ownership.rows.map((r) => r.ticker),
    ['AAPL', 'MSFT', 'NVDA'],
  );
  for (const r of p.ownership.rows)
    assert.deepEqual(Object.keys(r).sort(), ['issuer', 'managers', 'rank', 'ticker']);
  assert.equal(p.ownership.prior, undefined);
  assert.equal(p.ownership.coverage, undefined);
  assert.equal(p.ownership.universe.source, undefined);
  assert.equal(p.ownership.ranked, 4);
  assert.doesNotMatch(p.text, /AMZN|1000000000000|Vanguard|BlackRock/);
  assert.equal(p.preview, true);

  /* Default mode is today's behaviour; entitled readers are never projected. */
  assert.equal(P.unentitledOwnershipMode({}), 'full');
  const comp = { results: [full] };
  assert.equal(
    P.applyOwnershipAccess(comp, { entitlements: { datasets: ['echo'] }, mode: 'full' })
      .composition,
    comp,
  );
  assert.equal(
    P.applyOwnershipAccess(comp, { entitlements: { datasets: ['13f'] }, mode: 'preview' })
      .composition,
    comp,
  );
  assert.equal(P.applyOwnershipAccess(comp, { entitlements: null, mode: 'off' }).composition, comp);
  const prev = P.applyOwnershipAccess(comp, {
    entitlements: { datasets: ['echo'] },
    mode: 'preview',
  });
  assert.equal(prev.applied, 'preview');
  assert.equal(prev.composition.results[0].preview, true);
  const off = P.applyOwnershipAccess(comp, { entitlements: { datasets: ['echo'] }, mode: 'off' });
  assert.equal(off.composition.results.length, 0);
  assert.match(off.notice, /13F/);
});

test('a comparison on a measure filed figures cannot give is unsupported, not defaulted', () => {
  /* Retired from the held-out set (U10) when this was fixed. */
  const { attachments, intent } = inferComposition('Compare Tesla and Ford on dividend yield');
  assert.equal(attachments.length, 0);
  assert.match(intent.unsupported || '', /dividend/i);
});

test('recognized government revenue comes from the segment disclosure for the same year', async () => {
  const att = {
    capability: 'government-dependence',
    subject: { kind: 'company', id: 'AAA' },
    params: {},
  };
  const mix = (date) => async () => ({
    annual: [{ date, gov: 500, other: 750, total: 1250, govShare: 0.4, govLabel: 'Government' }],
  });
  const same = await runGovDependence(fakeSupabase(FIXTURES), att, {
    now: NOW,
    fetchMix: mix('2025-12-31'),
  });
  assert.ok(Math.abs(same.dependence.recognizedGovernmentShare - 0.4) < 1e-9);
  assert.equal(same.dependence.recognizedGovernmentRevenue, 500);
  /* The award-value indicator stays a separate figure. */
  assert.ok(Math.abs(same.dependence.obligationsToRevenue - 0.16) < 1e-9);
  /* A segment year that is not the filed revenue year is never paired. */
  const other = await runGovDependence(fakeSupabase(FIXTURES), att, {
    now: NOW,
    fetchMix: mix('2024-12-31'),
  });
  assert.equal(other.dependence.recognizedGovernmentShare, null);
  assert.match(other.text, /does not cover the fiscal year ending 2025-12-31/);
});

test('fiscal years in the same month of different years are not aligned', async () => {
  const { compareCompanies } = await import('../src/lib/sonar/composer/screen.js');
  const row = (ticker, end) => ({ ticker, ratios: { fiscalYearEnd: end, revenue_growth: 0.1 } });
  assert.equal(
    compareCompanies([row('A', '2025-12-27'), row('B', '2025-12-31')], ['revenue_growth']).aligned,
    true,
  );
  assert.equal(
    compareCompanies([row('A', '2025-12-31'), row('B', '2024-12-31')], ['revenue_growth']).aligned,
    false,
  );
  assert.equal(
    compareCompanies([row('A', '2025-12-27'), row('B', '2026-09-27')], ['revenue_growth']).aligned,
    false,
  );
});

test('a company comparison is never read as two holders (live run, Nov 28)', async () => {
  const { extractRelation } = await import('../src/lib/sonar/composer/subject.js');
  assert.equal(
    extractRelation('Compare AMD, Intel and Qualcomm on revenue growth and operating margin'),
    null,
  );
  assert.equal(extractRelation('Compare Nancy Pelosi and BlackRock holdings')?.op, 'compare');
  assert.equal(
    extractRelation('Which stocks do Nancy Pelosi and BlackRock both own?')?.op,
    'intersect',
  );
});

test('the dependence writer rule fixes the one ratio and forbids "does not disclose"', async () => {
  const { conclusionRule } = await import('../src/lib/sonar/composer/required-outputs.js');
  const rule = conclusionRule({
    status: 'done',
    capability: 'government-dependence',
    dependence: {
      pairedFiscalYear: 2025,
      obligationsToRevenue: 0.228,
      fiscalYearEnd: '2025-12-31',
      recognizedGovernmentShare: null,
    },
  });
  assert.match(rule, /22\.8%/);
  assert.match(rule, /do not compute or state any other award-to-revenue ratio/i);
  assert.match(rule, /do not say or imply that the company does not disclose it/);
});

/* ── Sonar 6.4 ───────────────────────────────────────────────────────────────── */

test('TTM rolls the latest annual forward with later quarters, never filling a gap', async () => {
  const { ttmFigure } = await import('../src/lib/sonar/composer/calc.js');
  const A = [{ end: '2025-12-31', value: 150 }];
  const Q = [
    ['2025-03-31', 30],
    ['2025-06-30', 35],
    ['2025-09-30', 40],
    ['2026-03-31', 40],
    ['2026-06-30', 45],
    ['2026-09-30', 50],
  ].map(([end, value]) => ({ end, value }));
  assert.deepEqual(ttmFigure(A, Q, { asOf: '2026-11-28' }).value, 180);
  /* A quarter without its year-earlier counterpart: fall back to the annual, said so. */
  const t = ttmFigure(
    A,
    Q.filter((x) => x.end !== '2025-06-30'),
    { asOf: '2026-11-28' },
  );
  assert.equal(t.method, 'annual');
  assert.equal(t.value, 150);
  /* No look-ahead: periods after asOf are ignored. */
  assert.equal(ttmFigure(A, Q, { asOf: '2026-05-01' }).through, '2026-03-31');
  /* Stale: the latest period ended more than 270 days ago. */
  assert.equal(
    ttmFigure([{ end: '2025-06-30', value: 400 }], [], { asOf: '2026-11-28' }).stale,
    true,
  );
});

test('valuation: P/E, P/S, earnings yield, negative earnings and stale inputs', async () => {
  const { valuationRatios } = await import('../src/lib/sonar/composer/calc.js');
  const ok = (v) => ({ value: v, through: '2026-09-30', stale: false });
  const base = {
    shares: { end: '2026-10-20', value: 10 },
    price: { price: 200, asOf: '2026-11-27' },
    asOf: '2026-11-28',
  };
  const a = valuationRatios({ ...base, ni: ok(180), rev: ok(1370) });
  assert.ok(Math.abs(a.pe - 2000 / 180) < 1e-9);
  assert.ok(Math.abs(a.ps - 2000 / 1370) < 1e-9);
  assert.ok(Math.abs(a.earningsYield - 0.09) < 1e-12);
  const neg = valuationRatios({ ...base, ni: ok(-16), rev: ok(1315) });
  assert.equal(neg.pe, null);
  assert.equal(neg.peStatus, 'negative');
  assert.ok(neg.earningsYield < 0);
  const oldPrice = valuationRatios({
    ...base,
    price: { price: 200, asOf: '2026-11-01' },
    ni: ok(180),
    rev: ok(1370),
  });
  assert.equal(oldPrice.pe, null);
  assert.match(oldPrice.stale.join(' '), /price from 2026-11-01/);
  const oldShares = valuationRatios({
    ...base,
    shares: { end: '2025-08-01', value: 10 },
    ni: ok(180),
    rev: ok(1370),
  });
  assert.equal(oldShares.marketCap, null);
});

test('valuation screen keeps negative earnings visible and names every gap', async () => {
  const { setQuoteProvider } = await import('../src/lib/sonar/composer/analytics-server.js');
  const { PRICES } = await import('./lib/sonar-exec-fixtures.mjs');
  setQuoteProvider(async (ts) =>
    Object.fromEntries(ts.filter((t) => PRICES[t]).map((t) => [t, PRICES[t]])),
  );
  const res = await runScreen(
    fakeSupabase(FIXTURES),
    {
      capability: 'financial-screen',
      params: { sector: 'energy', filters: [], rank_by: 'earnings_yield', direction: 'descending' },
    },
    { now: NOW },
  );
  assert.deepEqual(
    res.table.map((r) => r.ticker),
    ['BBB', 'AAA', 'CCC'],
  );
  const ccc = res.table.find((r) => r.ticker === 'CCC');
  assert.ok(Math.abs(ccc.earnings_yield - -16 / 200) < 1e-12);
  assert.match(ccc.flags, /negative TTM earnings/);
  assert.ok(res.columns.some((c) => c.key === 'market_cap'));
  /* DDD has no filings: counted at the filings step, not dropped silently. */
  assert.equal(res.funnel.find((f) => f.step === 'filings').count, 3);
  assert.equal(res.funnel[0].count, 4);
  assert.ok(res.limitations.some((l) => /negative trailing earnings.*CCC/.test(l)));
  setQuoteProvider(null);
});

test('industry universes: SIC classification, no sector substitution, honest gaps', async () => {
  const semis = await runScreen(
    fakeSupabase(FIXTURES),
    {
      capability: 'financial-screen',
      params: { sector: 'semiconductors', filters: [], rank_by: 'margin' },
    },
    { now: NOW },
  );
  assert.deepEqual(
    semis.table.map((r) => r.ticker),
    ['TTT'],
  );
  assert.match(semis.funnel[0].label, /SIC 3674/);
  /* The defense universe adds companies the contract data defines. */
  const def = await runScreen(
    fakeSupabase(FIXTURES),
    {
      capability: 'financial-screen',
      params: { sector: 'defense', filters: [], rank_by: 'revenue_growth' },
    },
    { now: NOW },
  );
  assert.deepEqual(
    def.table.map((r) => r.ticker),
    ['DEF'],
  );
  /* Without a classification table the universe is not established (no GICS fallback). */
  const noTable = { ...FIXTURES, company_industry: [] };
  await assert.rejects(
    runScreen(
      fakeSupabase(noTable),
      { capability: 'financial-screen', params: { sector: 'banks' } },
      { now: NOW },
    ),
    /cannot be established; Sonar does not substitute a broader sector/,
  );
  const { universeFor } = await import('../src/lib/sonar/composer/industries.js');
  assert.equal(universeFor('solar').kind, 'unsupported');
  assert.equal(universeFor('energy').kind, 'gics');
});

test('macro: inflation trend, real policy rate and policy changes from the series', async () => {
  const { CPI } = await import('./lib/sonar-exec-fixtures.mjs');
  const { runMacro } = await import('../src/lib/sonar/composer/analytics-server.js');
  const res = await runMacro(
    fakeSupabase(FIXTURES),
    {
      capability: 'macro-indicators',
      params: {
        countries: ['USA', 'CAN'],
        measures: ['inflation', 'real_rate', 'policy_changes', 'policy_rate'],
      },
    },
    { now: NOW },
  );
  const us = res.macro.byCountry.USA;
  /* 2025-10 is missing, so the 2026-10 year-on-year rate cannot be computed. */
  assert.equal(us.latestYoYPeriod, '2026-09');
  assert.ok(Math.abs(us.latestYoY - (CPI.USA['2026-09'] / CPI.USA['2025-09'] - 1)) < 1e-12);
  assert.ok(
    Math.abs(us.annualized3m - ((CPI.USA['2026-09'] / CPI.USA['2026-06']) ** 4 - 1)) < 1e-12,
  );
  assert.equal(us.direction, 'accelerating');
  assert.match(us.gapNote, /2025-10 is missing/);
  const ca = res.macro.byCountry.CAN;
  assert.equal(ca.realRatePeriod, '2026-09');
  assert.ok(
    Math.abs(ca.realRate - (2.25 - (CPI.CAN['2026-09'] / CPI.CAN['2025-09'] - 1) * 100)) < 1e-12,
  );
  assert.equal(ca.changesThisYear, 3);
  assert.equal(ca.netChangeThisYear, -0.25);
  assert.deepEqual(
    ca.changes.map((c) => c.date),
    ['2026-03', '2026-06', '2026-10'],
  );
  await assert.rejects(
    runMacro(
      fakeSupabase(FIXTURES),
      { capability: 'macro-indicators', params: { countries: ['WAK'] } },
      { now: NOW },
    ),
    /No inflation or policy rate series/,
  );
});

test('macro: daily policy data gives effective dates when it covers the window', async () => {
  const { policyChanges } = await import('../src/lib/sonar/composer/macro.js');
  const daily = { '2025-12-15': 2.75, '2026-03-12': 2.75, '2026-03-13': 2.5, '2026-06-05': 2.25 };
  const r = policyChanges({ daily, monthly: {} }, { from: '2026-01' });
  assert.equal(r.basis, 'daily');
  assert.deepEqual(
    r.changes.map((c) => c.date),
    ['2026-03-13', '2026-06-05'],
  );
});

test('claim check: the live Palantir errors are removed, the rest of the claim stays', async () => {
  const { validateResearch } = await import('../src/lib/sonar/engine/findings.js');
  const ev = {
    marker: 'S1',
    id: 'e1',
    title: 'Government Dependence (calculated)',
    text: 'Value of federal prime awards that started in FY2026, obligated to date: $1.34B (+31.3% vs the FY2025 vintage). Awards started in the overlapping FY2025: $1.02B, 22.8% of that revenue (exposure indicator, not a revenue share). Ezana could not retrieve a government segment disclosure for this company.',
    numbers: [],
    entities: ['Palantir'],
    date: '2026-11-28',
  };
  ev.numbers = (await import('../src/lib/sonar/engine/evidence.js')).numbersOf(ev.text);
  const parsed = {
    executiveConclusion: {
      text: 'Federal prime awards that started in FY2026 total $1.34B, up 31.3% from the FY2025 vintage [S1]. The award-value-to-revenue exposure indicator is 31.3% when FY2026 awards are set against revenue [S1]. The paired indicator is 22.8% [S1]. The company does not disclose recognized government revenue share in its filings [S1].',
      evidence: ['S1'],
      classification: 'calculated_result',
    },
    keyFindings: [],
    analysis: [],
    confidence: 'high',
  };
  const out = validateResearch(parsed, {
    marked: [ev],
    metrics: [],
    question: 'How dependent is Palantir?',
  });
  const t = out.executiveConclusion.text;
  assert.match(t, /up 31\.3% from the FY2025 vintage/); // correctly labeled growth stays
  assert.match(t, /paired indicator is 22\.8%/);
  assert.doesNotMatch(t, /indicator is 31\.3%/); // mislabeled ratio removed
  assert.doesNotMatch(t, /does not disclose/); // unverified negative removed
  assert.equal(out.validation.stats.rewritten, 1);
  const log = out.validation.log.find((l) => l.kind === 'conclusion');
  assert.ok(log.problems.some((p) => /mislabeled_number:31\.3%/.test(p)));
  assert.ok(log.problems.some((p) => /unverified_negative/.test(p)));
});

test('claim check: a supported negative stays; a coverage note never supports one', async () => {
  const { unverifiedNegative, mislabeledNumbers } =
    await import('../src/lib/sonar/engine/claim-check.js');
  assert.equal(
    unverifiedNegative('The company does not disclose segment revenue.', [
      'The company does not disclose segment revenue separately in its 10-K.',
    ]),
    false,
  );
  assert.equal(
    unverifiedNegative('The company does not disclose segment revenue.', [
      'Ezana could not retrieve the segment revenue disclosure.',
    ]),
    true,
  );
  /* Labels that agree are not flagged; a margin stated as growth is. */
  assert.deepEqual(
    mislabeledNumbers('Operating margin was 20.0%.', ['Operating margin: 20.0%']),
    [],
  );
  assert.deepEqual(mislabeledNumbers('Revenue grew 20.0%.', ['Operating margin: 20.0%']), [
    '20.0%',
  ]);
});

test('claim check: a contradicting value for the same label is removed', async () => {
  const { contradictions } = await import('../src/lib/sonar/engine/claim-check.js');
  const out = contradictions(
    [
      { id: 'conclusion', text: 'AMD operating margin was 20.0% [S1].' },
      { id: 'finding_1', text: 'AMD operating margin reached 25.0% last year.' },
    ],
    ['AMD operating margin: 20.0%. AMD revenue: $34.6B.'],
  );
  assert.deepEqual(out, [{ id: 'finding_1', text: '25.0%' }]);
});

test('bench integrity: members named as the evidence names them meet the objective', async () => {
  const { scoreRun, caseById } = await import('../src/lib/sonar/engine/eval/model-bench.js');
  const { evidenceTerms } = await import('../src/lib/sonar/engine/eval/model-bench-runner.js');
  const c = caseById('multi_dataset_screen');
  const snap = {
    calls: [
      {
        source: 'congress_sector',
        output: {
          items: [
            {
              data: {
                summary: {
                  byMember: [{ name: 'Kevin Hern' }],
                  latest: [{ member: 'Lisa C. McClain' }],
                },
              },
            },
          ],
        },
      },
    ],
  };
  const run = {
    executiveConclusion:
      'Kevin Hern sold LMT three times while 27 members bought defense names; purchases were 60.8% of trades.',
    keyFindings: [],
    evidence: [],
  };
  const withTerms = scoreRun(run, { ...c, evidenceTerms: evidenceTerms(snap) });
  assert.equal(withTerms.objectives.missing.includes('members'), false);
  const without = scoreRun(run, c);
  assert.equal(without.objectives.missing.includes('members'), true);
});

test('macro: null observations (BIS weekends) are missing, never zero', async () => {
  const { runMacro } = await import('../src/lib/sonar/composer/analytics-server.js');
  const daily = [];
  for (const [d, v] of [
    ['2025-12-30', 2.75],
    ['2026-01-02', 2.75],
    ['2026-01-03', null],
    ['2026-01-04', null],
    ['2026-01-05', 2.75],
    ['2026-03-12', 2.75],
    ['2026-03-13', 2.5],
    ['2026-03-14', null],
    ['2026-03-16', 2.5],
  ])
    daily.push({
      source: 'bis',
      series_key: 'WS_CBPOL:D.CA',
      country_iso3: 'CAN',
      period: d,
      value: v,
      series_name: 'Central bank policy rates',
      frequency: 'D',
    });
  const tables = { ...FIXTURES, macro_series_values: [...FIXTURES.macro_series_values, ...daily] };
  const res = await runMacro(
    fakeSupabase(tables),
    {
      capability: 'macro-indicators',
      params: { countries: ['CAN'], measures: ['policy_changes', 'policy_rate'] },
    },
    { now: NOW },
  );
  const ca = res.macro.byCountry.CAN;
  assert.equal(ca.changeBasis, 'daily');
  assert.deepEqual(
    ca.changes.map((c) => [c.date, c.change]),
    [['2026-03-13', -0.25]],
  );
});

test('claim check: a sourced number with a different metric of the same kind is not a contradiction', async () => {
  const { contradictions } = await import('../src/lib/sonar/engine/claim-check.js');
  /* Live run: the unemployment rate (4.4%, sourced) was removed for sharing "rate" with the
     policy rate. */
  assert.deepEqual(
    contradictions(
      [
        { id: 'conclusion', text: 'The US policy rate is 3.88% [S1].' },
        { id: 'finding_1', text: 'The US unemployment rate is 4.4% [S2].' },
      ],
      [
        'United States policy rate 3.88% (2026-10).',
        'United States unemployment 4.4% in September.',
      ],
    ),
    [],
  );
});

/* ── Sonar 6.4 hardening ─────────────────────────────────────────────── */

test('coverage: screens report complete, missing-data and bounded status', async () => {
  const { screenCoverage } = await import('../src/lib/sonar/composer/analytics-server.js');
  const full = screenCoverage({ eligible: 4, evaluated: 4, withData: 4, shown: 2 });
  assert.equal(full.status, 'complete');
  assert.equal(full.exhaustive, true);
  const gaps = screenCoverage({ eligible: 4, evaluated: 4, withData: 3, shown: 2 });
  assert.equal(gaps.status, 'complete_with_missing_data');
  assert.equal(gaps.exhaustive, true);
  assert.equal(gaps.unavailable, 1);
  const bounded = screenCoverage({
    eligible: 400,
    evaluated: 400,
    withData: 380,
    shown: 15,
    priceCoverage: { candidates: 380, cached: 100, live: 150, unchecked: new Array(130).fill('X') },
  });
  assert.equal(bounded.status, 'bounded');
  assert.equal(bounded.exhaustive, false);
  assert.equal(bounded.unchecked, 130);
  assert.deepEqual(bounded.sampling, ['largest_by_filed_revenue']);
  assert.equal(bounded.prices.cached, 100);
});

test('prices: stored closes first, live quotes only for the rest, unchecked beyond the cap', async () => {
  const { pricesFor, setQuoteProvider } =
    await import('../src/lib/sonar/composer/analytics-server.js');
  const admin = fakeSupabase({
    price_data_cache: [
      { ticker: 'AAA', date: '2026-11-27', close: 10 },
      { ticker: 'AAA', date: '2026-11-26', close: 9 },
      { ticker: 'BBB', date: '2026-11-01', close: 5 }, // older than 10 days: not used
      { ticker: 'CCC', date: '2026-11-27', close: null }, // null is never a price
    ],
  });
  const asked = [];
  setQuoteProvider(async (ts) => {
    asked.push(...ts);
    return Object.fromEntries(ts.map((t) => [t, { price: 20, asOf: '2026-11-28' }]));
  });
  try {
    const r = await pricesFor(admin, ['AAA', 'BBB', 'CCC', 'DDD'], {
      now: NOW,
      liveCap: 2,
      sizeOf: (t) => ({ BBB: 1, CCC: 3, DDD: 2 })[t] ?? -1,
    });
    assert.deepEqual(r.prices.AAA, { price: 10, asOf: '2026-11-27', source: 'cache' });
    assert.deepEqual(asked.sort(), ['CCC', 'DDD']);
    assert.deepEqual(r.unchecked, ['BBB']);
    assert.equal(r.cached, 1);
    assert.equal(r.live, 2);
  } finally {
    setQuoteProvider(null);
  }
});

test('screen grammar: verbless screens keep every filter and operator', () => {
  const cases = [
    ['Energy stocks with debt to equity below 0.6', 'energy', [['debt', '<', 0.6]], null],
    [
      'Semiconductor companies with operating margins above 25%',
      'semiconductors',
      [['margin', '>', 25]],
      null,
    ],
    ['Energy companies with P/S under 1', 'energy', [['ps_ratio', '<', 1]], null],
    [
      'Which technology companies grew revenue more than 20%?',
      'technology',
      [['revenue_growth', '>', 20]],
      null,
    ],
    ['Defense contractors ranked by revenue growth', 'defense', [], 'revenue_growth'],
    ['Energy stocks trading below 1x sales', 'energy', [['ps_ratio', '<', 1]], null],
    ['Defense contractors sorted by revenue growth', 'defense', [], 'revenue_growth'],
    [
      'Energy companies with margins above 15% but P/E under 10',
      'energy',
      [
        ['margin', '>', 15],
        ['pe_ratio', '<', 10],
      ],
      null,
    ],
  ];
  for (const [q, sector, filters, rank] of cases) {
    const att = inferComposition(q).attachments[0];
    assert.equal(att?.capability, 'financial-screen', q);
    assert.equal(att.params.sector, sector, q);
    assert.deepEqual(
      att.params.filters.map((f) => [f.metric, f.op, f.value]),
      filters,
      q,
    );
    if (rank) assert.equal(att.params.rank_by, rank, q);
  }
});

test('screen grammar: an unreadable condition stops the screen with a specific notice', async () => {
  const { canonicalIntent } = await import('../src/lib/sonar/semantic/canonical-intent.js');
  for (const q of [
    'Tech stocks where revenue jumped more than 20%',
    'Energy stocks with sparkle above 3',
  ]) {
    assert.equal(
      inferComposition(q).attachments.filter((a) => a.capability === 'financial-screen').length,
      0,
      q,
    );
    assert.match(canonicalIntent(q).unsupported || '', /could not read the condition/i, q);
  }
  /* A time window is not a condition. */
  assert.equal(
    canonicalIntent('Energy companies ranked by revenue growth over 3 years').unsupported,
    null,
  );
});

test('entities: canonical identities win over their parts', async () => {
  const { understandDeterministic } = await import('../src/lib/sonar/understand/index.js');
  const { canonicalIntent } = await import('../src/lib/sonar/semantic/canonical-intent.js');
  const kinds = (q) =>
    understandDeterministic(q).entities.map((e) => `${e.type || e.kind}:${e.id}`);
  assert.deepEqual(kinds('Has the Bank of Canada cut rates?').sort(), [
    'central_bank:boc',
    'country:CA',
  ]);
  assert.deepEqual(kinds('Bank of America revenue growth'), ['company:BAC']);
  assert.deepEqual(kinds('Royal Bank of Canada revenue'), ['company:RY']);
  assert.ok(kinds('Has the Fed cut rates this year?').includes('central_bank:fed'));
  const i = canonicalIntent('Compare Bank of America and Goldman Sachs on operating margin');
  assert.equal(i.primary_entity.key, 'company:BAC');
  assert.equal(i.secondary_entities[0].key, 'company:GS');
  /* "Bank of America" and the country America never share a signature key. */
  assert.notEqual(canonicalIntent('Bank of America revenue growth').primary_entity.key, 'america');
});

test('country universe: Canadian banks are the banks with a Canadian business address, never all banks', async () => {
  const att = inferComposition('Which Canadian banks grew revenue the most?').attachments[0];
  assert.equal(att.params.sector, 'banks');
  assert.equal(att.params.country, 'CA');
  assert.equal(att.params.rank_by, 'revenue_growth');
  const withCountry = {
    ...FIXTURES,
    company_industry: [
      ...FIXTURES.company_industry.map((r) => ({ ...r, business_country: 'US' })),
      {
        ticker: 'CBK',
        cik: '99',
        sic: '6029',
        business_country: 'CA',
        verified_at: '2026-11-20T00:00:00Z',
      },
    ],
  };
  const res = await runScreen(fakeSupabase(withCountry), att, { now: NOW });
  /* CBK files under IFRS (no US GAAP figures in the store): checked, data unavailable. */
  assert.equal(res.coverage.eligibleUniverse, 1);
  assert.equal(res.coverage.status, 'complete_with_missing_data');
  assert.equal(res.table.length, 0);
  assert.ok(!res.table.some((r) => r.ticker === 'BNK'));
  /* Addresses not classified (before SQL_02 or the refresh): refused, never all banks. */
  await assert.rejects(runScreen(fakeSupabase(FIXTURES), att, { now: NOW }), /business address/);
});

test('typing: a company measure is never read as a macro theme', async () => {
  const { macroSeriesParams } = await import('../src/lib/sonar/engine/planner.js');
  /* Live 13:40 run: a comparison of AMD, Intel and Qualcomm on revenue growth was answered
     with a world GDP growth ranking. */
  assert.equal(
    macroSeriesParams(
      { rawQuery: 'Compare AMD, Intel and Qualcomm on revenue growth and operating margin' },
      {},
    ),
    null,
  );
  assert.ok(
    macroSeriesParams({ rawQuery: 'Is US GDP growth slowing?' }, {}).families.includes(
      'gdp_growth',
    ),
  );
});

test('evidence contract: verified figures, allowed and unsupported conclusions, unknowns', async () => {
  const { runMacro } = await import('../src/lib/sonar/composer/analytics-server.js');
  const { evidenceContract, evidenceContractBlock } =
    await import('../src/lib/sonar/composer/evidence-contract.js');
  const macro = await runMacro(
    fakeSupabase(FIXTURES),
    {
      capability: 'macro-indicators',
      params: { countries: ['CAN'], measures: ['policy_changes', 'policy_rate'] },
    },
    { now: NOW },
  );
  const bounded = {
    capability: 'financial-screen',
    status: 'done',
    title: 'Financial Screen',
    columns: [{ key: 'pe', label: 'P/E (TTM)', unit: 'x' }],
    table: [
      { ticker: 'AAA', pe: 5.71, ttmThrough: '2026-09-30' },
      { ticker: 'BBB', pe: null },
    ],
    coverage: {
      status: 'bounded',
      eligibleUniverse: 400,
      evaluatedCount: 400,
      unchecked: 130,
      excluded: [{ kind: 'unchecked', reason: 'not priced', count: 130 }],
    },
  };
  const c = evidenceContract([
    { ...macro, capability: 'macro-indicators', status: 'done' },
    bounded,
    { capability: 'company-comparison', status: 'failed', failed: 'no companies resolved' },
  ]);
  const [m, s, f] = c.steps;
  assert.ok(
    m.allowed.some((a) =>
      /Canada: 3 policy rate change\(s\) since 2026-01 \(2026-03 -0.25 points, 2026-06 -0.25 points, 2026-10 \+0.25 points\)/.test(
        a,
      ),
    ),
  );
  assert.ok(m.unsupported.some((a) => /forecast/i.test(a)));
  assert.deepEqual(s.verified[0], {
    entity: 'AAA',
    label: 'P/E (TTM)',
    value: '5.71x',
    period: 'TTM through 2026-09-30',
  });
  assert.ok(s.unknowns.some((u) => /BBB: P\/E \(TTM\): missing \(not zero\)/.test(u)));
  assert.ok(s.unsupported.some((u) => /130 of 400/.test(u)));
  assert.ok(/among the 270 companies checked/.test(s.allowed[0]));
  assert.equal(f.verified.length, 0);
  assert.match(evidenceContractBlock(c), /EVIDENCE CONTRACT/);
});

test('null audit: a missing filed figure is missing, never zero', async () => {
  const { filed } = await import('./lib/sonar-exec-fixtures.mjs');
  /* NUL filed revenue for 2024 only; its 2025 revenue row is null. Before the audit
     Number(null) became 0 and revenue growth read -100%. */
  const rows = filed('NUL', {
    rev: null,
    revPrev: 100e6,
    opInc: 10e6,
    ni: 5e6,
    niPrev: 4e6,
    ocf: 8e6,
    capex: 2e6,
  });
  const tables = {
    ...FIXTURES,
    sec_fundamentals: [...FIXTURES.sec_fundamentals, ...rows],
    company_industry: [...FIXTURES.company_industry],
  };
  const res = await runComparison(
    fakeSupabase(tables),
    {
      capability: 'company-comparison',
      params: { tickers: ['NUL', 'SFT'], metrics: ['revenue_growth'] },
    },
    { now: NOW },
  );
  const nul = res.table.find((r) => r.ticker === 'NUL');
  assert.notEqual(nul?.ratios?.revenue_growth, -1);
});

test('macro provenance: observed vs derived, missing months listed, nothing interpolated', async () => {
  const { runMacro } = await import('../src/lib/sonar/composer/analytics-server.js');
  const res = await runMacro(
    fakeSupabase(FIXTURES),
    { capability: 'macro-indicators', params: { countries: ['USA'], measures: ['policy_rate'] } },
    { now: NOW },
  );
  const p = res.macro.byCountry.USA.provenance;
  assert.equal(p.interpolated, false);
  /* The fixture's USA CPI is missing 2025-10, as in the real IMF series. */
  assert.ok(p.missingMonths.includes('2025-10'));
  assert.match(p.derived.latestYoY, /both months observed/);
});

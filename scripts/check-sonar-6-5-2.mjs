/**
 * Sonar 6.5.2: financial data integrity and contract accounting (Nov 28 2026).
 *
 * Deterministic suite over the frozen fixtures in scripts/fixtures/sonar-6-5-2-contracts.mjs
 * (committed before the 6.5.2 code) and a fake Supabase. No network, no model calls: the
 * no-LLM guard fails the run on any provider request. Scenarios A to T.
 */
import { llmRequests } from './lib/no-llm-guard.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fakeSupabase } from './lib/fake-supabase.mjs';
import * as F from './fixtures/sonar-6-5-2-contracts.mjs';

const K = await import('../src/lib/sonar/execution/contracts.js');
const Tx = await import('../src/lib/contractors/transactions.js');
const Ag = await import('../src/lib/contractors/agencies.js');
const Rel = await import('../src/lib/sec/entity-relationships.js');
const N = await import('../src/lib/sonar/execution/entities.js');
const In = await import('../src/lib/sonar/execution/integrity.js');
const Ps = await import('../src/lib/prices/price-shadow.js');
const Rq = await import('../src/lib/sonar/execution/requirements.js');
const I = await import('../src/lib/sonar/composer/intents.js');
const A = await import('../src/lib/sonar/composer/analytics-server.js');
const Calc = await import('../src/lib/sonar/composer/calc.js');
const Rm = await import('../src/lib/sec/registrant-map.js');
const { SCREEN_MEASURES } = await import('../src/lib/sonar/composer/screen.js');

const periods = { current: F.FY[2026], prior: F.FY[2025] };
const round = (x, d = 6) => (x == null ? x : Math.round(x * 10 ** d) / 10 ** d);
const normalized = () =>
  Tx.dedupeTransactions(F.TRANSACTIONS.map((t) => Tx.normalizeTransaction(t, t.award_id)));
const stored = () => normalized().records.map((t) => Tx.transactionRow(t));
const syncedAll = new Set(['AW-1', 'AW-2', 'AW-4', 'AW-6', 'AW-7']); // AW-3 never ingested
const flow = (opts = {}) =>
  K.obligationFlowGrowth({
    transactions: stored(),
    awards: F.AWARDS,
    syncedComplete: syncedAll,
    tickers: ['XALP', 'XBET', 'XGAM', 'XDEL'],
    periods,
    opts,
  });

/* ═══ Transaction contract ═══════════════════════════════════════════════════════ */

test('transactions: normalization keeps the source id, signed delta and federal FY; nothing is inferred', () => {
  const n = Tx.normalizeTransaction(F.TRANSACTIONS[5], 'AW-1');
  assert.equal(n.recordState, 'verified');
  assert.equal(n.sourceTransactionId, 'CONT_TX_AW1_P04');
  assert.equal(n.signedObligationDeltaUsd, -10e6);
  assert.equal(n.federalFiscalYear, 2026);
  assert.equal(
    Tx.normalizeTransaction(
      { id: 'x', action_date: '2026-01-01', federal_action_obligation: null },
      'AW-1',
    ).reason,
    'no obligation amount reported',
  );
  assert.equal(
    Tx.normalizeTransaction({ action_date: '2026-01-01', federal_action_obligation: 5 }, 'AW-1')
      .reason,
    'no source transaction id',
  );
  assert.equal(
    Tx.normalizeTransaction({ id: 'x', federal_action_obligation: 5 }, 'AW-1').reason,
    'no action date',
  );
});

/* ═══ A, B, C, D, E: flow vs cohort ═════════════════════════════════════════════ */

test('A: an award started in FY2025 whose obligations grew in FY2026 counts that growth in FY2026', () => {
  const g = flow();
  assert.equal(g.XALP.current, F.EXPECTED.flow[2026].XALP);
  assert.equal(g.XALP.prior, F.EXPECTED.flow[2025].XALP);
  assert.equal(g.XALP.change, F.EXPECTED.flowGrowth.XALP.change);
  assert.equal(round(g.XALP.growthPct), F.EXPECTED.flowGrowth.XALP.pct);
  assert.equal(g.XALP.methodology, 'transaction_period_flow_v1');
});

test('B: the award-start cohort and the annual flow differ and carry different labels and versions', () => {
  const cohort = K.obligationsInPeriod(F.AWARDS, F.FY[2026]);
  assert.equal(cohort.XALP.net, F.EXPECTED.cohort[2026].XALP);
  assert.equal(K.obligationsInPeriod(F.AWARDS, F.FY[2025]).XALP.net, F.EXPECTED.cohort[2025].XALP);
  assert.notEqual(cohort.XALP.net, flow().XALP.current);
  assert.equal(
    SCREEN_MEASURES.federal_award_cohort_obligations.methodology,
    'award_start_cohort_v1',
  );
  assert.equal(SCREEN_MEASURES.federal_obligation_flow.methodology, 'transaction_period_flow_v1');
  assert.match(
    SCREEN_MEASURES.federal_obligations_current_period.label,
    /award-start cohort/i,
    '6.5.1 id relabelled, same computation',
  );
  assert.equal(
    SCREEN_MEASURES.federal_obligations_current_period.aliasOf,
    'federal_award_cohort_obligations',
  );
});

test('C: a deobligation reduces net obligations', () => {
  const g = flow();
  assert.equal(g.XALP.grossPositive, F.EXPECTED.flowGrossPositive2026.XALP);
  assert.equal(g.XALP.current, F.EXPECTED.flowGrossPositive2026.XALP - 10e6);
  assert.equal(g.XALP.deobligations, 1);
});

test('D: the same source transaction delivered twice counts once; a changed duplicate is a conflict', () => {
  const d = normalized();
  assert.equal(d.duplicates, 1);
  assert.notEqual(flow().XALP.current, 350e6, 'would be 350M if the duplicate counted');
  const conflict = Tx.dedupeTransactions([
    Tx.normalizeTransaction(
      { id: 'Z', action_date: '2026-01-01', federal_action_obligation: 5 },
      'AW-1',
    ),
    Tx.normalizeTransaction(
      { id: 'Z', action_date: '2026-01-01', federal_action_obligation: 7 },
      'AW-1',
    ),
  ]);
  assert.deepEqual(conflict.conflicts, ['Z']);
  assert.equal(
    conflict.records.length,
    0,
    'a corrected record is never summed with the one it replaces',
  );
});

test('E: the ceiling is never used as obligations', () => {
  assert.equal(K.obligationsInPeriod(F.AWARDS, F.FY[2025]).XALP.net, 300e6);
  assert.notEqual(
    K.obligationsInPeriod(F.AWARDS, F.FY[2025]).XALP.net,
    F.AWARD_FACTS['AW-1'].base_and_all_options,
  );
  const src = readFileSync(
    new URL('../src/lib/sonar/execution/contracts.js', import.meta.url),
    'utf8',
  );
  assert.ok(
    !/base_and_all_options|base_exercised_options/.test(src.replace(/\/\*[\s\S]*?\*\//g, '')),
    'no contract measure reads a ceiling field',
  );
});

/* ═══ F: missing transactions ═══════════════════════════════════════════════════ */

test('F: without transaction records the annual flow is unavailable, never built from start dates', () => {
  const g = flow();
  assert.equal(g.XBET.current, null);
  assert.match(g.XBET.reason, /transaction records incomplete/);
  assert.equal(g.XBET.coverage.current.complete, false);
  /* complete records and no action in the period: a confirmed zero, not unknown */
  const none = K.obligationFlowGrowth({
    transactions: [],
    awards: [F.AWARDS[0]],
    syncedComplete: new Set(['AW-1']),
    tickers: ['XALP'],
    periods,
  });
  assert.equal(none.XALP.current, 0);
  assert.equal(none.XALP.prior, 0);
  assert.match(none.XALP.reason, /growth rate is undefined/);
});

/* ═══ G, N: obligations relative to revenue ════════════════════════════════════ */

test('G: flow and cohort ratios have explicit numerator, denominator, periods and versions', () => {
  const c = F.COMPANIES.XALP;
  const base = {
    ticker: 'XALP',
    revenue: c.revenue,
    revenueFyEnd: c.revenueFyEnd,
    contractPeriod: F.FY[2026],
    sources: ['test'],
    company: { ticker: 'XALP', cik: c.cik },
  };
  const fr = K.exposureToRevenue({
    ...base,
    methodology: K.METHODOLOGY.FLOW,
    obligations: flow().XALP.current,
  });
  const cr = K.exposureToRevenue({
    ...base,
    methodology: K.METHODOLOGY.COHORT,
    obligations: K.obligationsInPeriod(F.AWARDS, F.FY[2026]).XALP.net,
  });
  assert.equal(round(fr.exposureRatio), F.EXPECTED.ratio.flow);
  assert.equal(round(cr.exposureRatio), F.EXPECTED.ratio.cohort);
  assert.equal(fr.metric, 'federal_obligation_flow_to_revenue');
  assert.equal(cr.metric, 'federal_award_cohort_exposure_to_revenue');
  assert.equal(fr.methodologyVersion, 'transaction_period_flow_v1');
  assert.equal(fr.numerator.value, 230e6);
  assert.equal(fr.denominator.value, 2.3e9);
  assert.equal(fr.denominator.period.end, '2025-12-31');
  assert.deepEqual(
    [fr.numerator.period.from, fr.numerator.period.to],
    ['2025-10-01', '2026-09-30'],
  );
  assert.ok(
    fr.qualifications.some((q) => /not the share of revenue earned from the government/.test(q)),
  );
  assert.ok(cr.qualifications.some((q) => /not obligations incurred in the period/.test(q)));
  assert.ok(
    In.checkMeasure(fr, { asOf: '2026-11-28' }).ok,
    JSON.stringify(In.checkMeasure(fr).violations),
  );
});

test('N: missing or negative revenue, or a financial issuer, makes the ratio unavailable', () => {
  const p = {
    contractPeriod: F.FY[2026],
    obligations: 10e6,
    revenueFyEnd: '2025-12-31',
    methodology: K.METHODOLOGY.COHORT,
  };
  assert.match(
    K.exposureToRevenue({ ...p, ticker: 'XBET', revenue: -5e6 }).reason,
    /^revenue_zero/,
  );
  assert.match(
    K.exposureToRevenue({ ...p, ticker: 'XGAM', revenue: null }).reason,
    /^revenue_missing/,
  );
  assert.match(
    K.exposureToRevenue({ ...p, ticker: 'XBNK', revenue: 1e9, sic: 6022 }).reason,
    /^financial_issuer/,
  );
});

/* ═══ H, I: agencies ═══════════════════════════════════════════════════════════ */

test('H: an unmatched agency is unresolved: neither counted as DoD nor as "not DoD"', () => {
  assert.equal(Ag.resolveAgency('Department of Defence Logistics').status, 'unmatched');
  assert.equal(Ag.resolveAgency('  department of defense ').status, 'matched');
  assert.equal(Ag.resolveAgency(null).status, 'missing');
  assert.equal(Ag.agencyMatchState(F.AWARDS[5], 'DOD'), 'unresolved');
  const stats = {};
  const ob = K.obligationsInPeriod(F.AWARDS, F.FY[2026], { agency: 'DOD', stats });
  assert.equal(ob.XDEL, undefined);
  assert.deepEqual(Object.keys(stats.unresolvedAgency), F.EXPECTED.unresolvedAgency);
});

test('I: the selected basis decides: awarding Energy, funding Defense', () => {
  const awarding = K.obligationsInPeriod(F.AWARDS, F.FY[2026], {
    agency: 'DOD',
    basis: 'awarding',
  });
  const funding = K.obligationsInPeriod(F.AWARDS, F.FY[2026], { agency: 'DOD', basis: 'funding' });
  assert.equal(awarding.XGAM, undefined);
  assert.equal(funding.XGAM.net, 40e6);
  const doe = K.obligationsInPeriod(F.AWARDS, F.FY[2026], { agency: 'DOE', basis: 'awarding' });
  assert.equal(doe.XGAM.net, 40e6);
  const att = I.inferComposition(
    'Which publicly traded contractors receive the most obligations from the Department of Energy?',
  ).attachments[0];
  assert.equal(att.params.sector, undefined, '"Department of Energy" is never an equity sector');
  assert.deepEqual(att.params.agency, { agency: 'DOE', basis: 'awarding' });
});

/* ═══ J, K: relationships ═════════════════════════════════════════════════════ */

test('J: a verified subsidiary joins the group only while the relationship is in effect', () => {
  const { relations, rejected } = Rel.toAttributionRelations(F.RELATIONSHIPS);
  assert.equal(rejected.length, 0);
  const company = { ticker: 'XALP', cik: '9300001', name: 'Xalp Corp' };
  const g = K.groupObligations(F.AWARDS, company, relations, F.FY[2026]);
  assert.equal(g.direct, 80e6);
  assert.equal(g.group, 150e6);
  const late = Rel.toAttributionRelations([F.LATE_RELATIONSHIP]).relations;
  assert.equal(
    K.groupObligations(F.AWARDS, company, late, F.FY[2026]).group,
    80e6,
    'not in effect on the award date',
  );
  assert.deepEqual(
    Rel.validateRelationship({ ...F.RELATIONSHIPS[0], evidence: 'source_parent_field' }),
    ['evidence "source_parent_field" cannot verify a relationship on its own'],
  );
});

test('K: a similar name never becomes a parent-group attribution', () => {
  const a = N.attributeAward(
    { recipient: 'XALP HOLDINGS GROUP PLC', uei: 'UEI-XLOOK', date: '2026-05-01' },
    { ticker: 'XALP', cik: '9300001', name: 'Xalp Corp' },
    Rel.toAttributionRelations(F.RELATIONSHIPS).relations,
  );
  assert.equal(a.joins, false);
  assert.match(a.basis, /similar name only/);
});

/* ═══ L, M: SEC identity and revenue comparability ═══════════════════════════════ */

test('L: predecessor filings keep their CIK; the successor wins per frame', () => {
  const succ = Rm.indexSuccessions([
    {
      ticker: 'XALP',
      predecessor_cik: '111',
      successor_cik: '9300001',
      effective_date: '2026-01-02',
      relationship: 'holding_company_reorganization',
      source_accession: '0009300001-26-000001',
      verified: true,
    },
  ]);
  const rows = [
    { ticker: 'XALP', cik: '111', concept: 'revenue', frame: 'CY2025', value: 2.2e9 },
    { ticker: 'XALP', cik: '9300001', concept: 'revenue', frame: 'CY2025', value: 2.3e9 },
    { ticker: 'XALP', cik: '111', concept: 'revenue', frame: 'CY2024', value: 2.0e9 },
  ];
  const r = Rm.preferSuccessorFacts(rows, succ);
  assert.deepEqual(
    r.rows.map((x) => [x.frame, x.cik, x.value]),
    [
      ['CY2025', '9300001', 2.3e9],
      ['CY2024', '111', 2.0e9],
    ],
  );
  assert.equal(r.dropped.length, 1);
});

test('M: conflicting revenue concepts are not comparable for growth', () => {
  const r = Calc.companyRatios({ annual: { revenue: F.REVENUE_CONFLICT }, instant: {} });
  assert.equal(r.revenue_growth, null);
  assert.ok(r.revenue_growth_reason, 'a reason is given');
});

/* ═══ O: prices ═══════════════════════════════════════════════════════════════ */

test('O: the shadow comparison separates dividend-sized and corporate-action-sized adjustments', () => {
  const c = Ps.comparePriceSelection(F.PRICES, { asOf: '2026-11-28' });
  const by = Object.fromEntries(c.rows.map((r) => [r.ticker, r.flags]));
  assert.ok(by.XALP.includes('adjustment_dividend_like'));
  assert.ok(by.XBET.includes('adjustment_corporate_action_like'));
  assert.ok(by.XDEL.includes('future_dated'));
  assert.equal(c.byCategory.adjustment_corporate_action_like, 1);
});

/* ═══ P: provider unavailable; end-to-end flow after the migration ═════════════ */

function db({ fail, synced = [...syncedAll] } = {}) {
  const rev = (ticker, cik, v) => ({
    ticker,
    cik,
    accession_no: `${cik}-26-1`,
    concept: 'revenue',
    taxonomy_concept: 'Revenues',
    period_type: 'annual',
    period_end: '2025-12-31',
    frame: 'CY2025',
    value: v,
  });
  return fakeSupabase(
    {
      contract_awards_resolved: F.AWARDS,
      usaspending_contract_transactions: stored(),
      usaspending_award_transaction_sync: synced.map((id) => ({
        generated_award_id: id,
        complete: true,
      })),
      /* XBET's filed revenue is test-local here (it has no transaction records: unknown flow). */
      sec_fundamentals: [
        rev('XALP', '9300001', 2.3e9),
        rev('XDEL', '9300004', 0.5e9),
        rev('XBET', '9300002', 1e9),
      ],
    },
    { fail },
  );
}

test('P: an unavailable transaction source is "unavailable", never zero obligations', async () => {
  const att = {
    capability: 'financial-screen',
    params: { tickers: ['XALP', 'XDEL'], filters: [], rank_by: 'federal_obligation_flow' },
  };
  const r = await A.runScreen(
    db({
      fail: {
        usaspending_contract_transactions:
          'relation "public.usaspending_contract_transactions" does not exist',
      },
    }),
    att,
    { now: F.NOW },
  );
  assert.equal(r.table.length, 0);
  assert.ok(r.steps.some((s) => s.source === 'contracts_flow' && s.status === 'unavailable'));
  assert.equal(r.researchState, 'provider_unavailable');
  assert.equal(A.readFailureStatus('fetch failed'), 'provider_error');
});

test('P: once the tables exist, the screen reports fiscal-year flows with coverage', async () => {
  const att = {
    capability: 'financial-screen',
    params: {
      tickers: ['XALP', 'XBET', 'XDEL'],
      filters: [],
      rank_by: 'federal_obligation_flow_to_revenue',
    },
  };
  const r = await A.runScreen(db(), att, { now: F.NOW });
  const x = r.contractExposure.find((e) => e.ticker === 'XALP');
  assert.equal(round(x.exposureRatio), F.EXPECTED.ratio.flow);
  assert.equal(x.methodologyVersion, 'transaction_period_flow_v1');
  const b = r.contractExposure.find((e) => e.ticker === 'XBET');
  assert.equal(b.exposureRatio, null);
  assert.ok(r.unknownTickers.includes('XBET'));
  assert.ok(r.limitations.some((l) => /complete for 2 of 3 companies/.test(l)));
});

/* ═══ Q, R, S, T ════════════════════════════════════════════════════════════════ */

test('Q: an award whose performance ends in 2031 is valid and counted in its year', () => {
  assert.equal(flow().XGAM.current, F.EXPECTED.flow[2026].XGAM);
  assert.equal(K.obligationsInPeriod(F.AWARDS, F.FY[2026]).XGAM.net, F.EXPECTED.cohort[2026].XGAM);
});

test('R: an award starting in 2027 is excluded from historical periods and counted', () => {
  const stats = {};
  K.obligationsInPeriod(F.AWARDS, F.FY[2026], { asOf: '2026-11-28', stats });
  assert.equal(stats.futureStart, F.EXPECTED.futureStartExcluded.length);
});

test('S: September 30 and October 1 fall in different federal fiscal years', () => {
  for (const [id, fy] of Object.entries(F.EXPECTED.boundary)) {
    const t = F.TRANSACTIONS.find((x) => x.id === id);
    assert.equal(Tx.federalFiscalYearOf(t.action_date), fy, id);
  }
});

test('T: incomplete coverage is never presented as exhaustive', async () => {
  const att = {
    capability: 'financial-screen',
    params: {
      tickers: ['XALP', 'XBET'],
      filters: [{ metric: 'federal_obligation_flow_change', op: '>', value: 0 }],
      rank_by: 'federal_obligation_flow_change',
    },
  };
  const r = await A.runScreen(db(), att, { now: F.NOW });
  assert.equal(r.universeReport.exhaustive, false);
  assert.ok(['complete_with_missing_data', 'partial_coverage'].includes(r.researchState));
  assert.deepEqual(
    r.table.map((x) => x.ticker),
    ['XALP'],
  );
});

/* ═══ Integrity, planner, telemetry, safety ═══════════════════════════════════ */

test('integrity: missing-as-zero, lost ratio terms, cumulative-as-flow and no lineage are rejected', () => {
  const bad = {
    metric: 'x',
    methodologyVersion: 'award_start_cohort_v1',
    measureKind: 'period_flow',
    ticker: 'X',
    value: 0.1,
    contractPeriod: F.FY[2026],
    numerator: { value: null },
    denominator: { value: 0 },
    missing: ['revenue'],
  };
  const rules = In.checkMeasure(bad).violations.map((v) => v.rule);
  for (const r of [
    'temporal.cumulative_not_flow',
    'numeric.missing_not_zero',
    'numeric.ratio_terms',
    'source.lineage',
  ])
    assert.ok(rules.includes(r), r);
  const e = In.enforce(bad);
  assert.equal(e.value, null);
  assert.match(e.reason, /^integrity/);
  assert.equal(
    In.researchState({
      steps: [{ status: 'complete' }],
      outcome: { unknown: 0, status: 'complete' },
    }),
    'complete',
  );
});

test('planner: growth asks for the flow; a ratio without a period is the labelled cohort; "during FY" asks for the flow ratio', () => {
  const g = I.inferComposition(
    'Which publicly traded companies experienced increasing federal contract obligations over the last two comparable periods?',
  ).attachments[0];
  assert.equal(g.params.filters[0].metric, 'federal_obligation_flow_change');
  const c = I.inferComposition(
    'Rank publicly traded companies by federal contract obligations relative to annual revenue.',
  ).attachments[0];
  assert.equal(c.params.rank_by, 'federal_award_cohort_exposure_to_revenue');
  const f = Rq.extractRequirements(
    'Rank companies by federal obligations incurred during the fiscal year relative to revenue.',
  );
  assert.equal(f.ranking.measure, 'federal_obligation_flow_to_revenue');
});

test('telemetry: data-quality counts are numbers only', async () => {
  const r = await A.runScreen(
    db(),
    {
      capability: 'financial-screen',
      params: { tickers: ['XALP', 'XBET'], filters: [], rank_by: 'federal_obligation_flow' },
    },
    { now: F.NOW },
  );
  const dq = r.telemetry.dataQuality;
  assert.equal(typeof dq.unknownAnnualObligations, 'number');
  assert.equal(dq.unknownAnnualObligations, 1);
  assert.ok(!/XALP|XBET/.test(JSON.stringify(r.telemetry)));
});

test('ingestion stays off; no flags read; no model calls', async () => {
  const off = await Tx.ingestAwardTransactions({}, { awardIds: ['AW-1'] });
  assert.equal(off.skipped, 'disabled');
  const route = readFileSync(
    new URL('../src/app/api/cron/ingest-contract-transactions/route.js', import.meta.url),
    'utf8',
  );
  assert.match(route, /SONAR_CONTRACT_TRANSACTIONS_INGEST !== '1'/);
  assert.ok(
    !readFileSync(new URL('../vercel.json', import.meta.url), 'utf8').includes(
      'ingest-contract-transactions',
    ),
    'not scheduled',
  );
  for (const f of [
    'src/lib/contractors/transactions.js',
    'src/lib/sonar/execution/integrity.js',
    'src/lib/sec/entity-relationships.js',
  ]) {
    const s = readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
    assert.ok(!/@anthropic-ai|generateText|Math\.random|SONAR_PRICE_(SYNC|CONTRACT)/.test(s), f);
  }
  assert.equal(llmRequests.length, 0);
});

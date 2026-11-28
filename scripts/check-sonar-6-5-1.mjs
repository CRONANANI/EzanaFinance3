/**
 * Sonar 6.5.1: research coverage, entity intelligence and production integration (Nov 28 2026).
 *
 * Deterministic suite over the frozen fixtures in scripts/fixtures/sonar-6-5-1-research.mjs
 * (committed before the 6.5.1 code) and a fake Supabase. No network, no model calls: the
 * no-LLM guard fails the run on any provider request. Scenarios A to P.
 */
import { llmRequests } from './lib/no-llm-guard.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fakeSupabase } from './lib/fake-supabase.mjs';
import * as F from './fixtures/sonar-6-5-1-research.mjs';

const K = await import('../src/lib/sonar/execution/contracts.js');
const Ag = await import('../src/lib/contractors/agencies.js');
const Id = await import('../src/lib/sec/security-identity.js');
const Rq = await import('../src/lib/sonar/execution/requirements.js');
const Sy = await import('../src/lib/sonar/execution/synthesis.js');
const I = await import('../src/lib/sonar/composer/intents.js');
const A = await import('../src/lib/sonar/composer/analytics-server.js');
const S = await import('../src/lib/sonar/composer/stages.js');
const Ps = await import('../src/lib/prices/price-shadow.js');
const Fe = await import('../src/lib/sonar/valuation/fetch.js');
const Rm = await import('../src/lib/sec/registrant-map.js');

const sorted = (a) => [...a].sort();
const plan = (q) => I.inferComposition(q).attachments[0];
const round = (x) => (x == null ? x : Math.round(x * 1e6) / 1e6);

/* ── fake database over the fixtures ── */
function db({ fail, congress, holders, sectors } = {}) {
  const tickers = Object.keys(F.ENTITIES).concat(['XMED', 'PSKY', 'SKYD']);
  const cusip = (t) => `${t.padEnd(6, '0').slice(0, 6)}101`;
  const filings = [];
  for (const period of ['2026-09-30', '2026-06-30'])
    for (let i = 0; i < 10; i += 1)
      filings.push({
        accession_no: `${period}-${i}`,
        cik: String(1000 + i),
        filer_name: `Filer ${i}`,
        book: 1e9,
        is_addon: false,
        period,
      });
  const own = {};
  for (const [t, [now, prior]] of Object.entries(holders || F.HOLDERS))
    own[cusip(t)] = { comparable_now: now, comparable_prior: prior };
  return fakeSupabase(
    {
      contract_awards_resolved: F.AWARDS,
      sec_fundamentals: F.FUNDAMENTALS,
      congress_trades: congress || F.CONGRESS,
      sec_cusip_map: tickers.map((t) => ({
        cusip: cusip(t),
        ticker: t,
        security_type: 'Common Stock',
        market_sector: 'Equity',
        name: `${t} CORP`,
        status: 'mapped',
      })),
      sec_13f_effective_filings: filings,
      ticker_sectors: sectors || F.TICKER_SECTORS,
      company_industry: [],
    },
    {
      fail,
      rpc: {
        sonar_13f_ownership: ({ p_cusips }) => ({
          rows: p_cusips
            .filter((c) => own[c])
            .map((c) => ({
              cusip: c,
              managers: own[c].comparable_now,
              value_usd: 1e6,
              shares: 1000,
              ...own[c],
              top: [],
            })),
        }),
      },
    },
  );
}

const verdictsOf = (r) => {
  const m = r.conditionReport.matrix;
  return {
    pass: sorted(m.filter((x) => x.verdict === 'pass').map((x) => x.ticker)),
    fail: sorted(m.filter((x) => x.verdict === 'fail').map((x) => x.ticker)),
    unknown: sorted(m.filter((x) => x.verdict === 'unknown').map((x) => x.ticker)),
  };
};

/* ═══ A. Contracts relative to revenue ═════════════════════════════════════════ */

test('A: "rank by obligations relative to revenue" is an executable plan', () => {
  const att = plan(
    'Rank publicly traded companies by federal contract obligations relative to annual revenue.',
  );
  assert.equal(att.capability, 'financial-screen');
  assert.equal(att.params.rank_by, 'federal_contract_obligations_to_revenue');
  assert.equal(att.params.universe_from, 'contracts');
  for (const q of [
    'Which defense companies have the highest federal contracting exposure compared with annual revenue?',
    "How significant are government obligations relative to Palantir's reported revenue?",
    'Compare federal obligations relative to revenue for Lockheed Martin, RTX, and Northrop Grumman.',
  ])
    assert.equal(plan(q)?.params.rank_by, 'federal_contract_obligations_to_revenue', q);
  assert.deepEqual(
    plan(
      'Compare federal obligations relative to revenue for Lockheed Martin, RTX, and Northrop Grumman.',
    ).params.tickers,
    ['LMT', 'RTX', 'NOC'],
  );
  assert.deepEqual(
    plan("How significant are government obligations relative to Palantir's reported revenue?")
      .params.tickers,
    ['PLTR'],
  );
});

test('A: end to end, ratios over aligned periods; missing, zero and misaligned revenue are unavailable', async () => {
  const att = plan(
    'Rank publicly traded companies by federal contract obligations relative to annual revenue.',
  );
  const r = await A.runScreen(db(), att, { now: F.NOW });
  const got = Object.fromEntries(
    r.table.map((x) => [
      x.ticker,
      round(r.contractExposure.find((e) => e.ticker === x.ticker).exposureRatio),
    ]),
  );
  assert.deepEqual(got, F.EXPECTED.A.ratios);
  assert.deepEqual(
    r.table.map((x) => x.ticker),
    F.EXPECTED.A.order,
  );
  for (const [t, why] of Object.entries(F.EXPECTED.A.unavailable)) {
    const e = r.contractExposure.find((x) => x.ticker === t);
    assert.equal(e.exposureRatio, null, t);
    assert.match(e.reason, new RegExp(`^${why}`), t);
  }
  assert.deepEqual(sorted(r.unknownTickers), ['XMIS', 'XNRV', 'XZERO']);
  const x = r.contractExposure.find((e) => e.ticker === 'XLMT');
  assert.equal(x.obligations, 700e6);
  assert.equal(x.revenue, 10e9);
  assert.equal(x.attribution, 'direct');
  assert.equal(x.methodology, 'obligations_to_latest_filed_revenue_proxy');
  assert.deepEqual([x.contractPeriod.from, x.contractPeriod.to], ['2025-10-01', '2026-09-30']);
  assert.equal(x.revenuePeriod.end, '2025-12-31');
  assert.ok(x.qualifications.some((q) => /not the share of reported revenue/.test(q)));
  assert.ok(r.limitations.some((l) => /exposure proxy/.test(l)));
});

test('A: the obligations proxy never answers the accounting question', () => {
  const reqs = Rq.extractRequirements(
    'What share of revenue from the government does Lockheed Martin report?',
  );
  const g = reqs.conditions.find((c) => c.id === 'gov_revenue_share');
  assert.equal(g.resolution, 'unsupported');
  assert.match(g.note, /exposure proxy/);
});

/* ═══ B. Agency filter ═══════════════════════════════════════════════════════════ */

test('B: agency resolution is exact on the stored toptier name; awarding is the labelled default', () => {
  assert.equal(Ag.agencyFromSourceName('Department of Defense').cgac, '097');
  assert.equal(Ag.agencyFromSourceName('Dept of Defense'), null, 'no fuzzy matching');
  const q = Ag.agenciesInQuestion('Which companies received new DoD awards?');
  assert.equal(q.agencies[0].id, 'DOD');
  assert.equal(q.basis, 'awarding');
  assert.equal(
    Ag.agenciesInQuestion('contracts funded by the Department of Energy').basis,
    'funding',
  );
  const row = F.AWARDS.find((a) => a.generated_award_id === 'X-NOC-1');
  assert.equal(Ag.awardMatchesAgency(row, 'DOD', 'awarding'), false);
  assert.equal(Ag.awardMatchesAgency(row, 'DOD', 'funding'), true);
});

test('B: "new DoD awards in the last 12 months" applies the verified agency filter end to end', async () => {
  const att = plan(
    'Which publicly traded companies received new DoD contract awards in the last 12 months?',
  );
  assert.deepEqual(att.params.agency, { agency: 'DOD', basis: 'awarding' });
  const r = await A.runScreen(db(), att, { now: F.NOW });
  assert.deepEqual(sorted(r.table.map((x) => x.ticker)), F.EXPECTED.B.awarding);
  assert.equal(r.agencyFilter.agency, 'Department of Defense');
  assert.equal(r.agencyFilter.basis, 'awarding');
  assert.ok(r.stages[0].lineage[0].filter.includes('awarding agency Department of Defense'));
  const funding = await A.runScreen(
    db(),
    { ...att, params: { ...att.params, agency: { agency: 'DOD', basis: 'funding' } } },
    { now: F.NOW },
  );
  assert.deepEqual(sorted(funding.table.map((x) => x.ticker)), F.EXPECTED.B.funding);
  const obj = Rq.evaluateObjective(
    Rq.extractRequirements(
      'Which publicly traded companies received new DoD contract awards in the last 12 months?',
    ),
    r,
  );
  assert.notEqual(obj.requirements.find((q) => q.id === 'agency').status, 'not_executed');
});

test('B: Department of Energy is an agency, not the energy sector', () => {
  const att = plan(
    'Which publicly traded contractors receive the most obligations from the Department of Energy?',
  );
  assert.equal(att.params.sector, undefined);
  assert.deepEqual(att.params.agency, { agency: 'DOE', basis: 'awarding' });
  assert.equal(att.params.rank_by, 'federal_obligations_current_period');
});

/* ═══ C. Congress + DoD + 13F ═══════════════════════════════════════════════════ */

test('C: every requested filter is represented and executed', async () => {
  const att = plan(
    'Find companies purchased by members of Congress that won Department of Defense contracts and increased institutional ownership.',
  );
  assert.deepEqual(
    att.params.filters.map((f) => f.metric),
    ['congress_holders', 'gov_contract_value', 'institutional_breadth_change'],
  );
  assert.deepEqual(att.params.agency, { agency: 'DOD', basis: 'awarding' });
  assert.equal(
    att.params.rank_by,
    'institutional_breadth_change',
    'ranked by the change asked for, not the 13F level',
  );
  const r = await A.runScreen(db(), att, { now: F.NOW });
  assert.deepEqual(verdictsOf(r), F.EXPECTED.C);
  assert.deepEqual(
    r.table.map((x) => x.ticker),
    ['XLMT'],
  );
  const obj = Rq.evaluateObjective(
    Rq.extractRequirements(
      'Find companies purchased by members of Congress that won Department of Defense contracts and increased institutional ownership.',
    ),
    r,
  );
  for (const q of obj.requirements) assert.notEqual(q.status, 'not_executed', q.id);
});

/* ═══ D, E. Contract growth ═════════════════════════════════════════════════════ */

test('D: comparable federal fiscal years, net and gross obligations, and unknown without a prior year', async () => {
  const per = K.comparableFederalYears(F.NOW);
  assert.deepEqual(
    [per.current.from, per.current.to, per.prior.from, per.prior.to],
    [F.FFY.current.from, F.FFY.current.to, F.FFY.prior.from, F.FFY.prior.to],
  );
  const g = K.obligationsGrowth(F.AWARDS, ['XLMT', 'XRTX', 'XNOC'], per);
  assert.equal(g.XLMT.current, F.EXPECTED.growth.XLMT.current);
  assert.equal(g.XLMT.change, F.EXPECTED.growth.XLMT.change);
  assert.equal(round(g.XLMT.growthPct), F.EXPECTED.growth.XLMT.pct);
  assert.equal(g.XRTX.current, F.EXPECTED.growth.XRTX.current, 'the deobligation is preserved');
  assert.equal(g.XRTX.grossPositive, F.EXPECTED.growth.XRTX.grossPositive);
  assert.equal(g.XNOC.change, null);
  assert.match(g.XNOC.reason, /unknown, not growth from zero/);
  const att = plan(
    'Which publicly traded companies experienced increasing federal contract obligations over the last two comparable periods?',
  );
  assert.equal(att.params.filters[0].metric, 'federal_obligations_change');
  const r = await A.runScreen(db(), att, { now: F.NOW });
  assert.deepEqual(verdictsOf(r), F.EXPECTED.D);
});

test('E: increasing obligations AND declining margin (two-condition intersection)', async () => {
  const att = plan(
    'Find defense contractors with increasing federal obligations but declining operating margins.',
  );
  assert.deepEqual(sorted(att.params.filters.map((f) => f.metric)), [
    'federal_obligations_change',
    'margin_change',
  ]);
  const r = await A.runScreen(
    db(),
    {
      ...att,
      params: { ...att.params, sector: undefined, tickers: ['XLMT', 'XRTX', 'XNOC', 'XGRP'] },
    },
    { now: F.NOW },
  );
  assert.deepEqual(verdictsOf(r), F.EXPECTED.E);
});

/* ═══ F, G. Historical congressional tickers ════════════════════════════════════ */

test('F/G: PARA trades resolve by transaction date; unverifiable ones are unresolved, never the current issuer', () => {
  const now = F.NOW;
  const got = Object.fromEntries(F.PARA_TRADES.map((t) => [t.id, Id.tradeSecurity(t, { now })]));
  assert.equal(got.P1.status, 'resolved');
  assert.equal(got.P1.cik, '813828');
  assert.equal(got.P1.currentSecurity, false, "Paramount Global is not today's PARA");
  assert.equal(got.P2.cik, '813828', 'last day before the reassignment');
  for (const k of ['P3', 'P4', 'P5', 'P6']) assert.equal(got[k].status, 'unresolved', k);
  assert.match(got.P3.basis, /reassigned/);
  assert.equal(got.P1.source.disclosureDate, '2025-04-01', 'filing reference preserved');
  /* a date range that spans the reassignment stays uncertain */
  const range = Id.tradeSecurity(
    { ticker: 'PARA', transaction_date_start: '2025-08-01', transaction_date_end: '2025-08-20' },
    { now },
  );
  assert.equal(range.status, 'unresolved');
  assert.equal(range.dateUncertain, true);
});

test('F: a PARA trade from 2025 does not seed the current PARA in a screen', () => {
  const s = A.seedFromRows(
    'congress',
    [
      ...F.CONGRESS,
      ...F.PARA_TRADES.filter((t) => t.ticker).map((t, i) => ({
        ...t,
        id: 100 + i,
        bioguide_id: `MP${i}`,
      })),
    ],
    { since: '2025-01-01', until: '2026-11-28' },
  );
  assert.ok(!s.rows.some((r) => r.ticker === 'PARA'));
  assert.equal(
    s.lineage[0].historicalIdentityExcluded,
    5,
    'all five PARA trades with a ticker: two are Paramount Global, three cannot be tied to a verified holder',
  );
});

test('G: a corporate successor with a changed CIK keeps the trade on its security and notes the change', () => {
  const succ = Rm.indexSuccessions([
    {
      ticker: 'XOLD',
      predecessor_cik: '111',
      successor_cik: '222',
      effective_date: '2026-01-02',
      relationship: 'holding_company_reorganization',
      source_accession: '0000000222-26-000001',
      verified: true,
    },
  ]);
  const r = Id.tradeSecurity(
    { ticker: 'XOLD', transaction_date: '2025-06-01' },
    { successions: succ },
  );
  assert.equal(r.status, 'resolved');
  assert.equal(r.currentSecurity, true);
  assert.deepEqual(r.registrantChange, {
    predecessorCik: '111',
    successorCik: '222',
    effective: '2026-01-02',
  });
});

/* ═══ H. SKYD / PSKY ═══════════════════════════════════════════════════════════ */

test('H: one entity in the sector table; fundamentals and 13F found under it; unrelated issuers untouched', async () => {
  const d = Id.dedupeByEntity(['PSKY', 'SKYD', 'XMED', 'PARA'], { asOf: F.NOW });
  assert.deepEqual(d.tickers, ['SKYD', 'XMED', 'PARA']);
  assert.deepEqual(d.merged, [{ kept: 'SKYD', dropped: ['PSKY'], cik: '2041610' }]);
  /* Sector screen over a table that lists the company twice (test-local rows: the GICS
     sector name and filed revenue for the two listed companies). */
  const sectors = F.TICKER_SECTORS.map((r) => ({ ...r, sector: 'Information Technology' }));
  const rev = (ticker, cik, v) => ({
    ticker,
    cik,
    accession_no: `${cik}-26-1`,
    concept: 'revenue',
    taxonomy_concept: 'Revenues',
    period_type: 'annual',
    period_end: '2025-12-31',
    value: v,
  });
  const admin = fakeSupabase({
    ticker_sectors: sectors,
    sec_fundamentals: [rev('SKYD', '2041610', 29e9), rev('XMED', '9200001', 1e9)],
    company_industry: [],
  });
  const r = await A.runScreen(
    admin,
    {
      capability: 'financial-screen',
      params: { sector: 'technology', filters: [], rank_by: 'revenue' },
    },
    { now: F.NOW },
  );
  assert.deepEqual(
    r.table.map((x) => x.ticker),
    ['SKYD', 'XMED'],
  );
  assert.ok(r.limitations.some((l) => /one company \(CIK 2041610\)/.test(l)));
  /* PSKY requested directly still finds the company's filed revenue (6.5 rule), joined only
     on its own CIK. */
  const f = await A.filedFiguresPaged(admin, ['PSKY'], F.NOW);
  assert.equal(f.PSKY.annual.revenue[0].value, 29e9);
});

/* ═══ I, K, L. Coverage, zero results, provider failure ═══════════════════════ */

test('I: a 200-company universe with 150 13F checks is bounded, never fully evaluated', async () => {
  const tickers = Array.from({ length: 200 }, (_, i) => `Y${String(i).padStart(3, '0')}`);
  const congress = tickers.map((t, i) => ({
    id: i + 1,
    ticker: t,
    bioguide_id: 'M1',
    type: 'purchase',
    transaction_date: '2026-06-01',
  }));
  const cusipRows = tickers.map((t) => ({
    cusip: `${t.padEnd(6, '0').slice(0, 6)}101`,
    ticker: t,
    security_type: 'Common Stock',
    market_sector: 'Equity',
    name: `${t} CORP`,
    status: 'mapped',
  }));
  const filings = [];
  for (const period of ['2026-09-30', '2026-06-30'])
    for (let i = 0; i < 10; i += 1)
      filings.push({
        accession_no: `${period}-${i}`,
        cik: String(1000 + i),
        filer_name: `F${i}`,
        book: 1e9,
        is_addon: false,
        period,
      });
  const admin2 = fakeSupabase(
    {
      congress_trades: congress,
      sec_cusip_map: cusipRows,
      sec_13f_effective_filings: filings,
      contract_awards_resolved: [],
      sec_fundamentals: [],
    },
    {
      rpc: {
        sonar_13f_ownership: ({ p_cusips }) => ({
          rows: p_cusips.map((c) => ({
            cusip: c,
            managers: 3,
            comparable_now: 3,
            comparable_prior: 2,
            value_usd: 1,
            shares: 1,
            top: [],
          })),
        }),
      },
    },
  );
  const att = {
    capability: 'financial-screen',
    params: {
      universe_from: 'congress',
      window_days: 365,
      filters: [
        { metric: 'congress_holders', op: 'exists' },
        { metric: 'institutional_breadth_change', op: '>', value: 0 },
      ],
      rank_by: 'institutional_breadth_change',
    },
  };
  const r = await A.runScreen(admin2, att, { now: F.NOW });
  assert.equal(r.universeReport.eligible, 200);
  assert.equal(r.universeReport.evaluated, 150);
  assert.equal(r.universeReport.unchecked, 50);
  assert.equal(r.universeReport.coverageStatus, 'bounded');
  assert.equal(r.universeReport.exhaustive, false);
  assert.equal(r.rankingScope, 'checked_companies_only');
  assert.ok(r.limitations.some((l) => /not exhaustive/.test(l)));
  /* Stage B: the 12-company follow-on never removes rows from the screen. */
  const u = S.universeFromComposition({
    results: [
      {
        capability: 'financial-screen',
        status: 'done',
        table: r.table.length
          ? r.table
          : Array.from({ length: 20 }, (_, i) => ({ ticker: tickers[i] })),
        rankBy: r.rankBy,
        universeReport: r.universeReport,
        stages: [],
      },
    ],
  });
  assert.ok(u.tickers.length <= 12);
  assert.equal(u.research.totalQualified, u.allTickers.length);
  assert.equal(u.research.selection, 'top_ranked_passing');
  assert.equal(u.research.screenCoverage, 'bounded');
  assert.ok(u.allTickers.length >= u.tickers.length);
});

test('K: an empty result is a true zero only when every condition was evaluated', async () => {
  const att = plan(
    'Which publicly traded companies received new DoD contract awards in the last 12 months?',
  );
  const empty = fakeSupabase({ contract_awards_resolved: [], sec_fundamentals: [] });
  const r = await A.runScreen(empty, att, { now: F.NOW });
  assert.equal(r.table.length, 0);
  assert.equal(r.stages[0].status, 'empty');
});

test('L: a contract provider failure produces no ranking, no false zero, and a failure category', async () => {
  const att = {
    capability: 'financial-screen',
    params: {
      tickers: ['XLMT', 'XRTX'],
      filters: [],
      rank_by: 'federal_contract_obligations_to_revenue',
    },
  };
  const r = await A.runScreen(
    db({ fail: { contract_awards_resolved: 'fetch failed: ECONNRESET' } }),
    att,
    { now: F.NOW },
  );
  assert.equal(r.table.length, 0, 'nothing fabricated');
  assert.equal(r.outcome.zeroResult, false, 'not presented as "nothing qualified"');
  assert.ok(r.steps.some((s) => s.source === 'contracts_ratio' && s.status === 'provider_error'));
  assert.equal(Sy.failureCategory(new Error('fetch failed: ECONNRESET')), 'dataset_unavailable');
  assert.equal(
    Sy.failureCategory({ status: 402, message: 'Your credit balance is too low' }),
    'provider_entitlement',
  );
  assert.equal(
    Sy.failureCategory(new Error('The operation was aborted due to timeout')),
    'timeout',
  );
});

/* ═══ J, M, N. Attribution, unsupported, period mismatch ════════════════════════ */

test('J: direct and group attribution stay distinct; only verified subsidiaries join', () => {
  const company = { ticker: 'XGRP', cik: '9100005', name: 'Xgrp Holdings' };
  const g = K.groupObligations(F.AWARDS, company, F.RELATIONSHIPS, F.FFY.current);
  assert.equal(g.direct, 50e6);
  assert.equal(g.group, 130e6);
  const direct = K.obligationsToRevenue({
    ticker: 'XGRP',
    obligations: g.direct,
    revenue: 1e9,
    revenueFyEnd: '2025-12-31',
    contractPeriod: F.FFY.current,
  });
  const group = K.obligationsToRevenue({
    ticker: 'XGRP',
    obligations: g.group,
    revenue: 1e9,
    revenueFyEnd: '2025-12-31',
    contractPeriod: F.FFY.current,
    attribution: 'parent_group',
  });
  assert.equal(round(direct.exposureRatio), F.EXPECTED.J.direct);
  assert.equal(round(group.exposureRatio), F.EXPECTED.J.group);
  const unverified = K.groupObligations(
    F.AWARDS,
    company,
    [{ ...F.RELATIONSHIPS[0], verified: false }],
    F.FFY.current,
  );
  assert.equal(unverified.group, 50e6);
});

test('M: interest-rate sensitivity stays unsupported; institutional definitions are not substituted', () => {
  const r = Rq.extractRequirements(
    'Which companies have high interest rate sensitivity and rising revenue?',
  );
  assert.equal(r.conditions.find((c) => c.id === 'rate_sensitivity').resolution, 'unsupported');
  const pct = Rq.extractRequirements(
    'Which defense companies saw their institutional ownership percentage rise?',
  );
  const c = pct.conditions.find((x) => x.id === 'institutional');
  assert.equal(c.resolution, 'unsupported');
  assert.equal(c.metric, null, 'the manager count is not substituted for ownership percentage');
  const managers = Rq.extractRequirements('Which companies have more 13F managers holding them?');
  assert.equal(managers.conditions.find((x) => x.id === 'institutional').resolution, 'exact');
});

test('N: a financial period mismatch makes the ratio unavailable, with the reason', () => {
  const r = K.obligationsToRevenue({
    ticker: 'XMIS',
    obligations: 30e6,
    revenue: 0.6e9,
    revenueFyEnd: '2024-06-30',
    contractPeriod: F.FFY.current,
  });
  assert.equal(r.exposureRatio, null);
  assert.match(r.reason, /^period/);
  const cur = K.obligationsToRevenue({
    ticker: 'X',
    obligations: 1,
    revenue: 10,
    revenueFyEnd: '2025-12-31',
    contractPeriod: F.FFY.current,
    revenueCurrency: 'EUR',
  });
  assert.match(cur.reason, /currency mismatch/);
});

/* ═══ O. SEC succession overlap ═════════════════════════════════════════════════ */

test('O: successor facts win per SEC frame; predecessor CIK, accession and missing data are preserved', async () => {
  const row = (cik, acc, end, frame, value) => ({
    ticker: 'XSUC',
    cik,
    accession_no: acc,
    concept: 'revenue',
    taxonomy_concept: 'Revenues',
    period_type: 'annual',
    period_end: end,
    frame,
    value,
  });
  const succ = [
    {
      ticker: 'XSUC',
      predecessor_cik: '111',
      successor_cik: '222',
      effective_date: '2026-01-02',
      relationship: 'holding_company_reorganization',
      source_accession: '0000000222-26-000001',
      verified: true,
    },
  ];
  const facts = [
    row('111', '0000000111-26-000004', '2025-12-28', 'CY2025', 90), // predecessor, 52-53 week end
    row('222', '0000000222-26-000010', '2025-12-31', 'CY2025', 100), // successor, same frame
    row('111', '0000000111-25-000002', '2024-12-29', 'CY2024', 80),
  ];
  const out = await A.filedFiguresPaged(
    fakeSupabase({ sec_registrant_successions: succ, sec_fundamentals: facts }),
    ['XSUC'],
    F.NOW,
  );
  assert.deepEqual(
    out.XSUC.annual.revenue.map((r) => [r.end, r.value, r.cik, r.accession]),
    [
      ['2025-12-31', 100, '222', '0000000222-26-000010'],
      ['2024-12-29', 80, '111', '0000000111-25-000002'],
    ],
  );
  /* Before the backfill: no predecessor rows, nothing invented. */
  const pre = await A.filedFiguresPaged(
    fakeSupabase({ sec_fundamentals: [facts[1]] }),
    ['XSUC'],
    F.NOW,
  );
  assert.equal(pre.XSUC.annual.revenue.length, 1);
});

/* ═══ P. Price contract ═════════════════════════════════════════════════════════ */

test('P: sample, zero and stale prices are rejected for valuation; the shadow comparison flags adjusted mismatches', async () => {
  const rows = Object.values(F.PRICES);
  const cmp = Ps.comparePriceSelection(rows, { asOf: '2026-11-28' });
  const by = Object.fromEntries(cmp.rows.map((r) => [r.ticker, r]));
  assert.equal(by.XLMT.verdict, 'same');
  assert.ok(by.XRTX.flags.includes('adjusted_close_differs'));
  assert.equal(by.XGRP.verdict, 'neither', 'zero price never selected');
  assert.ok(by.XPLTR.flags.includes('quote_row'));
  assert.equal(by.XNOC.verdict, 'neither', 'older than 10 days: rejected by both');
  /* price_data_cache rows carry no sample marker; sample (demonstration) data is rejected
     where it is marked, at the provider responses (6.4 compat 9, test:market-sample). */
  const zero = await Fe.storedClose(
    fakeSupabase({ price_data_cache: [F.PRICES.zero] }),
    'XGRP',
    F.NOW,
    { SONAR_PRICE_CONTRACT: '1' },
  );
  assert.equal(zero, null);
  /* The flag stays off by default and SONAR_PRICE_SYNC is never read by Sonar. */
  const off = await A.pricesFor(fakeSupabase({ price_data_cache: rows }), ['XLMT'], {
    now: F.NOW,
    liveCap: 0,
    env: {},
  });
  assert.equal(off.prices.XLMT.source, 'cache');
  const on = await A.pricesFor(fakeSupabase({ price_data_cache: rows }), ['XLMT', 'XGRP'], {
    now: F.NOW,
    liveCap: 0,
    env: { SONAR_PRICE_CONTRACT: '1' },
  });
  assert.equal(on.prices.XLMT.price, 410.2);
  assert.equal(on.prices.XLMT.currency, 'USD');
  assert.equal(on.prices.XGRP, undefined);
});

/* ═══ Telemetry and safety ══════════════════════════════════════════════════════ */

test('telemetry: aggregate counts only, with bounded and unchecked sizes', async () => {
  const att = plan(
    'Find companies purchased by members of Congress that won Department of Defense contracts and increased institutional ownership.',
  );
  const r = await A.runScreen(db(), att, { now: F.NOW });
  const t = r.telemetry;
  assert.equal(typeof t.unknownConditions, 'number');
  assert.equal(typeof t.crossDatasetJoins, 'number');
  assert.equal(t.planGenerated, true);
  assert.ok(!/XLMT|XRTX|Congress/.test(JSON.stringify(t)), 'no tickers or research text');
});

test('no model calls; no SONAR_PRICE_SYNC reads in Sonar; no Math.random in new modules', () => {
  for (const f of [
    'src/lib/sonar/execution/contracts.js',
    'src/lib/contractors/agencies.js',
    'src/lib/sec/security-identity.js',
    'src/lib/prices/price-shadow.js',
  ]) {
    const src = readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
    assert.ok(!/@anthropic-ai|openai|generateText|Math\.random/.test(src), f);
  }
  const dir = new URL('../src/lib/sonar/', import.meta.url);
  const walk = (u) =>
    readdirSync(u, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory()
        ? walk(new URL(`${e.name}/`, u))
        : e.name.endsWith('.js')
          ? [new URL(e.name, u)]
          : [],
    );
  for (const f of walk(dir))
    assert.ok(!/process\.env\.SONAR_PRICE_SYNC/.test(readFileSync(f, 'utf8')), String(f));
  assert.equal(llmRequests.length, 0);
});

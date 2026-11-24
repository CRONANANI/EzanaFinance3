// Sonar 5.0 (Nov 24 2026): multi-source research execution. Covers the question that
// failed in production ("fundamental analysis on the shares that both Nancy Pelosi has and
// BlackRock also has in its top 10 positions by weight") and benchmark cases A to H:
//   A  exact overlap with full fundamentals            -> complete, answer names the matches
//   B  no overlap                                      -> computed empty result, not missing
//   C  partial fundamentals coverage                   -> limited, coverage gap finding
//   D  writer fails                                    -> the computed answer still stands
//   E  composer step fails                             -> failed, never a false zero
//   F  report routing                                  -> composition evidence is typed
//   G  conflicting manual choice                       -> derived overlap stays recommended
//   H  non-composer questions                          -> no relation is invented
// The identifiers are real (BlackRock Inc. CIK 0002012383, June 30 2026 13F); the figures in
// the fixtures are test values, not market data.
//
// Run: npm run test:sonar-5
import { test } from 'node:test';
import assert from 'node:assert/strict';

const intents = await import('../src/lib/sonar/composer/intents.js');
const auto = await import('../src/lib/sonar/composer/auto-queries.js');
const ful = await import('../src/lib/sonar/composer/fulfillment.js');
const { reduceEvent, EMPTY_RESEARCH_STATE } = await import('../src/lib/sonar/research-state.js');
const ctxLib = await import('../src/lib/sonar/composer/context.js');

const Q =
  'Can you do fundamental analysis on the shares that both Nancy Pelosi has and BlackRock also has in its top 10 positions by weight?';

const ratios = (over = {}) => ({
  fiscalYearEnd: '2026-01-25',
  revenue: 1e11,
  revenue_growth: 0.2,
  gross_margin: 0.6,
  operating_margin: 0.3,
  net_margin: 0.25,
  fcf: 2e10,
  fcf_margin: 0.2,
  roe: 0.3,
  debt_to_equity: 0.5,
  ...over,
});

const SET = (matches) => ({
  kind: 'query',
  key: 'auto:holdings:2012383',
  title: 'Securities in both Nancy Pelosi and BlackRock',
  op: 'intersect',
  left: {
    label: "Nancy Pelosi's estimated holdings",
    short: 'Pelosi',
    count: 20,
    asOf: 'disclosures through 2026-10',
  },
  right: {
    label: "BlackRock's top 10 13F holdings",
    short: 'BlackRock',
    count: 10,
    periods: ['2026-06-30'],
  },
  matches,
  stats: {
    overlap: matches.length,
    leftOnly: 20 - matches.length,
    rightOnly: 10 - matches.length,
    level: 'security',
  },
});
const M = (ticker, issuer) => ({
  cusip: `${ticker}000000`,
  ticker,
  tickers: [ticker],
  issuer,
  leftEst: 1e6,
  rightValue: 1e11,
});
const SIX = [
  M('NVDA', 'NVIDIA Corp'),
  M('AAPL', 'Apple Inc'),
  M('MSFT', 'Microsoft Corp'),
  M('AMZN', 'Amazon.com Inc'),
  M('GOOGL', 'Alphabet Inc'),
  M('AVGO', 'Broadcom Inc'),
];
const FA = (table, selected = table.length) => ({
  key: 'fa:auto',
  capability: 'fundamental-analysis',
  title: 'Fundamental Analysis',
  status: 'done',
  coverage: { selected, withData: table.filter((t) => t.ratios?.revenue != null).length },
  table,
  limitations: [],
});
const row = (ticker, issuer, r) => ({ ticker, issuer, value: 1e11, ratios: r });
const PLAN = [
  { id: 'subject:holdings', label: 'Holdings' },
  { id: 'query:auto:holdings:2012383', label: 'BlackRock top 10' },
  { id: 'set:auto:holdings:2012383', label: 'Overlap' },
  { id: 'analysis:fa:auto', label: 'Fundamental Analysis' },
];
const comp = (results, failedTasks = []) => ({
  subject: { name: 'Nancy Pelosi', kind: 'politician' },
  plan: PLAN,
  results,
  failedTasks,
  durationMs: 1200,
});

/* ── intent ──────────────────────────────────────────────────────────── */

test('the failing question resolves to an overlap of two holders, not a Pelosi profile', () => {
  const r = intents.extractRelation(Q);
  assert.deepEqual(r, {
    op: 'intersect',
    left: 'Nancy Pelosi',
    right: 'BlackRock',
    topN: 10,
    topNFor: 'BlackRock',
  });
  const c = intents.inferComposition(Q);
  assert.equal(c.subject, 'Nancy Pelosi');
  const fa = c.attachments.find((a) => a.capability === 'fundamental-analysis');
  assert.ok(fa, 'Fundamental Analysis is inferred');
  assert.equal(fa.wantsSet, true, 'it analyses the overlap');
  assert.equal(fa.params?.top_n ?? null, null, "BlackRock's top 10 is not the analysis count");
});

test('other overlap phrasings', () => {
  for (const q of [
    'Which stocks do Nancy Pelosi and BlackRock both own?',
    'Show the overlap between Nancy Pelosi and Vanguard',
    'What do Nancy Pelosi and BlackRock have in common?',
  ]) {
    const r = intents.extractRelation(q);
    assert.ok(r, q);
    assert.equal(r.op, 'intersect', q);
    assert.equal(r.left, 'Nancy Pelosi', q);
  }
});

test('H: questions about one subject invent no relation', () => {
  for (const q of [
    'Who is Nancy Pelosi?',
    'Why did the Turkish lira fall this year?',
    'Fundamental analysis of NVIDIA',
  ])
    assert.equal(intents.extractRelation(q), null, q);
});

/* ── auto-configured holdings query ─────────────────────────────────── */

test("the right-hand holder's holdings become a valid EzanaQL query with its top N", () => {
  const item = auto.holdingsQueryFor(
    { id: '0002012383', name: 'BlackRock, Inc.', period: '2026-06-30' },
    { topN: 10 },
  );
  assert.match(item.query, /filer_cik = "0002012383"/);
  assert.match(item.query, /period = "2026-06-30"/);
  assert.match(item.query, /share_type = "SH"/);
  assert.match(item.query, /ORDER BY value DESC/);
  assert.match(item.query, /LIMIT 10;/);
  assert.equal(item.origin, 'auto');
  assert.equal(item.relation, 'intersect');
  assert.ok(auto.queryCovers(item, 'BlackRock'));
  assert.equal(auto.holdingsQueryFor({ id: 'x', period: 'nope' }), null);
});

test('without a top N the whole latest book is used, capped', () => {
  const item = auto.holdingsQueryFor({ id: '2012383', name: 'BlackRock', period: '2026-06-30' });
  assert.match(item.query, new RegExp(`LIMIT ${auto.DEFAULT_BOOK_LIMIT};`));
});

/* ── A: complete ─────────────────────────────────────────────────────── */

test('A: overlap with full fundamentals is complete and the answer names the matches', () => {
  const c = comp([
    SET(SIX),
    FA(SIX.map((m, i) => row(m.ticker, m.issuer, ratios({ operating_margin: 0.2 + i / 20 })))),
  ]);
  const f = ful.fulfillmentContract(c);
  assert.equal(f.state, 'complete');
  const ans = ful.deterministicAnswer(c, f);
  assert.match(ans.executiveConclusion.text, /^6 securities appear in both/);
  for (const t of ['NVDA', 'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'AVGO'])
    assert.match(ans.executiveConclusion.text, new RegExp(t));
  assert.equal(ans.executiveConclusion.classification, 'calculated_result');
  assert.match(ans.keyFindings[0].title, /Highest operating margin: Broadcom Inc \(AVGO\)/);
  assert.ok(ful.answerCovers({ executiveConclusion: ans.executiveConclusion }, c));
});

test('a generic congressional profile does not count as answering it', () => {
  const c = comp([SET(SIX), FA([])]);
  const generic = {
    executiveConclusion: {
      text: 'Nancy Pelosi disclosed 42 trades in technology stocks since 2020.',
    },
    keyFindings: [],
  };
  assert.equal(ful.answerCovers(generic, c), false);
});

/* ── B: no overlap ───────────────────────────────────────────────────── */

test('B: no overlap is a computed empty result, stated as zero matches', () => {
  const c = comp([SET([]), { ...FA([]), status: 'skipped' }]);
  const f = ful.fulfillmentContract(c);
  assert.equal(f.state, 'limited');
  assert.equal(f.objectives.find((o) => o.id.startsWith('set:')).status, 'empty');
  const ans = ful.deterministicAnswer(c, f);
  assert.match(ans.executiveConclusion.text, /^No securities appear in both/);
  assert.ok(
    ful.answerCovers({ executiveConclusion: { text: 'None of the holdings overlap.' } }, c),
  );
});

/* ── C: partial coverage ─────────────────────────────────────────────── */

test('C: missing financials limit the result and are named, never zero-filled', () => {
  const table = SIX.map((m) => row(m.ticker, m.issuer, m.ticker === 'AVGO' ? null : ratios()));
  const c = comp([SET(SIX), FA(table)]);
  const f = ful.fulfillmentContract(c);
  assert.equal(f.state, 'limited');
  const ans = ful.deterministicAnswer(c, f);
  const gap = ans.keyFindings.find((x) => x.title === 'Coverage gap');
  assert.ok(gap);
  assert.match(gap.explanation, /6 matching companies identified; 5 have filed financials/);
  assert.match(gap.explanation, /Broadcom Inc \(AVGO\)/);
  const ev = ful.compositionEvidence(c);
  assert.ok(
    !ev.some((e) => e.data?.ticker === 'AVGO'),
    'no fundamentals item is made for a company without figures',
  );
});

/* ── D: the writer fails ─────────────────────────────────────────────── */

test('D: with no written report, the computed answer and evidence still stand', () => {
  const c = comp([SET(SIX), FA(SIX.map((m) => row(m.ticker, m.issuer, ratios())))]);
  const f = ful.fulfillmentContract(c);
  const ev = ful.compositionEvidence(c);
  assert.equal(ev.filter((e) => e.data?.ticker).length, 6);
  const ans = ful.deterministicAnswer(c, f);
  assert.ok(ans.keyFindings.length >= 3);
  const payload = ful.clientComposition(c, f);
  assert.equal(payload.version, 5);
  assert.equal(payload.sets[0].matches.length, 6);
  assert.equal(payload.analyses[0].table.length, 6);
});

/* ── E: the composer fails ───────────────────────────────────────────── */

test('E: a failed overlap step is failed, never a false zero', () => {
  const c = comp(
    [
      {
        kind: 'query',
        key: 'auto:holdings:2012383',
        title: 'BlackRock top 10',
        status: 'failed',
        failed: 'The holdings query timed out.',
      },
    ],
    ['set:auto:holdings:2012383', 'analysis:fa:auto'],
  );
  const f = ful.fulfillmentContract(c);
  assert.notEqual(f.state, 'complete');
  assert.notEqual(f.state, 'limited');
  assert.equal(f.objectives.find((o) => o.id.startsWith('set:')).status, 'failed');
  const ans = ful.deterministicAnswer(c, f);
  assert.doesNotMatch(ans.executiveConclusion.text, /^No securities|\b0 securities/);
  assert.match(ans.executiveConclusion.text, /did not complete/);
  assert.equal(ful.clientComposition(c, f).failures[0].failed, 'The holdings query timed out.');
});

/* ── F: evidence and state ───────────────────────────────────────────── */

test('F: composition evidence is typed for the engine', () => {
  const c = comp([SET(SIX), FA(SIX.map((m) => row(m.ticker, m.issuer, ratios())))]);
  const ev = ful.compositionEvidence(c);
  assert.ok(ev.every((e) => e.category === 'ezana_datasets' && e.reliability >= 0.9));
  assert.match(ev[0].text, /matched on CUSIP/);
  assert.match(ev[0].text, /not verified simultaneous ownership/);
  assert.equal(ful.COMPOSER_SOURCE, 'research_composer');
});

test('the research state keeps the composition, including on a saved report', async () => {
  assert.equal(EMPTY_RESEARCH_STATE.composition, null);
  const payload = ful.clientComposition(comp([SET(SIX)]), null);
  const s = reduceEvent(EMPTY_RESEARCH_STATE, ['composition', payload]);
  assert.equal(s.composition.sets[0].stats.overlap, 6);
  assert.equal(reduceEvent(s, ['composition', null]).composition, s.composition);
  const { snapshotFromState, stateFromSnapshot } = await import('../src/lib/org-sonar/reports.js');
  const snap = snapshotFromState({ ...s, report: { executiveConclusion: { text: 'x' } } });
  assert.equal(stateFromSnapshot(snap).composition.sets[0].stats.overlap, 6);
});

/* ── G: conflicts ────────────────────────────────────────────────────── */

test('G: an inferred analysis on a two-holder question targets the overlap', () => {
  const fa = intents
    .inferComposition(Q)
    .attachments.find((a) => a.capability === 'fundamental-analysis');
  const q = auto.holdingsQueryFor(
    { id: '2012383', name: 'BlackRock', period: '2026-06-30' },
    { topN: 10 },
  );
  const ctx = ctxLib.buildContext({
    primary: {
      text: 'Nancy Pelosi',
      kind: 'politician',
      id: 'P000197',
      name: 'Nancy Pelosi',
      eligible: 20,
    },
    question: Q,
    items: [{ ...fa, seq: 2 }, q],
  });
  const t = ctxLib.analysisTargets({ ...fa, seq: 2 }, ctx);
  const rec = t.options.find((o) => o.id === t.recommended);
  assert.ok(rec, 'a target is recommended');
  assert.equal(rec.dataset?.role, 'derived', 'the overlap, not Pelosi alone');
});

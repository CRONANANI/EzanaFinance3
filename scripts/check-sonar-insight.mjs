/**
 * Sonar insight quality (Nov 2026): analytical intent, evidence relevance, deterministic
 * findings, insight selection, cross-component redundancy and the visualization plan
 * (src/lib/sonar/insight). Regression cases for the Turkey lira and crude oil answers, the
 * ten-question intent suite, and the adversarial cases where Sonar must show less rather
 * than fabricate a complete-looking answer.
 *
 * Run: node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-sonar-insight.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { oilState } from './fixtures/sonar-research-oil.mjs';

const I = await import('@/lib/sonar/insight/intent');
const S = await import('@/lib/sonar/insight/semantic');
const R = await import('@/lib/sonar/insight/relevance');
const D = await import('@/lib/sonar/insight/derived');
const SEL = await import('@/lib/sonar/insight/select');
const RED = await import('@/lib/sonar/insight/redundancy');
const V = await import('@/lib/sonar/insight/viz-plan');
const P = await import('@/lib/sonar/insight/pipeline');
const F = await import('@/lib/sonar/engine/findings');
const B = await import('@/lib/sonar/research-board');
const CUR = await import('@/lib/sonar/macro/currency');

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const FIX = JSON.parse(read('scripts/fixtures/macro-turkey.json')).series;
const TURKEY = [{ kind: 'country', id: 'TUR', label: 'Turkey' }];
const LIRA_Q = "Is Turkey's lira under pressure?";
const OIL_Q = 'Which countries produce the most crude oil?';
const NOW = new Date('2026-11-06T12:00:00Z');
const intentOf = (q, entities = []) => I.analyticalIntent(q, { understood: { entities } });
const turkeyPicture = (extra = {}) =>
  CUR.buildCurrencyPicture(
    {
      fx: FIX.fx,
      reer: FIX.reer,
      inflation: { history: FIX.cpi, mode: 'index' },
      policy: FIX.policy,
      external: { currentAccount: { value: -1.4, period: '2025', unit: '% of GDP' } },
      ...extra,
    },
    { currency: { code: 'TRY', short: 'lira' }, place: 'Turkey', now: NOW },
  );

/* ------------------------------------------------------------------ intent */

test('the ten regression questions get the right primary objective, family and measure', () => {
  const cases = [
    [LIRA_Q, TURKEY, 'risk_assessment', 'currency_stress', 'exchange_rate'],
    [OIL_Q, [], 'ranking', 'commodity_production', 'production'],
    [
      'How has congressional trading changed over the last three years?',
      [],
      'trend',
      'congressional_trading',
      'trading',
    ],
    [
      'Is inflation in the United States accelerating?',
      [{ kind: 'country', id: 'USA', label: 'United States' }],
      'trend',
      'inflation_trend',
      'inflation',
    ],
    [
      'Which companies are most dependent on government contracts?',
      [],
      'exposure',
      'government_contracts',
      'contracts',
    ],
    ['Who is lobbying hardest on AI regulation?', [], 'ranking', 'lobbying', 'lobbying'],
    [
      'How concentrated is the semiconductor industry?',
      [],
      'concentration',
      'industry_concentration',
      null,
    ],
    [
      "How has NVIDIA's valuation changed relative to earnings growth?",
      [],
      'relative_performance',
      'valuation_vs_earnings',
      null,
    ],
    [
      'Which countries have the highest sovereign debt burdens?',
      [],
      'ranking',
      'sovereign_debt',
      'debt',
    ],
    [
      'Are institutional investors increasing their exposure to technology stocks?',
      [],
      'trend',
      'institutional_flows',
      'holdings',
    ],
  ];
  for (const [q, ents, primary, family, measure] of cases) {
    const it = intentOf(q, ents);
    assert.equal(it.primary, primary, `${q}: primary`);
    assert.equal(it.family, family, `${q}: family`);
    if (measure) assert.equal(it.measure, measure, `${q}: measure`);
    assert.ok(it.objectives.includes(primary));
  }
});

test('same topic, different analysis: ranking, concentration over time, risk', () => {
  const rank = intentOf(OIL_Q);
  const conc = intentOf('How has crude oil production concentration changed?');
  const risk = intentOf(LIRA_Q, TURKEY);
  assert.equal(rank.primary, 'ranking');
  assert.equal(rank.needsHistory, false);
  assert.equal(conc.primary, 'concentration');
  assert.ok(conc.objectives.includes('trend'));
  assert.equal(conc.needsHistory, true, 'concentration change needs history');
  assert.equal(risk.primary, 'risk_assessment');
  assert.ok(!risk.objectives.includes('ranking'), 'a yes/no question is never a ranking');
  assert.ok(risk.calculations.includes('ex_post_real_rate'));
  assert.ok(risk.expectedGaps.some((g) => /reserves/.test(g)));
});

test('semantic matching refines the family but never decides it alone', async () => {
  /* A lexical cue plus a close exemplar: the family stays and gets more confident. */
  const lex = intentOf('How vulnerable is the Argentine peso?', [
    { kind: 'country', id: 'ARG', label: 'Argentina' },
  ]);
  const sem = I.analyticalIntent('How vulnerable is the Argentine peso?', {
    understood: { entities: [{ kind: 'country', id: 'ARG', label: 'Argentina' }] },
    semantic: { currency_stress: 0.93, commodity_production: 0.4 },
  });
  assert.equal(lex.family, 'currency_stress');
  assert.equal(sem.family, 'currency_stress');
  /* Similarity alone below the bar assigns nothing. */
  const weak = I.analyticalIntent('Tell me something interesting', {
    semantic: { commodity_production: 0.8 },
  });
  assert.equal(weak.family, null);
  /* The embedder: cosine, timeout and failure all degrade to null, never throw. */
  assert.equal(S.cosine([1, 0], [1, 0]), 1);
  assert.equal(S.cosine([1, 0], [0, 1]), 0);
  S.resetSemanticCache();
  const vec = (t) => (/lira|peso|pound|yen|currency/i.test(t) ? [1, 0.1] : [0.1, 1]);
  const scores = await S.semanticFamilyScores('Is the rupee weakening? currency', { embed: vec });
  assert.ok(scores.currency_stress > scores.commodity_production);
  const slow = await S.semanticFamilyScores('x', {
    embed: () => new Promise((r) => setTimeout(() => r([1, 0]), 200)),
    timeoutMs: 20,
  });
  assert.equal(slow, null);
  assert.equal(
    await S.semanticFamilyScores('x', { embed: () => Promise.reject(new Error('down')) }),
    null,
  );
});

test('the analytical plan joins the synthesis prompt; no new model call', () => {
  const block = I.intentBlock(intentOf(OIL_Q));
  assert.match(block, /Primary objective: Descriptive ranking/);
  assert.match(block, /Measure asked about: production/);
  assert.match(F.SYNTHESIS_SYSTEM, /Never make a finding that only restates the conclusion/);
  assert.match(F.SYNTHESIS_SYSTEM, /two to five, most important first, and fewer is better/);
  assert.equal(F.SYNTHESIS_PROMPT_VERSION, 'synth-v3');
});

/* ------------------------------------------------------------------ evidence relevance */

test('evidence about the right country but the wrong subject is dropped', () => {
  const it = intentOf(LIRA_Q, TURKEY);
  const c = (title, extra = {}) =>
    R.classifyEvidence({ title, source: 'news', ...extra }, it).relevance;
  assert.equal(c("Do you agree? These are America's 5 favorite Thanksgiving sides"), 'irrelevant');
  assert.equal(
    c('Monroe County residents invited to join the Hometown Turkey Takeover'),
    'irrelevant',
  );
  assert.equal(c("Turkey's central bank holds rates as the lira slides"), 'direct');
  assert.equal(
    c("Erdogan says South Korea could partner in Turkiye's Sinop nuclear project"),
    'background',
  );
  /* A dataset record tagged with the country is never dropped, even with an ambiguous name. */
  assert.notEqual(
    R.classifyEvidence(
      {
        title: 'Turkey: real GDP growth',
        text: '3.2% in 2025',
        source: 'macro_series',
        kind: 'series',
        entities: ['Turkey'],
      },
      it,
    ).relevance,
    'irrelevant',
  );
  const gated = R.gateCountryNews(
    [
      { title: 'Hometown Turkey Takeover returns to Monroe County' },
      { title: 'Lira weakens past 48 per dollar as inflation stays high in Turkiye' },
    ],
    it,
  );
  assert.deepEqual(
    gated.map((n) => n.title),
    ['Lira weakens past 48 per dollar as inflation stays high in Turkiye'],
  );
});

test('a record from outside the horizon is flagged, not blended in', () => {
  const it = I.analyticalIntent(
    'How has congressional trading changed over the last three years?',
    {
      spec: { timeHorizon: { kind: 'trailing', months: 36 } },
    },
  );
  assert.equal(R.outsideHorizon({ period: { to: '2019-06' } }, it, NOW), true);
  assert.equal(R.outsideHorizon({ period: { to: '2025-06' } }, it, NOW), false);
});

/* ------------------------------------------------------------------ Turkey lira */

test('Turkey lira: findings about pressure, policy, pace and what is missing, not the KPIs again', () => {
  const pic = turkeyPicture();
  const ins = D.currencyInsights(pic, {
    place: 'Turkey',
    currency: { code: 'TRY', short: 'lira' },
  });
  const kinds = ins.map((x) => x.insight);
  for (const k of [
    'nominal_vs_real',
    'policy_vs_inflation',
    'depreciation_pace',
    'inflation_fx',
    'missing_evidence',
  ])
    assert.ok(kinds.includes(k), `candidate ${k}`);

  const B_ = ins.find((x) => x.insight === 'policy_vs_inflation');
  assert.match(
    B_.explanation,
    /A policy rate of 37\.0% .* annual inflation of 29\.7% .* ex-post spread of \+7\.27 percentage points/,
  );
  assert.match(B_.caveat, /not the forward-looking real rate/);
  assert.doesNotMatch(
    `${B_.title} ${B_.explanation}`,
    /forward-looking real (interest )?rate (is|of)/i,
  );

  const A = ins.find((x) => x.insight === 'nominal_vs_real');
  assert.equal(
    A.classification,
    'analytical_interpretation',
    'an interpretation is never labelled verified',
  );
  assert.match(A.caveat, /does not by itself establish overvaluation/);

  const C = ins.find((x) => x.insight === 'depreciation_pace');
  assert.match(
    C.explanation,
    /over three months, an annualised pace of .* over the full year .* over five years/,
  );
  assert.match(C.caveat, /not on its own evidence of an imminent crisis/);

  const Dd = ins.find((x) => x.insight === 'inflation_fx');
  assert.match(Dd.caveat, /mechanism, not a result measured here/);

  const kpis = pic.kpis.map((k) => [k.label, k.value, k.change].filter(Boolean).join(' '));
  /* A quick research run (cap 3) plus room for the gap: selected against the answer and the
     KPI tiles. */
  const kf = SEL.selectFindings(
    ins.map((x) => ({ ...x, derived: true, validation: { action: 'kept', problems: [] } })),
    {
      conclusion:
        'By Ezana thresholds, pressure on the lira is elevated. Over the year to Sep 2026 the dollar costs 17.7% more in lira, and the lira lost 15.0% of its dollar value.',
      kpis,
      intent: intentOf(LIRA_Q, TURKEY),
      depth: 'quick',
      cap: 4,
    },
  ).keyFindings;
  assert.ok(kf.length >= 3 && kf.length <= 4, `keeps 3 to 4, got ${kf.length}`);
  assert.ok(
    kf.some((x) => x.insight === 'policy_vs_inflation'),
    'the spread is new information, not a KPI repeat',
  );
  assert.equal(kf.at(-1).insight, 'missing_evidence', 'what is missing reads last');
  /* No finding just restates the latest exchange rate, inflation rate or GDP growth. */
  for (const x of kf) assert.doesNotMatch(x.title, /^(TRY per USD|Inflation|Real GDP growth)\b/);
});

test('Turkey lira: the derived findings pass the same claim validator as the model', () => {
  const pic = turkeyPicture();
  const ins = D.currencyInsights(pic, {
    place: 'Turkey',
    currency: { code: 'TRY', short: 'lira' },
  });
  const marked = [
    ...pic.statements.map((text, i) => ({
      id: `c${i}`,
      marker: `S${i + 1}`,
      title: `Turkey: computed currency measures ${i + 1}`,
      text,
      entities: ['Turkey'],
      kind: 'aggregate',
    })),
    {
      id: 'gap',
      marker: `S${pic.statements.length + 1}`,
      title: 'Turkey: data not available',
      text: `Not in Ezana's data for Turkey: ${pic.missing.join(', ')}.`,
      entities: ['Turkey'],
      kind: 'aggregate',
    },
  ];
  const metrics = [];
  const report = {
    executiveConclusion: { text: 'Pressure on the lira is elevated.' },
    keyFindings: [],
    analysis: [],
    limitations: [],
  };
  const out = P.applyInsightStep(report, {
    intent: intentOf(LIRA_Q, TURKEY),
    marked,
    metrics,
    visualizations: [],
    layout: { macro: { countryIntel: { place: 'Turkey', insights: ins } } },
    depth: 'standard',
  });
  assert.equal(
    out.diagnostics.derived.valid,
    out.diagnostics.derived.candidates,
    'every derived claim is grounded',
  );
  assert.ok(report.keyFindings.length >= 4 && report.keyFindings.length <= 5);
  assert.ok(
    metrics.some(
      (m) =>
        m.id === 'insight_policy_spread_pp' &&
        m.method === 'policy rate minus latest annual inflation',
    ),
  );
  for (const f of report.keyFindings.filter((k) => !k.gap))
    assert.ok(f.metrics.length, `${f.id} cites its calculation`);
  assert.match(report.conclusionLimits, /cannot judge how well the lira can be defended/);
  assert.ok(!(out instanceof Promise), 'the insight step is synchronous: no model or network call');
});

/* ------------------------------------------------------------------ crude oil */

function oilRun() {
  const s = structuredClone(oilState);
  const intent = intentOf(OIL_Q, [{ kind: 'commodity', id: 'crude_oil', label: 'crude oil' }]);
  const marked = R.gateEvidence(s.run.evidence, intent).kept;
  F.ensureRankingAnswer(s.report, {
    visualizations: s.analysis.visualizations,
    marked,
    metrics: s.analysis.metrics,
  });
  const before = s.report.keyFindings.map((f) => f.id);
  const out = P.applyInsightStep(s.report, {
    intent,
    marked,
    metrics: s.analysis.metrics,
    visualizations: s.analysis.visualizations,
    layout: {},
    depth: 'standard',
  });
  return { s, intent, before, out };
}

test('crude oil: the ranking is shown once, not restated as a finding', () => {
  const { s, before } = oilRun();
  assert.deepEqual(before, ['finding_rank', 'finding_6'], 'before: the ranking was finding one');
  const ids = s.report.keyFindings.map((f) => f.id);
  assert.ok(!ids.includes('finding_rank'), 'after: the ranking restatement is not a key finding');
  assert.equal(s.report.supportingFacts.find((x) => x.id === 'finding_rank').placement, 'ranking');
  const conc = s.report.keyFindings.find((f) => f.insight === 'concentration');
  assert.ok(conc, 'concentration is the analytical finding');
  assert.match(conc.explanation, /Among the 10 largest listed, the top five account for 71\.7%/);
  assert.match(conc.caveat, /not of world output/, 'no world share from a top-ten list');
  /* The WTI price is a different measure: context beside the answer, not a key finding. */
  assert.equal(s.report.supportingFacts.find((x) => x.id === 'finding_6').placement, 'context');
  assert.match(s.report.conclusionLimits, /shares of world output cannot be computed/);
});

test('crude oil: one ranking module with a table view; the off-question price chart goes', () => {
  const { s, intent } = oilRun();
  const plan = V.planVisualizations(s.analysis.visualizations, {
    intent,
    findings: s.report.keyFindings,
  });
  assert.deepEqual(
    plan.items.map((x) => x.id),
    ['macro_rank_oil_production'],
  );
  assert.deepEqual(plan.items[0].views, ['chart', 'table']);
  assert.equal(plan.items[0].spec.objective, 'ranking');
  assert.ok(plan.items[0].spec.unique && plan.items[0].spec.source);
  assert.deepEqual(plan.dropped, [{ id: 'commodity_price', reason: 'off_objective' }]);
  /* The executive bullets do not repeat the concentration finding's figure. */
  const rank = B.rankingOf(s.analysis.visualizations);
  const bullets = B.boardBullets(s.report, rank).map((b) => b.text);
  assert.ok(!bullets.some((t) => /top five hold/.test(t)));
  assert.ok(
    bullets.some((t) => /WTI crude oil prices have risen/.test(t)),
    'the price fact stays as a bullet',
  );
  /* The KPI strip does not lead with the price change on a production question. */
  const kpis = B.boardKpis({ metrics: s.analysis.metrics, rank, intent: s.report.insight.intent });
  assert.ok(!kpis.some((k) => /WTI/.test(k.label)));
  assert.ok(kpis.some((k) => k.id === 'universe'));
});

test('a saved report from before the step: the board still leaves out the ranking restatement', () => {
  const s = structuredClone(oilState);
  F.ensureRankingAnswer(s.report, {
    visualizations: s.analysis.visualizations,
    marked: s.run.evidence,
    metrics: s.analysis.metrics,
  });
  const rank = B.rankingOf(s.analysis.visualizations);
  const shown = B.boardFindings(s.report, rank);
  assert.deepEqual(
    shown.map((f) => f.id),
    ['finding_6'],
  );
  assert.equal(shown[0].kind.label, 'Verified observation');
});

/* ------------------------------------------------------------------ adversarial */

test('adversarial: two charts of different types with the same content are one chart', () => {
  const rows = [
    { label: 'A', value: 5 },
    { label: 'B', value: 3 },
  ];
  const plan = V.planVisualizations([
    { id: 'v1', type: 'bars', title: 'Highest copper output', unit: 'kt', rows },
    { id: 'v2', type: 'leaderboard', title: 'Copper output (top 2)', unit: 'kt', rows },
  ]);
  assert.deepEqual(
    plan.items.map((x) => x.id),
    ['v1'],
  );
  assert.deepEqual(plan.dropped, [{ id: 'v2', reason: 'same_content', duplicateOf: 'v1' }]);
});

test('adversarial: two semantically equivalent findings keep one', () => {
  const base = {
    classification: 'verified_fact',
    markers: ['S1'],
    validation: { action: 'kept', problems: [] },
  };
  const sel = SEL.selectFindings(
    [
      {
        ...base,
        id: 'f1',
        title: 'Saudi Arabia pumped 7,290 kb/d against Russia at 9,582 kb/d',
        explanation:
          'Russia produces more than Saudi Arabia: 9,582 against 7,290 thousand barrels per day, a gap that matters for supply.',
      },
      {
        ...base,
        id: 'f2',
        title: 'Russia out-produces Saudi Arabia',
        explanation:
          'At 9,582 thousand barrels per day Russia is ahead of Saudi Arabia at 7,290, which matters for supply.',
      },
    ],
    { evidence: [{ marker: 'S1', relevance: 'direct' }] },
  );
  assert.equal(sel.keyFindings.length, 1);
  assert.equal(
    sel.diagnostics.decisions.find((d) => d.decision === 'supporting')?.gate,
    'restates_finding',
  );
});

test('adversarial: historical periods differ across rows', () => {
  const r = D.rankingInsights({
    id: 'macro_rank_x',
    title: 'Highest natural gas production',
    rows: Array.from({ length: 8 }, (_, i) => ({
      label: `C${i}`,
      value: 100 - i * 10,
      note: i < 4 ? '2026-06' : '2024-12',
    })),
  });
  assert.match(r.limitations[0], /different periods \(Dec 2024 to Jun 2026\)/);
});

test('adversarial: partial coverage never becomes a global share', () => {
  const short = D.rankingInsights({
    id: 'r',
    title: 'Highest uranium output',
    rows: Array.from({ length: 10 }, (_, i) => ({ label: `C${i}`, value: 50 - i })),
  });
  assert.match(short.findings[0].caveat, /not of world output/);
  assert.ok(short.limitations.some((l) => /cannot be computed/.test(l)));
  const wide = D.rankingInsights({
    id: 'r',
    title: 'Highest uranium output',
    rows: Array.from({ length: 40 }, (_, i) => ({ label: `C${i}`, value: 1000 / (i + 1) })),
  });
  assert.match(
    wide.findings[0].explanation,
    /across the 40 countries reported, equivalent to about [\d.]+ equal-sized producers/,
  );
});

test('adversarial: a critical metric is unavailable', () => {
  const pic = turkeyPicture({ reer: null });
  const ins = D.currencyInsights(pic, { place: 'Turkey', currency: { short: 'lira' } });
  assert.ok(
    !ins.some((x) => x.insight === 'nominal_vs_real'),
    'no real-rate finding without the REER',
  );
  const gap = ins.find((x) => x.gap);
  assert.equal(gap.classification, 'unknown');
  assert.equal(SEL.findingKind(gap).label, 'Not established');
});

test('adversarial: a timely but weak source cannot carry a key finding', () => {
  const sel = SEL.selectFindings(
    [
      {
        id: 'f',
        title: 'Lira sentiment sours',
        explanation: 'A blog says traders are nervous.',
        classification: 'verified_fact',
        markers: ['S1'],
        validation: { action: 'kept', problems: [] },
      },
    ],
    { evidence: [{ marker: 'S1', relevance: 'background' }], intent: intentOf(LIRA_Q, TURKEY) },
  );
  assert.equal(sel.keyFindings.length, 0);
  assert.equal(sel.diagnostics.decisions[0].gate, 'background_evidence');
});

test('adversarial: a trend question with a single observation says so', () => {
  const it = intentOf('How has crude oil production concentration changed?');
  const r = D.rankingInsights(
    {
      id: 'macro_rank_oil',
      title: 'Highest crude oil production',
      rows: [
        { label: 'A', value: 10 },
        { label: 'B', value: 5 },
      ],
    },
    it,
  );
  const gap = r.findings.find((x) => x.insight === 'missing_history');
  assert.ok(gap && gap.gap && gap.classification === 'unknown');
  assert.equal(
    D.trendInsight({
      id: 's',
      title: 'Output',
      series: [
        { x: '2026-01', y: 1 },
        { x: '2026-02', y: 2 },
      ],
    }),
    null,
  );
});

test('adversarial: an article claim the data cannot substantiate is rejected, whatever its score', () => {
  const marked = [
    {
      id: 'e1',
      marker: 'S1',
      title: 'Crude oil production',
      text: 'United States 13,792 thousand barrels per day.',
      numbers: [{ value: 13792, text: '13,792' }],
      entities: ['United States'],
    },
  ];
  const claim = {
    title: 'US output will hit 15,500 kb/d',
    explanation: 'An editorial says production reaches 15,500.',
    classification: 'verified_fact',
    evidence: ['S1'],
    metrics: [],
  };
  const v = F.validateClaim(claim, {
    byMarker: new Map(marked.map((e) => [e.marker, e])),
    metricsById: new Map(),
  });
  assert.equal(v.action, 'removed');
  const sel = SEL.selectFindings(
    [
      {
        ...claim,
        id: 'x',
        markers: ['S1'],
        validation: { action: 'removed', problems: v.problems },
      },
    ],
    { evidence: marked },
  );
  assert.equal(sel.keyFindings.length, 0);
  assert.equal(sel.rejected.length, 1);
});

test('budgets: findings and charts respect the quick, standard and deep caps', () => {
  const many = Array.from({ length: 9 }, (_, i) => ({
    id: `f${i}`,
    insight: `k${i}`,
    title: `Distinct insight number ${'abcdefghi'[i]} about topic ${i * 37}`,
    explanation: `Comparison against a baseline of ${i * 11 + 13}% while the peer sits at ${i * 7 + 91}%, which suggests a gap.`,
    implication: 'It matters for exposure.',
    classification: 'calculated_result',
    metrics: [`m${i}`],
    derived: true,
    validation: { action: 'kept', problems: [] },
  }));
  assert.equal(SEL.selectFindings(many, { depth: 'quick' }).keyFindings.length, 3);
  assert.equal(SEL.selectFindings(many, { depth: 'standard' }).keyFindings.length, 5);
  assert.equal(SEL.selectFindings(many, { depth: 'deep' }).keyFindings.length, 6);
  const lines = Array.from({ length: 8 }, (_, i) => ({
    id: `l${i}`,
    type: 'line',
    title: `Series ${i} (C${i})`,
    series: [
      { x: '2025', y: 1 },
      { x: '2026', y: 2 },
    ],
  }));
  assert.equal(V.planVisualizations(lines, { depth: 'quick' }).items.length, 2);
  assert.equal(V.planVisualizations(lines, { depth: 'deep' }).items.length, 6);
});

test('redundancy: structured first, wording alone never merges claims', () => {
  assert.ok(
    RED.isRankRestatement(
      'The United States ranks first in crude oil production.',
      'United States',
    ),
  );
  assert.ok(
    !RED.isRankRestatement(
      'The United States holds 22% of the listed total, more than Russia and Saudi Arabia combined share',
      'United States',
    ),
  );
  const a = RED.signature('Inflation rose to 29.7% from 33.3%');
  const b = RED.signature('Exports rose to 29.7% from 33.3% of output in Chile');
  /* The same figures but no shared name: not merged on figures alone. */
  assert.ok(RED.similarity(a, b).score < RED.RESTATE_THRESHOLD);
  /* A high embedding similarity only escalates when names or figures agree. */
  const c = RED.similarity('Lira weakness persists', 'Peso strength fades', {
    semantic: () => 0.97,
  });
  assert.ok(c.score < RED.RESTATE_THRESHOLD);
});

/* ------------------------------------------------------------------ wiring */

test('the engine runs the insight step at every depth, and versions its caches', () => {
  const eng = read('src/lib/sonar/engine/engine.js');
  assert.match(eng, /ENGINE_VERSION = 'engine-v3\.1'/);
  assert.match(eng, /applyInsightStep\(report, \{/);
  assert.match(eng, /gateEvidence\(all, intent, \{ now \}\)/);
  assert.match(eng, /relevanceGate\.kept\.map/);
  assert.match(eng, /intentBlock\(intent\)/);
  assert.match(
    eng,
    /depth !== 'quick' && !evidenceOverride/,
    'semantic matching never delays a quick run',
  );
  assert.match(read('src/lib/sonar/landing-pipeline.js'), /landing:v[4-9]:/);
  assert.match(read('src/lib/sonar/landing-pipeline.js'), /gateCountryNews\(c\.items, ci\)/);
  assert.match(read('src/lib/sonar/answer-cache.js'), /sonar:qa:v2:/);
  assert.match(read('src/lib/sonar/engine/sources.js'), /insights: currencyInsights\(pic,/);
});

test('the boards: one ranking module, planned charts, finding kinds, country key findings', () => {
  const rb = read('src/components/sonar/research/ResearchBoard.jsx');
  assert.doesNotMatch(rb, /function TopTable/);
  assert.doesNotMatch(rb, /id: 'table'/);
  assert.match(rb, /function RankingModule/);
  assert.match(rb, /aria-pressed=\{view === v\}/);
  assert.match(rb, /planVisualizations\(vis, \{/);
  assert.match(rb, /f\.kind\.label/);
  assert.match(rb, /Why it matters/);
  assert.match(rb, /Not established: /);
});

test('the REER is compared with the nominal move only when its basis is verified', () => {
  const pic = turkeyPicture();
  const kinds = (basis) =>
    D.currencyInsights(pic, { place: 'Turkey', currency: { short: 'lira' }, reerBasis: basis }).map(
      (x) => x.insight,
    );
  assert.ok(kinds('bis_real_broad').includes('nominal_vs_real'));
  assert.ok(!kinds('other').includes('nominal_vs_real'));
  assert.ok(!kinds(null).includes('nominal_vs_real'));
});

test('branding: tokens only and no em dashes in the new and changed files', () => {
  for (const f of [
    'src/components/sonar/research/research-board.css',
    'src/components/landing/sonar-country-board.css',
  ]) {
    const css = read(f);
    for (const start of ['/* Nov 2026: what kind of claim', '/* Key findings (Nov 2026)']) {
      const i = css.indexOf(start);
      if (i < 0) continue;
      const block = css.slice(i, i + 3000);
      assert.doesNotMatch(block, /#[0-9a-fA-F]{3,8}\b/, `${f}: hex`);
      assert.doesNotMatch(block, /rgba?\(/, `${f}: raw rgb`);
    }
  }
  for (const f of [
    'src/lib/sonar/insight/intent.js',
    'src/lib/sonar/insight/semantic.js',
    'src/lib/sonar/insight/relevance.js',
    'src/lib/sonar/insight/derived.js',
    'src/lib/sonar/insight/select.js',
    'src/lib/sonar/insight/redundancy.js',
    'src/lib/sonar/insight/viz-plan.js',
    'src/lib/sonar/insight/pipeline.js',
    'src/components/sonar/research/ResearchBoard.jsx',
    'src/components/landing/SonarCountryBoard.jsx',
  ])
    assert.ok(!read(f).includes('—'), `${f}: em dash`);
});

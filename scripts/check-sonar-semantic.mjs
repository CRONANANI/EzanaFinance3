// Sonar Semantic Intelligence 6.0 (Nov 28 2026): the query-equivalence regression gate.
//
//   A  equivalence groups: every paraphrase resolves to the same canonical intent
//   B  hard negatives: near-identical questions with a material difference never merge
//   C  composer: Query A and Query B attach the same analysis with the same metric;
//      unsupported measures attach nothing rather than a different ranking
//   D  plans: same required task graph, report family, research-spec ranking and
//      (after resolution) the same plan signature
//   E  frozen fixture: every paraphrase ranks the same securities in the same order
//   F  fulfillment: a generic report never satisfies an ownership ranking
//   G  embedding stage: candidates only fill an unstated measure, above threshold and margin
//   H  telemetry and signatures carry no raw query text
//   I  latency and quality metrics
//
// Run: npm run test:sonar-semantic
import { test } from 'node:test';
import assert from 'node:assert/strict';

const ci = await import('../src/lib/sonar/semantic/canonical-intent.js');
const { GROUPS, HARD_NEGATIVES, BENCHMARK_VERSION } =
  await import('../src/lib/sonar/semantic/benchmark.js');
const ex = await import('../src/lib/sonar/semantic/intent-exemplars.js');
const { inferComposition } = await import('../src/lib/sonar/composer/intents.js');
const { rankOwnership } = await import('../src/lib/sonar/composer/ownership.js');
const { nearestExemplars } = await import('../src/lib/sonar/insight/semantic.js');
const { buildResearchSpec } = await import('../src/lib/sonar/engine/research-spec.js');

const QUERY_A =
  'Can you tell me what stocks Nancy Pelosi owns that are most owned by investment firms?';
const QUERY_B =
  'Tell me what stocks owned by Nancy Pelosi are also owned the most by investment firms.';

/* A frozen resolver: what /api/sonar/composer returns for these names (verified ids). */
const RESOLVED = {
  pelosi: { kind: 'politician', id: 'P000197', name: 'Nancy Pelosi' },
  tuberville: { kind: 'politician', id: 'T000278', name: 'Tommy Tuberville' },
  blackrock: { kind: 'institution', id: '0001364742', name: 'BlackRock' },
};
const resolve = (intent) => ci.withResolution(intent, RESOLVED[intent.primary_entity?.key]);

test('A  every paraphrase in a group resolves to the same canonical intent', () => {
  for (const g of GROUPS) {
    const intents = g.queries.map((q) => ci.canonicalIntent(q));
    for (const [k, i] of intents.entries()) {
      const q = g.queries[k];
      assert.equal(i.family, g.family, `${g.id}: family of "${q}"`);
      if (g.measure) assert.equal(i.measure, g.measure, `${g.id}: measure of "${q}"`);
      if (g.entity)
        assert.ok(
          `${i.primary_entity?.key} ${i.primary_entity?.text}`.toLowerCase().includes(g.entity),
          `${g.id}: entity of "${q}" was ${i.primary_entity?.text}`,
        );
      const cmp = ci.compareIntents(intents[0], i);
      assert.ok(cmp.equivalent, `${g.id}: "${q}" differs on ${JSON.stringify(cmp.differences)}`);
      if (g.reportFamily) assert.equal(i.report_family, g.reportFamily);
    }
  }
});

test('B  hard negatives stay distinct on the material field', () => {
  for (const [a, b, field] of HARD_NEGATIVES) {
    const A = resolve(ci.canonicalIntent(a));
    const B = resolve(ci.canonicalIntent(b));
    const cmp = ci.compareIntents(A, B);
    assert.equal(cmp.equivalent, false, `merged: "${a}" / "${b}"`);
    assert.ok(
      cmp.differences.some((d) => d.field === field),
      `"${a}" / "${b}" should differ on ${field}, got ${cmp.differences.map((d) => d.field)}`,
    );
    assert.notEqual(ci.planSignature(A).id, ci.planSignature(B).id);
  }
});

test('C  the composer attaches the same analysis for Query A and Query B', () => {
  const a = inferComposition(QUERY_A);
  const b = inferComposition(QUERY_B);
  const pick = (c) =>
    c.attachments.map((x) => ({
      cap: x.capability,
      metric: x.params.metric,
      subject: x.subject?.text,
    }));
  assert.deepEqual(pick(a), [
    { cap: 'institutional-ownership', metric: 'managers', subject: 'Nancy Pelosi' },
  ]);
  assert.deepEqual(pick(b), pick(a));
  /* Every breadth paraphrase attaches exactly one ownership analysis (no duplicate
     attachments that would push a simple question into Deep Research). */
  for (const q of GROUPS.find((g) => g.id === 'pelosi-own-breadth').queries) {
    const c = inferComposition(q);
    assert.equal(c.attachments.length, 1, q);
    assert.equal(c.attachments[0].params.metric, 'managers', q);
  }
  for (const [q, metric] of [
    ['Which Pelosi holdings have the most institutional money invested?', 'value'],
    ['Which Pelosi holdings gained the most institutional owners last quarter?', 'change'],
  ])
    assert.equal(inferComposition(q).attachments[0]?.params.metric, metric, q);
  /* Unsupported: never attach a different ranking in their place. */
  for (const q of [
    'Which Pelosi holdings have the highest institutional ownership percentage?',
    'Which Pelosi holdings have the lowest institutional ownership?',
    'Which stocks purchased by Pelosi in the last 30 days have the highest institutional ownership?',
    "Which of Pelosi's stocks are most widely held by other members of Congress?",
  ])
    assert.equal(
      inferComposition(q).attachments.filter((x) => x.capability === 'institutional-ownership')
        .length,
      0,
      q,
    );
  /* Questions that need only retrieval still attach nothing. */
  for (const q of ['Who is Nancy Pelosi?', "Is Turkey's lira under pressure?"])
    assert.equal(inferComposition(q).attachments.length, 0, q);
});

test('D  equivalent questions get the same plan, report and signature', () => {
  const A = resolve(ci.canonicalIntent(QUERY_A));
  const B = resolve(ci.canonicalIntent(QUERY_B));
  assert.equal(A.primary_entity.id, 'P000197');
  assert.deepEqual(ci.requiredTasks(A), ci.requiredTasks(B));
  assert.deepEqual(
    ci.requiredTasks(A).map((t) => t.op),
    [
      'resolve_holder',
      'retrieve_estimated_holdings',
      'match_securities',
      'select_13f_period',
      'aggregate_distinct_managers',
      'rank_securities',
      'validate_coverage',
      'generate_findings',
      'render_institutional_ownership_intelligence',
    ],
  );
  assert.equal(ci.planSignature(A).id, ci.planSignature(B).id);
  assert.equal(ci.planSignature(A).resolved, true);
  assert.equal(
    A.canonical_paraphrase,
    "Rank the eligible equities in Nancy Pelosi's estimated disclosed holdings by the number of distinct institutional managers reporting ownership in SEC Form 13F filings.",
  );
  assert.equal(A.canonical_paraphrase, B.canonical_paraphrase);
  /* Unresolved signatures are never reusable. */
  assert.equal(ci.planSignature(ci.canonicalIntent(QUERY_A)).resolved, false);
  /* The research spec ranks by the same metric for both. */
  const sa = buildResearchSpec({ raw: QUERY_A }, { query: QUERY_A });
  const sb = buildResearchSpec({ raw: QUERY_B }, { query: QUERY_B });
  assert.equal(sa.ranking.metric, 'distinct_reporting_manager_count');
  assert.deepEqual(sa.ranking, sb.ranking);
  assert.equal(sa.objective.primary, 'rank');
  assert.equal(sb.objective.primary, 'rank');
  assert.equal(sa.planSignature, sb.planSignature);
  assert.deepEqual(sa.requiredTasks, sb.requiredTasks);
});

test('E  every paraphrase ranks the frozen fixture identically', () => {
  const rows = [
    {
      cusip: '67066G104',
      ticker: 'NVDA',
      managers: 4120,
      value: 9e11,
      comparableNow: 4000,
      comparablePrior: 3900,
    },
    {
      cusip: '037833100',
      ticker: 'AAPL',
      managers: 4870,
      value: 8e11,
      comparableNow: 4700,
      comparablePrior: 4720,
    },
    {
      cusip: '594918104',
      ticker: 'MSFT',
      managers: 4870,
      value: 9.5e11,
      comparableNow: 4750,
      comparablePrior: 4700,
    },
    {
      cusip: '88160R101',
      ticker: 'TSLA',
      managers: 3010,
      value: 3e11,
      comparableNow: 2900,
      comparablePrior: 2800,
    },
    {
      cusip: '000000000',
      ticker: 'XYZ',
      managers: 0,
      value: 0,
      comparableNow: null,
      comparablePrior: null,
    },
  ];
  const order = (q) => {
    const metric = ci.composerMetric(ci.canonicalIntent(q));
    return rankOwnership(rows, metric).map((r) => `${r.rank}:${r.ticker}`);
  };
  const expected = order(QUERY_A);
  assert.deepEqual(expected, ['1:MSFT', '2:AAPL', '3:NVDA', '4:TSLA', 'null:XYZ']);
  for (const q of GROUPS.find((g) => g.id === 'pelosi-own-breadth').queries)
    assert.deepEqual(order(q), expected, q);
  /* Different meaning, different ranking. */
  assert.notDeepEqual(
    order('Which Pelosi holdings gained the most institutional owners last quarter?'),
    expected,
  );
});

test('F  a generic report never satisfies the ownership ranking', () => {
  const A = ci.canonicalIntent(QUERY_A);
  assert.equal(ci.intentFulfillment(A, null).met, false);
  assert.equal(ci.intentFulfillment(A, { analyses: [] }).met, false);
  const done = {
    analyses: [
      {
        capability: 'institutional-ownership',
        status: 'ok',
        ownership: { period: '2026-09-30', universe: { eligible: 12 }, rows: [{ rank: 1 }] },
      },
    ],
  };
  assert.equal(ci.intentFulfillment(A, done).met, true);
  const noPeriod = structuredClone(done);
  delete noPeriod.analyses[0].ownership.period;
  assert.equal(ci.intentFulfillment(A, noPeriod).met, false);
  /* Questions without an ownership ranking owe no such check. */
  assert.equal(
    ci.intentFulfillment(ci.canonicalIntent('Who is Nancy Pelosi?'), null).required,
    false,
  );
});

test('G  embedding candidates only fill an unstated measure, gated by score and margin', async () => {
  const cand = (measure, score, id = `own-${measure}`) => ({
    id,
    family: 'institutional_ownership',
    measure,
    score,
  });
  assert.equal(ex.semanticMeasure([cand('value', 0.8)]), null, 'below threshold');
  assert.equal(ex.semanticMeasure([cand('value', 0.9), cand('breadth', 0.88)]), null, 'no margin');
  assert.equal(ex.semanticMeasure([cand('value', 0.92), cand('breadth', 0.85)]).measure, 'value');
  /* A stated measure wins over any candidate. */
  const sm = { measure: 'value', score: 0.95, exemplarId: 'own-value-1' };
  assert.equal(ci.canonicalIntent(QUERY_A, { semanticMeasure: sm }).measure, 'breadth');
  /* An unstated one may be filled, and says so. */
  const open = "Rank Pelosi's holdings for institutional investors";
  const filled = ci.canonicalIntent(open, { semanticMeasure: sm });
  assert.equal(filled.measure_source, 'semantic');
  assert.equal(filled.measure, 'value');
  assert.ok(filled.inferred_defaults.some((d) => d.field === 'measure'));
  /* nearestExemplars: sorted, and null on timeout. */
  const vec = (t) => (t.includes('money') || t.includes('dollar') ? [1, 0] : [0, 1]);
  const near = await nearestExemplars('institutional money', ex.INTENT_EXEMPLARS, { embed: vec });
  assert.equal(near[0].measure, 'value');
  const slow = await nearestExemplars('x', ex.INTENT_EXEMPLARS, {
    embed: () => new Promise((r) => setTimeout(() => r([1, 0]), 200)),
    timeoutMs: 20,
  });
  assert.equal(slow, null);
});

test('H  signatures and telemetry never carry the raw question', () => {
  const A = ci.canonicalIntent(QUERY_A);
  const t = ci.intentTelemetry(A);
  assert.ok(!JSON.stringify(t).toLowerCase().includes('investment firms'));
  assert.ok(!JSON.stringify(ci.materialFields(A)).includes('Can you tell me'));
  assert.match(t.signature, /^cri1-[0-9a-f]{16}$/);
});

test('I  latency and quality', () => {
  const all = GROUPS.flatMap((g) => g.queries);
  const t0 = performance.now();
  for (let i = 0; i < 20; i += 1) all.forEach((q) => ci.canonicalIntent(q));
  const perQuery = (performance.now() - t0) / (20 * all.length);
  let pairs = 0;
  let hits = 0;
  for (const g of GROUPS) {
    const ints = g.queries.map((q) => ci.canonicalIntent(q));
    for (let i = 1; i < ints.length; i += 1) {
      pairs += 1;
      if (ci.compareIntents(ints[0], ints[i]).equivalent) hits += 1;
    }
  }
  const falseEq = HARD_NEGATIVES.filter(
    ([a, b]) => ci.compareIntents(ci.canonicalIntent(a), ci.canonicalIntent(b)).equivalent,
  ).length;
  console.log(
    `# ${BENCHMARK_VERSION}: ${all.length} queries in ${GROUPS.length} groups; equivalent recall ${hits}/${pairs}; false equivalence ${falseEq}/${HARD_NEGATIVES.length}; ${perQuery.toFixed(3)} ms per query (deterministic stages, no model call)`,
  );
  assert.equal(hits, pairs);
  assert.equal(falseEq, 0);
  assert.ok(perQuery < 5, `canonical intent took ${perQuery} ms per query`);
});

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
const { GROUPS, HARD_NEGATIVES, FOLLOW_UPS, BENCHMARK_VERSION } =
  await import('../src/lib/sonar/semantic/benchmark.js');
const { noisyVariants } = await import('../src/lib/sonar/semantic/noise.js');
const comp = await import('../src/lib/sonar/semantic/compositional.js');
const reuse = await import('../src/lib/sonar/semantic/result-reuse.js');
const { parseResearchJson, repairTruncatedJson, deterministicResearch, WRITER_FAILURE } =
  await import('../src/lib/sonar/engine/findings.js');
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
  crenshaw: { kind: 'politician', id: 'C001120', name: 'Dan Crenshaw' },
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

test('J  follow-ups inherit the prior intent and change only what they name', () => {
  for (const [prior, follow, full] of FOLLOW_UPS) {
    const r = ci.followUpIntent(follow, prior);
    assert.notEqual(r.change, 'none', `"${follow}" after "${prior}" was not read as a follow-up`);
    const cmp = ci.compareIntents(r.intent, ci.canonicalIntent(full));
    assert.ok(cmp.equivalent, `"${follow}" -> ${JSON.stringify(cmp.differences)}`);
  }
  /* A complete question after another stands on its own. */
  const own = ci.followUpIntent("Is Turkey's lira under pressure?", QUERY_A);
  assert.equal(own.change, 'none');
  assert.equal(own.intent.family, 'currency_pressure');
});

test('K  deterministic noisy variants keep the intent', () => {
  const tally = {};
  for (const g of GROUPS) {
    const base = ci.canonicalIntent(g.queries[0]);
    for (const [kind, v] of noisyVariants(g.queries[0])) {
      const cmp = ci.compareIntents(base, ci.canonicalIntent(v));
      tally[kind] = tally[kind] || [0, 0];
      tally[kind][1] += 1;
      if (cmp.equivalent) tally[kind][0] += 1;
      assert.ok(
        cmp.equivalent,
        `${kind} variant "${v}" differs on ${cmp.differences.map((d) => d.field)}`,
      );
    }
  }
  console.log(
    `# noise: ${Object.entries(tally)
      .map(([k, [a, b]]) => `${k} ${a}/${b}`)
      .join(', ')}`,
  );
});

test('L  compositional reading: universe, filters, measures, operation', () => {
  const i = ci.canonicalIntent(
    'Which semiconductor stocks with revenue growth above 20% are most held by institutions?',
  );
  assert.equal(i.family, 'multi_stage_screen');
  assert.deepEqual(i.composition.universe, { type: 'sector', id: 'semiconductors' });
  assert.deepEqual(i.composition.filters, [
    { metric: 'revenue_growth', op: '>', value: 20, unit: 'pct' },
  ]);
  assert.deepEqual(i.composition.measures, ['institutional_breadth']);
  assert.equal(i.primary_entity, null, 'a sector is the universe, not a subject');
  assert.ok(
    i.required_datasets.includes('sec_fundamentals') &&
      i.required_datasets.includes('sec_13f_holdings'),
  );
  const m = ci.canonicalIntent('How do rising interest rates affect bank stocks?');
  assert.equal(m.family, 'macro_relationship');
  assert.equal(m.composition.driver, 'interest_rate');
  assert.ok(m.operations.includes('estimate_relationship'));
  /* A measure Ezana has no data for is reported, never swapped. */
  const u = ci.canonicalIntent('Which bank stocks have the highest short interest?');
  assert.match(u.unsupported || '', /short interest/);
  /* "won government contracts" is an event, not the Korean currency. */
  const w = comp.composeIntent(
    'which defense contractors that won government contracts lobby the most',
  );
  assert.ok(!w.measures.includes('fx_rate') && !w.filters.some((f) => f.metric === 'fx_rate'));
});

test('M  holder candidates are tried, never trusted', () => {
  const lower = ci.canonicalIntent('which pelosi holdings have the most institutional managers');
  assert.equal(lower.primary_entity.status, 'candidate');
  assert.deepEqual(lower.primary_entity.alternates, ['pelosi']);
  const apos = ci.canonicalIntent(
    'Which of Pelosis holdings are most widely held by institutions?',
  );
  assert.deepEqual(apos.primary_entity.alternates, ['Pelosis', 'Pelosi']);
  assert.equal(
    ci.canonicalIntent('which tech stocks are most owned by institutions').primary_entity,
    null,
  );
  assert.equal(ci.planSignature(lower).resolved, false, 'a candidate is not reusable');
  /* After verified resolution it is the same investigation as the capitalised question. */
  const a = ci.withResolution(lower, RESOLVED.pelosi);
  const b = resolve(
    ci.canonicalIntent('Which Pelosi holdings have the most institutional managers?'),
  );
  assert.equal(ci.planSignature(a).id, ci.planSignature(b).id);
});

test('N  a cut written analysis is repaired to its complete parts', () => {
  const full = JSON.stringify({
    executiveConclusion: {
      text: 'MSFT leads [S1].',
      classification: 'verified_fact',
      evidence: ['S1'],
    },
    keyFindings: [
      { title: 'A', explanation: 'with "quotes" inside', evidence: ['S1'] },
      { title: 'B', explanation: 'second', evidence: ['S2'] },
    ],
    analysis: [{ text: 'z', evidence: ['S1'] }],
    headline: 'H',
  });
  const cut = parseResearchJson(full.slice(0, Math.floor(full.length * 0.7)));
  assert.equal(cut._truncated, true);
  assert.equal(cut.executiveConclusion.text, 'MSFT leads [S1].');
  for (const f of cut.keyFindings || [])
    assert.ok(f.title && f.explanation, 'no half-written finding');
  assert.equal(parseResearchJson(full)._truncated, undefined, 'a complete reply is untouched');
  assert.equal(repairTruncatedJson('{"executiveConclusion": {"text": "cut mid str'), null);
  /* The fallback says why the writer is missing, not "did not complete in time". */
  const det = deterministicResearch({
    spec: { question: 'q' },
    marked: [],
    metrics: [],
    writerFailure: 'truncated',
  });
  assert.match(det.limitations[0], /length limit/);
  assert.ok(WRITER_FAILURE.timeout && WRITER_FAILURE.provider && WRITER_FAILURE.invalid);
});

test('O  reuse only complete, public, verified, same-data computations', () => {
  const A = resolve(ci.canonicalIntent(QUERY_A));
  const att = inferComposition(QUERY_A).attachments;
  assert.equal(reuse.reuseEligibility({ intent: A, attachments: att }).ok, true);
  assert.equal(
    reuse.reuseEligibility({ intent: ci.canonicalIntent(QUERY_A), attachments: att }).ok,
    false,
    'unresolved',
  );
  assert.equal(
    reuse.reuseEligibility({ intent: A, attachments: att, orgId: 'o1' }).ok,
    false,
    'org scope',
  );
  assert.equal(
    reuse.reuseEligibility({ intent: A, attachments: [...att, { kind: 'query', query: 'x' }] }).ok,
    false,
    'query attachment',
  );
  assert.equal(
    reuse.reuseEligibility({
      intent: A,
      attachments: att,
      question: 'latest Pelosi holdings most owned by funds',
    }).ok,
    false,
    'fresh data requested',
  );
  const epoch = {
    kind: 'politician',
    id: 'P000197',
    holder: { trades: 300, latest: '2026-11-09' },
    filers: { '2026-09-30': 1591 },
  };
  const B = resolve(ci.canonicalIntent(QUERY_B));
  const kA = reuse.reuseKey({ intent: A, attachments: att, epoch, access: 'guest' });
  const kB = reuse.reuseKey({
    intent: B,
    attachments: inferComposition(QUERY_B).attachments,
    epoch,
    access: 'guest',
  });
  assert.equal(kA, kB, 'paraphrases share one computation');
  assert.notEqual(
    kA,
    reuse.reuseKey({
      intent: A,
      attachments: att,
      epoch: { ...epoch, holder: { trades: 301, latest: '2026-11-20' } },
      access: 'guest',
    }),
    'new disclosure',
  );
  assert.notEqual(
    kA,
    reuse.reuseKey({
      intent: A,
      attachments: att,
      epoch: { ...epoch, filers: { '2026-09-30': 1600 } },
      access: 'guest',
    }),
    'new filings',
  );
  assert.notEqual(
    kA,
    reuse.reuseKey({ intent: A, attachments: att, epoch, access: 'member' }),
    'access class',
  );
  const done = {
    results: [{ key: 'a', status: 'ok' }],
    failedTasks: [],
    subject: { id: 'P000197' },
  };
  const sig = ci.planSignature(A).id;
  assert.equal(
    reuse.reuseEntry({ composition: done, fulfilled: false, signature: sig }),
    null,
    'unfulfilled',
  );
  assert.equal(
    reuse.reuseEntry({
      composition: { ...done, failedTasks: ['x'] },
      fulfilled: true,
      signature: sig,
    }),
    null,
    'partial',
  );
  assert.equal(
    reuse.reuseEntry({
      composition: { ...done, extra: new Set([1]) },
      fulfilled: true,
      signature: sig,
    }),
    null,
    'not plain JSON',
  );
  const entry = reuse.reuseEntry({ composition: done, fulfilled: true, signature: sig, now: 1e12 });
  assert.ok(reuse.validEntry(entry, { signature: sig, now: 1e12 + 3600e3 }));
  assert.equal(
    reuse.validEntry(entry, { signature: sig, now: 1e12 + 7 * 3600e3 }),
    null,
    'past 6 hours',
  );
  assert.equal(reuse.validEntry(entry, { signature: 'other', now: 1e12 }), null, 'other signature');
});

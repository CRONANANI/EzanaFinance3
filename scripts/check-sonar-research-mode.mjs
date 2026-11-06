/**
 * Sonar research modes (Nov 2026): the classifier, its evaluation sets and
 * the routing helpers.
 *   npm run test:sonar-research-mode
 *
 * Evaluation sets (scripts/fixtures/sonar-mode-eval/):
 *   calibration-50.json   50 owner-labelled deep questions, 10 holdout
 *   design-examples.json  21 reviewed examples (quick, standard, deep)
 *   drafted.json          150 drafted questions; gated only once reviewed
 *
 * Printed per set: a confusion matrix, deep recall and precision, the false
 * negative rate (deep classified lower), the false positive rate (quick or
 * standard offered deep), mode agreement, and the holdout recall.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const {
  classifyResearchMode,
  detectOperations,
  coverageFromPlan,
  estimateFromPlan,
  routeForClassification,
  deepOffer,
  goDeeperFor,
  THRESHOLDS,
  BAND,
} = await import('@/lib/sonar/research-mode');
const { DEPTHS } = await import('@/lib/sonar/engine/planner');
const { deepResearchSignal, deepResearchForGuests, standardResearchEnabled } =
  await import('@/lib/sonar/deep-research');
const { modeEventRow, MODE_EVENT_ACTIONS } = await import('@/lib/sonar/mode-events');
const { reservePing } = await import('@/lib/sonar/quota');
const { getSonarEntitlements, DEEP_RUNS_PER_DAY } = await import('@/lib/sonar/entitlements');
const { SONAR_QUERY_MAX } = await import('@/lib/sonar/limits');

const load = (f) => JSON.parse(readFileSync(`scripts/fixtures/sonar-mode-eval/${f}`, 'utf8'));
const CAL = load('calibration-50.json');
const DESIGN = load('design-examples.json');
const DRAFTED = load('drafted.json');

const MODES = ['quick', 'standard', 'deep'];
/* Offered deep = what the visitor sees as a deep offer. */
const offeredDeep = (c) => c.mode === 'deep' && c.confidence === 'clear';
/* Counted deep for the calibration gate: offered, or borderline to deep. */
const countsDeep = (c) => offeredDeep(c) || c.goDeeperTo === 'deep';

function evaluate(rows) {
  const matrix = Object.fromEntries(MODES.map((m) => [m, { quick: 0, standard: 0, deep: 0 }]));
  const out = rows.map((r) => ({ r, c: classifyResearchMode(r.query) }));
  for (const { r, c } of out) matrix[r.mode][c.mode] += 1;
  const deepRows = out.filter((x) => x.r.mode === 'deep');
  const offered = out.filter((x) => offeredDeep(x.c));
  const tp = deepRows.filter((x) => offeredDeep(x.c)).length;
  const agree = out.filter((x) => x.r.mode === x.c.mode).length;
  return {
    out,
    matrix,
    deepRecall: deepRows.length ? tp / deepRows.length : null,
    deepPrecision: offered.length ? tp / offered.length : null,
    falseNegativeRate: deepRows.length ? 1 - tp / deepRows.length : null,
    falsePositiveRate: out.filter((x) => x.r.mode !== 'deep').length
      ? out.filter((x) => x.r.mode !== 'deep' && offeredDeep(x.c)).length /
        out.filter((x) => x.r.mode !== 'deep').length
      : null,
    agreement: agree / out.length,
  };
}

const pct = (v) => (v == null ? 'n/a' : `${(v * 100).toFixed(1)}%`);
function report(name, e) {
  console.log(`\n# ${name} (${e.out.length})`);
  console.log('#   labelled \\ classified   quick  standard  deep');
  for (const m of MODES) {
    const row = e.matrix[m];
    if (!row.quick && !row.standard && !row.deep) continue;
    console.log(
      `#   ${m.padEnd(22)} ${String(row.quick).padStart(5)} ${String(row.standard).padStart(9)} ${String(row.deep).padStart(5)}`,
    );
  }
  console.log(
    `#   deep recall ${pct(e.deepRecall)}, deep precision ${pct(e.deepPrecision)}, false negatives ${pct(
      e.falseNegativeRate,
    )}, false positives ${pct(e.falsePositiveRate)}, agreement ${pct(e.agreement)}`,
  );
}

/* ── Evaluation gates ────────────────────────────────────────────────── */

test('calibration: at least 38 of 40 non-holdout questions are deep', () => {
  const rows = CAL.filter((r) => !r.holdout);
  const e = evaluate(rows);
  report('calibration-50, non-holdout', e);
  const misses = e.out.filter((x) => !countsDeep(x.c));
  const borderline = e.out.filter((x) => !offeredDeep(x.c) && countsDeep(x.c));
  for (const { r, c } of [...misses, ...borderline]) {
    console.log(
      `#   ${misses.some((m) => m.r.id === r.id) ? 'MISS' : 'borderline-to-deep'} ${r.id} ${c.mode}/${c.confidence} score ${c.score} ${JSON.stringify(
        Object.fromEntries(Object.entries(c.dimensions).map(([k, v]) => [k, v.points])),
      )}`,
    );
  }
  assert.ok(
    rows.length - misses.length >= 38,
    `deep ${rows.length - misses.length}/40, misses: ${misses.map((m) => m.r.id).join(', ')}`,
  );
});

test('calibration holdout: at least 8 of 10 are deep (never tuned against)', () => {
  const rows = CAL.filter((r) => r.holdout);
  const e = evaluate(rows);
  report('calibration-50, holdout', e);
  const deep = e.out.filter((x) => countsDeep(x.c)).length;
  const offered = e.out.filter((x) => offeredDeep(x.c)).length;
  console.log(`#   holdout recall: ${deep}/10 deep (offered deep: ${offered}/10)`);
  assert.ok(deep >= 8, `holdout ${deep}/10`);
});

test('design examples: all 21 exact', () => {
  const e = evaluate(DESIGN);
  report('design-examples', e);
  for (const { r, c } of e.out) {
    if (r.mode === 'deep') assert.ok(offeredDeep(c), `${r.id} must be deep and clear: ${r.query}`);
    else {
      assert.equal(c.mode, r.mode, `${r.id}: ${r.query}`);
      assert.ok(!offeredDeep(c), `${r.id} must not be offered deep`);
    }
  }
});

test('drafted questions: printed now, gated once reviewed', () => {
  for (const set of ['quick', 'standard', 'borderline', 'adversarial']) {
    report(`drafted ${set}`, evaluate(DRAFTED.filter((r) => r.set === set)));
  }
  const reviewed = DRAFTED.filter((r) => r.reviewed === true);
  console.log(`#   reviewed drafted questions: ${reviewed.length}/${DRAFTED.length}`);
  if (!reviewed.length) return;
  const quick = evaluate(reviewed.filter((r) => r.mode === 'quick'));
  const std = evaluate(reviewed.filter((r) => r.mode === 'standard'));
  const quickOffered = quick.out.filter((x) => offeredDeep(x.c)).length;
  if (quick.out.length)
    assert.ok(quickOffered / quick.out.length <= 0.05, 'quick offered deep > 5%');
  if (std.out.length) assert.ok(std.agreement >= 0.8, `standard agreement ${pct(std.agreement)}`);
});

test('the existing deep-research expectations hold', () => {
  for (const q of [
    'How exposed is Nvidia to China export controls?',
    'Who is lobbying hardest on AI regulation?',
  ]) {
    const c = classifyResearchMode(q);
    assert.equal(c.mode, 'standard', q);
    assert.ok(!offeredDeep(c), q);
  }
  const nv = classifyResearchMode('How exposed is Nvidia to China export controls?');
  assert.equal(nv.confidence, 'borderline');
  assert.equal(nv.goDeeperTo, 'deep');
  /* The longer calibration version, with explicit rigor, is deep. */
  assert.ok(offeredDeep(classifyResearchMode(CAL.find((r) => r.id === 'cal18').query)));
});

/* ── The classifier's parts ──────────────────────────────────────────── */

test('operations are read from structure and verbs, not names', () => {
  const ops = (q) => detectOperations(q).map((o) => o.id);
  assert.ok(ops('How dependent is Acme on government spending?').includes('dependence'));
  assert.ok(ops('Can Acme keep this up?').includes('sustainability'));
  assert.ok(ops('Who wins if budgets keep rising?').includes('opportunity'));
  assert.ok(ops('What could go wrong for Acme?').includes('risk_assessment'));
  assert.ok(ops('How has Acme revenue changed over the past five years?').includes('trend'));
  assert.ok(ops('Compare Acme and Globex margins.').includes('compare'));
  assert.ok(ops('Break down the listings by country.').includes('breakdown'));
  assert.ok(
    ops('Map the relationships between lenders and borrowers.').includes('relationship_map'),
  );
  assert.ok(ops('Find three emerging themes across the data.').includes('discovery'));
  assert.ok(ops('Where do the sources contradict each other?').includes('reconciliation'));
  /* Records of one entity, or recency, are not a ranking. */
  assert.ok(!ops('Who are the largest holders of Acme?').includes('rank_screen'));
  assert.ok(!ops('Which companies won the most recent contracts?').includes('rank_screen'));
  /* A single period is not a trend or a horizon. */
  assert.ok(!ops("What was Acme's revenue last quarter?").includes('trend'));
  assert.ok(!ops("What did Acme guide for next quarter's revenue?").includes('outlook_scenario'));
});

test('each mandatory trigger fires', () => {
  const trig = (q) => classifyResearchMode(q, { coverage: false }).triggers;
  assert.ok(trig('Build a due diligence dossier on Tesla.').includes('deep:assignment_operation'));
  assert.ok(trig('How dependent is Tesla on China?').includes('deep:judgement_on_subject'));
  assert.ok(
    trig('Compare Apple, Microsoft and Alphabet on revenue growth and lobbying.').includes(
      'deep:multi_company_comparison',
    ),
  );
  assert.ok(
    trig('Rank defense contractors by contract awards and lobbying spend.').includes(
      'deep:multi_criteria_ranking',
    ),
  );
  assert.ok(
    trig(
      "How has Boeing's backlog grown over the past five years, and what is the outlook?",
    ).includes('deep:trend_and_forward'),
  );
  assert.ok(
    trig('Look at Pfizer contracts, lobbying and institutional ownership.').includes(
      'deep:three_families_requested',
    ),
  );
  assert.ok(
    trig(
      'Which agencies award the most cloud contracts? Identify the vendors, award values and agencies.',
    ).includes('deep:multi_part_assignment'),
  );
  /* Quick triggers. */
  assert.ok(trig("What was Apple's revenue last quarter?").includes('quick:single_metric_lookup'));
  assert.ok(trig('Exxon Mobil').includes('quick:bare_entity'));
  assert.ok(trig('Who owns Tesla?').includes('quick:who_owns'));
  assert.ok(trig('Full report: Apple stock price').includes('quick:price_or_ticker'));
});

test('the borderline band runs the lighter mode and offers Go deeper', () => {
  assert.equal(BAND, 1);
  assert.ok(THRESHOLDS.deep > THRESHOLDS.standard);
  const c = classifyResearchMode('Which companies have the greatest exposure to copper prices?');
  assert.equal(c.mode, 'standard');
  assert.equal(c.confidence, 'borderline');
  assert.equal(c.goDeeperTo, 'deep');
  assert.ok(c.score > THRESHOLDS.deep - BAND && c.score < THRESHOLDS.deep + BAND);
  const clear = classifyResearchMode("How has Boeing's revenue changed over the past five years?");
  assert.equal(clear.mode, 'standard');
  assert.equal(clear.confidence, 'clear');
  assert.equal(clear.goDeeperTo, null);
});

test('the coverage check escalates when the standard plan drops a requested family', () => {
  const q =
    "How have Microsoft's revenue and institutional ownership changed over the past three years?";
  assert.equal(classifyResearchMode(q).mode, 'standard');
  const saved = DEPTHS.standard.maxTasks;
  try {
    DEPTHS.standard.maxTasks = 1;
    const c = classifyResearchMode(q);
    assert.equal(c.mode, 'deep');
    assert.equal(c.confidence, 'clear');
    assert.ok(c.triggers.includes('deep:standard_plan_incomplete'));
    assert.ok(c.plannedWork.droppedAtStandard.length >= 1);
    assert.match(c.reasons.join(' '), /A standard run would leave out/);
  } finally {
    DEPTHS.standard.maxTasks = saved;
  }
  /* The real phase-1 plan: a capped family is reported, never escalated. */
  const cov = coverageFromPlan(
    {
      tasks: [{ source: 'company_financials' }],
      excluded: [{ source: 'holder_positioning', reason: 'depth_cap' }],
    },
    ['financials', 'ownership'],
  );
  assert.deepEqual(cov, { incomplete: true, missing: ['institutional ownership'] });
  assert.deepEqual(coverageFromPlan({ tasks: [], excluded: [] }, ['ownership']), {
    incomplete: false,
    missing: [],
  });
});

test('the estimate comes from planned work', () => {
  const s = estimateFromPlan('standard', { tasks: 8 });
  assert.equal(s.label, 'about 20 to 40 seconds');
  /* Nov 6: the research team adds one parallel round of specialist calls. */
  assert.ok(s.minSec >= 10 && s.maxSec <= 40 && s.minSec < s.maxSec);
  const noTeam = estimateFromPlan('standard', { tasks: 8, team: false });
  assert.ok(noTeam.maxSec <= 30 && noTeam.maxSec < s.maxSec);
  const memo = estimateFromPlan('deep', { tasks: 20, memo: true });
  const rep = estimateFromPlan('deep', { tasks: 8, memo: false });
  assert.equal(memo.label, 'about 1 to 4 minutes');
  assert.ok(memo.maxSec > rep.maxSec && memo.minSec >= rep.minSec);
  const c = classifyResearchMode('How dependent is Palantir on government spending?');
  assert.equal(c.format, 'investment_memo');
  assert.ok(c.plannedWork.tasks > 8, 'a deep memo plans more than the standard cap');
  assert.match(c.reasons[0], /^This question asks how dependent Palantir is/);
});

test('questions up to 600 characters are accepted', () => {
  assert.equal(SONAR_QUERY_MAX, 600);
  const cal34 = CAL.find((r) => r.id === 'cal34').query;
  assert.ok(cal34.length > 300 && cal34.length <= SONAR_QUERY_MAX);
  assert.ok(offeredDeep(classifyResearchMode(cal34)));
  for (const f of [
    'src/app/api/sonar/landing-query/route.js',
    'src/app/api/sonar/research/route.js',
  ]) {
    const src = readFileSync(f, 'utf8');
    assert.match(src, /query\.length > SONAR_QUERY_MAX/, f);
    assert.doesNotMatch(src, /query\.length > 300/, f);
  }
});

test('deepResearchSignal stays a thin wrapper; flags default as specified', () => {
  const s = deepResearchSignal('How dependent is Palantir on government spending?');
  assert.equal(s.deep, true);
  assert.equal(deepResearchSignal('Who owns Palantir?').deep, false);
  assert.equal(deepResearchForGuests({}), false, 'deep research needs an account by default');
  assert.equal(deepResearchForGuests({ SONAR_DEEP_GUESTS: 'true' }), true);
  assert.equal(standardResearchEnabled({}), true);
  assert.equal(standardResearchEnabled({ SONAR_STANDARD_RESEARCH: 'false' }), false);
});

/* ── Routing ─────────────────────────────────────────────────────────── */

test('landing-query routing: deep offer, standard, quick with Go deeper', () => {
  const deep = classifyResearchMode('How dependent is Palantir on government spending?');
  const r1 = routeForClassification(deep, { hostRunsStandard: true, isGuest: true });
  assert.equal(r1.kind, 'deep');
  assert.equal(r1.deep.guestNeedsAccount, true);
  assert.equal(r1.deep.format, 'investment_memo');
  assert.ok(r1.deep.reasons.length && r1.deep.domains.length);
  assert.equal(r1.deep.meta.mode, 'deep');
  assert.equal(routeForClassification(deep, { deepEnabled: false }).kind, 'quick');

  const std = classifyResearchMode(
    'Which hedge funds increased their Palantir positions, and by how much?',
  );
  assert.equal(routeForClassification(std, { hostRunsStandard: true }).kind, 'standard');
  assert.equal(
    routeForClassification(std, { hostRunsStandard: false }).kind,
    'quick',
    'a host that cannot render the report keeps the quick path',
  );
  const nv = classifyResearchMode('How exposed is Nvidia to China export controls?');
  const r2 = routeForClassification(nv, { hostRunsStandard: true });
  assert.equal(r2.kind, 'standard');
  assert.equal(r2.goDeeper.to, 'deep');
  assert.ok(r2.goDeeper.deep && r2.goDeeper.reasons[0]);

  const q = classifyResearchMode(
    'Which members of the Armed Services Committee own defense stocks?',
  );
  const r3 = routeForClassification(q, { hostRunsStandard: true });
  assert.equal(r3.kind, 'quick');
  assert.equal(r3.goDeeper?.to, 'standard');
  assert.equal(routeForClassification(q, { hostRunsStandard: false }).goDeeper, null);
  assert.equal(routeForClassification(classifyResearchMode('Who owns Palantir?')).goDeeper, null);
  assert.equal(goDeeperFor({ goDeeperTo: null }), null);
  assert.ok(deepOffer(deep).estimate.label);
});

/* A fake admin client for the quota: rpc(name) answers from the map. */
function fakeAdmin(rpc, deepCount = 0) {
  const q = {
    select: () => q,
    eq: () => q,
    gte: () => q,
    like: () => Promise.resolve({ count: deepCount, error: null }),
  };
  return {
    calls: [],
    rpc: async function (name, args) {
      this.calls.push([name, args]);
      return typeof rpc[name] === 'function' ? rpc[name](args) : rpc[name];
    },
    from: () => q,
  };
}

test('research routing: deep quota, missing function fallback, guests gated', async () => {
  const quota = fakeAdmin({
    reserve_sonar_ping_deep: { data: [{ id: null, reason: 'deep_quota', used: 2 }], error: null },
  });
  const r = await reservePing(quota, {
    userId: 'u1',
    query: 'q',
    version: 'research:deep:regular',
    deepLimit: 2,
  });
  assert.deepEqual(r, { ok: false, reason: 'deep_quota', used: 2 });
  assert.equal(quota.calls[0][1].p_deep_limit, 2);

  const missing = fakeAdmin(
    {
      reserve_sonar_ping_deep: { data: null, error: { code: 'PGRST202', message: 'missing' } },
      reserve_sonar_ping: { data: [{ id: 'row1', used: 0 }], error: null },
    },
    2,
  );
  const r2 = await reservePing(missing, { userId: 'u1', query: 'q', version: 'v', deepLimit: 2 });
  assert.equal(r2.reason, 'deep_quota', 'fallback counts today’s deep runs');
  const under = fakeAdmin(
    {
      reserve_sonar_ping_deep: { data: null, error: { code: '42883', message: 'missing' } },
      reserve_sonar_ping: { data: [{ id: 'row1', used: 0 }], error: null },
    },
    1,
  );
  assert.deepEqual(
    await reservePing(under, { userId: 'u1', query: 'q', version: 'v', deepLimit: 2 }),
    {
      ok: true,
      id: 'row1',
      used: 0,
    },
  );

  const src = readFileSync('src/app/api/sonar/research/route.js', 'utf8');
  assert.match(src, /res\.reason === 'deep_quota'/);
  assert.match(src, /status: 429/);
  assert.match(src, /A standard answer is still available\./);
  assert.match(src, /signup: true/);
  assert.match(src, /body\?\.mode === 'standard' && standardResearchEnabled\(\)/);
  assert.match(src, /send\('coverage'/);
});

test('entitlements carry the deep caps; events validate', () => {
  assert.deepEqual(DEEP_RUNS_PER_DAY, { guest: 0, 0: 2, 1: 5, 2: 15, 3: 15, 4: 50 });
  assert.equal(getSonarEntitlements({ planTier: 0 }).deepRunsPerDay, 2);
  assert.equal(getSonarEntitlements({ planTier: 1 }).deepRunsPerDay, 5);
  assert.equal(getSonarEntitlements({ planTier: 2 }).deepRunsPerDay, 15);
  assert.equal(getSonarEntitlements({ planTier: 4, version: 'org' }).deepRunsPerDay, 50);
  assert.ok(getSonarEntitlements({ planTier: 0 }).researchModes.includes('standard'));

  assert.equal(MODE_EVENT_ACTIONS.size, 8);
  const row = modeEventRow({
    query: 'x'.repeat(900),
    action: 'go_deeper_clicked',
    predictedMode: 'standard',
    confidence: 'borderline',
    score: 4,
    triggers: ['a'],
    ranMode: 'deep',
    ipHash: 'h',
  });
  assert.equal(row.query_text.length, 600);
  assert.equal(row.ip_hash, 'h');
  assert.equal(
    modeEventRow({ query: 'q', action: 'hacked', predictedMode: 'quick', confidence: 'clear' }),
    null,
  );
  assert.equal(
    modeEventRow({
      query: 'q',
      action: 'classified',
      predictedMode: 'quick',
      confidence: 'clear',
      userId: 'u',
      ipHash: 'h',
    }).ip_hash,
    null,
    'a member is never stored by IP hash',
  );
});

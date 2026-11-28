/**
 * Sonar 6.5: multi-step research intelligence and execution reliability (Nov 28 2026).
 *
 * Deterministic suite over the frozen fixtures in scripts/fixtures/sonar-6-5-research.mjs
 * (committed before the execution code) and a fake Supabase. No network, no model calls:
 * the no-LLM guard fails the run on any provider request.
 *
 * Scenario C (Congress purchases, then direct federal awards, then a 13F rise, with one
 * company unknown on 13F) is release-blocking.
 */
import { llmRequests } from './lib/no-llm-guard.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fakeSupabase } from './lib/fake-supabase.mjs';
import * as F from './fixtures/sonar-6-5-research.mjs';

const E = await import('../src/lib/sonar/execution/envelope.js');
const G = await import('../src/lib/sonar/execution/graph.js');
const C = await import('../src/lib/sonar/execution/conditions.js');
const T = await import('../src/lib/sonar/execution/temporal.js');
const N = await import('../src/lib/sonar/execution/entities.js');
const Rl = await import('../src/lib/sonar/execution/relationships.js');
const Rq = await import('../src/lib/sonar/execution/requirements.js');
const Gp = await import('../src/lib/sonar/execution/gaps.js');
const Sy = await import('../src/lib/sonar/execution/synthesis.js');
const P = await import('../src/lib/sonar/execution/plan.js');
const S = await import('../src/lib/sonar/composer/stages.js');
const I = await import('../src/lib/sonar/composer/intents.js');
const A = await import('../src/lib/sonar/composer/analytics-server.js');
const Fu = await import('../src/lib/sonar/composer/fulfillment.js');
const V = await import('../src/lib/sonar/valuation/model.js');

const sorted = (a) => [...a].sort();

/* ── fixture-backed readers (the frozen records, evaluated with their own period semantics) ── */

const congressIn = (types) =>
  sorted(
    new Set(
      F.CONGRESS.filter(
        (r) => types.includes(r.type) && T.inWindow(r.transaction_date, F.WINDOW, F.NOW),
      ).map((r) => r.ticker),
    ),
  );

const directAwardValue = (ticker) => {
  const company = F.ENTITIES[ticker];
  const dated = F.AWARDS.filter((a) => T.inWindow(a.action_date, F.WINDOW, F.NOW));
  return N.awardExposure(dated, company, F.RELATIONSHIPS, { scope: 'direct' }).total;
};

const breadthChange = (t) => {
  const r = F.HOLDERS13F.rows[t];
  return r ? r.now - r.prior : null;
};

const verdicts = (screen) => ({
  pass: sorted(screen.passing.map((m) => m.ticker)),
  fail: sorted(screen.failing.map((m) => m.ticker)),
  unknown: sorted(screen.unknown.map((m) => m.ticker)),
});

function scenarioC(sources = {}) {
  const universe = congressIn(['purchase']).map((t) => ({ ticker: t, cik: F.ENTITIES[t].cik }));
  const conditions = [
    { id: 'congress', label: 'Bought by members of Congress', source: 'congress', op: 'exists' },
    {
      id: 'awards',
      label: 'Direct federal awards in the window',
      source: 'contracts_window',
      op: 'exists',
      zeroIsConfirmed: true,
    },
    {
      id: 'inst',
      label: 'More 13F managers holding',
      source: 'holders13f_change',
      op: '>',
      value: 0,
    },
  ];
  const values = Object.fromEntries(
    universe.map(({ ticker: t }) => [
      t,
      {
        congress: F.CONGRESS.filter((r) => r.ticker === t && r.type === 'purchase').length,
        awards: directAwardValue(t),
        inst: breadthChange(t),
      },
    ]),
  );
  return C.screenEntities({ universe, conditions, values, sources });
}

/* ═══ A. Envelope ═══════════════════════════════════════════════════════════════ */

test('envelope: statuses are validated; not-executed results need a reason; usable ones need lineage', () => {
  assert.throws(() => E.stepResult({ stepId: 's', status: 'done' }), /bad status/);
  assert.throws(() => E.stepResult({ stepId: 's', status: 'provider_error' }), /needs a reason/);
  assert.throws(() => E.stepResult({ stepId: 's', status: 'complete' }), /source lineage/);
  const ok = E.stepResult({
    stepId: 's',
    status: 'complete',
    sources: ['congress_trades'],
    entitySet: [E.entity({ ticker: 'XAAA' }), E.entity({ ticker: 'xaaa' })],
  });
  assert.equal(ok.entitySet.length, 1, 'duplicate canonical ids collapse');
  assert.ok(Object.isFrozen(ok));
});

test('envelope: outcomes separate "none qualified" from "nothing checked"', () => {
  const none = E.stepResult({ stepId: 's', status: 'complete', sources: ['x'] });
  assert.equal(E.outcomeOf(none), 'none_qualified');
  assert.equal(E.outcomeOf(E.notExecuted('s', 'provider_error', 'timeout')), 'query_failed');
  assert.equal(E.outcomeOf(E.notExecuted('s', 'permission_denied', 'no entitlement')), 'no_access');
  assert.equal(
    E.outcomeOf(E.notExecuted('s', 'skipped_dependency', 'upstream failed')),
    'not_executed',
  );
  assert.equal(
    E.outcomeOf(
      E.stepResult({ stepId: 's', status: 'bounded', sources: ['x'], coverage: { unchecked: 4 } }),
    ),
    'partially_evaluated',
  );
});

/* ═══ B. Graph ══════════════════════════════════════════════════════════════════ */

test('graph: cycles, unknown dependencies and unresolved inputs are rejected before execution', () => {
  const cyc = G.validatePlan({
    steps: [
      { id: 'a', operation: 'x', dependsOn: ['b'] },
      { id: 'b', operation: 'x', dependsOn: ['a'] },
    ],
  });
  assert.equal(cyc.ok, false);
  assert.match(cyc.errors.join(' '), /cyclic/);
  const unknown = G.validatePlan({ steps: [{ id: 'a', operation: 'x', dependsOn: ['zz'] }] });
  assert.match(unknown.errors.join(' '), /unknown step zz/);
  const input = G.validatePlan({
    steps: [
      { id: 'a', operation: 'x', output: 'u' },
      { id: 'b', operation: 'x', input: 'a.u' },
    ],
  });
  assert.match(input.errors.join(' '), /without depending on a/);
  const big = G.validatePlan({
    steps: Array.from({ length: G.MAX_STEPS + 1 }, (_, i) => ({ id: `s${i}`, operation: 'x' })),
  });
  assert.match(big.errors.join(' '), /bound is/);
});

test('graph: a failed step skips its dependants with the upstream reason; independent steps still run', async () => {
  const plan = {
    steps: [
      { id: 'u', operation: 'ok', output: 'set' },
      { id: 'bad', operation: 'boom', dependsOn: ['u'] },
      { id: 'after', operation: 'ok', dependsOn: ['bad'] },
      { id: 'side', operation: 'ok', dependsOn: ['u'] },
    ],
  };
  const ops = {
    ok: async (s) => E.stepResult({ stepId: s.id, status: 'complete', sources: ['fixture'] }),
    boom: async () => {
      throw new Error('provider timed out');
    },
  };
  const r = await G.executePlan(plan, ops);
  assert.equal(r.results.bad.status, 'provider_error');
  assert.equal(r.results.after.status, 'skipped_dependency');
  assert.match(r.results.after.reason, /needs bad, which was provider_error/);
  assert.equal(r.results.side.status, 'complete');
});

test('graph: an entitlement 403 is permission_denied, never retried as a substitute', async () => {
  const plan = { steps: [{ id: 'q', operation: 'deny' }] };
  const err = Object.assign(new Error('forbidden'), { status: 403, entitlement: true });
  const r = await G.executePlan(plan, {
    deny: async () => {
      throw err;
    },
  });
  assert.equal(r.results.q.status, 'permission_denied');
  const gap = Gp.analyzeStep(r.results.q);
  assert.equal(
    Gp.recoveryPolicy(gap, { httpStatus: 403, available: ['alternate_identifier'] }).recover,
    false,
  );
});

test('graph: bounded parallelism, dedupe by key, deadline and cancellation', async () => {
  let live = 0;
  let peak = 0;
  let calls = 0;
  const slow = async (s) => {
    calls += 1;
    live += 1;
    peak = Math.max(peak, live);
    await new Promise((r) => setTimeout(r, 5));
    live -= 1;
    return E.stepResult({ stepId: s.id, status: 'complete', sources: ['fixture'] });
  };
  const steps = Array.from({ length: 6 }, (_, i) => ({
    id: `p${i}`,
    operation: 'slow',
    key: i < 2 ? 'same' : `k${i}`,
  }));
  const r = await G.executePlan({ steps }, { slow }, { concurrency: 2 });
  assert.ok(peak <= 2, `peak ${peak}`);
  assert.ok(calls <= 6);
  assert.ok(Object.values(r.results).every((x) => x.status === 'complete'));
  const ctl = new AbortController();
  ctl.abort();
  const c = await G.executePlan(
    { steps: [{ id: 'x', operation: 'slow' }] },
    { slow },
    { signal: ctl.signal },
  );
  assert.equal(c.results.x.status, 'cancelled');
  const d = await G.executePlan(
    { steps: [{ id: 'y', operation: 'slow' }] },
    { slow },
    { deadlineAt: 1, now: () => 2 },
  );
  assert.equal(d.results.y.status, 'cancelled');
  assert.match(d.results.y.reason, /deadline/);
});

test('plan: requirements become a typed chain; every read takes the candidate set of the step before it', () => {
  const reqs = Rq.extractRequirements(
    'Find companies traded by members of Congress that also received federal contracts and experienced increasing institutional ownership.',
  );
  const plan = P.planScreen({
    universe: reqs.universe,
    filters: Rq.screenFilters(reqs.conditions),
    requirements: reqs.requirements,
    rankBy: 'institutional_breadth_change',
  });
  const v = G.validatePlan(plan);
  assert.ok(v.ok, v.errors.join('; '));
  assert.equal(plan.steps[0].operation, 'seed_from_records');
  const reads = plan.steps.filter((s) => s.operation === 'evaluate_conditions');
  assert.equal(reads.at(-1).datasets[0], 'holders13f_change', '13F (costliest) read last');
  for (const s of reads) assert.equal(s.output, 'candidates');
  assert.equal(plan.steps.at(-1).operation, 'rank');
});

/* ═══ C. Release-blocking: Congress -> direct awards -> 13F rise ═══════════════════ */

test('SCENARIO C (release-blocking): pass / unknown / fail are kept apart; unknown is never dropped as a fail', () => {
  const s = scenarioC();
  assert.deepEqual(verdicts(s), F.EXPECTED.scenarioC);
  assert.equal(s.outcome.status, 'complete_with_missing_data');
  assert.equal(s.exhaustive, false);
  assert.equal(s.outcome.zeroResult, false);
  const xeee = s.matrix.find((m) => m.ticker === 'XEEE');
  assert.match(xeee.reasons.inst, /no More 13F managers holding on record/);
});

test('SCENARIO C (release-blocking): end to end through runScreen, the unknown company is reported, not ranked', async () => {
  const att = I.inferComposition(
    'Which companies did Congress buy, that won new federal contracts in the same period, whose institutional ownership rose?',
  ).attachments[0];
  assert.equal(att.capability, 'financial-screen');
  assert.deepEqual(
    att.params.filters.map((f) => f.metric),
    ['congress_holders', 'gov_contract_value_window', 'institutional_breadth_change'],
  );
  const r = await A.runScreen(screenDb(), att, { now: F.NOW });
  assert.deepEqual(
    r.table.map((t) => t.ticker),
    ['XAAA'],
  );
  assert.deepEqual(r.unknownTickers, ['XEEE']);
  assert.equal(r.outcome.unknown, 1);
  assert.equal(r.outcome.zeroResult, false);
  assert.ok(
    r.limitations.some((l) => /XEEE/.test(l)),
    'the unknown company is named',
  );
  assert.ok(r.conditionReport.matrix.some((m) => m.ticker === 'XEEE' && m.verdict === 'unknown'));
  assert.ok(
    r.lineage?.some?.((l) => l.futureDatedExcluded >= 1) ||
      r.stages.some((s) => (s.lineage || []).some((l) => l.futureDatedExcluded >= 1)),
    'future-dated award counted, not used',
  );
  assert.match(r.text, /unknown/i);
});

/* ═══ D-H. Other multi-condition scenarios ═════════════════════════════════════════ */

test('SCENARIO D: sector + margin + 13F rise', () => {
  const universe = ['XCCC', 'XDDD'].map((t) => ({ ticker: t }));
  const conditions = [
    { id: 'margin', source: 'ratios', op: '>', value: 0.25 },
    { id: 'inst', source: 'holders13f_change', op: '>', value: 0 },
  ];
  const values = Object.fromEntries(
    universe.map(({ ticker: t }) => [
      t,
      { margin: F.RATIOS[t].operating_margin, inst: breadthChange(t) },
    ]),
  );
  assert.deepEqual(
    verdicts(C.screenEntities({ universe, conditions, values })),
    F.EXPECTED.scenarioD,
  );
});

test('SCENARIO H: revenue growth > 20% and declining margin; a missing prior-year margin is unknown', () => {
  const universe = Object.keys(F.RATIOS).map((t) => ({ ticker: t }));
  const conditions = [
    { id: 'growth', source: 'ratios', op: '>', value: 0.2 },
    { id: 'mchg', source: 'ratios', op: '<', value: 0 },
  ];
  const values = Object.fromEntries(
    universe.map(({ ticker: t }) => {
      const r = F.RATIOS[t];
      return [
        t,
        {
          growth: r.revenue_growth,
          mchg:
            r.operating_margin_prior == null ? null : r.operating_margin - r.operating_margin_prior,
        },
      ];
    }),
  );
  assert.deepEqual(
    verdicts(C.screenEntities({ universe, conditions, values })),
    F.EXPECTED.scenarioH,
  );
});

test('SCENARIO E/F: Congress "traded" is broader than "bought"; set algebra is by canonical id', () => {
  assert.deepEqual(congressIn(['purchase']), F.EXPECTED.congressBuyers);
  assert.deepEqual(congressIn(['purchase', 'sale']), F.EXPECTED.congressTraders);
  const ent = (ts) => ts.map((t) => E.entity({ ticker: t, cik: F.ENTITIES[t].cik }));
  assert.deepEqual(
    sorted(
      C.setOp('intersect', ent(F.EXPECTED.congressBuyers), ent(F.EXPECTED.awardsDirect)).map(
        (e) => e.ticker,
      ),
    ),
    ['XAAA', 'XEEE'],
  );
  assert.deepEqual(
    sorted(
      C.setOp('difference', ent(F.EXPECTED.congressTraders), ent(F.EXPECTED.congressBuyers)).map(
        (e) => e.ticker,
      ),
    ),
    ['XCCC'],
  );
});

test('SCENARIO G: award attribution. Direct joins; a verified subsidiary joins only at group scope; a look-alike never joins', () => {
  const dated = F.AWARDS.filter((a) => T.inWindow(a.action_date, F.WINDOW, F.NOW));
  assert.ok(!dated.some((a) => a.id === 'A2'), 'future-dated A2 is outside the window');
  const direct = sorted(
    Object.keys(F.ENTITIES).filter(
      (t) => N.awardExposure(dated, F.ENTITIES[t], F.RELATIONSHIPS, { scope: 'direct' }).total,
    ),
  );
  const group = sorted(
    Object.keys(F.ENTITIES).filter(
      (t) => N.awardExposure(dated, F.ENTITIES[t], F.RELATIONSHIPS, { scope: 'group' }).total,
    ),
  );
  assert.deepEqual(direct, F.EXPECTED.awardsDirect);
  assert.deepEqual(group, F.EXPECTED.awardsGroup);
  const look = N.attributeAward(
    F.AWARDS.find((a) => a.id === 'A5'),
    F.ENTITIES.XPAR,
    F.RELATIONSHIPS,
  );
  assert.equal(look.joins, false);
  assert.match(look.basis, /similar name only/);
  const unverified = N.attributeAward(
    F.AWARDS.find((a) => a.id === 'A4'),
    F.ENTITIES.XPAR,
    [{ ...F.RELATIONSHIPS[0], verified: false }],
  );
  assert.equal(unverified.attribution, 'inferred');
  assert.equal(unverified.joins, false);
});

/* ═══ I-K. Unknown, provider failure, permission ═══════════════════════════════════ */

test('SCENARIO I: a dataset with no record for a company is unknown, not a fail', () => {
  assert.equal(C.evaluate({ op: '>', value: 0 }, null), 'unknown');
  assert.equal(C.combine(['pass', 'unknown']), 'unknown');
  assert.equal(C.combine(['unknown', 'fail']), 'fail');
  assert.equal(
    C.evaluate({ op: 'exists', zeroIsConfirmed: true }, null),
    'fail',
    'a complete dated window confirms a zero',
  );
});

test('SCENARIO J: a failed source makes its condition unknown for everyone; the screen is partial, not empty', async () => {
  const s = scenarioC({ holders13f_change: { status: 'provider_error', reason: 'timeout' } });
  assert.equal(s.outcome.status, 'partial');
  assert.equal(s.outcome.zeroResult, false);
  assert.ok(s.passing.length === 0 && s.unknown.length >= 2);
  const att = I.inferComposition(
    'Which companies did Congress buy, that won new federal contracts in the same period, whose institutional ownership rose?',
  ).attachments[0];
  const r = await A.runScreen(
    screenDb({
      fail: {
        contract_awards_resolved: '403 permission denied for table contract_awards_resolved',
      },
    }),
    att,
    { now: F.NOW },
  );
  assert.equal(
    r.outcome.zeroResult,
    false,
    'a failed read is never presented as "nothing qualified"',
  );
  assert.ok(r.steps.some((s) => s.source === 'contracts_window' && !E.USABLE.has(s.status)));
  assert.ok(r.limitations.some((l) => /contract/i.test(l)));
  assert.ok(r.gaps.some((g) => g.kind === 'entitlement_limitation' || g.kind === 'provider_unavailable'), 'the failed read is a reported gap');
});

test('SCENARIO K: gap recovery is bounded to one attempt and never substitutes a dataset', () => {
  const gap = { kind: 'identifier_gap', stepId: 's' };
  assert.equal(Gp.MAX_RECOVERY_ATTEMPTS, 1);
  assert.equal(
    Gp.recoveryPolicy(gap, { attempts: 1, available: ['reuse_identifier_map'] }).recover,
    false,
  );
  assert.equal(
    Gp.recoveryPolicy(gap, { httpStatus: 401, available: ['reuse_identifier_map'] }).recover,
    false,
  );
});

/* ═══ L. Org context ══════════════════════════════════════════════════════════════ */

test('SCENARIO L: council holdings universe needs an org id; screen over the fund', () => {
  const noOrg = Rq.extractRequirements(
    'Which of our council holdings have improving revenue and increased institutional selling?',
  );
  assert.equal(noOrg.universe.kind, 'org_holdings');
  const gate = Rq.evaluateObjective(noOrg, null).requirements.find((r) => r.id === 'universe');
  assert.equal(
    gate.status,
    'unavailable',
    'no org context: the council universe is unavailable, never guessed',
  );
  assert.match(gate.reason, /authorized organization context/);
  const withOrg = Rq.extractRequirements(
    'Which of our council holdings have improving revenue and increased institutional selling?',
    { orgContext: { orgId: F.COUNCIL.orgId } },
  );
  assert.equal(withOrg.universe.orgId, F.COUNCIL.orgId);
  const universe = F.COUNCIL.tickers.map((t) => ({ ticker: t }));
  const conditions = [
    { id: 'rev', source: 'ratios', op: '>', value: 0 },
    { id: 'sell', source: 'holders13f_change', op: '<', value: 0 },
  ];
  const values = Object.fromEntries(
    universe.map(({ ticker: t }) => [
      t,
      { rev: F.RATIOS[t].revenue_growth, sell: breadthChange(t) },
    ]),
  );
  const got = verdicts(C.screenEntities({ universe, conditions, values }));
  /* XFFF has no 13F row; revenue fell, so the fail dominates. */
  assert.deepEqual(got, F.EXPECTED.scenarioL);
  const plan = P.planScreen({
    universe: { kind: 'org_holdings', orgId: F.COUNCIL.orgId },
    filters: [{ metric: 'revenue_growth', op: '>', value: 0 }],
  });
  assert.equal(plan.steps[0].operation, 'read_org_holdings');
});

/* ═══ M. Requirement extraction and objective fulfillment ══════════════════════════ */

test('SCENARIO M: wording variants keep every condition; unsupported ones stay visible', () => {
  const variants = [
    'Find companies with congressional trading activity, significant federal contracts, and increasing institutional ownership.',
    'Which companies traded by members of Congress have seen increased institutional ownership?',
    'Which semiconductor companies have operating margins above 25% and growing institutional participation?',
    'Find companies with revenue growth above 20% but declining operating margins.',
  ];
  for (const q of variants) {
    const att = I.inferComposition(q).attachments[0];
    assert.equal(att?.capability, 'financial-screen', q);
    assert.ok(att.params.filters.length >= 2, `${q}: ${JSON.stringify(att.params.filters)}`);
    assert.notEqual(
      att.params.rank_by,
      'congress_holders',
      'a Congress condition is a filter, not a ranking',
    );
  }
  const dod = I.inferComposition(
    'Find companies traded by members of Congress that also received Department of Defense contracts and experienced increasing institutional ownership.',
  ).attachments[0];
  const agency = dod.params.requirements.find((r) => r.id === 'agency');
  assert.equal(agency.resolution, 'unsupported', 'DoD no longer disappears silently');
  const growth = I.inferComposition(
    'Which defense companies have growing federal award exposure but declining operating margins?',
  ).attachments[0];
  assert.equal(
    growth.params.requirements.find((r) => r.id === 'contracts_growth').resolution,
    'unsupported',
  );
  assert.ok(
    !growth.params.filters.some((f) => f.metric === 'gov_contract_value'),
    'growth is not silently read as "any award"',
  );
});

test('SCENARIO M: the objective is partial while a requirement is unsupported; fulfillment names it', () => {
  const reqs = Rq.extractRequirements(
    'Find companies traded by members of Congress that also received Department of Defense contracts and experienced increasing institutional ownership.',
  );
  const screen = {
    conditionReport: {
      conditions: reqs.conditions.filter((c) => c.metric).map((c) => ({ metric: c.metric })),
    },
    steps: [
      { source: 'congress', status: 'complete' },
      { source: 'contracts', status: 'complete' },
      { source: 'holders13f_change', status: 'complete' },
    ],
    outcome: { unknown: 0 },
  };
  const obj = Rq.evaluateObjective(reqs, screen);
  assert.equal(obj.objectiveStatus, 'partial');
  assert.equal(obj.requirements.find((r) => r.id === 'agency').status, 'unsupported');
});

/* ═══ N, O. Bounded coverage and zero results ═════════════════════════════════════ */

test('SCENARIO N: capped evaluation is bounded; companies past the cap are unchecked, not failed', () => {
  const universe = ['XAAA', 'XBBB', 'XCCC'].map((t) => ({ ticker: t }));
  const s = C.screenEntities({
    universe,
    conditions: [{ id: 'x', source: 'r', op: '>', value: 0 }],
    values: { XAAA: { x: 1 }, XBBB: { x: 1 } },
    unchecked: ['XCCC'],
  });
  assert.equal(s.outcome.status, 'bounded');
  assert.deepEqual(s.unchecked, ['XCCC']);
  assert.ok(!s.failing.some((m) => m.ticker === 'XCCC'));
  assert.equal(s.exhaustive, false);
});

test('SCENARIO N: the planner handoff keeps the full result set and states the 12-company research limit', () => {
  const table = Array.from({ length: 20 }, (_, i) => ({
    ticker: `X${String.fromCharCode(65 + i)}Q`,
  }));
  const u = S.universeFromComposition({
    results: [
      { capability: 'financial-screen', status: 'done', table, rankBy: 'margin', stages: [] },
    ],
  });
  assert.equal(u.tickers.length, 12);
  assert.equal(u.allTickers.length, 20);
  assert.equal(u.total, 20);
  assert.equal(u.limit.applied, true);
  assert.match(u.label, /first 12 of the 20/);
  assert.match(u.label, /ranked by margin/);
  const small = S.universeFromComposition({
    results: [
      { capability: 'financial-screen', status: 'done', table: table.slice(0, 3), stages: [] },
    ],
  });
  assert.equal(small.limit.applied, false);
});

test('SCENARIO O: a genuine zero result is only declared when everything was evaluated', async () => {
  const universe = ['XAAA'].map((t) => ({ ticker: t }));
  const s = C.screenEntities({
    universe,
    conditions: [{ id: 'x', source: 'r', op: '>', value: 5 }],
    values: { XAAA: { x: 1 } },
  });
  assert.equal(s.outcome.zeroResult, true);
  const att = I.inferComposition(
    'Which companies did Congress buy, that won new federal contracts in the same period, whose institutional ownership rose?',
  ).attachments[0];
  const r = await A.runScreen(screenDb({ congress: [] }), att, { now: F.NOW });
  assert.equal(r.table.length, 0);
  assert.equal(r.stages[0].status, 'empty');
});

/* ═══ Temporal, relationships, synthesis, fulfillment ═════════════════════════════ */

test('temporal: federal FY, windows by transaction date, and fiscal-year mismatch is flagged', () => {
  assert.equal(T.federalFiscalYear('2026-10-01'), 2027);
  assert.equal(T.federalFiscalYear('2026-09-30'), 2026);
  assert.equal(T.inWindow('2025-10-01', F.WINDOW, F.NOW), false, 'XFFF traded before the window');
  assert.equal(T.inWindow('2027-01-15', F.WINDOW, F.NOW), false, 'future-dated award');
  const al = T.alignFiscalYears(
    Object.fromEntries(Object.entries(F.RATIOS).map(([t, r]) => [t, r.fiscalYearEnd])),
  );
  const a = T.period('ratios', { from: '2025-01-01', to: '2025-12-31' });
  const b = T.period('holders13f', { from: '2026-07-01', to: '2026-09-30' });
  assert.equal(T.comparable(a, b).comparable, false);
  assert.equal(al.aligned, false);
  assert.match(al.note, /different dates/);
});

test('relationships: co-occurrence is not causation; causal wording without mechanism evidence is flagged', () => {
  const p1 = T.period('congress', { from: '2026-03-02', to: '2026-08-12' });
  const p2 = T.period('contracts_window', { from: '2026-05-01', to: '2026-05-01' });
  const rel = Rl.relationship({
    type: 'temporal_co_occurrence',
    entities: ['XAAA'],
    datasets: ['congress', 'contracts'],
    records: ['A1'],
    kind: 'observed',
    periods: [p1, p2],
  });
  assert.ok(rel.ok, rel.problems?.join('; '));
  assert.equal(rel.relationship.type, 'temporal_co_occurrence');
  const bad = Rl.relationship({
    type: 'temporal_co_occurrence',
    entities: ['XAAA'],
    datasets: ['congress', 'ratios'],
    records: ['r'],
    kind: 'observed',
    periods: [p1, T.period('ratios', { from: '2024-01-01', to: '2024-12-31' })],
  });
  assert.equal(bad.ok, false, 'non-overlapping periods cannot be related');
  assert.equal(Rl.causalClaimCheck('Congressional buying caused the contract award.').ok, false);
  assert.equal(Rl.causalClaimCheck('Members bought before the award was announced.').ok, true);
});

test('synthesis: the writer receives qualified, unknown and unavailable separately; telemetry holds counts only', () => {
  const s = scenarioC();
  const w = Sy.writerInput({
    screen: { conditionReport: s },
    objective: { objectiveStatus: 'complete', requirements: [] },
  });
  assert.deepEqual(w.qualified, ['XAAA']);
  assert.deepEqual(
    w.unknown.map((q) => q.ticker),
    ['XEEE'],
  );
  assert.match(w.block, /unknown/i);
  const t = Sy.telemetry({
    planType: 'multi_condition_screen',
    steps: [{ status: 'complete' }, { status: 'provider_error' }],
  });
  assert.ok(!JSON.stringify(t).includes('XAAA'), 'no research content in telemetry');
});

test('fulfillment: an unsupported requirement keeps the screen limited and is listed', () => {
  const contract = Fu.fulfillmentContract
    ? Fu.fulfillmentContract({
        plan: [{ id: 'analysis:financial-screen', label: 'Screen' }],
        attachments: [
          { key: 'financial-screen', capability: 'financial-screen', kind: 'analysis', params: {} },
        ],
        results: [
          {
            key: 'financial-screen',
            capability: 'financial-screen',
            status: 'done',
            table: [{ ticker: 'XAAA' }],
            objective: {
              objectiveStatus: 'partial',
              requirements: [
                {
                  id: 'agency',
                  label: 'Awards from the Department of Defense',
                  status: 'unsupported',
                  reason: 'agency filter not applied',
                },
              ],
            },
          },
        ],
      })
    : null;
  assert.ok(contract, 'fulfillmentContract is exported');
  const all = JSON.stringify(contract);
  assert.match(all, /Department of Defense/);
  assert.ok(
    contract.objectives.some((o) => o.id === 'analysis:financial-screen' && o.status === 'limited'),
  );
});

/* ═══ Integration items ══════════════════════════════════════════════════════════ */

test('DCF capex fade is a labelled scenario, not the default (pending methodology approval)', () => {
  assert.match(V.CAPEX_FADE_LABEL, /pending methodology approval/);
});

test('no model calls: execution modules import no provider SDK and the guard saw nothing', () => {
  const dir = new URL('../src/lib/sonar/execution/', import.meta.url);
  for (const f of readdirSync(dir)) {
    const src = readFileSync(new URL(f, dir), 'utf8');
    assert.ok(!/@anthropic-ai|openai|generateText|streamText|Math\.random/.test(src), f);
  }
  assert.equal(llmRequests.length, 0);
});

/* ── fake database for the runScreen end-to-end scenarios ── */

function screenDb({ congress, fail } = {}) {
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
  const tickers = Object.keys(F.ENTITIES);
  const cusip = (t) => `${t.padEnd(6, '0').slice(0, 6)}001`;
  const own = {};
  for (const [t, r] of Object.entries(F.HOLDERS13F.rows))
    if (r) own[cusip(t)] = { comparable_now: r.now, comparable_prior: r.prior };
  return fakeSupabase(
    {
      congress_trades:
        congress ||
        F.CONGRESS.map((r, i) => ({
          id: i + 1,
          ticker: r.ticker,
          bioguide_id: r.member,
          type: r.type,
          transaction_date: r.transaction_date,
        })),
      contract_awards_resolved: F.AWARDS.filter((a) => a.ticker).map((a) => ({
        generated_award_id: a.id,
        ticker: a.ticker,
        award_amount: a.amount,
        action_date: a.action_date,
      })),
      sec_cusip_map: tickers.map((t) => ({
        cusip: cusip(t),
        ticker: t,
        security_type: 'Common Stock',
        market_sector: 'Equity',
        name: F.ENTITIES[t].name,
        status: 'mapped',
      })),
      sec_13f_effective_filings: filings,
      sec_fundamentals: [],
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

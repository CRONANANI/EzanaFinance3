/**
 * Ezana API, Alpha Intelligence: statistics, point-in-time rules, the
 * procurement acceleration signal, the signal registry and registry entries.
 * Run: node --no-warnings --test scripts/check-ezana-api-alpha.mjs (part of npm run test:api).
 * Self-contained node:test file, no network. Synthetic data only, from a seeded
 * generator, so results are reproducible.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./mobile-node-loader.mjs', import.meta.url);

const reg = await import('../src/lib/ezana-api/registry.js');
const { TIERS, ALL_SCOPES } = await import('../src/lib/ezana-api/tiers.js');
const { HANDLERS } = await import('../src/lib/ezana-api/handlers.js');
const { buildOpenApi } = await import('../src/lib/ezana-api/openapi.js');
const st = await import('../src/lib/ezana-api/alpha/stats.js');
const sig = await import('../src/lib/ezana-api/alpha/signals.js');
const al = await import('../src/lib/ezana-api/insights/alpha.js');

/* Seeded normal generator (LCG + Box-Muller): deterministic test data. */
function rng(seed) {
  let s = seed >>> 0;
  const u = () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return (s + 0.5) / 4294967296;
  };
  return () => Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u());
}

/* ── registry ──────────────────────────────────────────────────────── */

test('alpha: routes are live, scoped alpha, typed and documented', () => {
  const mine = reg.ENDPOINTS.filter((e) => e.dimension === 'alpha');
  assert.deepEqual(mine.map((e) => e.id).sort(), [
    'alpha.procurement_acceleration',
    'alpha.signal',
    'alpha.signals',
  ]);
  for (const e of mine) {
    assert.equal(e.status, 'live', e.id);
    assert.equal(e.scope, 'alpha', e.id);
    assert.equal(e.kind, 'insight', e.id);
    assert.ok(e.method && e.method.length > 40, `${e.id} states its method`);
    assert.equal(typeof HANDLERS[e.id], 'function', `${e.id} handler`);
  }
  assert.ok(ALL_SCOPES.includes('alpha'));
  assert.ok(TIERS.quant_firm.scopes.includes('alpha'));
  assert.ok(TIERS.institution.scopes.includes('alpha'));
  assert.ok(!TIERS.developer.scopes.includes('alpha'));
  assert.ok(!TIERS.trader.scopes.includes('alpha'));
});

test('alpha: every routed signal has a registry entry and every route a signal', () => {
  const routed = sig.SIGNALS.filter((s) => s.route);
  for (const s of routed) {
    const m = reg.matchEndpoint(s.route);
    assert.ok(m, `${s.id} route resolves`);
    assert.equal(m.endpoint.id, s.route_id);
  }
  assert.equal(
    reg.matchEndpoint('/v1/alpha/signals/procurement_acceleration').endpoint.id,
    'alpha.signal',
  );
});

test('alpha: OpenAPI lists the alpha paths with their sort and direction enums', () => {
  const doc = buildOpenApi();
  const op = doc.paths['/v1/alpha/procurement-acceleration']?.get;
  assert.ok(op, 'procurement path');
  const p = Object.fromEntries(op.parameters.map((x) => [x.name, x.schema]));
  assert.deepEqual(p.sort.enum, ['robust_z', 'growth', 'excess_growth', 'amount_change']);
  assert.deepEqual(p.direction.enum, ['up', 'down']);
  assert.ok(doc.paths['/v1/alpha/signals']?.get);
  assert.ok(doc.paths['/v1/alpha/signals/{signal_id}']?.get);
});

/* ── statistics ────────────────────────────────────────────────────── */

test('stats: median, MAD and robust z on known values', () => {
  assert.equal(st.median([3, 1, 2]), 2);
  assert.equal(st.median([4, 1, 2, 3]), 2.5);
  assert.equal(st.median([]), null);
  assert.equal(st.median([null, 'x', 5]), 5);
  assert.equal(st.mad([1, 2, 3, 4, 100]), 1);
  /* An outlier in the baseline does not move the robust z. */
  const z = st.robustZ(10, [1, 2, 3, 4, 1000]);
  assert.ok(Math.abs(z - (10 - 3) / (1.4826 * 1)) < 1e-9);
  assert.equal(st.robustZ(5, [2, 2, 2, 2]), null, 'flat baseline has no spread');
  assert.equal(st.robustZ(5, [1, 2]), null, 'too few points');
  assert.equal(st.robustZ(null, [1, 2, 3]), null);
});

test('stats: robust z matches a standard z on normal data', () => {
  const g = rng(7);
  const xs = Array.from({ length: 20000 }, () => g());
  const scale = 1.4826 * st.mad(xs);
  assert.ok(Math.abs(scale - 1) < 0.03, `scaled MAD ${scale}`);
});

test('stats: percentile rank, arc growth and HHI', () => {
  assert.equal(st.percentileRank(3, [1, 2, 3, 4]), 62.5);
  assert.equal(st.percentileRank(0, [1, 2]), 0);
  assert.equal(st.percentileRank(9, [1, 2]), 100);
  assert.equal(st.percentileRank(1, []), null);
  assert.equal(st.arcGrowth(150, 50), 1);
  assert.equal(st.arcGrowth(100, 0), 2, 'entry');
  assert.equal(st.arcGrowth(0, 100), -2, 'exit');
  assert.equal(st.arcGrowth(0, 0), null);
  assert.equal(st.arcGrowth(-50, 50), -2, 'bounded');
  assert.equal(st.hhi([1, 1, 1, 1]), 0.25);
  assert.equal(st.hhi([5]), 1);
  assert.equal(st.hhi([0, -3]), null);
  assert.equal(st.round(null), null);
});

test('stats: robust z alone has a fat null tail on short baselines (why we calibrate)', () => {
  const g = rng(42);
  let extreme = 0;
  let found = 0;
  const runs = 4000;
  for (let i = 0; i < runs; i += 1) {
    const base = Array.from({ length: 8 }, () => 100 + 10 * g());
    if (Math.abs(st.robustZ(100 + 10 * g(), base)) > 3) extreme += 1;
    if (st.robustZ(100 + 10 * g() + 80, base) > 3) found += 1;
  }
  /* Far above the 0.27% a standard normal gives: a raw |z| > 3 is not rare. */
  assert.ok(extreme / runs > 0.04 && extreme / runs < 0.1, `null exceedance ${extreme / runs}`);
  assert.ok(found / runs > 0.95, `power ${found / runs}`);
});

test('stats: null exceedance is calibrated on fresh noise for every baseline length', () => {
  for (const n of [5, 8]) {
    const g = rng(900 + n); /* a different seed from the simulated null */
    let hit05 = 0;
    let hit01 = 0;
    const runs = 6000;
    for (let i = 0; i < runs; i += 1) {
      const base = Array.from({ length: n }, g);
      const z = st.robustZ(g(), base);
      if (z == null) continue;
      const p = st.nullExceedance(z, n);
      if (p <= 0.05) hit05 += 1;
      if (p <= 0.01) hit01 += 1;
    }
    assert.ok(Math.abs(hit05 / runs - 0.05) < 0.012, `n=${n} p<=0.05 rate ${hit05 / runs}`);
    assert.ok(Math.abs(hit01 / runs - 0.01) < 0.006, `n=${n} p<=0.01 rate ${hit01 / runs}`);
  }
  assert.ok(st.nullExceedance(40, 8) < 0.001, 'a huge move has a tiny tail');
  assert.equal(st.nullExceedance(1, 2), null);
  assert.equal(st.nullExceedance(st.robustZ(5, [1, 2, 3]), 3) <= 1, true);
});

test('stats: rank p is exact under exchangeability; BH q-values', () => {
  assert.equal(st.rankPValue(10, [1, 2, 3, 4]), 0.2, 'above all four: 1/5');
  assert.equal(st.rankPValue(0, [1, 2, 3, 4], 'down'), 0.2);
  assert.equal(st.rankPValue(2.5, [1, 2, 3, 4]), 0.6);
  const g = rng(5);
  let low = 0;
  const runs = 9000;
  for (let i = 0; i < runs; i += 1) {
    const base = Array.from({ length: 8 }, g);
    if (st.rankPValue(g(), base) <= 1 / 9) low += 1;
  }
  assert.ok(Math.abs(low / runs - 1 / 9) < 0.012, `rank p uniform ${low / runs}`);
  const q = st.benjaminiHochberg([0.01, 0.04, 0.03, null, 0.2]);
  assert.deepEqual(
    q.map((v) => (v == null ? null : Math.round(v * 1e6) / 1e6)),
    [0.04, 0.053333, 0.053333, null, 0.2],
  );
  /* On pure noise BH should rarely flag anything at q <= 0.05. */
  const ps = Array.from({ length: 300 }, () => {
    const base = Array.from({ length: 8 }, g);
    return st.nullExceedance(st.robustZ(g(), base), 8);
  });
  const flagged = st.benjaminiHochberg(ps).filter((v) => v != null && v <= 0.05).length;
  assert.ok(flagged <= 3, `false discoveries on noise ${flagged}`);
});

/* ── point in time: complete fiscal years ──────────────────────────── */

const row = (ticker, fy, amount, agency = 'Department of Defense', awards = 10) => ({
  ticker,
  fiscal_year: fy,
  awarding_agency: agency,
  award_count: awards,
  total_amount: amount,
});

test('pit: a fiscal year is read only after its reporting window closes', () => {
  assert.equal(al.fiscalYearAvailable(2025), '2025-12-29');
  const rows = [2022, 2023, 2024, 2025].map((fy) => row('AAA', fy, 100));
  assert.deepEqual(al.completeFiscalYears(rows, '2025-12-28'), [2022, 2023, 2024]);
  assert.deepEqual(al.completeFiscalYears(rows, '2025-12-29'), [2022, 2023, 2024, 2025]);
});

test('pit: a year whose dataset total is still filling in is not complete', () => {
  const rows = [
    ...[2021, 2022, 2023, 2024].map((fy) => row('AAA', fy, 100)),
    row('AAA', 2025, 50) /* half reported */,
  ];
  assert.deepEqual(al.completeFiscalYears(rows, '2026-11-24'), [2021, 2022, 2023, 2024]);
});

/* ── procurement acceleration ──────────────────────────────────────── */

const YEARS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];
function synthPanel() {
  const g = rng(11);
  const rows = [];
  /* Twelve industrials with noisy flat histories, one of them surging. */
  for (let i = 0; i < 12; i += 1) {
    const t = `IND${i}`;
    for (const fy of YEARS) {
      let amt = 50e6 + 5e6 * g();
      if (t === 'IND0' && fy === 2025) amt = 140e6;
      if (t === 'IND1' && fy === 2025) amt = 5e6;
      rows.push(row(t, fy, amt * 0.7, 'Department of Defense'));
      rows.push(row(t, fy, amt * 0.3, 'NASA'));
    }
  }
  for (const fy of YEARS) rows.push(row('FLAT', fy, 20e6)); /* no spread */
  for (const fy of YEARS) rows.push(row('TINY', fy, 1e5 + 1e4 * g())); /* small base */
  for (const fy of [2023, 2024, 2025]) rows.push(row('NEWCO', fy, 30e6 + fy)); /* short */
  /* GAP has no FY2024 row: a real zero after first appearance. */
  for (const fy of YEARS.filter((y) => y !== 2024)) rows.push(row('GAP', fy, 10e6 + 1e6 * g()));
  return rows;
}
const sectors = new Map([
  ...Array.from({ length: 12 }, (_, i) => [`IND${i}`, 'Industrials']),
  ['GAP', 'Energy'],
]);
const complete = YEARS;

test('procurement: the planted surge leads, exclusions are counted', () => {
  const out = al.procurementAcceleration(synthPanel(), {
    fiscalYear: 2025,
    completeYears: complete,
    sectors,
  });
  assert.deepEqual(out.excluded, { short_history: 1, small_baseline: 1, flat_history: 1 });
  const up = al.orderProcurement(out.rows, { direction: 'up' });
  assert.equal(up[0].entity.ticker, 'IND0');
  assert.ok(up[0].value > 5, `surge z ${up[0].value}`);
  const down = al.orderProcurement(out.rows, { direction: 'down' });
  assert.equal(down[0].entity.ticker, 'IND1');
  for (const r of up) assert.ok(r.value > 0);
  for (const r of down) assert.ok(r.value < 0);
});

test('procurement: the output follows the shared signal contract', () => {
  const out = al.procurementAcceleration(synthPanel(), {
    fiscalYear: 2025,
    completeYears: complete,
    sectors,
  });
  const r = out.rows.find((x) => x.entity.ticker === 'IND0');
  for (const k of [
    'signal_id',
    'signal_version',
    'entity',
    'signal_type',
    'status',
    'as_of',
    'available_at',
    'method',
    'value',
    'unit',
    'baseline_value',
    'percentile',
    'sample_size',
    'metrics',
    'coverage',
    'statistical_validation',
    'limitations',
  ])
    assert.ok(k in r, `field ${k}`);
  assert.equal(r.signal_type, 'descriptive');
  assert.equal(r.unit, 'robust_z');
  assert.equal(r.as_of, '2025-09-30');
  assert.equal(r.available_at, '2025-12-29');
  assert.equal(r.sample_size, 8);
  assert.equal(r.statistical_validation.predictive, 'not_evaluated');
  assert.ok(r.statistical_validation.null_exceedance < 0.01, 'the planted surge is not noise');
  assert.ok(r.statistical_validation.q_value < 0.05);
  assert.equal(r.statistical_validation.rank_p, 0.1111, 'above all 8 prior years');
  assert.equal(r.statistical_validation.min_attainable_rank_p, 0.1111);
  assert.equal(r.metrics.sector_peers, 12);
  assert.ok(r.metrics.excess_arc_growth > 0);
  assert.equal(r.metrics.top_agency.agency, 'Department of Defense');
  assert.equal(r.metrics.top_agency.share, 0.7);
  assert.equal(r.metrics.drivers[0].agency, 'Department of Defense');
  assert.ok(Math.abs(r.metrics.agency_hhi - (0.49 + 0.09)) < 1e-9);
  assert.equal(r.metrics.history.length, 8);
  /* FY2024 was ordinary for IND0, so its prior-year z is small. */
  assert.ok(Math.abs(r.metrics.prior_year_robust_z) < 3);
  assert.equal(r.metrics.history[0].fiscal_year, 2017);
});

test('procurement: no leakage, the baseline never reads the evaluated or a later year', () => {
  const base = synthPanel();
  const a = al.procurementAcceleration(base, {
    fiscalYear: 2024,
    completeYears: complete,
    sectors,
  });
  /* Rewrite FY2025 entirely: FY2024's evaluation must not move. */
  const changed = base.map((r) =>
    r.fiscal_year === 2025 ? { ...r, total_amount: r.total_amount * 9 } : r,
  );
  const b = al.procurementAcceleration(changed, {
    fiscalYear: 2024,
    completeYears: complete,
    sectors,
  });
  const pick = (o) =>
    o.rows.map((r) => [r.entity.ticker, r.value, r.baseline_value, r.metrics.arc_growth]);
  assert.deepEqual(pick(a), pick(b));
  /* The baseline median ignores the evaluated year's own value. */
  const c = al.procurementAcceleration(
    base.map((r) =>
      r.fiscal_year === 2024 && r.ticker === 'IND3' ? { ...r, total_amount: 1e12 } : r,
    ),
    { fiscalYear: 2024, completeYears: complete, sectors },
  );
  const before = a.rows.find((r) => r.entity.ticker === 'IND3');
  const after = c.rows.find((r) => r.entity.ticker === 'IND3');
  assert.equal(before.baseline_value, after.baseline_value);
  assert.ok(after.value > before.value);
});

test('procurement: a level shift that persisted is visible in the prior-year z', () => {
  const rows = synthPanel().map((r) =>
    r.ticker === 'IND5' && r.fiscal_year >= 2024 ? { ...r, total_amount: r.total_amount * 4 } : r,
  );
  const out = al.procurementAcceleration(rows, {
    fiscalYear: 2025,
    completeYears: complete,
    sectors,
  });
  const r = out.rows.find((x) => x.entity.ticker === 'IND5');
  assert.ok(r.value > 5, 'FY2025 is far above the baseline');
  assert.ok(r.metrics.prior_year_robust_z > 5, 'and so was FY2024: an earlier, persisting shift');
  assert.ok(Math.abs(r.metrics.arc_growth) < 0.3, 'with little change this year');
});

test('procurement: unknowns are null, never zero, and say why', () => {
  const out = al.procurementAcceleration(synthPanel(), {
    fiscalYear: 2025,
    completeYears: complete,
    sectors,
  });
  const gap = out.rows.find((r) => r.entity.ticker === 'GAP');
  assert.ok(gap, 'GAP is evaluated');
  /* FY2024 is a real zero after first appearance, so growth is defined. */
  assert.equal(gap.metrics.prior_obligations_usd, 0);
  assert.equal(gap.metrics.arc_growth, 2);
  /* One Energy company: too few peers for a sector comparison. */
  assert.equal(gap.metrics.sector_median_arc_growth, null);
  assert.equal(gap.metrics.excess_arc_growth, null);
  assert.equal(gap.metrics.sector_percentile, null);
  assert.ok(gap.limitations.some((l) => /sector peers/.test(l)));
  /* An incomplete prior year: growth is null, not zero. */
  const noPrior = al.procurementAcceleration(synthPanel(), {
    fiscalYear: 2025,
    completeYears: YEARS.filter((y) => y !== 2024),
    sectors,
  });
  const r = noPrior.rows.find((x) => x.entity.ticker === 'IND2');
  assert.equal(r.metrics.prior_obligations_usd, null);
  assert.equal(r.metrics.arc_growth, null);
  assert.ok(r.limitations.some((l) => /prior fiscal year/.test(l)));
});

test('procurement: sorts by growth, excess growth and amount change', () => {
  const out = al.procurementAcceleration(synthPanel(), {
    fiscalYear: 2025,
    completeYears: complete,
    sectors,
  });
  for (const sort of ['growth', 'excess_growth', 'amount_change']) {
    const rows = al.orderProcurement(out.rows, { sort });
    const keys = rows.map((r) => al.PROCUREMENT_SORTS[sort](r)).filter((v) => v != null);
    for (let i = 1; i < keys.length; i += 1) assert.ok(keys[i - 1] >= keys[i], `${sort} ordered`);
  }
});

/* ── signal registry and readiness gates ───────────────────────────── */

/* Coverage as measured on 24 Nov 2026 (see docs/ezana-api/alpha-intelligence). */
const MEASURED = {
  as_of: '2026-11-24',
  institutional: {
    period: '2026-09-30',
    parsed_filers: 148,
    indexed_filings: 1575,
    comparable_filers: 29,
  },
  insider: { first_filed: '2026-09-30', last_filed: '2026-11-23', span_days: 54 },
  contracts: { complete_fiscal_years: [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025] },
  lobbying: { first_year: 2024, complete_years: 2 },
  patents: { rows: 0 },
  predictions: { first_snapshot: '2026-10-20', span_days: 35 },
};

test('signals: every signal is fully described and versioned', () => {
  const ids = new Set();
  for (const s of sig.SIGNALS) {
    assert.ok(!ids.has(s.id), `${s.id} unique`);
    ids.add(s.id);
    assert.match(s.version, /^\d+\.\d+\.\d+$/);
    assert.ok(sig.MATURITY.includes(s.maturity), `${s.id} maturity`);
    for (const k of ['name', 'hypothesis', 'measures', 'does_not_measure', 'model_family'])
      assert.ok(s[k] && s[k].length > 10, `${s.id} ${k}`);
    assert.ok(Array.isArray(s.dependencies) && s.dependencies.length, `${s.id} dependencies`);
    const view = sig.signalView(s, MEASURED);
    assert.ok(sig.READINESS[view.status], `${s.id} status ${view.status}`);
    assert.ok(!('route_id' in view) && view.gates.every((g) => typeof g.pass === 'boolean'));
  }
});

test('signals: measured coverage gives the honest status of each signal', () => {
  const status = Object.fromEntries(
    sig.SIGNALS.map((s) => [s.id, sig.evaluateReadiness(s, MEASURED).status]),
  );
  assert.deepEqual(status, {
    procurement_acceleration: 'live',
    institutional_divergence: 'blocked_ingestion',
    ownership_confirmation: 'blocked_ingestion',
    insider_behavior_anomaly: 'blocked_history',
    lobbying_procurement_leadlag: 'blocked_history',
    innovation_capital_divergence: 'blocked_ingestion',
    capital_crowding: 'blocked_ingestion',
    sector_rotation_pressure: 'blocked_ingestion',
    macro_regime_shift: 'blocked_point_in_time',
    geopolitical_exposure: 'blocked_mapping',
    event_probability_divergence: 'covered_by_existing',
  });
  const g = sig.evaluateReadiness(
    sig.SIGNALS.find((s) => s.id === 'institutional_divergence'),
    MEASURED,
  ).gates[0];
  assert.equal(g.pass, false);
  assert.match(g.observed, /9\.4% \(148 of 1575\)/);
});

test('signals: once 13F parsing completes, the 13F signals become ready to build', () => {
  const full = {
    ...MEASURED,
    institutional: { ...MEASURED.institutional, parsed_filers: 1500, comparable_filers: 1300 },
  };
  const s = sig.SIGNALS.find((x) => x.id === 'institutional_divergence');
  assert.equal(sig.evaluateReadiness(s, full).status, 'ready_descriptive');
  /* Confirmation also needs a full quarter of Form 4. */
  const c = sig.SIGNALS.find((x) => x.id === 'ownership_confirmation');
  assert.equal(sig.evaluateReadiness(c, full).status, 'blocked_history');
});

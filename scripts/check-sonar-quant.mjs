/**
 * Sonar quantitative engine: every function the skills and evaluation cases name exists in
 * QUANT, and each one matches a hand-computed expectation.
 *   node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-sonar-quant.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import * as Q from '../src/lib/sonar/analysts/quant.js';

const { QUANT, QUANT_NAMES } = Q;
const close = (a, b, tol = 1e-6, msg = '') =>
  assert.ok(a != null && Math.abs(a - b) <= tol, `${msg} expected ${b}, got ${a}`);
const hasWarning = (m, re) =>
  assert.ok(
    m.warnings.some((w) => re.test(w)),
    `no warning matching ${re}: ${JSON.stringify(m.warnings)}`,
  );
const monthly = (start, values) => {
  const [y0, m0] = start.split('-').map(Number);
  return values.map((value, i) => {
    const t = y0 * 12 + (m0 - 1) + i;
    return { period: `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`, value };
  });
};
const daily = (start, values) => {
  const d0 = Date.parse(`${start}T00:00:00Z`);
  return values.map((value, i) => ({
    period: new Date(d0 + i * 864e5).toISOString().slice(0, 10),
    value,
  }));
};

/* ------------------------------------------------------------------ name gathering */

/** Engine function names from every skill's Calculations section and every mustCompute. */
function gatherEngineNames() {
  const root = new URL('../sonar-skills/', import.meta.url);
  const fromSkills = new Set();
  const fromCases = new Set();
  for (const dir of readdirSync(root)) {
    const skill = new URL(`${dir}/SKILL.md`, root);
    if (existsSync(skill)) {
      const text = readFileSync(skill, 'utf8');
      const sec = /^## Calculations[^\n]*\n([\s\S]*?)(?=^## )/m.exec(text);
      assert.ok(sec, `${dir}: no Calculations section`);
      for (const line of sec[1].split('\n')) {
        const i = line.search(/\b(Engines?|Deterministic):/);
        if (i < 0) continue;
        const tail = line.slice(i);
        for (const m of tail.matchAll(/(?:Engines?|Deterministic):\s*([a-z][A-Za-z0-9]*)\b/g))
          fromSkills.add(m[1]);
        for (const m of tail.matchAll(/\b([a-z][A-Za-z0-9]*)\(/g)) fromSkills.add(m[1]);
      }
    }
    const cases = new URL(`${dir}/tests/evaluation-cases.json`, root);
    if (existsSync(cases)) {
      const j = JSON.parse(readFileSync(cases, 'utf8'));
      for (const c of Array.isArray(j) ? j : j.cases || [])
        for (const n of c.mustCompute || []) fromCases.add(n);
    }
  }
  return { fromSkills, fromCases };
}

test('every engine function named by a skill or an evaluation case exists in QUANT', () => {
  const { fromSkills, fromCases } = gatherEngineNames();
  assert.ok(fromSkills.size >= 40, `only ${fromSkills.size} names gathered from skills`);
  assert.ok(fromCases.size >= 40, `only ${fromCases.size} names gathered from cases`);
  const missing = [...new Set([...fromSkills, ...fromCases])].filter(
    (n) => typeof QUANT[n] !== 'function',
  );
  assert.deepEqual(missing, [], `missing engine functions: ${missing.join(', ')}`);
  for (const n of ['overround', 'effectiveNumberOfPositions', 'trackingError'])
    assert.equal(typeof QUANT[n], 'function');
  assert.deepEqual(QUANT_NAMES, Object.keys(QUANT).sort());
});

test('every function returns the citable metric shape and honours opts.id and opts.inputs', () => {
  const m = Q.pctChange(100, 110, { id: 'rev_yoy', inputs: ['S3', 'S4'] });
  for (const k of ['id', 'value', 'unit', 'method', 'inputs', 'periods', 'warnings'])
    assert.ok(k in m, `missing ${k}`);
  assert.equal(m.id, 'rev_yoy');
  assert.deepEqual(m.inputs, ['S3', 'S4']);
  assert.equal(Q.pctChange(1, 2).id, 'pctChange');
});

test('no em dash in any engine string', () => {
  const src = readFileSync(new URL('../src/lib/sonar/analysts/quant.js', import.meta.url), 'utf8');
  assert.ok(!src.includes(String.fromCharCode(0x2014)), 'quant.js contains an em dash');
});

/* ------------------------------------------------------------------ changes and currency */

test('pctChange: relative change, and percentage points for series already in percent', () => {
  const m = Q.pctChange({ period: '2025-09', value: 100 }, { period: '2026-09', value: 110 });
  close(m.value, 10);
  assert.deepEqual(m.periods, ['2025-09', '2026-09']);
  assert.equal(m.changePp, undefined);
  const r = Q.pctChange(
    { period: '2025-10', value: 50 },
    { period: '2026-10', value: 42.5 },
    { unit: '%' },
  );
  close(r.value, -15);
  close(r.changePp, -7.5);
  assert.equal(r.changePpUnit, 'percentage points');
  const z = Q.pctChange(0, 0.25, { unit: 'percent' });
  assert.equal(z.value, null);
  close(z.changePp, 0.25);
  hasWarning(z, /zero/);
});

test('bothConventionsFx reuses the currency conventions and inverts USD-per-local quotes', () => {
  const m = Q.bothConventionsFx(30, 40);
  close(m.value.dollarDearerPct, 100 / 3);
  close(m.value.valueLostPct, 25);
  const inv = Q.bothConventionsFx(0.5, 0.4, { quote: 'usd_per_local' });
  close(inv.value.dollarDearerPct, 25);
  close(inv.value.valueLostPct, 20);
  hasWarning(inv, /inverted/);
});

test('annualise: compound and value-lost bases', () => {
  close(Q.annualise(1, 12).value, (1.01 ** 12 - 1) * 100);
  close(Q.annualise(5, 4, { basis: 'valueLost' }).value, 18.549375);
});

test('yoyFromIndex: monthly, quarterly and two-number forms', () => {
  const s = monthly('2025-01', [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 110]);
  const m = Q.yoyFromIndex(s);
  close(m.value, 10);
  assert.deepEqual(m.periods, ['2025-01', '2026-01']);
  close(
    Q.yoyFromIndex([
      { period: '2025-Q2', value: 200 },
      { period: '2026-Q2', value: 210 },
    ]).value,
    5,
  );
  close(Q.yoyFromIndex(105, 100).value, 5);
});

test('momChange: consecutive months only', () => {
  close(
    Q.momChange([
      { period: '2026-08', value: 100 },
      { period: '2026-09', value: 102 },
    ]).value,
    2,
  );
  const gap = Q.momChange([
    { period: '2026-07', value: 100 },
    { period: '2026-09', value: 102 },
  ]);
  assert.equal(gap.value, null);
  hasWarning(gap, /not consecutive/);
});

test('cagr from annual endpoints', () => {
  const m = Q.cagr([
    { period: '2020', value: 100 },
    { period: '2021', value: 104 },
    { period: '2023', value: 133.1 },
  ]);
  close(m.value, 10, 1e-9);
  assert.equal(m.years, 3);
  hasWarning(
    Q.cagr([
      { period: '2022', value: 1 },
      { period: '2023', value: 2 },
    ]),
    /fewer than three/,
  );
});

/* ------------------------------------------------------------------ history and risk */

test('rollingVolatility: sample deviation and annualisation', () => {
  const m = Q.rollingVolatility([1, -1, 1, -1], 4, { returns: true });
  close(m.value, Math.sqrt(4 / 3));
  close(Q.rollingVolatility([1, -1, 1, -1], 4, { returns: true, periodsPerYear: 12 }).value, 4);
  const pct = Q.rollingVolatility(monthly('2026-01', [100, 110, 99]), 2);
  close(pct.value, stdevOf([10, -10]));
  assert.equal(pct.unit, '% per month');
});
function stdevOf(xs) {
  const m = xs.reduce((s, x) => s + x, 0) / xs.length;
  return Math.sqrt(xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1));
}

test('percentileVsHistory and its small-sample warning', () => {
  const vals = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 15];
  const m = Q.percentileVsHistory(monthly('2025-01', vals), 10);
  close(m.value, 75);
  assert.equal(m.n, 20);
  const small = Q.percentileVsHistory(monthly('2026-01', [1, 2, 3, 4, 5]), 10);
  assert.equal(small.value, null);
  hasWarning(small, /below the minimum of 12/);
});

test('zScore on the trailing window', () => {
  const m = Q.zScore(monthly('2026-01', [2, 4, 4, 4, 5, 5, 7, 9]), 10);
  close(m.value, 4 / Math.sqrt(32 / 7));
  hasWarning(m, /below the minimum of 12/);
});

test('drawdown: maximum drawdown with peak, trough and recovery', () => {
  const m = Q.drawdown(monthly('2026-01', [100, 120, 90, 130]));
  close(m.value, -25);
  assert.equal(m.peakPeriod, '2026-02');
  assert.equal(m.troughPeriod, '2026-03');
  assert.equal(m.recoveryPeriod, '2026-04');
});

/* ------------------------------------------------------------------ statistics */

test('correlation: aligned by period, reports n, warns below 12', () => {
  const x = monthly('2025-01', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  const y = monthly('2025-01', [3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25]);
  const m = Q.correlation(x, y, true);
  close(m.value, 1);
  assert.equal(m.n, 12);
  assert.ok(!m.warnings.some((w) => /below the minimum/.test(w)));
  const small = Q.correlation([1, 2, 3, 4, 5], [2, 1, 4, 3, 5]);
  assert.equal(small.n, 5);
  close(small.value, 0.8);
  hasWarning(small, /below the minimum of 12/);
  /* Misaligned periods: only the shared months are paired. */
  const a = monthly('2025-01', [1, 2, 3, 4]);
  const b = monthly('2025-02', [2, 4, 6, 8]);
  const al = Q.correlation(a, b);
  assert.equal(al.n, 3);
});

test('regressionOLS: coefficients, standard errors, R-squared, small-sample warning', () => {
  const m = Q.regressionOLS([2, 4, 5, 4, 5], [1, 2, 3, 4, 5]);
  const [b0, b1] = m.value.coefficients;
  close(b0.estimate, 2.2);
  close(b1.estimate, 0.6);
  close(b1.se, Math.sqrt(0.08));
  close(b0.se, Math.sqrt(0.88));
  close(b1.tStat, 0.6 / Math.sqrt(0.08));
  close(m.value.rSquared, 0.6);
  assert.equal(m.n, 5);
  hasWarning(m, /below the minimum of 20/);
  /* Rows form with two regressors: y = 1 + 2 x1 - x2 exactly. */
  const X = [
    [1, 0],
    [2, 1],
    [3, 1],
    [4, 3],
    [5, 2],
    [6, 5],
  ];
  const y = X.map(([a, b]) => 1 + 2 * a - b);
  const r = Q.regressionOLS(y, X);
  close(r.value.coefficients[1].estimate, 2);
  close(r.value.coefficients[2].estimate, -1);
});

test('eventStudy: market-adjusted CAR, and asOf refuses look-ahead', () => {
  const n = 30;
  const bench = daily(
    '2026-01-01',
    Array.from({ length: n }, (_, i) => (i % 2 ? 0.1 : -0.1)),
  );
  const asset = bench.map((p) => ({ ...p }));
  asset[19].value += 5; // 2026-01-20
  asset[20].value += 1;
  const m = Q.eventStudy(asset, ['2026-01-20'], [-1, 1], { benchmark: bench, asOf: '2026-02-15' });
  close(m.value.caar, 6, 1e-9);
  assert.equal(m.value.nEvents, 1);
  hasWarning(m, /below the minimum of 10/);
  const look = Q.eventStudy(asset, ['2026-01-20'], [-1, 1], {
    benchmark: bench,
    asOf: '2026-01-25',
  });
  assert.equal(look.value, null);
  assert.equal(look.refused, true);
  hasWarning(look, /look-ahead refused/);
  const released = asset.map((p) => ({ ...p, released: p.period }));
  released[3] = { ...released[3], released: '2026-03-01' };
  const rel = Q.eventStudy(released, ['2026-01-20'], [-1, 1], {
    benchmark: bench,
    asOf: '2026-02-15',
  });
  assert.equal(rel.value, null);
  hasWarning(rel, /look-ahead/);
  const noAsOf = Q.eventStudy(asset, ['2026-01-20'], [-1, 1], { benchmark: bench });
  assert.equal(noAsOf.value, null);
  hasWarning(noAsOf, /asOf is required/);
});

/* ------------------------------------------------------------------ time alignment */

test('alignPeriods never forward-fills and reports every mismatch', () => {
  const a = [
    { period: '2026-01', value: 1 },
    { period: '2026-02', value: 2 },
    { period: '2026-04', value: 4 },
    { period: '2026-05', value: 5 },
    { period: '2026-06', value: 6 },
  ];
  const b = monthly('2026-01', [10, 20, 30, 40, 50]);
  const m = Q.alignPeriods([
    { name: 'fx', series: a },
    { name: 'cpi', series: b },
  ]);
  assert.deepEqual(
    m.value.rows.map((r) => r.period),
    ['2026-01', '2026-02', '2026-04', '2026-05'],
  );
  assert.ok(!m.value.rows.some((r) => r.period === '2026-03' || r.period === '2026-06'));
  assert.equal(m.value.latestCommon, '2026-05');
  assert.ok(m.notes.some((n) => /fx has no observation for 2026-03/.test(n)));
  assert.ok(m.notes.some((n) => /latest observations differ/.test(n)));
  /* A coarser series is never expanded. */
  const annual = [{ period: '2025', value: 7 }];
  const mixed = Q.alignPeriods(
    [
      { name: 'monthly', series: b },
      { name: 'annual', series: annual },
    ],
    { to: 'monthly' },
  );
  assert.equal(mixed.value.rows.length, 0);
  assert.ok(mixed.notes.some((n) => /not expanded/.test(n)));
  /* Finer series are collapsed to the coarsest frequency (last observation). */
  const d = [
    { period: '2026-01-15', value: 1 },
    { period: '2026-01-31', value: 2 },
    { period: '2026-02-27', value: 3 },
  ];
  const c = Q.alignPeriods([d, monthly('2026-01', [5, 6])]);
  assert.equal(c.value.frequency, 'monthly');
  assert.deepEqual(c.value.rows, [
    { period: '2026-01', values: [2, 5] },
    { period: '2026-02', values: [3, 6] },
  ]);
  assert.ok(c.notes.some((n) => /collapsed from daily to monthly/.test(n)));
  const ratio = Q.alignPeriods([monthly('2026-01', [10]), monthly('2026-01', [40])], {
    ratio: [0, 1],
  });
  close(ratio.value.ratio[0].value, 0.25);
});

/* ------------------------------------------------------------------ macro and sovereign */

test('realRateExPost in percentage points, flags period mismatch', () => {
  const m = Q.realRateExPost({ period: '2026-09', value: 45 }, { period: '2026-08', value: 33.3 });
  close(m.value, 11.7, 1e-9);
  assert.equal(m.unit, 'percentage points');
  hasWarning(m, /periods differ/);
});

test('reserveCoverMonths from a monthly figure, a series and annual imports', () => {
  close(Q.reserveCoverMonths(60e9, 10e9).value, 6);
  close(Q.reserveCoverMonths(60e9, monthly('2025-10', Array(12).fill(5e9))).value, 12);
  close(Q.reserveCoverMonths(60e9, 120e9, { importsFrequency: 'annual' }).value, 6);
  assert.equal(Q.reserveCoverMonths(20e9, 10e9).belowWeakLine, true);
});

test('shortTermDebtCover derives the amount from the IDS share times total, same year only', () => {
  const m = Q.shortTermDebtCover(
    { period: '2024', value: 50e9 },
    {
      shortTermSharePct: { period: '2024', value: 20 },
      totalExternalDebt: { period: '2024', value: 200e9 },
    },
  );
  close(m.shortTermDebt, 40e9);
  close(m.value, 1.25);
  assert.equal(m.belowOne, false);
  const bad = Q.shortTermDebtCover(50e9, {
    shortTermSharePct: { period: '2023', value: 20 },
    totalExternalDebt: { period: '2024', value: 200e9 },
  });
  assert.equal(bad.value, null);
  hasWarning(bad, /not the same year/);
  close(Q.shortTermDebtCover(30e9, 40e9).value, 0.75);
});

test('debtDynamics is a labelled scenario', () => {
  const m = Q.debtDynamics(60, 5, 3, 1, { years: 2 });
  close(m.value, (2 / 103) * 60 - 1);
  close(m.debtStabilisingPrimaryBalance, (2 / 103) * 60);
  assert.equal(m.path.length, 2);
  assert.equal(m.scenario, true);
  hasWarning(m, /scenario/);
});

/* ------------------------------------------------------------------ valuation */

test('dcf: value, terminal share, sensitivity grid and solve mode', () => {
  const m = Q.dcf([100, 100, 100], 10, 2);
  const pvE = 100 / 1.1 + 100 / 1.21 + 100 / 1.331;
  const pvT = 102 / 0.08 / 1.331;
  close(m.value.pvExplicit, pvE);
  close(m.value.pvTerminal, pvT);
  close(m.value.enterpriseValue, pvE + pvT);
  close(m.value.terminalSharePct, (pvT / (pvE + pvT)) * 100);
  assert.equal(m.value.grid.cells.length, 5);
  assert.equal(m.value.grid.cells[0].length, 3);
  close(m.value.grid.cells[2][1], pvE + pvT);
  hasWarning(m, /terminal value is/);
  assert.equal(Q.dcf([100], 3, 3).value, null);
  const fcf = [1, 2, 3, 4, 5].map((t) => 100 * 1.05 ** t);
  const target = Q.dcf(fcf, 9, 2).value.enterpriseValue;
  const s = Q.dcf(null, 9, 2, { solve: { target, baseFcf: 100, years: 5 } });
  close(s.value.impliedGrowthPct, 5, 1e-6);
});

test('wacc with CAPM cost of equity and labelled inputs', () => {
  const m = Q.wacc({
    equityValue: 600,
    debtValue: 400,
    riskFreePct: 4,
    beta: 1.2,
    equityRiskPremiumPct: 5,
    costOfDebtPct: 6,
    taxRatePct: 25,
  });
  close(m.value, 7.8);
  close(m.components.costOfEquityPct, 10);
  hasWarning(m, /no label/);
  const L = (value) => ({ value, label: 'assumption' });
  const l = Q.wacc({
    equityValue: L(600),
    debtValue: L(400),
    costOfEquityPct: L(10),
    costOfDebtPct: L(6),
    taxRatePct: L(25),
  });
  close(l.value, 7.8);
  assert.deepEqual(l.warnings, []);
});

test('evToEquity bridge and per-share value', () => {
  const m = Q.evToEquity(1000, 200, 50, 10, { dilutedShares: 100, sharesDate: '2026-09-30' });
  close(m.value, 740);
  close(m.perShare, 7.4);
  close(Q.evToEquity(1000, { debt: 300, cash: 100 }).value, 800);
});

test('multiples: medians and quartiles, non-positive denominators excluded', () => {
  const peers = [2, 4, 6, 8].map((k, i) => ({
    name: `P${i}`,
    ev: k * 100,
    marketCap: 100,
    revenue: 100,
    netIncome: i === 0 ? -5 : 10,
  }));
  const m = Q.multiples(peers);
  const s = m.value.summary.evToRevenue;
  close(s.median, 5);
  close(s.q1, 3.5);
  close(s.q3, 6.5);
  assert.equal(m.value.summary.priceToEarnings.n, 3);
  hasWarning(m, /priceToEarnings: 1 peer/);
  hasWarning(m, /below the minimum of 5/);
  const f = Q.multiples(
    [
      { name: 'A', revenue: 100, grossProfit: 40 },
      { name: 'B', revenue: 200, grossProfit: 100 },
    ],
    { mode: 'fundamentals' },
  );
  close(f.value.summary.grossMarginPct.median, 45);
  assert.equal(f.value.summary.evToRevenue, undefined);
});

/* ------------------------------------------------------------------ company fundamentals */

test('marginDecomposition in percentage points', () => {
  const m = Q.marginDecomposition({
    prior: {
      period: '2025-Q3',
      revenue: 100,
      gross_profit: 40,
      operating_income: 10,
      net_income: 5,
    },
    current: {
      period: '2026-Q3',
      revenue: 120,
      grossProfit: 54,
      operatingIncome: 18,
      netIncome: 12,
    },
  });
  close(m.value.current.gross, 45);
  close(m.value.changePp.gross, 5);
  close(m.value.changePp.operating, 5);
  close(m.value.changePp.opexIntensity, 0);
  close(m.value.changePp.net, 5);
  assert.deepEqual(m.periods, ['2025-Q3', '2026-Q3']);
});

test('cashConversion ratios; not meaningful on negative earnings', () => {
  const m = Q.cashConversion({
    operating_cash_flow: 150,
    net_income: 100,
    capex: -50,
    revenue: 1000,
  });
  close(m.value.ocfToNetIncome, 1.5);
  close(m.value.fcfToNetIncome, 1);
  close(m.value.capexToRevenuePct, 5);
  close(m.value.capexToOcfPct, 100 / 3);
  const neg = Q.cashConversion({
    operatingCashFlow: 150,
    netIncome: -10,
    capex: 50,
    revenue: 1000,
  });
  assert.equal(neg.value.ocfToNetIncome, null);
  hasWarning(neg, /not meaningful/);
});

/* ------------------------------------------------------------------ concentration */

test('herfindahl on both scales and concentrationTopN', () => {
  const h = Q.herfindahl([50, 30, 20]);
  close(h.value, 0.38);
  close(h.hhiPoints, 3800);
  close(Q.herfindahl([0.5, 0.3, 0.2], { scale: 'points' }).value, 3800);
  const c = Q.concentrationTopN(
    [
      { name: 'DoD', value: 50 },
      { name: 'NASA', value: 20 },
      { name: 'DHS', value: 30 },
    ],
    2,
  );
  close(c.value, 80);
  assert.deepEqual(
    c.top.map((t) => t.name),
    ['DoD', 'DHS'],
  );
  hasWarning(Q.concentrationTopN([1, 2], 3), /only 2/);
});

/* ------------------------------------------------------------------ ownership */

test('positionChange13F compares only managers filing both quarters', () => {
  const q0 = [
    { cik: 'A', shares: 100 },
    { cik: 'B', shares: 200 },
    { cik: 'C', shares: 50 },
    { cik: 'E', shares: 10 },
  ];
  const q1 = [
    { cik: 'A', shares: 150 },
    { cik: 'D', shares: 70 },
    { cik: 'E', shares: 10 },
    { cik: 'F', shares: 30 },
  ];
  const m = Q.positionChange13F(q0, q1, {
    filers0: ['A', 'B', 'C', 'E', 'F'],
    filers1: ['A', 'B', 'D', 'E', 'F'],
  });
  assert.deepEqual(m.value.counts, { new: 1, add: 1, cut: 0, exit: 1, unchanged: 1 });
  assert.equal(m.value.managersCompared, 4);
  assert.equal(m.value.netShareChange, 50 - 200 + 30);
  const noFilers = Q.positionChange13F(q0, q1);
  assert.deepEqual(noFilers.value.counts, { new: 0, add: 1, cut: 0, exit: 0, unchanged: 1 });
  hasWarning(noFilers, /cannot be identified/);
});

test('dedupeHoldings: restatements replace, new-holdings amendments add, materialised wins', () => {
  const rows = [
    {
      cik: '1',
      period: '2026-06-30',
      cusip: 'X',
      shares: 100,
      accession: 'a1',
      filedAt: '2026-08-01',
      source: 'raw',
    },
    {
      cik: '1',
      period: '2026-06-30',
      cusip: 'Y',
      shares: 50,
      accession: 'a1',
      filedAt: '2026-08-01',
      source: 'raw',
    },
    {
      cik: '1',
      period: '2026-06-30',
      cusip: 'X',
      shares: 110,
      accession: 'a2',
      filedAt: '2026-08-20',
      source: 'raw',
      amendmentType: 'RESTATEMENT',
    },
    {
      cik: '1',
      period: '2026-06-30',
      cusip: 'Z',
      shares: 10,
      accession: 'a3',
      filedAt: '2026-09-01',
      source: 'raw',
      amendmentType: 'NEW HOLDINGS',
    },
    {
      cik: '1',
      period: '2026-06-30',
      cusip: 'Z',
      shares: 10,
      accession: 'a3',
      filedAt: '2026-09-01',
      source: 'raw',
      amendmentType: 'NEW HOLDINGS',
    },
    { cik: '2', period: '2026-06-30', cusip: 'X', shares: 5, source: 'titans_13f_positions' },
    {
      cik: '2',
      period: '2026-06-30',
      cusip: 'X',
      shares: 5,
      accession: 'b1',
      filedAt: '2026-08-01',
      source: 'raw',
    },
  ];
  const m = Q.dedupeHoldings(rows);
  const got = m.value.rows.map((r) => `${r.cik}:${r.cusip}:${r.shares}`).sort();
  assert.deepEqual(got, ['1:X:110', '1:Z:10', '2:X:5']);
  assert.equal(m.value.duplicatesRemoved, 4);
  assert.equal(m.value.rawRowsUsed, 2);
});

/* ------------------------------------------------------------------ contracts and lobbying */

test('contractObligationsByFY: federal fiscal years and completeness', () => {
  const rows = [
    { action_date: '2024-10-15', award_amount: 100 },
    { action_date: '2025-03-01', award_amount: 50 },
    { action_date: '2025-10-02', award_amount: 80 },
    { fiscal_year: 2027, award_amount: 20 },
  ];
  const m = Q.contractObligationsByFY(rows, { now: '2026-11-06' });
  const by = Object.fromEntries(m.value.byYear.map((y) => [y.period, y]));
  assert.equal(by.FY2025.total, 150);
  assert.equal(by.FY2025.complete, true);
  assert.equal(by.FY2026.complete, true);
  assert.equal(by.FY2027.complete, false);
  assert.equal(m.value.latestComplete, 'FY2026');
  const dod = Q.contractObligationsByFY(
    rows.map((r) => ({ ...r, awarding_agency: 'Department of Defense' })),
    { now: '2026-11-06' },
  );
  assert.equal(dod.value.byYear.find((y) => y.period === 'FY2026').complete, false);
  assert.equal(dod.value.latestComplete, 'FY2025');
  hasWarning(m, /largest award/);
});

test('awardCeilingVsObligated per award and in total', () => {
  const m = Q.awardCeilingVsObligated([
    {
      generated_award_id: 'a',
      base_and_all_options: 1000,
      base_exercised_options: 600,
      total_obligation: 400,
    },
    {
      generated_award_id: 'b',
      base_and_all_options: 500,
      base_exercised_options: 500,
      total_obligation: 250,
    },
    { generated_award_id: 'c', total_obligation: 90 },
  ]);
  assert.equal(m.value.totals.ceiling, 1500);
  assert.equal(m.value.totals.unobligatedCeiling, 850);
  close(m.value.totals.obligatedSharePct, (650 / 1500) * 100);
  assert.equal(m.value.awards[0].unobligatedCeiling, 600);
  hasWarning(m, /without a ceiling/);
});

test('lobbyingSpendByQuarter: self-file rule, registrations, amendments, completeness', () => {
  const base = { filing_year: 2026, client_name: 'Acme Corp' };
  const rows = [
    {
      ...base,
      filing_period: 'first_quarter',
      filing_type: 'Q1',
      registrant_name: 'Acme Corporation',
      amount: 100000,
    },
    {
      ...base,
      filing_period: 'first_quarter',
      filing_type: 'Q1',
      registrant_name: 'K Street LLC',
      amount: 50000,
    },
    {
      ...base,
      filing_period: 'second_quarter',
      filing_type: 'Q2',
      registrant_name: 'K Street LLC',
      amount: 30000,
      dt_posted: '2026-07-10',
    },
    {
      ...base,
      filing_period: 'second_quarter',
      filing_type: 'Q2A',
      registrant_name: 'K Street LLC',
      amount: 40000,
      dt_posted: '2026-08-01',
    },
    {
      ...base,
      filing_period: 'second_quarter',
      filing_type: 'Q2',
      registrant_name: 'Hill Partners',
      amount: 20000,
    },
    {
      ...base,
      filing_period: 'third_quarter',
      filing_type: 'RR',
      registrant_name: 'New Firm',
      amount: 0,
    },
    {
      ...base,
      filing_period: 'third_quarter',
      filing_type: 'Q3',
      registrant_name: 'Hill Partners',
      amount: 0,
    },
    {
      ...base,
      filing_period: 'third_quarter',
      filing_type: 'Q3',
      registrant_name: 'Hill Partners',
      amount: 10000,
    },
    {
      ...base,
      filing_period: 'fourth_quarter',
      filing_type: 'Q4',
      registrant_name: 'Hill Partners',
      amount: 10000,
    },
  ];
  const m = Q.lobbyingSpendByQuarter(rows, { now: '2026-11-06' });
  const q = Object.fromEntries(m.value.clients[0].quarters.map((x) => [x.period, x]));
  assert.equal(q['2026-Q1'].spend, 100000);
  assert.equal(q['2026-Q1'].rule, 'self-filed expenses only');
  assert.equal(q['2026-Q2'].spend, 60000);
  assert.equal(q['2026-Q2'].rule, 'outside income summed');
  assert.equal(q['2026-Q3'].spend, 10000);
  assert.equal(q['2026-Q3'].complete, true);
  assert.equal(q['2026-Q4'].complete, false);
  hasWarning(m, /would double count/);
  hasWarning(m, /excluded/);
});

/* ------------------------------------------------------------------ congressional trades */

test('tradeRangeMidpoint with bounds and open brackets', () => {
  const m = Q.tradeRangeMidpoint('$1,001 - $15,000');
  close(m.value, 8000.5);
  assert.deepEqual(m.bounds, [1001, 15000]);
  const open = Q.tradeRangeMidpoint('Over $50,000,000');
  assert.equal(open.value, 50000000);
  assert.equal(open.open, true);
  const agg = Q.tradeRangeMidpoint(['$1,001 - $15,000', { amount_min: 15001, amount_max: 50000 }]);
  close(agg.value, 8000.5 + 32500.5);
  assert.deepEqual(agg.bounds, [16002, 65000]);
  const aggOpen = Q.tradeRangeMidpoint(['$1,001 - $15,000', 'Over $50,000,000']);
  assert.equal(aggOpen.high, null);
  assert.equal(aggOpen.openEndedBrackets, 1);
});

test('disclosureLagDays in calendar days with the 45-day line', () => {
  const m = Q.disclosureLagDays('2026-01-10', '2026-03-01');
  assert.equal(m.value, 50);
  assert.equal(m.late, true);
  assert.equal(Q.disclosureLagDays('2026-01-10', '2026-02-01').late, false);
  const s = Q.disclosureLagDays([
    { transaction_date: '2026-01-01', disclosure_date: '2026-01-11' },
    { transaction_date: '2026-01-01', disclosure_date: '2026-03-02' },
  ]);
  assert.equal(s.lateCount, 1);
});

/* ------------------------------------------------------------------ prediction markets */

test('impliedProbability bounds, overround and Brier score', () => {
  const m = Q.impliedProbability(0.6, 0.01, 0.04);
  close(m.value, 60);
  close(m.bounds[0], 57);
  close(m.bounds[1], 63);
  const q = Q.impliedProbability(null, 0, { bid: 0.55, ask: 0.65 });
  close(q.value, 60);
  hasWarning(q, /fees assumed zero/);
  close(Q.overround([0.5, 0.3, 0.25]).value, 0.05, 1e-12);
  const b = Q.brierScore([0.9, 0.2, 0.6], [1, 0, 0]);
  close(b.value, 0.41 / 3);
  hasWarning(b, /below the minimum of 20/);
});

/* ------------------------------------------------------------------ portfolio */

test('portfolioReturn: single period, backtest, and asOf refusal', () => {
  close(Q.portfolioReturn({ A: 0.6, B: 0.4 }, { A: 10, B: -5 }).value, 4);
  const returns = { A: monthly('2026-01', [1, 2]), B: monthly('2026-01', [-1, 0]) };
  const bt = Q.portfolioReturn({ A: 0.6, B: 0.4 }, returns, { asOf: '2026-03-31' });
  close(bt.value, (1.002 * 1.012 - 1) * 100);
  assert.equal(bt.series.length, 2);
  const look = Q.portfolioReturn({ A: 0.6, B: 0.4 }, returns, { asOf: '2026-01-31' });
  assert.equal(look.value, null);
  hasWarning(look, /look-ahead refused/);
});

test('trackingError(portfolioReturns, benchmarkReturns) annualised', () => {
  const m = Q.trackingError([1, 2, 3, 4], [0, 0, 0, 0], { periodsPerYear: 12 });
  close(m.perPeriod, stdevOf([1, 2, 3, 4]));
  close(m.value, stdevOf([1, 2, 3, 4]) * Math.sqrt(12));
  hasWarning(m, /below the minimum of 12/);
  const p = Q.trackingError(monthly('2026-01', [1, 2, 3]), monthly('2026-01', [0, 0, 0]));
  assert.equal(p.unit, '% annualised');
});

test('betaVs with standard error', () => {
  const m = Q.betaVs([2, 4, 5, 4, 5], [1, 2, 3, 4, 5]);
  close(m.value, 0.6);
  close(m.se, Math.sqrt(0.08));
  close(m.alpha, 2.2);
  hasWarning(m, /below the minimum of 20/);
  close(Q.betaVs({ asset: [2, 4, 5, 4, 5], benchmark: [1, 2, 3, 4, 5] }).value, 0.6);
});

test('varHistorical and expected shortfall', () => {
  const r = Array.from({ length: 20 }, (_, i) => i - 10);
  const m = Q.varHistorical(r, 0.95);
  close(m.value, 9.05);
  close(m.expectedShortfall, 10);
  close(Q.varHistorical(r, 0.05).value, 9.05);
  hasWarning(m, /fewer than 5/);
});

test('stressTest with shock precedence', () => {
  const m = Q.stressTest(
    [
      { id: 'A', value: 100, sector: 'Tech', beta: 1.5 },
      { id: 'B', value: 200, sector: 'Energy' },
      { id: 'C', value: 100 },
    ],
    { bySector: { Tech: -20 }, market: -10 },
  );
  close(m.value.pnl, -50);
  close(m.value.pnlPct, -12.5);
  assert.equal(m.value.byHolding[0].source, 'sector');
  const sc = Q.stressTest(
    [{ id: 'A', value: 100, beta: 2 }],
    [
      { name: 'crash', market: -30 },
      { name: 'rally', market: 10 },
    ],
  );
  close(sc.value.scenarios[0].pnl, -60);
  close(sc.value.scenarios[1].pnl, 20);
});

test('effectiveNumberOfPositions = 1 / sum of squared weights', () => {
  close(Q.effectiveNumberOfPositions([0.5, 0.25, 0.25]).value, 1 / 0.375);
  const n = Q.effectiveNumberOfPositions([1, 1, 1, 1]);
  close(n.value, 4);
  hasWarning(n, /normalised/);
});

/* ------------------------------------------------------------------ commodities and food */

test('supplyDemandBalance, daysOfCover and importDependency', () => {
  const b = Q.supplyDemandBalance(100, 95, 3);
  close(b.value, 5);
  close(b.residual, 2);
  assert.equal(
    Q.supplyDemandBalance({ value: 100, unit: 'kb/d' }, { value: 95, unit: 'mb/d' }).value,
    null,
  );
  close(Q.daysOfCover(3000, 100).value, 30);
  close(Q.daysOfCover(3100, { period: '2026-01', value: 3100 }, { demandPer: 'month' }).value, 31);
  assert.equal(
    Q.daysOfCover({ value: 3000, unit: 'kb' }, { value: 100, unit: 'million m3/d' }).value,
    null,
  );
  close(Q.importDependency(30, 120).value, 25);
  close(Q.importDependency({ imports: 50, exports: 20 }, 120).value, 25);
  hasWarning(Q.importDependency({ imports: 10, exports: 20 }, 100), /net exporter/);
});

test('seasonalAdjustSimple removes a pure seasonal pattern and refuses gaps', () => {
  const f = Array.from({ length: 12 }, (_, i) => (i % 2 ? 0.9 : 1.1));
  const s = monthly(
    '2023-01',
    Array.from({ length: 48 }, (_, i) => 100 * f[i % 12]),
  );
  const m = Q.seasonalAdjustSimple(s);
  close(m.value, 100, 1e-9);
  close(m.factors[0], 1.1, 1e-9);
  hasWarning(m, /Ezana simple seasonal adjustment/);
  const gap = Q.seasonalAdjustSimple([...s.slice(0, 20), ...s.slice(21)]);
  assert.equal(gap.value, null);
  hasWarning(gap, /gap/);
});

/* ------------------------------------------------------------------ wrapped engine functions */

test('assessCurrencyPressure and aggregateFews are wrapped, not re-implemented', () => {
  const a = Q.assessCurrencyPressure({ fxNow: 40, fxYearAgo: 30 });
  assert.equal(a.value.components.find((c) => c.id === 'depreciation').level, 'severe');
  hasWarning(a, /not assessed/);
  const rows = [
    {
      source: 'fewsnet',
      series_key: 'FEWS:KE.Nairobi.Maize.kg.KES.Retail',
      country_iso3: 'KEN',
      period: '2026-09',
      value: 50,
      year_ago_value: 40,
      year_ago_period: '2025-09',
    },
    {
      source: 'fewsnet',
      series_key: 'FEWS:KE.Mombasa.Maize.kg.KES.Retail',
      country_iso3: 'KEN',
      period: '2026-09',
      value: 60,
      year_ago_value: 44,
      year_ago_period: '2025-09',
    },
  ];
  const g = Q.aggregateFews(rows);
  assert.equal(g.value.length, 1);
  assert.equal(g.value[0].value, 55);
  assert.equal(g.value[0].year_ago_value, 42);
});

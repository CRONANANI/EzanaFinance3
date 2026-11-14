/**
 * Mock Trading theses (Nov 2026): the pure helpers in
 * src/lib/trading/mock-thesis.js and src/lib/trading/mock-risk.js.
 * Imported by scripts/check-mock-trading.mjs, so it runs under
 *   npm run test:mock-trading
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  FIT,
  THESIS_LIMITS,
  THESIS_TEMPLATES,
  capStatus,
  concentrationCheck,
  fitClauses,
  fitLabel,
  parseThesis,
  parseThesisNote,
  portfolioAlignment,
  riskCheck,
  sectorCheck,
  thesisFit,
  thesisNameKey,
  timeHorizonLabel,
  tradeImpacts,
  whatIf,
} from '../src/lib/trading/mock-thesis.js';
import {
  MIN_RISK_POINTS,
  annualisedVolatility,
  beta,
  dailySeries,
  maxDrawdown,
  rangeReturn,
  rebaseBenchmark,
  riskSnapshot,
} from '../src/lib/trading/mock-risk.js';

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} is not about ${b}`);
const SECTORS = ['Technology', 'Healthcare', 'Financial Services', 'Energy', 'Utilities'];
const THESIS = {
  name: 'AI Infrastructure Growth',
  risk_tolerance: 'moderate',
  sector_focus: ['Technology'],
  max_single_name_pct: 15,
};
/* $100,000 portfolio: $30,000 cash, NVDA $14,000, AAPL $56,000. */
const BOOK = {
  cash: 30000,
  totalValue: 100000,
  positions: [
    { symbol: 'NVDA', value: 14000 },
    { symbol: 'AAPL', value: 56000 },
  ],
};

/* ── validation ─────────────────────────────────────────────────── */

test('parseThesis: trims, collapses whitespace, applies defaults', () => {
  const r = parseThesis({ name: '  AI   Infrastructure\n Growth ' }, { sectors: SECTORS });
  assert.equal(r.ok, true);
  assert.deepEqual(r.value, {
    name: 'AI Infrastructure Growth',
    objective: '',
    position_rules: '',
    time_horizon: '3_5y',
    risk_tolerance: 'moderate',
    sector_focus: [],
    max_single_name_pct: 15,
  });
});

test('parseThesis: limits on name, text, sectors and the cap', () => {
  const bad = (body, re) => {
    const r = parseThesis(body, { sectors: SECTORS });
    assert.equal(r.ok, false);
    assert.match(r.error, re);
  };
  bad({ name: '   ' }, /Name is required/);
  bad({ name: 'x'.repeat(61) }, /60 characters/);
  assert.equal(parseThesis({ name: 'x'.repeat(60) }).ok, true);
  bad({ name: 'A', objective: 'o'.repeat(281) }, /Objective must be 280/);
  bad({ name: 'A', position_rules: 'p'.repeat(281) }, /Position rules must be 280/);
  bad({ name: 'A', time_horizon: '10y' }, /time horizon/);
  bad({ name: 'A', risk_tolerance: 'yolo' }, /risk tolerance/);
  bad({ name: 'A', sector_focus: ['Crypto'] }, /Unknown sector: Crypto/);
  bad({ name: 'A', sector_focus: 'Technology' }, /must be a list/);
  bad({ name: 'A', max_single_name_pct: 0.5 }, /between 1 and 100/);
  bad({ name: 'A', max_single_name_pct: 101 }, /between 1 and 100/);
  bad({ name: 'A', max_single_name_pct: 'abc' }, /between 1 and 100/);
  const seven = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
  const r = parseThesis({ name: 'A', sector_focus: seven }, { sectors: seven });
  assert.equal(r.ok, false);
  assert.match(r.error, /up to 6 sectors/);
});

test('parseThesis: sectors match case-insensitively, dedupe, keep the list spelling', () => {
  const r = parseThesis(
    { name: 'A', sector_focus: ['technology', ' HEALTHCARE ', 'Technology', ''] },
    { sectors: SECTORS },
  );
  assert.deepEqual(r.value.sector_focus, ['Technology', 'Healthcare']);
});

test('parseThesis: cap accepts numeric text and keeps one decimal', () => {
  assert.equal(
    parseThesis({ name: 'A', max_single_name_pct: '12.34' }).value.max_single_name_pct,
    12.3,
  );
  assert.equal(parseThesis({ name: 'A', max_single_name_pct: 100 }).value.max_single_name_pct, 100);
});

test('parseThesis: unknown keys are rejected, including ids and flags', () => {
  for (const key of ['id', 'user_id', 'is_active', 'created_at', 'color']) {
    const r = parseThesis({ name: 'A', [key]: 'x' });
    assert.equal(r.ok, false);
    assert.equal(r.error, `Unknown field: ${key}`);
  }
  assert.equal(parseThesis(null).ok, false);
  assert.equal(parseThesis([]).ok, false);
});

test('parseThesis: partial validates only what is sent', () => {
  const r = parseThesis({ max_single_name_pct: 20 }, { partial: true });
  assert.deepEqual(r, { ok: true, value: { max_single_name_pct: 20 } });
  assert.equal(parseThesis({}, { partial: true }).ok, false);
  assert.equal(parseThesis({ name: ' ' }, { partial: true }).ok, false);
});

test('thesisNameKey: the unique-name rule ignores case and spacing', () => {
  assert.equal(thesisNameKey('  Macro   Rotation '), thesisNameKey('macro rotation'));
});

test('parseThesisNote: trims, keeps line breaks, empty clears, 280 limit', () => {
  assert.deepEqual(parseThesisNote('  Added on   demand \r\n\r\n\r\n second line  '), {
    ok: true,
    value: 'Added on demand\n\nsecond line',
  });
  assert.deepEqual(parseThesisNote('   '), { ok: true, value: null });
  assert.deepEqual(parseThesisNote(null), { ok: true, value: null });
  assert.equal(parseThesisNote('n'.repeat(280)).ok, true);
  assert.equal(parseThesisNote('n'.repeat(281)).ok, false);
  assert.equal(parseThesisNote(42).ok, false);
});

test('templates: every starter passes validation and none exceeds the limits', () => {
  const allowed = [
    'Technology',
    'Communication Services',
    'Consumer Defensive',
    'Healthcare',
    'Utilities',
    'Financial Services',
    'Energy',
    'Industrials',
    'Basic Materials',
  ];
  assert.equal(THESIS_TEMPLATES[0].values, null);
  for (const t of THESIS_TEMPLATES.slice(1)) {
    const r = parseThesis(t.values, { sectors: allowed });
    assert.equal(r.ok, true, `${t.label}: ${r.error}`);
    assert.deepEqual(r.value, t.values);
  }
  assert.equal(timeHorizonLabel('1_3y'), '1 to 3 years');
  assert.equal(THESIS_LIMITS.maxTheses, 3);
});

/* ── what-if ────────────────────────────────────────────────────── */

test('whatIf: a buy moves cash into the position and total value holds', () => {
  const w = whatIf({ ...BOOK, side: 'buy', amount: 1000, symbol: 'nvda', price: 125 });
  assert.equal(w.symbol, 'NVDA');
  assert.equal(w.shares, 8);
  near(w.weight.before, 14);
  near(w.weight.after, 15);
  assert.deepEqual(w.cash, { before: 30000, after: 29000 });
  near(w.exposure.before, 70);
  near(w.exposure.after, 71);
  assert.equal(w.exceedsCash, false);
  assert.equal(w.closes, false);
});

test('whatIf: a buy of a ticker not held starts from zero weight', () => {
  const w = whatIf({ ...BOOK, side: 'buy', amount: 5000, symbol: 'MSFT', price: 400 });
  near(w.weight.before, 0);
  near(w.weight.after, 5);
  assert.equal(
    whatIf({ ...BOOK, side: 'buy', amount: 40000, symbol: 'MSFT', price: 400 }).exceedsCash,
    true,
  );
});

test('whatIf: a sell is capped at the position and a full sell closes it', () => {
  const part = whatIf({ ...BOOK, side: 'sell', amount: 4000, symbol: 'NVDA', price: 125 });
  near(part.weight.after, 10);
  assert.equal(part.cash.after, 34000);
  near(part.exposure.after, 66);
  assert.equal(part.closes, false);
  const all = whatIf({ ...BOOK, side: 'sell', amount: 99999, symbol: 'NVDA', price: 125 });
  assert.equal(all.amount, 14000);
  near(all.weight.after, 0);
  assert.equal(all.cash.after, 44000);
  assert.equal(all.closes, true);
});

test('whatIf: nothing to project without a symbol, price or amount', () => {
  assert.equal(whatIf({ ...BOOK, side: 'buy', amount: 0, symbol: 'NVDA', price: 125 }), null);
  assert.equal(whatIf({ ...BOOK, side: 'buy', amount: 100, symbol: '', price: 125 }), null);
  assert.equal(whatIf({ ...BOOK, side: 'buy', amount: 100, symbol: 'NVDA', price: 0 }), null);
  assert.equal(
    whatIf({ ...BOOK, totalValue: 0, side: 'buy', amount: 100, symbol: 'NVDA', price: 1 }),
    null,
  );
});

/* ── fit ────────────────────────────────────────────────────────── */

test('sector check: match, mismatch, and the three neutral cases', () => {
  assert.equal(sectorCheck({ thesis: THESIS, sector: 'technology' }), 'match');
  assert.equal(sectorCheck({ thesis: THESIS, sector: 'Energy' }), 'mismatch');
  assert.equal(
    sectorCheck({ thesis: { ...THESIS, sector_focus: [] }, sector: 'Energy' }),
    'neutral',
  );
  assert.equal(sectorCheck({ thesis: THESIS, sector: 'Energy', isFund: true }), 'neutral');
  assert.equal(sectorCheck({ thesis: THESIS, sector: null }), 'neutral');
});

test('risk check: beta against the band for each tolerance', () => {
  const t = (risk_tolerance) => ({ ...THESIS, risk_tolerance });
  assert.equal(riskCheck({ thesis: t('conservative'), beta: 0.9 }), 'within');
  assert.equal(riskCheck({ thesis: t('conservative'), beta: 0.91 }), 'above');
  assert.equal(riskCheck({ thesis: t('moderate'), beta: 1.3 }), 'within');
  assert.equal(riskCheck({ thesis: t('moderate'), beta: 1.31 }), 'above');
  assert.equal(riskCheck({ thesis: t('aggressive'), beta: 3 }), 'within');
  assert.equal(riskCheck({ thesis: t('moderate'), beta: null }), 'unknown');
});

test('cap status: within below 90% of the cap, nearing up to it, over past it', () => {
  assert.equal(capStatus(13.4, 15), 'within');
  assert.equal(capStatus(13.5, 15), 'nearing');
  assert.equal(capStatus(15, 15), 'nearing');
  assert.equal(capStatus(15.7, 15), 'over');
});

test('concentration: a sell never reads worse than the position does today', () => {
  const buy = whatIf({ ...BOOK, side: 'buy', amount: 2000, symbol: 'NVDA', price: 125 });
  assert.equal(concentrationCheck({ thesis: THESIS, projection: buy }), 'over');
  const rank = { within: 0, nearing: 1, over: 2 };
  for (const amount of [100, 1000, 5000, 14000]) {
    for (const symbol of ['NVDA', 'AAPL']) {
      const p = whatIf({ ...BOOK, side: 'sell', amount, symbol, price: 100 });
      const after = concentrationCheck({ thesis: THESIS, projection: p });
      assert.ok(rank[after] <= rank[capStatus(p.weight.before, 15)], `${symbol} ${amount}`);
    }
  }
  const trim = whatIf({ ...BOOK, side: 'sell', amount: 50000, symbol: 'AAPL', price: 100 });
  assert.equal(concentrationCheck({ thesis: THESIS, projection: trim }), 'within');
});

test('fit score: the points table adds up and the labels follow the cut-offs', () => {
  const projection = whatIf({ ...BOOK, side: 'buy', amount: 500, symbol: 'MSFT', price: 400 });
  const best = thesisFit({ thesis: THESIS, projection, sector: 'Technology', beta: 1.1 });
  assert.deepEqual(best.checks, { sector: 'match', risk: 'within', concentration: 'within' });
  assert.equal(best.score, 100);
  assert.equal(best.label, 'High');

  const mixed = thesisFit({ thesis: THESIS, projection, sector: null, beta: null });
  assert.equal(mixed.score, 28 + 15 + 35);
  assert.equal(mixed.label, 'High');

  const over = whatIf({ ...BOOK, side: 'buy', amount: 2000, symbol: 'NVDA', price: 125 });
  const worst = thesisFit({ thesis: THESIS, projection: over, sector: 'Energy', beta: 2 });
  assert.equal(worst.score, 0);
  assert.equal(worst.label, 'Low');

  const mid = thesisFit({ thesis: THESIS, projection: over, sector: 'Technology', beta: 1 });
  assert.equal(mid.score, 65);
  assert.equal(mid.label, 'Medium');

  assert.equal(fitLabel(75), 'High');
  assert.equal(fitLabel(74), 'Medium');
  assert.equal(fitLabel(50), 'Medium');
  assert.equal(fitLabel(49), 'Low');
  assert.equal(fitLabel(null), null);
  const max = FIT.points.sector.match + FIT.points.risk.within + FIT.points.concentration.within;
  assert.equal(max, 100);
});

test('fit: nothing to judge without an active thesis or an order', () => {
  assert.equal(thesisFit({ thesis: null, projection: {} }), null);
  assert.equal(thesisFit({ thesis: THESIS, projection: null }), null);
  assert.deepEqual(fitClauses({ thesis: THESIS, fit: null, projection: null }), []);
});

test('fit wording: descriptive sentences, a warning flag, and no advice words', () => {
  const projection = whatIf({ ...BOOK, side: 'buy', amount: 1700, symbol: 'NVDA', price: 125 });
  const fit = thesisFit({ thesis: THESIS, projection, sector: 'Technology', beta: 1 });
  const clauses = fitClauses({ thesis: THESIS, fit, projection });
  assert.deepEqual(
    clauses.map((c) => c.text),
    [
      'Lines up with AI Infrastructure Growth.',
      'Within risk tolerance.',
      'Past the cap: NVDA would be 15.7% against a 15.0% cap.',
    ],
  );
  assert.deepEqual(
    clauses.map((c) => c.ok),
    [true, true, false],
  );
  const src = fs.readFileSync('src/lib/trading/mock-thesis.js', 'utf8');
  const strings = [...src.matchAll(/[`'"]([^`'"\n]{12,})[`'"]/g)].map((m) => m[1]).join('\n');
  assert.doesNotMatch(strings, /\b(should|recommend|good trade|bad trade)\b/i);
  for (const file of ['src/lib/trading/mock-thesis.js', 'src/lib/trading/mock-risk.js']) {
    const text = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(text, new RegExp(String.fromCharCode(0x2014)), `${file}: em dash`);
    assert.doesNotMatch(text, /#[0-9a-f]{3,8}\b/i, `${file}: hex colour`);
    assert.doesNotMatch(text, /Math\.random/, `${file}: Math.random`);
    assert.doesNotMatch(text, /^import /m, `${file}: must stay import-free`);
  }
});

test('portfolio alignment: share of invested value in the sector focus', () => {
  const sectors = { NVDA: 'Technology', AAPL: 'technology', XOM: 'Energy', ZZZ: null };
  const positions = [
    { symbol: 'NVDA', value: 3000 },
    { symbol: 'AAPL', value: 1000 },
    { symbol: 'XOM', value: 4000 },
    { symbol: 'ZZZ', value: 2000 },
  ];
  near(portfolioAlignment({ thesis: THESIS, positions, sectors }), 40);
  assert.equal(portfolioAlignment({ thesis: { sector_focus: [] }, positions, sectors }), null);
  assert.equal(portfolioAlignment({ thesis: THESIS, positions: [], sectors }), null);
});

/* ── journal ────────────────────────────────────────────────────── */

test('trade impacts: opened, added, reduced, closed, replayed in time order', () => {
  const trades = [
    {
      id: 'd',
      ticker: 'NVDA',
      trade_type: 'sell',
      quantity: 12,
      created_at: '2026-10-04T15:00:00Z',
    },
    { id: 'a', ticker: 'NVDA', trade_type: 'buy', quantity: 5, created_at: '2026-10-01T15:00:00Z' },
    {
      id: 'c',
      ticker: 'nvda',
      trade_type: 'sell',
      quantity: 3,
      created_at: '2026-10-03T15:00:00Z',
    },
    {
      id: 'b',
      ticker: 'NVDA',
      trade_type: 'buy',
      quantity: 10,
      created_at: '2026-10-02T15:00:00Z',
    },
    { id: 'e', ticker: 'AAPL', trade_type: 'buy', quantity: 2, created_at: '2026-10-05T15:00:00Z' },
    { id: 'f', ticker: 'NVDA', trade_type: 'buy', quantity: 1, created_at: '2026-10-06T15:00:00Z' },
  ];
  const m = tradeImpacts(trades);
  assert.deepEqual(m.get('a'), { kind: 'opened', shares: 5, after: 5 });
  assert.deepEqual(m.get('b'), { kind: 'added', shares: 10, after: 15 });
  assert.deepEqual(m.get('c'), { kind: 'reduced', shares: 3, after: 12 });
  assert.deepEqual(m.get('d'), { kind: 'closed', shares: 12, after: 0 });
  assert.deepEqual(m.get('e'), { kind: 'opened', shares: 2, after: 2 });
  assert.deepEqual(m.get('f'), { kind: 'opened', shares: 1, after: 1 });
  assert.equal(tradeImpacts(null).size, 0);
});

/* ── risk ───────────────────────────────────────────────────────── */

const series = (values, start = '2026-08-03') =>
  values.map((value, i) => {
    const d = new Date(`${start}T16:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return { at: d.toISOString(), value };
  });

test('range return and drawdown on a fixed series', () => {
  const pts = series([100, 110, 99, 104.5, 120, 108]);
  near(rangeReturn(pts), 8);
  near(maxDrawdown(pts), -10);
  assert.equal(rangeReturn(series([100])), null);
  assert.equal(maxDrawdown(series([100])), null);
  near(maxDrawdown(series([100, 101, 102])), 0);
});

test('daily series: one point per day, the last one wins, bad points dropped', () => {
  const pts = [
    { at: '2026-08-04T16:00:00.000Z', value: 102 },
    { at: '2026-08-03T10:00:00.000Z', value: 99 },
    { at: '2026-08-03T16:00:00.000Z', value: 100 },
    { t: '2026-08-05T16:00:00.000Z', v: 103 },
    { at: 'not a date', value: 5 },
    { at: '2026-08-06T16:00:00.000Z', value: 0 },
  ];
  assert.deepEqual(dailySeries(pts), [
    { day: '2026-08-03', value: 100 },
    { day: '2026-08-04', value: 102 },
    { day: '2026-08-05', value: 103 },
  ]);
});

test('volatility: sample standard deviation of daily returns, annualised', () => {
  /* Returns +1%, -1%, +1%, -1%: mean 0, sample variance 0.0004 / 3. */
  const pts = series([100, 101, 99.99, 100.9899, 99.980001]);
  near(annualisedVolatility(pts), Math.sqrt(0.0004 / 3) * Math.sqrt(252) * 100, 1e-6);
  assert.equal(annualisedVolatility(series([100, 101])), null);
});

test('beta: 2x the benchmark reads 2, the benchmark itself reads 1', () => {
  const benchReturns = [0.01, -0.02, 0.015, 0.005, -0.01, 0.02];
  const build = (k) => {
    const out = [100];
    for (const r of benchReturns) out.push(out[out.length - 1] * (1 + k * r));
    return series(out);
  };
  near(beta(build(2), build(1)), 2);
  near(beta(build(1), build(1)), 1);
  near(beta(build(-0.5), build(1)), -0.5);
  assert.equal(beta(build(1), series([100, 100, 100, 100])), null);
  assert.equal(beta(build(1), []), null);
});

test('risk snapshot: N/A under 20 daily points, concentration is always live', () => {
  const positions = [
    { symbol: 'NVDA', value: 14000 },
    { symbol: 'AAPL', value: 56000 },
  ];
  const short = riskSnapshot({ points: series([100, 101, 102]), positions, totalValue: 100000 });
  assert.equal(short.enough, false);
  assert.equal(short.maxDrawdownPct, null);
  assert.equal(short.volatilityPct, null);
  assert.equal(short.beta, null);
  assert.equal(short.concentration.symbol, 'AAPL');
  near(short.concentration.weight, 56);

  const values = Array.from({ length: MIN_RISK_POINTS }, (_, i) => 100 + (i % 2 ? 2 : 0) + i);
  const full = riskSnapshot({
    points: series(values),
    benchmark: series(values),
    positions: [],
    totalValue: 0,
  });
  assert.equal(full.enough, true);
  assert.equal(full.concentration, null);
  assert.ok(full.maxDrawdownPct <= 0);
  assert.ok(full.volatilityPct > 0);
  near(full.beta, 1);
});

test('benchmark rebase: starts on the portfolio value and keeps its shape', () => {
  const port = series([50000, 50500, 51000], '2026-08-04');
  const bench = series([400, 500, 505, 520], '2026-08-03');
  const out = rebaseBenchmark(port, bench);
  assert.equal(out.length, 3);
  assert.equal(out[0].at, '2026-08-04T16:00:00.000Z');
  near(out[0].value, 50000);
  near(out[2].value, 52000);
  near(rangeReturn(out), 4);
  assert.deepEqual(rebaseBenchmark([], bench), []);
});

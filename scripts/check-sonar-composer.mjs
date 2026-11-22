// Research Composer (Nov 22 2026): registry, automatic composition, validation, the
// three-resource Deep rule and the deterministic calculations. node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inferComposition, extractParams } from '../src/lib/sonar/composer/intents.js';
import {
  makeAnalysis,
  validateAttachment,
  deepQualification,
  relationText,
} from '../src/lib/sonar/composer/registry.js';
import { companyRatios, dcfValue } from '../src/lib/sonar/composer/calc.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const caps = (q) => inferComposition(q).attachments.map((a) => a.capability);

test('A: BlackRock top 10 fundamentals is inferred with top N and the subject', () => {
  const c = inferComposition('Give me a fundamental analysis of the top 10 stocks BlackRock owns.');
  assert.equal(c.subject, 'BlackRock');
  assert.deepEqual(caps('Give me a fundamental analysis of the top 10 stocks BlackRock owns.'), [
    'fundamental-analysis',
  ]);
  const a = c.attachments[0];
  assert.equal(a.origin, 'auto');
  assert.equal(a.params.top_n, 10);
  const resolved = validateAttachment({
    ...a,
    subject: { text: 'BlackRock', kind: 'institution', name: 'BlackRock, Inc.', eligible: 180 },
  });
  assert.equal(resolved.status, 'supported');
  assert.match(relationText(resolved), /top 10 disclosed 13F holdings by reported value/);
});

test('B: manual Fundamental Analysis on Nancy Pelosi validates top N against eligible holdings', () => {
  const a = makeAnalysis('fundamental-analysis', {
    origin: 'user',
    subject: { text: 'Nancy Pelosi', kind: 'politician', name: 'Nancy Pelosi', eligible: 7 },
  });
  /* The default stays inside the data: 7 of 7. */
  assert.equal(a.params.top_n, 7);
  assert.equal(a.status, 'supported');
  const asked = validateAttachment({ ...a, params: { ...a.params, top_n: 10 } });
  assert.equal(asked.status, 'validation_error');
  assert.equal(asked.issues[0].fix, 7);
  Object.assign(a, asked);
  assert.match(a.issues[0].message, /Only 7 eligible holdings are available/);
  assert.equal(a.issues[0].fix, 7);
  const fixed = validateAttachment({ ...a, params: { ...a.params, top_n: 5 } });
  assert.equal(fixed.status, 'supported');
  assert.match(relationText(fixed), /top 5 estimated disclosed holdings/);
});

test('C: Pelosi backtest is inferred with the window; backtesting needs a member', () => {
  const c = inferComposition("Backtest Nancy Pelosi's disclosed purchases over five years.");
  assert.equal(c.subject, 'Nancy Pelosi');
  assert.deepEqual(
    c.attachments.map((a) => a.capability),
    ['backtesting'],
  );
  assert.equal(c.attachments[0].params.years, 5);
  const inst = validateAttachment({
    ...c.attachments[0],
    subject: { text: 'BlackRock', kind: 'institution', eligible: 100 },
  });
  assert.equal(inst.status, 'unsupported');
});

test('D: three distinct analyses qualify for Deep research, whatever their origin', () => {
  const q =
    "Analyze BlackRock's top 10 holdings fundamentals, run a discounted cash-flow valuation on the largest holdings, and backtest a strategy following changes in those holdings.";
  assert.deepEqual(caps(q), ['fundamental-analysis', 'dcf-valuation', 'backtesting']);
  const valid = ['fundamental-analysis', 'dcf-valuation', 'backtesting'].map((cap) =>
    makeAnalysis(cap, {
      origin: cap === 'backtesting' ? 'user' : 'auto',
      subject: { text: 'Nancy Pelosi', kind: 'politician', name: 'Nancy Pelosi', eligible: 20 },
    }),
  );
  assert.deepEqual(deepQualification(valid), { count: 3, qualifies: true });
  /* An invalid or unsupported analysis never counts; duplicates count once. */
  const inst = valid.map((a) =>
    validateAttachment({ ...a, subject: { text: 'BlackRock', kind: 'institution', eligible: 20 } }),
  );
  assert.equal(deepQualification(inst).count, 2);
  assert.equal(deepQualification([...valid.slice(0, 2), valid[0]]).count, 2);
  /* Other resource kinds count once each; photos never. */
  assert.equal(
    deepQualification([
      valid[0],
      { key: 'model:garch', kind: 'model' },
      { key: 'p', kind: 'photo' },
      { key: 'pack:macro', kind: 'pack' },
    ]).count,
    3,
  );
});

test('simple questions get no attachments; duplicate intents collapse to one', () => {
  assert.deepEqual(caps('Who is Nancy Pelosi?'), []);
  assert.deepEqual(caps("Is Turkey's lira under pressure?"), []);
  assert.deepEqual(caps('nancy pelosi'), []);
  assert.deepEqual(caps('Analyze the fundamentals and financial performance of Microsoft.'), [
    'fundamental-analysis',
  ]);
  assert.deepEqual(caps("Analyze Microsoft's fundamentals and run a DCF."), [
    'fundamental-analysis',
    'dcf-valuation',
  ]);
  assert.equal(
    inferComposition("Analyze Microsoft's fundamentals and run a DCF.").subject,
    'Microsoft',
  );
});

test('explicit numbers become typed parameters', () => {
  assert.deepEqual(extractParams('the top seven energy companies over the last three years'), {
    top_n: 7,
    years: 3,
  });
  assert.equal(extractParams('hold each for 30 days').hold_days, 30);
  assert.equal(extractParams('a DCF with a discount rate of 8.5%').wacc_pct, 8.5);
});

test('a DCF count above its bound is a validation error with a fix, never truncated', () => {
  const a = makeAnalysis('dcf-valuation', {
    subject: { text: 'BlackRock', kind: 'institution', eligible: 150 },
    params: { top_n: 10 },
  });
  assert.equal(a.status, 'validation_error');
  assert.equal(a.params.top_n, 10);
  assert.equal(a.issues[0].fix, 5);
  const bad = validateAttachment({
    ...a,
    params: { ...a.params, top_n: 3, terminal_pct: 10, wacc_pct: 9 },
  });
  assert.match(bad.issues.map((i) => i.message).join(' '), /Terminal growth must be below/);
});

/* NVIDIA's filed figures (sec_fundamentals, FY ending 2026-01-25). */
const NVDA = {
  annual: {
    revenue: [
      { end: '2026-01-25', value: 215938e6 },
      { end: '2025-01-26', value: 130497e6 },
    ],
    gross_profit: [{ end: '2026-01-25', value: 153463e6 }],
    operating_income: [{ end: '2026-01-25', value: 130387e6 }],
    net_income: [{ end: '2026-01-25', value: 120067e6 }],
    operating_cash_flow: [{ end: '2026-01-25', value: 102718e6 }],
    capex: [{ end: '2026-01-25', value: 6042e6 }],
  },
  instant: {
    equity: { end: '2026-07-26', value: 228984e6 },
    long_term_debt: { end: '2026-07-26', value: 32366e6 },
    cash: { end: '2026-07-26', value: 22443e6 },
    shares_outstanding: { end: '2026-08-21', value: 24100e6 },
  },
};

test('ratios are computed from filed figures', () => {
  const r = companyRatios(NVDA);
  const close = (a, b) => Math.abs(a - b) < 0.001;
  assert.ok(close(r.revenue_growth, 215938 / 130497 - 1));
  assert.ok(close(r.gross_margin, 153463 / 215938));
  assert.ok(close(r.operating_margin, 130387 / 215938));
  assert.equal(r.fcf, 102718e6 - 6042e6);
  assert.ok(close(r.debt_to_equity, 32366 / 228984));
  assert.equal(companyRatios(null), null);
});

test('DCF: deterministic, refuses negative free cash flow and a terminal rate at or above the discount rate', () => {
  const v = dcfValue({
    fcf: 100,
    growth: 0.1,
    wacc: 0.1,
    terminal: 0.02,
    years: 5,
    cash: 10,
    debt: 20,
    shares: 10,
  });
  assert.ok(v.ok);
  /* Hand check: PV of 5 years at g = r is 5 x 100; TV = 161.05 x 1.02 / 0.08, discounted 5 years. */
  const tv = (100 * 1.1 ** 5 * 1.02) / 0.08 / 1.1 ** 5;
  assert.ok(Math.abs(v.ev - (500 + tv)) < 1e-6);
  assert.ok(Math.abs(v.perShare - (500 + tv - 10) / 10) < 1e-6);
  assert.equal(dcfValue({ fcf: -5, growth: 0.1, wacc: 0.1, terminal: 0.02, years: 5 }).ok, false);
  assert.equal(dcfValue({ fcf: 5, growth: 0.1, wacc: 0.02, terminal: 0.02, years: 5 }).ok, false);
});

test('executors are wired to real data and the Quant Lab engine; the backtest dates by disclosure', () => {
  const src = read('src/lib/sonar/composer/execute.js');
  assert.match(src, /titans_13f_positions/);
  assert.match(src, /sec_fundamentals/);
  assert.match(src, /politician_portfolio/);
  assert.match(src, /runBacktest\(/);
  assert.match(src, /disclosure_date/);
  assert.ok(!/transaction_date/.test(src), 'never signals on the trade date');
  const route = read('src/app/api/sonar/composer/route.js');
  assert.match(route, /Sign in to run research analyses/);
});

test('composer UI: rows in the pill, Compose label, five categories, slide-in EzanaQL builder', () => {
  const bar = read('src/components/sonar/SonarAnswerQueryBar.jsx');
  assert.match(bar, /<SonarComposerRows/);
  assert.match(bar, /Compose/);
  assert.match(bar, /deepQualification/);
  const menu = read('src/components/sonar/SonarBuildMenu.jsx');
  for (const t of [
    'Research Composer',
    'Queries',
    'Models',
    'Data packs',
    'Tools',
    'Echo',
    'Create new query',
    'Include in research',
    'Save to library',
  ])
    assert.ok(menu.includes(t), t);
  assert.match(menu, /\/api\/ezanaql\/generate/);
  assert.ok(!/href="\/datasets\/capitol"/.test(menu), 'Create new query no longer links away');
  const rows = read('src/components/sonar/SonarComposerRows.jsx');
  assert.match(rows, /Auto-configured/);
  assert.match(rows, /How should Sonar use this\?/);
  const css = read('src/components/sonar/sonar-answer-query-bar.css');
  assert.match(css, /\.sqb \.sbm\.is-builder \.sbm-track/);
  assert.match(css, /\.sqb \.sbm-tab\.is-on \{\s*color: var\(--sqb-accent\);\s*\}/);
});

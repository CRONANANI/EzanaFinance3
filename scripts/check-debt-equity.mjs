/**
 * Debt to equity from filed components (Sonar 6.4 final hardening). Values are the FY2025 10-K
 * balance sheets (2025-12-31) as tagged in SEC companyfacts, read Nov 28 2026, in $ millions.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  totalDebt,
  debtToEquity,
  companyRatios,
  dcfValue,
} from '../src/lib/sonar/composer/calc.js';

const END = '2025-12-31';
const f = (instant, sic = null) => ({
  annual: {},
  instant: Object.fromEntries(
    Object.entries(instant).map(([k, v]) => [k, { end: END, value: v * 1e6 }]),
  ),
  sic,
});
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-3, `${a} vs ${b}`);

test('Amplify Energy (AMPY): noncurrent debt 0 with no current-debt tag is not 0.00x', () => {
  const ampy = f({ debt_noncurrent: 0, equity: 459 });
  const d = debtToEquity(ampy);
  assert.equal(d.value, null);
  assert.equal(d.status, 'qualified');
  assert.match(d.reason, /current debt not tagged/);
  assert.equal(companyRatios({ ...ampy, annual: {} }).debt_to_equity, null);
});

test('Halliburton (HAL): noncurrent 7,158 + current portion 0 + short-term borrowings 0', () => {
  const hal = f({
    debt_noncurrent: 7158,
    debt_long_term_total: 7158,
    debt_current_portion: 0,
    short_term_borrowings: 0,
    equity: 10461,
  });
  const t = totalDebt(hal.instant, END);
  assert.equal(t.status, 'complete');
  close(t.value / 1e6, 7158);
  close(debtToEquity(hal).value, 7158 / 10461);
});

test('Exxon Mobil (XOM): debt and finance leases noncurrent 34,241 + all current debt 9,296 (commercial paper not added twice)', () => {
  const xom = f({
    debt_and_leases_noncurrent: 34241,
    debt_current_portion: 6200,
    debt_current: 9296,
    commercial_paper: 3059,
    equity: 259386,
  });
  const t = totalDebt(xom.instant, END);
  assert.equal(t.status, 'complete');
  close(t.value / 1e6, 34241 + 9296);
  assert.ok(t.flags.includes('includes finance lease obligations'));
  close(debtToEquity(xom).value, (34241 + 9296) / 259386);
});

test('Valero (VLO): LongTermDebt beside DebtCurrent with no current portion is ambiguous, so qualified', () => {
  const vlo = f({ debt_long_term_total: 8261, debt_current: 949, equity: 23725 });
  const d = debtToEquity(vlo);
  assert.equal(d.value, null);
  assert.equal(d.status, 'qualified');
});

test('short-term-only debt, revolver only, zero debt, negative or missing equity, banks, stale components', () => {
  /* Short-term borrowings and current portion, no long-term debt tag: noncurrent unknown. */
  assert.equal(debtToEquity(f({ debt_current: 50, equity: 100 })).status, 'qualified');
  /* A revolver balance alone. */
  assert.equal(debtToEquity(f({ line_of_credit: 40, equity: 100 })).status, 'qualified');
  /* Explicit zero debt, both parts tagged: a real 0. */
  assert.equal(
    debtToEquity(f({ debt_noncurrent: 0, debt_current_portion: 0, equity: 100 })).value,
    0,
  );
  /* LongTermDebt alone is current plus noncurrent by definition. */
  close(debtToEquity(f({ debt_long_term_total: 30, equity: 100 })).value, 0.3);
  assert.equal(
    debtToEquity(f({ debt_noncurrent: 10, debt_current_portion: 1, equity: -5 })).status,
    'not_meaningful',
  );
  assert.equal(
    debtToEquity(f({ debt_noncurrent: 10, debt_current_portion: 1 })).status,
    'unavailable',
  );
  assert.equal(debtToEquity(f({ equity: 100 })).status, 'unavailable');
  assert.equal(
    debtToEquity(f({ debt_noncurrent: 10, debt_current_portion: 1, equity: 100 }, '6021')).status,
    'not_meaningful',
  );
  /* A REIT keeps the ratio. */
  assert.equal(
    debtToEquity(f({ debt_noncurrent: 10, debt_current_portion: 1, equity: 100 }, '6798')).status,
    'complete',
  );
  /* A component from another balance-sheet date is not combined. */
  const mixed = f({ debt_noncurrent: 10, equity: 100 });
  mixed.instant.debt_current_portion = { end: '2024-12-31', value: 1e6 };
  assert.equal(debtToEquity(mixed).status, 'qualified');
});

test('DCF: a missing debt figure is not zero debt', () => {
  const r = dcfValue({
    fcf: 100,
    growth: 0.03,
    wacc: 0.09,
    terminal: 0.025,
    years: 5,
    debt: Number.NaN,
    shares: 10,
  });
  assert.equal(r.ok, false);
});

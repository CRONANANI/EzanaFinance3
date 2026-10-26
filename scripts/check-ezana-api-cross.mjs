/**
 * Ezana API, cross dimension: params, pure insight maths and registry entries.
 * Run: node --no-warnings --test scripts/check-ezana-api-cross.mjs (part of npm run test:api).
 * Self-contained node:test file, no network.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { register } from 'node:module';

register('./mobile-node-loader.mjs', import.meta.url);

const reg = await import('../src/lib/ezana-api/registry.js');

test('cross: every route in this dimension is live and typed', () => {
  for (const e of reg.ENDPOINTS.filter((x) => x.dimension === 'cross')) {
    assert.equal(e.status, 'live', e.path);
    assert.ok(['data', 'insight'].includes(e.kind), e.path);
  }
});

const x = await import('../src/lib/ezana-api/insights/cross.js');

test('cross: holder change summary counts classes and net shares', () => {
  const s = x.holderChangeSummary([
    { change: 'new', shares: 100, shares_prior: null },
    { change: 'added', shares: 300, shares_prior: 200 },
    { change: 'doubled', shares: 400, shares_prior: 100 },
    { change: 'trimmed', shares: 50, shares_prior: 80 },
    { change: 'exited', shares: 0, shares_prior: 40 },
    { change: null, shares: 10, shares_prior: null },
  ]);
  assert.deepEqual(
    { ...s },
    {
      holders: 6,
      new: 1,
      added: 2,
      trimmed: 1,
      exited: 1,
      flat: 0,
      net_share_change: 100 + 100 + 300 - 30 - 40,
    },
  );
  assert.equal(x.holderChangeSummary(null).holders, 0);
});

test('cross: confirmation counts stated rules only, never a call', () => {
  const c = x.confirmation({
    congress: { flow: { flow_score: 42 } },
    insider: { days_90: { net_value: -15000 } },
    institutional: { holder_changes: { holders: 5, new: 1, added: 2, trimmed: 1, exited: 0 } },
    contracts: { year_over_year: { change_usd: 0 } },
    patents: null,
    etf: { funds_holding: 3 },
  });
  assert.equal(c.bullish, 2);
  assert.equal(c.bearish, 1);
  assert.deepEqual(
    c.signals.map((s) => [s.dimension, s.lean]),
    [
      ['congress', 'bullish'],
      ['insider', 'bearish'],
      ['institutional', 'bullish'],
    ],
  );
  for (const s of c.signals) assert.ok(s.rule.length > 20, 'each signal states its rule');
  assert.deepEqual(x.confirmation({}), { bullish: 0, bearish: 0, signals: [] });
  const text = JSON.stringify(x.CONFIRMATION_RULES).toLowerCase();
  assert.ok(!/\bbuy (signal|call)|\bsell (signal|call)|recommend/.test(text), 'no calls');
});

test('cross: insider net by ticker and the contract-to-insider join', () => {
  const net = x.insiderNetByTicker([
    { ticker: 'lmt', code: 'P', value: 100 },
    { ticker: 'LMT', code: 'S', value: 30 },
    { ticker: 'GD', code: 'S', value: 50 },
    { ticker: 'NOC', code: 'P', value: 10 },
    { ticker: 'NOC', code: 'A', value: 999 },
  ]);
  assert.deepEqual(net.get('LMT'), {
    buy_value: 100,
    sell_value: 30,
    net_value: 70,
    buys: 1,
    sells: 1,
  });
  assert.equal(net.get('NOC').net_value, 10, 'only open-market codes count');
  const j = x.contractToInsider(
    [
      { ticker: 'NOC', change_usd: 5e6, change_pct: 12 },
      { ticker: 'LMT', change_usd: 9e6, change_pct: 30 },
      { ticker: 'GD', change_usd: 1e6, change_pct: 50 },
      { ticker: 'BA', change_usd: -2e6, change_pct: -10 },
    ],
    net,
  );
  assert.deepEqual(
    j.map((r) => r.ticker),
    ['LMT', 'NOC'],
  );
});

test('cross: routes are registered, scoped and delayed', () => {
  const ids = reg.ENDPOINTS.filter((e) => e.dimension === 'cross').map((e) => e.id);
  assert.deepEqual(ids.sort(), [
    'cross.capitol_insider_overlap',
    'cross.composite',
    'cross.contract_to_insider',
    'cross.influence_to_capital',
  ]);
  for (const e of reg.ENDPOINTS.filter((r) => r.dimension === 'cross')) {
    assert.equal(e.scope, 'cross');
    assert.ok(e.delayed, `${e.id} applies the delay`);
    assert.ok(!/ahead of/i.test(`${e.summary} ${e.method}`), 'neutral wording');
  }
});

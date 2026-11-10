/**
 * Watchlist Market Monitor + Smart Watchlists (Nov 2026): the rule language
 * (src/lib/watchlist/smart-rules.js), the page helpers
 * (src/lib/watchlist/watchlist-view.js), and the wiring and token rules.
 *   node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-watchlist-monitor.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  CONDITIONS,
  MAX_CONDITIONS,
  PER_RUN_CAP,
  conditionsFor,
  describeCondition,
  describeRule,
  evaluateCandidate,
  isDue,
  newCondition,
  pickAdds,
  sanitizeRule,
  testCondition,
} from '../src/lib/watchlist/smart-rules.js';
import {
  classCounts,
  computeInsights,
  fmtSignedPct,
  fmtUSD,
  itemsForClass,
  readUrlState,
  writeUrlState,
} from '../src/lib/watchlist/watchlist-view.js';
import { classIdOfType, displayTicker } from '../src/lib/watchlist/asset-classes.js';

const read = (p) => fs.readFileSync(p, 'utf8');
const NOW = Date.parse('2026-11-09T15:00:00Z');
const daysAgo = (n) => new Date(NOW - n * 86400000).toISOString().slice(0, 10);

/* ------------------------------------------------------------------ */
/* Rule language                                                       */
/* ------------------------------------------------------------------ */

test('catalog: each class gets only its conditions', () => {
  assert.deepEqual(conditionsFor('commodity'), ['day_change', 'price']);
  assert.ok(conditionsFor('stock').includes('congress_traded'));
  assert.ok(!conditionsFor('stock').includes('party'));
  assert.deepEqual(conditionsFor('politician'), [
    'party',
    'chamber',
    'state',
    'trade_activity',
    'traded_ticker',
    'trade_size',
  ]);
  for (const t of Object.keys(CONDITIONS)) assert.equal(newCondition(t).type, t);
});

test('sanitizeRule: validates, clamps and rejects', () => {
  const ok = sanitizeRule({
    asset_class: 'stock',
    match: 'weird',
    conditions: [
      { type: 'day_change', op: 'gte', value: '4' },
      { type: 'sector', sectors: ['Technology', 'Nope'] },
    ],
    max_items: 999,
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.rule.match, 'all');
  assert.equal(ok.rule.max_items, 50);
  assert.equal(ok.rule.conditions[0].value, 4);
  assert.deepEqual(ok.rule.conditions[1].sectors, ['Technology']);
  assert.equal(ok.rule.notify, true);

  assert.equal(
    sanitizeRule({ asset_class: 'nope', conditions: [newCondition('price')] }).ok,
    false,
  );
  assert.equal(sanitizeRule({ asset_class: 'stock', conditions: [] }).ok, false);
  assert.equal(
    sanitizeRule({ asset_class: 'commodity', conditions: [newCondition('sector')] }).ok,
    false,
  );
  assert.equal(
    sanitizeRule({
      asset_class: 'stock',
      conditions: Array.from({ length: MAX_CONDITIONS + 1 }, () => newCondition('price')),
    }).ok,
    false,
  );
  assert.equal(
    sanitizeRule({ asset_class: 'stock', conditions: [{ type: 'price', min: 50, max: 10 }] }).ok,
    false,
  );
  assert.equal(
    sanitizeRule({
      asset_class: 'politician',
      conditions: [{ type: 'traded_ticker', ticker: 'not a ticker!' }],
    }).ok,
    false,
  );
  assert.equal(
    sanitizeRule({
      asset_class: 'politician',
      conditions: [{ type: 'state', states: ['ca', 'Texas'] }],
    }).rule.conditions[0].states[0],
    'CA',
  );
});

test('descriptions read as plain language without em dashes', () => {
  assert.equal(
    describeCondition({ type: 'day_change', op: 'gte', value: 3 }),
    'Up 3% or more today',
  );
  assert.equal(
    describeCondition({ type: 'day_change', op: 'lte', value: -2 }),
    'Down 2% or more today',
  );
  assert.equal(
    describeCondition({ type: 'sector', sectors: ['Healthcare', 'Technology'] }),
    'In Health Care or Technology',
  );
  const rule = {
    match: 'any',
    conditions: [
      { type: 'price', min: 10, max: null },
      { type: 'market_cap', min: null, max: 2 },
    ],
  };
  assert.equal(describeRule(rule), 'Price at or above $10 or Market cap of $2B or less');
  for (const t of Object.keys(CONDITIONS))
    assert.doesNotMatch(describeCondition(newCondition(t)), /—/);
});

test('matching: unknown data never matches; all vs any', () => {
  assert.equal(
    testCondition({ type: 'day_change', op: 'gte', value: 3 }, { changePct: null }),
    null,
  );
  assert.match(
    testCondition({ type: 'day_change', op: 'gte', value: 3 }, { changePct: 4.2 }),
    /Up 4\.20%/,
  );
  const cand = {
    type: 'stock',
    ticker: 'NVDA',
    sector: 'Technology',
    price: 120,
    changePct: 1,
    marketCap: 3e12,
  };
  const all = {
    match: 'all',
    conditions: [
      { type: 'sector', sectors: ['Technology'] },
      { type: 'day_change', op: 'gte', value: 3 },
    ],
  };
  assert.equal(evaluateCandidate(cand, all, NOW).match, false);
  assert.equal(evaluateCandidate(cand, { ...all, match: 'any' }, NOW).match, true);
});

test('congressional conditions count distinct members inside the window', () => {
  const c = {
    type: 'congress_traded',
    side: 'buy',
    days: 30,
    min_members: 2,
    min_amount: null,
    party: 'any',
  };
  const trades = [
    { date: daysAgo(3), side: 'buy', member: 'A1', amount: 15000 },
    { date: daysAgo(5), side: 'buy', member: 'A1', amount: 15000 },
    { date: daysAgo(90), side: 'buy', member: 'B2', amount: 15000 },
  ];
  assert.equal(testCondition(c, { trades }, NOW), null, 'one member in window');
  trades.push({ date: daysAgo(10), side: 'buy', member: 'C3', amount: 50000 });
  assert.match(testCondition(c, { trades }, NOW), /2 members/);

  const pol = {
    type: 'politician',
    trades: [{ date: daysAgo(2), side: 'buy', ticker: 'NVDA', amount: 300000 }],
  };
  assert.ok(
    testCondition({ type: 'traded_ticker', ticker: 'NVDA', side: 'buy', days: 90 }, pol, NOW),
  );
  assert.equal(
    testCondition({ type: 'traded_ticker', ticker: 'NVDA', side: 'sell', days: 90 }, pol, NOW),
    null,
  );
  assert.ok(testCondition({ type: 'trade_size', min_amount: 250000, days: 90 }, pol, NOW));
});

test('pickAdds: skips held and already-added, caps per run and by room', () => {
  const rule = { match: 'all', conditions: [{ type: 'day_change', op: 'gte', value: 1 }] };
  const cands = Array.from({ length: 20 }, (_, i) => ({
    type: 'stock',
    ticker: `T${i}`,
    changePct: i + 1,
  }));
  const out = pickAdds(cands, rule, {
    existing: new Set(['stock:T19']),
    seen: new Set(['stock:T18']),
    room: 50,
    now: NOW,
  });
  assert.equal(out.length, PER_RUN_CAP);
  assert.equal(out[0].ticker, 'T17', 'biggest mover first, held and seen skipped');
  assert.equal(pickAdds(cands, rule, { room: 3, now: NOW }).length, 3);
  assert.equal(pickAdds(cands, rule, { room: 0, now: NOW }).length, 0);
});

test('isDue: disabled never, otherwise after the interval', () => {
  assert.equal(isDue({ enabled: false, last_run_at: null }, NOW), false);
  assert.equal(isDue({ enabled: true, last_run_at: null }, NOW), true);
  assert.equal(
    isDue({ enabled: true, last_run_at: new Date(NOW - 10 * 60000).toISOString() }, NOW),
    false,
  );
  assert.equal(
    isDue({ enabled: true, last_run_at: new Date(NOW - 70 * 60000).toISOString() }, NOW),
    true,
  );
});

/* ------------------------------------------------------------------ */
/* Page helpers                                                        */
/* ------------------------------------------------------------------ */

const LIST = {
  id: 'l1',
  stocks: [
    { type: 'stock', ticker: 'AAPL', sector: 'Technology', createdAt: '2026-01-01' },
    {
      type: 'stock',
      ticker: 'XOM',
      sector: 'Energy',
      createdAt: '2026-01-02',
      starredAt: '2026-11-01',
    },
    { type: 'stock', ticker: 'MSFT', sector: 'Technology', createdAt: '2026-01-03' },
    { type: 'crypto', ticker: 'BTCUSD', createdAt: '2026-01-04' },
    { type: 'politician', ticker: 'P000197', name: 'Member', createdAt: '2026-01-05' },
    { type: 'bond', ticker: 'TLT', createdAt: '2026-01-06' },
  ],
};
const QUOTES = {
  AAPL: { price: 200, changePct: 1.5 },
  XOM: { price: 110, changePct: -2 },
  MSFT: { price: 400, changePct: 0.5 },
};

test('items per class: starred first, quotes merged, legacy bond type mapped', () => {
  const items = itemsForClass(LIST, 'stocks', QUOTES);
  assert.deepEqual(
    items.map((i) => i.ticker),
    ['XOM', 'AAPL', 'MSFT'],
  );
  assert.equal(items[1].price, 200);
  assert.deepEqual(classCounts(LIST), {
    stocks: 3,
    bonds: 1,
    commodities: 0,
    politicians: 1,
    crypto: 1,
  });
  assert.equal(classIdOfType('bond'), 'bonds');
  assert.equal(displayTicker('BTCUSD'), 'BTC');
});

test('insights come from the visible items', () => {
  const ins = computeInsights(itemsForClass(LIST, 'stocks', QUOTES), 'stocks');
  assert.equal(ins.up, 2);
  assert.equal(ins.down, 1);
  assert.equal(Math.round(ins.breadthPct), 67);
  assert.equal(ins.best.ticker, 'AAPL');
  assert.equal(ins.worst.ticker, 'XOM');
  assert.equal(ins.sector.name, 'Technology');
  assert.equal(ins.sector.count, 2);
  assert.equal(computeInsights([], 'stocks').breadthPct, null);
});

test('formatting and URL state', () => {
  assert.equal(fmtUSD(1234.5), '$1,234.50');
  assert.equal(fmtUSD(0.1234), '$0.1234');
  assert.equal(fmtUSD(null), 'N/A');
  assert.equal(fmtSignedPct(-4.271), '-4.27%');
  const sp = new URLSearchParams('class=crypto&symbol=btcusd&range=max&list=abc');
  assert.deepEqual(readUrlState(sp), {
    classId: 'crypto',
    symbol: 'BTCUSD',
    range: 'ALL',
    listId: 'abc',
  });
  assert.deepEqual(readUrlState(new URLSearchParams('class=nope&range=2W')), {
    classId: 'stocks',
    symbol: null,
    range: '1M',
    listId: null,
  });
  assert.equal(
    writeUrlState('', { classId: 'stocks', symbol: null, range: '1M', listId: null }),
    '',
  );
  assert.equal(
    writeUrlState('x=1', { classId: 'bonds', symbol: 'TLT', range: '1Y', listId: null }),
    'x=1&class=bonds&symbol=TLT&range=1Y',
  );
});

/* ------------------------------------------------------------------ */
/* Wiring                                                              */
/* ------------------------------------------------------------------ */

const PAGE = 'src/app/(dashboard)/watchlist/page.js';
const CSS = 'src/app/(dashboard)/watchlist/watchlist.css';
const COMPONENTS = ['MonitorParts.jsx', 'MonitorPanels.jsx', 'SmartWatchlist.jsx'].map(
  (f) => `src/components/watchlist/monitor/${f}`,
);

test('page: real data hooks, smart card, no sample data or recharts', () => {
  const page = read(PAGE);
  for (const s of [
    'useWatchlists',
    'useQuotes',
    'useSmartWatchlists',
    'useWatchlistAlerts',
    'SmartWatchlistCard',
    'SmartWatchlistDialog',
    "completeTask('watchlist_1')",
  ]) {
    assert.ok(page.includes(s), s);
  }
  assert.doesNotMatch(page, /from 'recharts'|ASSET_CLASSES\.find|mock(Data|Watchlists)/);
  assert.match(page, /<Suspense/);
});

test('smart notifications land in the Watchlist tab of the bell', () => {
  const engine = read('src/lib/watchlist/smart-engine.js');
  assert.match(engine, /type: 'watchlist'/);
  assert.match(read('src/components/NavNotifications.jsx'), /watchlist/i);
  const sql = read('supabase/migrations/20261114090000_watchlist_monitor_smart.sql');
  for (const s of [
    'smart_watchlist_rules',
    'smart_watchlist_events',
    'enable row level security',
    'starred_at',
    "'politician'",
  ]) {
    assert.ok(sql.toLowerCase().includes(s.toLowerCase()), s);
  }
  assert.match(read('vercel.json'), /\/api\/cron\/smart-watchlists/);
});

test('styles: tokens only, no root max-width, reduced motion', () => {
  const css = read(CSS).replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgba?\(/i, 'no raw colours');
  assert.doesNotMatch(css, /\.wlm-page\s*\{[^}]*max-width/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test('components: Bootstrap Icons only, no em dashes, no raw colours', () => {
  for (const f of [PAGE, ...COMPONENTS]) {
    const src = read(f);
    assert.doesNotMatch(src, /from 'lucide-react'/, f);
    assert.doesNotMatch(src, /—/, `${f} has an em dash`);
    assert.doesNotMatch(src, /['"]#[0-9a-f]{3,8}['"]/i, f);
  }
});

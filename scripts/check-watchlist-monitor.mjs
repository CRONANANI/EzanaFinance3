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
  explainCandidate,
  matchDetails,
} from '../src/lib/watchlist/smart-rules.js';
import {
  NOTE_LIMITS,
  appendCatalyst,
  noteHeadline,
  parseNote,
} from '../src/lib/watchlist/notes.js';
import {
  classCounts,
  computeInsights,
  fmtSignedPct,
  fmtUSD,
  itemsForClass,
  BIG_MOVE_PCT,
  PAGE_SIZE,
  addedLabel,
  bigMoves,
  filterItems,
  paginate,
  pulseSummary,
  sonarPrompt,
  sortItems,
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
/* Market Monitor 2.0: pulse, table, notes, explanations               */
/* ------------------------------------------------------------------ */

test('pulse: tracked, breadth from priced items only, scoped alerts', () => {
  const items = itemsForClass(LIST, 'stocks', { ...QUOTES, MSFT: { price: 400 } });
  const p = pulseSummary({
    list: LIST,
    classId: 'stocks',
    items,
    smartWeekCount: 3,
    unreadAlerts: [
      { created_at: '2026-11-09T14:00:00Z', tickers: ['AAPL'] },
      { created_at: '2026-11-09T14:30:00Z', tickers: ['ZZZZ'] },
      { created_at: '2026-11-09T13:00:00Z', tickers: [] },
    ],
    now: NOW,
  });
  assert.deepEqual(p.tracked, { total: 6, inClass: 3, classLabel: 'Stocks' });
  assert.deepEqual(p.breadth, { priced: 2, up: 1, down: 1, pct: 50 });
  assert.equal(p.disclosures, null);
  assert.deepEqual(p.smartMatches, { count: 3, days: 7 });
  assert.deepEqual(p.alerts, { unread: 1, latestAt: '2026-11-09T14:00:00Z', scoped: true });

  const untagged = pulseSummary({
    list: LIST,
    classId: 'stocks',
    items,
    unreadAlerts: [{ created_at: '2026-11-08T10:00:00Z' }, { created_at: '2026-11-09T10:00:00Z' }],
    now: NOW,
  });
  assert.deepEqual(untagged.alerts, {
    unread: 2,
    latestAt: '2026-11-09T10:00:00Z',
    scoped: false,
  });
  assert.equal(pulseSummary({ list: LIST, classId: 'crypto', items: [] }).breadth, null);
});

test('pulse: politicians show disclosures, never breadth', () => {
  const items = itemsForClass(LIST, 'politicians', {});
  const p = pulseSummary({
    list: LIST,
    classId: 'politicians',
    items,
    politicians: {
      P000197: { trades: [{ date: '2026-11-01' }, { date: '2026-10-20' }, { date: '2026-08-01' }] },
    },
    now: NOW,
  });
  assert.equal(p.breadth, null);
  assert.deepEqual(p.disclosures, { count: 2, capped: false, days: 30 });
  assert.equal(
    pulseSummary({ list: LIST, classId: 'politicians', items, politicians: {}, now: NOW })
      .disclosures,
    null,
    'no data means the card is omitted, not zero',
  );
});

test('table: sort, filter, paginate, big moves, added label', () => {
  const rows = [
    { type: 'stock', ticker: 'MSFT', name: 'Microsoft', price: 400, changePct: 0.5 },
    { type: 'stock', ticker: 'AAPL', name: 'Apple', price: 200, changePct: -6 },
    { type: 'stock', ticker: 'NEW', name: 'No quote yet', price: null, changePct: null },
    {
      type: 'crypto',
      ticker: 'BTCUSD',
      name: 'Bitcoin',
      price: 90000,
      changePct: 7.2,
      starredAt: '2026-11-01',
      addedBy: 'smart',
      addedReason: 'Up 7.20% today',
    },
  ];
  const tickers = (xs) => xs.map((r) => r.ticker);
  assert.deepEqual(tickers(sortItems(rows, null)), tickers(rows), 'no key keeps the order');
  assert.deepEqual(tickers(sortItems(rows, 'ticker', 'asc')), ['AAPL', 'BTCUSD', 'MSFT', 'NEW']);
  assert.deepEqual(tickers(sortItems(rows, 'price', 'desc')), ['BTCUSD', 'MSFT', 'AAPL', 'NEW']);
  assert.deepEqual(
    tickers(sortItems(rows, 'changePct', 'asc')),
    ['AAPL', 'MSFT', 'BTCUSD', 'NEW'],
    'rows without a value sink in both directions',
  );
  assert.notEqual(sortItems(rows, 'price'), rows, 'never sorts in place');

  assert.deepEqual(tickers(filterItems(rows, { q: 'btc' })), ['BTCUSD']);
  assert.deepEqual(tickers(filterItems(rows, { q: ' apple ' })), ['AAPL']);
  assert.deepEqual(tickers(filterItems(rows, { starredOnly: true })), ['BTCUSD']);
  assert.deepEqual(tickers(filterItems(rows, { smartOnly: true })), ['BTCUSD']);
  assert.equal(filterItems(rows, {}).length, 4);

  const many = Array.from({ length: 40 }, (_, i) => ({ ticker: `T${i}` }));
  assert.equal(PAGE_SIZE, 25);
  const p2 = paginate(many, 2);
  assert.deepEqual(
    {
      n: p2.rows.length,
      page: p2.page,
      pages: p2.pages,
      from: p2.from,
      to: p2.to,
      total: p2.total,
    },
    { n: 15, page: 2, pages: 2, from: 26, to: 40, total: 40 },
  );
  assert.equal(paginate(many, 99).page, 2, 'page is clamped');
  assert.deepEqual(
    { from: paginate([], 1).from, to: paginate([], 1).to, pages: paginate([], 1).pages },
    { from: 0, to: 0, pages: 1 },
  );

  assert.equal(BIG_MOVE_PCT, 5);
  assert.deepEqual(tickers(bigMoves(rows)), ['BTCUSD', 'AAPL']);
  assert.deepEqual(addedLabel(rows[0]), { smart: false, text: 'Manual' });
  assert.deepEqual(addedLabel(rows[3]), { smart: true, text: 'Up 7.20% today' });
  assert.doesNotMatch(sonarPrompt(rows[3]) + sonarPrompt({ type: 'politician', name: 'A' }), /—/);
  assert.match(sonarPrompt(rows[3]), /Bitcoin \(BTC\)/);
});

test('notes: limits, trimming, unknown keys, empty and past dates', () => {
  const base = { type: 'stock', ticker: ' aapl ' };
  const ok = parseNote(
    { ...base, hypothesis: '  Services margin keeps expanding.\r\n\r\n\r\n\r\nWatch.  ' },
    { today: '2026-11-14' },
  );
  assert.equal(ok.ok, true);
  assert.equal(ok.note.ticker, 'AAPL');
  assert.equal(ok.note.hypothesis, 'Services margin keeps expanding.\n\nWatch.');
  assert.equal(ok.note.reviewOn, null);
  assert.deepEqual(Object.keys(ok.note).sort(), [
    'catalysts',
    'hypothesis',
    'metrics',
    'reviewOn',
    'risks',
    'ticker',
    'type',
  ]);

  assert.equal(parseNote({ ...base, hypothesis: '   ' }).ok, false, 'all empty is rejected');
  assert.equal(parseNote({ ...base, risks: 'x', user_id: 'someone-else' }).ok, false);
  assert.equal(parseNote({ ...base, risks: 5 }).field, 'risks');
  assert.equal(
    parseNote({ ...base, hypothesis: 'a'.repeat(NOTE_LIMITS.hypothesis + 1) }).field,
    'hypothesis',
  );
  assert.equal(parseNote({ ...base, hypothesis: 'a'.repeat(NOTE_LIMITS.hypothesis) }).ok, true);
  assert.equal(parseNote({ type: 'fund', ticker: 'AAPL', risks: 'x' }).ok, false);
  assert.equal(parseNote({ type: 'stock', ticker: 'A B', risks: 'x' }).ok, false);
  assert.equal(parseNote({ type: 'politician', ticker: 'P000197', risks: 'x' }).ok, true);
  assert.equal(parseNote({ type: 'commodity', ticker: 'GC=F', metrics: 'x' }).ok, true);

  const t = { today: '2026-11-14' };
  assert.equal(parseNote({ ...base, risks: 'x', reviewOn: '2026-11-13' }, t).field, 'reviewOn');
  assert.equal(
    parseNote({ ...base, risks: 'x', reviewOn: '2026-11-14' }, t).note.reviewOn,
    '2026-11-14',
  );
  assert.equal(parseNote({ ...base, risks: 'x', reviewOn: '2026-13-40' }, t).ok, false);
  assert.equal(parseNote({ ...base, risks: 'x', reviewOn: '' }, t).note.reviewOn, null);
  assert.equal(parseNote(null).ok, false);
  assert.equal(parseNote([]).ok, false);

  assert.equal(noteHeadline({ hypothesis: '', risks: 'Rates' }), 'Rates');
  assert.equal(noteHeadline(null), '');
  assert.equal(appendCatalyst('', 'Earnings, Nov 5 (est.)'), 'Earnings, Nov 5 (est.)');
  assert.equal(appendCatalyst('A', 'A'), 'A', 'no duplicate lines');
  assert.equal(appendCatalyst('A', 'B'), 'A\nB');
  const full = 'x'.repeat(NOTE_LIMITS.catalysts);
  assert.equal(appendCatalyst(full, 'B'), full, 'never over the limit');
});

test('explanations: observed values, stored reason text unchanged', () => {
  const rule = {
    match: 'all',
    conditions: [
      { type: 'day_change', op: 'gte', value: 3 },
      { type: 'sector', sectors: ['Energy'] },
    ],
  };
  const hit = { type: 'stock', ticker: 'FSLR', changePct: 4.25, sector: 'Energy' };
  assert.equal(testCondition(rule.conditions[0], hit, NOW), 'Up 4.25% today');
  assert.equal(evaluateCandidate(hit, rule, NOW).reasons.join(' · '), 'Up 4.25% today · Energy');

  const e = explainCandidate(hit, rule, NOW);
  assert.equal(e.matchesNow, true);
  assert.equal(e.evaluatedAt, new Date(NOW).toISOString());
  assert.deepEqual(e.conditions, [
    { description: 'Up 3% or more today', met: true, observed: '+4.25% today' },
    { description: describeCondition(rule.conditions[1]), met: true, observed: 'Energy' },
  ]);

  const faded = explainCandidate({ ...hit, changePct: -0.53 }, rule, NOW);
  assert.equal(faded.matchesNow, false);
  assert.deepEqual(
    faded.conditions.map((c) => [c.met, c.observed]),
    [
      [false, '-0.53% today'],
      [true, 'Energy'],
    ],
  );

  const blind = explainCandidate({ ...hit, changePct: null }, rule, NOW);
  assert.equal(blind.matchesNow, null, 'missing data is unknown, not a failed match');
  assert.equal(blind.conditions[0].observed, null);

  const any = explainCandidate({ ...hit, changePct: null }, { ...rule, match: 'any' }, NOW);
  assert.equal(any.matchesNow, true);

  const d = matchDetails(hit, rule, NOW);
  assert.deepEqual(d, {
    evaluatedAt: new Date(NOW).toISOString(),
    match: 'all',
    conditions: [
      { description: 'Up 3% or more today', observed: '+4.25% today' },
      { description: describeCondition(rule.conditions[1]), observed: 'Energy' },
    ],
  });

  const [add] = pickAdds([hit], rule, { now: NOW });
  assert.equal(add.reason, 'Up 4.25% today · Energy', 'the stored reason is unchanged');
  assert.deepEqual(add.details, d);

  const pol = {
    type: 'politician',
    ticker: 'P000197',
    party: 'D',
    chamber: 'house',
    state: 'CA',
    trades: [
      { date: '2026-11-01', side: 'buy', ticker: 'NVDA', amount: 500000 },
      { date: '2026-10-25', side: 'sell', ticker: 'AAPL', amount: 15000 },
    ],
  };
  const polRule = {
    match: 'all',
    conditions: [
      { type: 'party', parties: ['D'] },
      { type: 'trade_activity', side: 'any', days: 30, min_trades: 3 },
      { type: 'traded_ticker', ticker: 'NVDA', side: 'buy', days: 90 },
      { type: 'trade_size', min_amount: 250000, days: 90 },
    ],
  };
  const pe = explainCandidate(pol, polRule, NOW);
  assert.deepEqual(
    pe.conditions.map((c) => [c.met, c.observed]),
    [
      [true, 'Democrat'],
      [false, '2 trades in 30d'],
      [true, 'bought on 2026-11-01'],
      [true, 'Largest $500K in 90d'],
    ],
  );
  assert.equal(pe.matchesNow, false);
  for (const c of [...e.conditions, ...pe.conditions])
    assert.doesNotMatch(`${c.description}${c.observed}`, /—/);
});

/* ------------------------------------------------------------------ */
/* Wiring                                                              */
/* ------------------------------------------------------------------ */

const PAGE = 'src/app/(dashboard)/watchlist/page.js';
const CSS = 'src/app/(dashboard)/watchlist/watchlist.css';
const COMPONENTS = [
  ...[
    'MonitorParts.jsx',
    'MonitorPanels.jsx',
    'SmartWatchlist.jsx',
    'CommandBar.jsx',
    'PulseRow.jsx',
    'SecuritiesTable.jsx',
    'MonitoringNote.jsx',
    'SignalExplainer.jsx',
    'CatalystPanel.jsx',
  ].map((f) => `src/components/watchlist/monitor/${f}`),
  'src/components/watchlist/NewWatchlistDialog.jsx',
];

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

test('stage A: atomic move, undo keeps provenance, no market cap placeholder', () => {
  const items = read('src/app/api/watchlists/[listId]/items/route.js');
  const move = read('src/app/api/watchlists/[listId]/items/move/route.js');
  const hook = read('src/hooks/useWatchlists.js');
  const page = read(PAGE);
  for (const f of [items, hook, read('src/app/api/watchlists/route.js')])
    assert.doesNotMatch(f, /marketCap: '–'/, 'the placeholder hid the real market cap');
  assert.match(move, /\.update\(\{ list_id: toId \}\)/, 'a move is one UPDATE of list_id');
  assert.doesNotMatch(
    move,
    /from\('user_watchlist_items'\)\s*\.(insert|upsert|delete)\(/,
    'never add then remove',
  );
  assert.match(move, /\.eq\('user_id', user\.id\)/);
  assert.match(items, /parseRestore/);
  assert.match(items, /removed/);
  assert.match(hook, /moveItem/);
  assert.match(hook, /loadWatchlistsOnce/, 'the layout and the page share one request');
  assert.match(page, /moveItem\(activeList\.id, toId/);
  assert.match(page, /restore:/);
});

test('migration: notes are owner-only, smart events carry match details', () => {
  const sql = read(
    'supabase/migrations/20261120090000_watchlist_notes_and_match_details.sql',
  ).toLowerCase();
  for (const s of [
    'create table if not exists public.user_watchlist_notes',
    'enable row level security',
    'for select to authenticated',
    'for insert to authenticated',
    'for update to authenticated',
    'for delete to authenticated',
    'uq_user_watchlist_notes_user_item',
    'add column if not exists details jsonb',
  ]) {
    assert.ok(sql.includes(s), s);
  }
  assert.equal(
    (sql.match(/auth\.uid\(\) = user_id/g) || []).length,
    5,
    'every policy is owner-scoped',
  );
  assert.doesNotMatch(sql, /using \(true\)|with check \(true\)/);
  const engine = read('src/lib/watchlist/smart-engine.js');
  assert.match(engine, /details: m\.details \|\| null/);
  const notes = read('src/app/api/watchlists/notes/route.js');
  assert.match(notes, /withApiGuard/);
  assert.match(notes, /requireAuth: true/);
  assert.doesNotMatch(
    read('src/lib/watchlist/notes-server.js'),
    /getAdminClient/,
    'notes use the caller client',
  );
});

test('selection never sits on text; the side column rule is emerald; no bottom cards', () => {
  const css = read(CSS);
  assert.doesNotMatch(
    css,
    /box-shadow:\s*inset\s+-?\d+px\s+0\s+0/,
    'no left or right bar drawn over a flush row (it overlaps the text)',
  );
  assert.match(css, /\.wlm-mylists__row\.is-on \.wlm-strong \{\s*color: var\(--emerald-text\)/);
  assert.match(css, /\.ez-canvas \.wl-side\.wlm-side \{\s*border-left-color: var\(--emerald\)/);
  const all = [PAGE, ...COMPONENTS].map(read).join('\n');
  assert.doesNotMatch(all, /SignalsCard|RecentAlertsCard|LearnRow|wlm-duo/);
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

test('stage B: layout wiring, text-only tabs, one list selector', () => {
  const all = [PAGE, ...COMPONENTS].map(read).join('\n');
  for (const s of [
    'data-task-target="watchlist-add-button"',
    'data-task-target="watchlist-create-list"',
    'pulseSummary',
    'sortItems',
    'filterItems',
    'paginate',
    'renameList',
    'deleteList',
    '/trading/mock?symbol=',
    '/sonar?q=',
    'Checked while Ezana is open in this browser.',
    'wl-strip-card',
    'wl-chart-panel',
    'wl-side',
  ]) {
    assert.ok(all.includes(s), s);
  }
  assert.doesNotMatch(all, /QuoteStrip|AlsoInWatchlist|CoursesCard/);
  assert.doesNotMatch(all, /suitab|risk tolerance|alignment score|real-time|continuously/i);
  assert.doesNotMatch(read(PAGE), /wlm-title|<h1/, 'no page title block');
  assert.doesNotMatch(read(PAGE), /<select/, 'one list selector, the command bar dropdown');
  const dialog = read('src/components/watchlist/NewWatchlistDialog.jsx');
  assert.match(dialog, /key: 'bond_etf'/, 'Bond ETF is a new-list kind');
  assert.match(dialog, /BOND_ETFS/);
  const css = read(CSS).replace(/\/\*[\s\S]*?\*\//g, '');
  const onTab = css.match(/\.wlm-tab\.is-on \{[^}]*\}/g).pop();
  assert.doesNotMatch(onTab, /border|background/, 'tabs are text only');
  assert.match(css, /\.wlm-table :is\(th, td\):first-child \{\s*padding-left: 0;/);
  const tbl = read('src/components/watchlist/monitor/SecuritiesTable.jsx');
  assert.match(
    tbl,
    /type === 'stock' \|\| item\?\.type === 'bond_etf'/,
    'paper trading: stocks and bond ETFs',
  );
  assert.match(read('src/hooks/useWatchlistMonitor.js'), /weekCounts: d\.weekCounts/);
});

test('stage C: smart card shows real run state, errors, and matches', () => {
  const card = read('src/components/watchlist/monitor/SmartWatchlist.jsx');
  for (const s of [
    'Not run yet',
    'Checks hourly',
    'role="switch"',
    'rule.lastError',
    '<Alert',
    'View matches',
    'Open list',
    'Edit rule',
    'Run',
  ]) {
    assert.ok(card.includes(s), s);
  }
  assert.doesNotMatch(card, /Waiting for first run|bi-stars/);
  assert.match(read(PAGE), /setSmartOnly\(true\)/, 'View matches sets the smart-only filter');
});

test('market monitor 2.0: wiring', () => {
  const all = [PAGE, ...COMPONENTS].map(read).join('\n');
  for (const s of [
    'data-task-target="watchlist-add-button"',
    'data-task-target="watchlist-create-list"',
    'pulseSummary',
    'sortItems',
    'filterItems',
    'paginate',
    'useWatchlistNotes',
    'useWatchlistCatalysts',
    'useSmartExplain',
    'renameList',
    'deleteList',
    '/trading/mock?symbol=',
    '/sonar?q=',
  ]) {
    assert.ok(all.includes(s), s);
  }
  assert.doesNotMatch(all, /QuoteStrip|AlsoInWatchlist/);
  assert.doesNotMatch(all, /suitab|risk tolerance|alignment score|real-time|continuously/i);
});

test('stage D: note, explainer and catalysts follow the stored facts', () => {
  const note = read('src/components/watchlist/monitor/MonitoringNote.jsx');
  const explainer = read('src/components/watchlist/monitor/SignalExplainer.jsx');
  const cat = read('src/components/watchlist/monitor/CatalystPanel.jsx');
  for (const s of [
    'parseNote(',
    'NOTE_FIELDS',
    'NOTE_LABELS',
    'NOTE_LIMITS',
    'noteHeadline',
    'Review by',
  ])
    assert.ok(note.includes(s), s);
  assert.match(note, /error\?\.field === f/, 'the field error shows inline');
  assert.match(note, /Delete this note\?/, 'delete confirms inside the modal');
  assert.match(explainer, /aria-live="polite"/);
  assert.match(explainer, /Still matches/);
  assert.match(explainer, /No longer\s+matches/);
  assert.match(explainer, /details\.conditions/);
  assert.match(explainer, /Added manually|added manually/);
  assert.doesNotMatch(explainer, /score|suitab|should|recommend/i, 'rule facts only');
  assert.match(cat, /\(est\.\)/);
  assert.match(cat, /Add to monitoring note/);
  assert.match(cat, /Research with Sonar/);
  assert.match(read(PAGE), /appendCatalyst\(/);
});

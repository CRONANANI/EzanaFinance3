/**
 * Sonar commodity stats (Nov 1): the figures in a brief that open a price
 * chart, the brief's window start, and the series route's feed order
 * (primary market data, then the fallback feed). Network is stubbed.
 *   npm run test:sonar-commodities
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.FMP_API_KEY = 'test-fmp';
process.env.ALPHA_VANTAGE_API_KEY = 'test-av';

const { commoditySegments, windowStart, COMMODITY_BY_ID } =
  await import('@/lib/sonar/commodity-stats');
const { getCommoditySeries } = await import('@/lib/sonar/commodity-series');

const BRIEF =
  'Since the Iran war began on February 28, 2026, supply disruptions through the Strait of Hormuz have driven tungsten up 557%, oil 40–55%, fertilizers roughly 75%, and aluminum 12% [S5].';

test('every commodity figure in the brief becomes a stat, text intact', () => {
  const segs = commoditySegments(BRIEF);
  assert.equal(segs.map((s) => s.text).join(''), BRIEF, 'nothing lost or reordered');
  const stats = segs.filter((s) => s.stat);
  assert.deepEqual(
    stats.map((s) => [s.text, s.stat.id, s.stat.figure]),
    [
      ['tungsten up 557%', 'tungsten', '557%'],
      ['oil 40–55%', 'oil', '40–55%'],
      ['fertilizers roughly 75%', 'fertilizer', '75%'],
      ['aluminum 12%', 'aluminum', '12%'],
    ],
  );
});

test('stat matching: figure after the name, clause breaks, whole words', () => {
  const after = commoditySegments('Analysts flagged a 75% jump in fertilizer costs.');
  assert.equal(after.find((s) => s.stat)?.text, '75% jump in fertilizer');
  assert.equal(
    commoditySegments('Oil traded higher. Exports fell 12%.').filter((s) => s.stat).length,
    0,
    'a sentence break separates them',
  );
  assert.equal(
    commoditySegments('Goldman raised its target 8%.').filter((s) => s.stat).length,
    0,
    'Goldman is not gold',
  );
  assert.equal(commoditySegments('Brent rose 9%.').find((s) => s.stat)?.stat.id, 'brent');
  assert.equal(commoditySegments('natural gas up 30%').find((s) => s.stat)?.stat.id, 'natgas');
  assert.deepEqual(commoditySegments('No commodities here.'), [{ text: 'No commodities here.' }]);
});

test('window start comes from the brief', () => {
  assert.equal(windowStart(BRIEF), '2026-02-28');
  assert.equal(windowStart('disrupted markets since late February 2026'), '2026-02-01');
  assert.equal(windowStart('no date here'), null);
});

test('proxies say so; every commodity has a primary symbol', () => {
  for (const c of Object.values(COMMODITY_BY_ID)) assert.ok(c.fmp, c.id);
  assert.match(COMMODITY_BY_ID.tungsten.proxy, /No traded tungsten price/);
  assert.ok(
    !/fmp|alpha vantage|financialmodelingprep/i.test(
      JSON.stringify(COMMODITY_BY_ID).replace(/"(fmp|av|avEquity)":/g, ''),
    ),
  );
});

let calls = [];
let fmpRows = [];
let avRows = [];
beforeEach(() => {
  calls = [];
});
globalThis.fetch = async (url) => {
  const u = new URL(String(url));
  calls.push(
    `${u.hostname}${u.pathname}?${u.searchParams.get('symbol') || u.searchParams.get('function')}`,
  );
  const body = u.hostname.includes('financialmodelingprep') ? fmpRows : { data: avRows };
  return new Response(JSON.stringify(body), { status: 200 });
};

test('series: primary feed first, oldest to newest, change measured', async () => {
  fmpRows = [
    { symbol: 'CLUSD', date: '2026-10-30', price: 90 },
    { symbol: 'CLUSD', date: '2026-03-02', price: 60 },
  ];
  const s = await getCommoditySeries('oil', '2026-02-28');
  assert.equal(s.from, '2026-02-28');
  assert.deepEqual(
    s.points.map((p) => p.d),
    ['2026-03-02', '2026-10-30'],
  );
  assert.equal(Math.round(s.changePct), 50);
  assert.equal(s.feed, 'primary');
  assert.ok(calls[0].includes('historical-price-eod/light?CLUSD'));
});

test('series: falls back to the second feed when the primary is empty', async () => {
  fmpRows = [];
  avRows = [
    { date: '2026-10-01', value: '2600' },
    { date: '2026-03-01', value: '2300' },
    { date: '2025-01-01', value: '.' },
  ];
  const s = await getCommoditySeries('aluminum', '2026-02-28');
  assert.equal(s.feed, 'fallback');
  assert.deepEqual(
    s.points.map((p) => p.v),
    [2300, 2600],
  );
  assert.ok(calls.some((c) => c.includes('alphavantage.co/query?ALUMINUM')));
});

test('series: unknown id is null, a total miss is empty', async () => {
  assert.equal(await getCommoditySeries('unobtainium', '2026-01-01'), null);
  fmpRows = [];
  avRows = [];
  const s = await getCommoditySeries('cocoa', '2026-02-28');
  assert.deepEqual(s.points, []);
  assert.equal(s.changePct, null);
});

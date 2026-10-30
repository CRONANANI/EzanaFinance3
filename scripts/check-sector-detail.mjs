/**
 * Sector modal (Oct 30): Top Performers and Recent News were empty for every
 * sector. Production showed the screener returning 141 Utilities rows and the
 * bulk quote endpoint answering 402 on the plan; news keyword-filtered two
 * general feeds. Offline checks with every upstream stubbed (global fetch):
 * the label map, ranking through the per-symbol fallback, the news symbols
 * fallback, and one panel surviving the other's failure.
 */
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.FMP_API_KEY = 'test-key';
process.env.marketaux = 'test-token';

const { SECTOR_MAP, UI_SECTORS, mapSector } = await import('@/lib/research/sectorMap');
const { getSectorDetail, resetRefusals, TOP_N } = await import('@/lib/research/sector-detail');

/* 14 Utilities names; returns spread so the order is checkable. */
const UNIVERSE = Array.from({ length: 14 }, (_, i) => ({
  symbol: `UT${String(i).padStart(2, '0')}`,
  companyName: `Utility ${i}`,
  marketCap: (20 - i) * 1e10,
  price: 50 + i,
}));
const PCT = (sym) => ((Number(sym.slice(2)) * 7) % 13) - 4; // -4..8, distinct per symbol

function article(i, extra = {}) {
  return {
    uuid: `a${i}`,
    title: `Utilities story ${i}`,
    url: `https://news.example/${i}`,
    source: 'example.com',
    published_at: new Date(Date.now() - i * 3_600_000).toISOString(),
    entities: [{ symbol: 'UT00' }],
    ...extra,
  };
}

let scenario;
let seen;
let seenSymbols = [];
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

globalThis.fetch = async (url) => {
  const u = new URL(String(url));
  const path = u.pathname.replace('/stable', '');
  seen.push(`${u.host}${path}`);
  seenSymbols.push(u.searchParams.get('symbol') || u.searchParams.get('symbols') || '');
  if (u.host === 'api.marketaux.com') {
    if (scenario.newsDown) return json({ error: { code: 'server_error' } }, 500);
    if (u.searchParams.get('industries')) {
      return json({ data: Array.from({ length: scenario.industryCount }, (_, i) => article(i)) });
    }
    if (u.searchParams.get('symbols')) {
      return json({ data: [article(0), article(20), article(21), article(22)] });
    }
    return json({ data: [] });
  }
  if (u.host === 'finnhub.io') {
    const sym = u.searchParams.get('symbol');
    /* "shared" is one story tagged to every symbol: it must appear once. */
    const shared = {
      id: 999,
      headline: 'Sector-wide story',
      summary: '',
      source: 'Example Wire',
      url: 'https://wire.example/shared',
      datetime: Math.floor(Date.now() / 1000) - 7200,
      related: sym,
    };
    return json([
      shared,
      ...[0, 1].map((i) => ({
        id: Number(sym.slice(2)) * 10 + i,
        headline: `${sym} headline ${i}`,
        summary: '',
        source: 'Example Wire',
        url: `https://wire.example/${sym}/${i}`,
        datetime: Math.floor(Date.now() / 1000) - i * 3600,
        related: sym,
      })),
    ]);
  }
  if (path === '/company-screener') {
    if (scenario.screenerDown) return json({ 'Error Message': 'down' }, 500);
    return json(u.searchParams.get('sector') === 'Utilities' ? UNIVERSE : UNIVERSE);
  }
  if (path === '/batch-quote') return json({ 'Error Message': 'Restricted' }, 402);
  if (path === '/quote') {
    const s = u.searchParams.get('symbol');
    return json([{ symbol: s, name: `Utility ${s}`, price: 60, changePercentage: PCT(s) }]);
  }
  if (path === '/stock-price-change') {
    const s = u.searchParams.get('symbol');
    if (s.includes(',')) return json([]); // plan takes one symbol at a time
    return json([{ symbol: s, '1D': PCT(s), '5D': PCT(s) * 2, '1M': PCT(s) * 3, ytd: 1 }]);
  }
  return json([], 404);
};

beforeEach(() => {
  scenario = { industryCount: 10, newsDown: false, screenerDown: false };
  seen = [];
  seenSymbols = [];
  resetRefusals();
});

test('sectorMap: every UI sector maps to a screener and a news name', () => {
  assert.equal(UI_SECTORS.length, 11);
  for (const s of UI_SECTORS) {
    const m = mapSector(s);
    assert.ok(m?.fmp && m?.news, `${s} maps`);
  }
  assert.equal(mapSector('Health Care').fmp, 'Healthcare');
  assert.equal(mapSector('Financials').fmp, 'Financial Services');
  assert.equal(mapSector('Consumer Staples').fmp, 'Consumer Defensive');
  assert.equal(mapSector('Consumer Discretionary').fmp, 'Consumer Cyclical');
  assert.equal(mapSector('Materials').news, 'Basic Materials');
  assert.equal(mapSector('Information Technology').fmp, 'Technology');
  assert.deepEqual(mapSector('utilities'), SECTOR_MAP.Utilities, 'case-insensitive');
  assert.equal(mapSector('Crypto'), null);
});

test('Utilities 1D: 10 performers, descending, through the per-symbol fallback', async () => {
  const d = await getSectorDetail('Utilities', '1D');
  assert.equal(d.topPerformers.length, TOP_N);
  const r = d.topPerformers.map((p) => p.returnPct);
  assert.deepEqual(
    r,
    [...r].sort((a, b) => b - a),
    'sorted descending',
  );
  assert.ok(d.topPerformers.every((p) => p.symbol && p.name && Number.isFinite(p.price)));
  assert.ok(
    d.topPerformers.every((p) => Number.isFinite(p.marketCap)),
    'market cap carried',
  );
  assert.ok(
    seen.some((s) => s.endsWith('/batch-quote')),
    'bulk tried first',
  );
  assert.ok(seen.filter((s) => s.endsWith('/quote')).length >= TOP_N, 'then one per symbol');
  assert.equal(d.performanceRange, '1D');
  assert.equal(d.errors.performers, false);
});

test('a refused bulk endpoint is not retried on the next click', async () => {
  await getSectorDetail('Utilities', '1D');
  seen = [];
  await getSectorDetail('Utilities', '1D');
  assert.ok(!seen.some((s) => s.endsWith('/batch-quote')));
});

test('1M ranks by the price-change field, per symbol when the list call is empty', async () => {
  const d = await getSectorDetail('Utilities', '1M');
  assert.equal(d.performanceRange, '1M');
  assert.equal(d.topPerformers.length, TOP_N);
  assert.equal(d.topPerformers[0].returnPct, Math.max(...UNIVERSE.map((u) => PCT(u.symbol) * 3)));
});

test('news: industry filter first, symbols fallback under the target, deduped', async () => {
  scenario.industryCount = 2;
  const d = await getSectorDetail('Utilities', '1D');
  const ids = d.news.map((n) => n.id);
  assert.equal(new Set(ids).size, ids.length, 'deduped');
  assert.equal(d.news.length, 5, '2 industry + 3 new from the symbols call');
  assert.ok(seen.filter((s) => s.startsWith('api.marketaux.com')).length === 2);
  assert.ok(d.news.every((n) => n.title && n.url && n.source && n.publishedAt));
  const times = d.news.map((n) => new Date(n.publishedAt).getTime());
  assert.deepEqual(
    times,
    [...times].sort((a, b) => b - a),
    'newest first',
  );
});

test('news: a full industry answer makes one call only', async () => {
  const d = await getSectorDetail('Utilities', '1D');
  assert.equal(d.news.length, 10);
  assert.equal(seen.filter((s) => s.startsWith('api.marketaux.com')).length, 1);
});

test('news down: performers still render, news flags its own error', async () => {
  scenario.newsDown = true;
  const d = await getSectorDetail('Utilities', '1D');
  assert.equal(d.topPerformers.length, TOP_N);
  assert.equal(d.errors.news, true);
  assert.equal(d.errors.performers, false);
});

test('screener down: news still renders, performers flag their own error', async () => {
  scenario.screenerDown = true;
  const d = await getSectorDetail('Utilities', '1D');
  assert.equal(d.errors.performers, true);
  assert.equal(d.errors.news, false);
  assert.equal(d.news.length, 10);
});

test('an unknown sector returns null (the route answers 400)', async () => {
  assert.equal(await getSectorDetail('Not A Sector', '1D'), null);
});

test('no news token: company headlines for the largest names fill the panel', async () => {
  const saved = process.env.marketaux;
  delete process.env.marketaux;
  process.env.FINNHUB_API_KEY = 'test-finnhub';
  try {
    const d = await getSectorDetail('Utilities', '1D');
    assert.equal(d.errors.news, false);
    assert.equal(
      d.news.length,
      7,
      'two per name for the three largest, plus the shared story once',
    );
    assert.equal(d.news.filter((n) => n.url === 'https://wire.example/shared').length, 1);
    assert.ok(!seen.some((s) => s.startsWith('api.marketaux.com')), 'no call without a token');
    assert.ok(d.news.every((n) => n.source === 'Example Wire' && n.url && n.publishedAt));
  } finally {
    process.env.marketaux = saved;
    delete process.env.FINNHUB_API_KEY;
  }
});

test("a company's notes and preferreds collapse into its common stock", async () => {
  UNIVERSE.push({ symbol: 'UT00N', companyName: 'Utility 0', marketCap: 1e12, price: 25 });
  try {
    const d = await getSectorDetail('Utilities', '1D');
    assert.ok(!d.topPerformers.some((p) => p.symbol === 'UT00N'));
    assert.ok(!seenSymbols.some((s) => s.split(',').includes('UT00N')), 'never priced');
  } finally {
    UNIVERSE.pop();
  }
});

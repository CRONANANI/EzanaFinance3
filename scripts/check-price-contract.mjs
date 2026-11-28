/**
 * Shared price-access contract (Sonar 6.4 final integration). Pure fixtures, no network.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PRICE_CONTRACT_VERSION,
  fromFmpQuote,
  fromAlpacaBar,
  fromCacheRow,
  fromAlphaVantageQuote,
  fromFinnhubQuote,
  unavailablePrice,
  usableForValuation,
} from '../src/lib/prices/price-contract.js';

const ASOF = '2026-11-27';
const FIELDS = [
  'security',
  'price',
  'currency',
  'priceDate',
  'kind',
  'adjustment',
  'provider',
  'freshness',
  'redistribution',
  'state',
  'reason',
  'cacheVersion',
];

test('every source normalizes to the same shape', () => {
  const pts = [
    fromFmpQuote(
      { symbol: 'BRK-B', price: 480.1, timestamp: Date.parse('2026-11-27T21:00:00Z') / 1000 },
      { asOf: ASOF },
    ),
    fromAlpacaBar('AAPL', { t: '2026-11-26T05:00:00Z', c: 231.2 }, { asOf: ASOF }),
    fromCacheRow(
      { ticker: 'MSFT', date: '2026-11-26', close: 410, adj_close: 409, volume: 1e7 },
      { asOf: ASOF },
    ),
    fromAlphaVantageQuote(
      {
        'Global Quote': {
          '01. symbol': 'IBM',
          '05. price': '250.00',
          '07. latest trading day': '2026-11-26',
        },
      },
      { asOf: ASOF },
    ),
    fromFinnhubQuote(
      'NVDA',
      { c: 180, t: Date.parse('2026-11-26T21:00:00Z') / 1000 },
      { asOf: ASOF },
    ),
  ];
  for (const p of pts) {
    for (const k of FIELDS) assert.ok(k in p, `${p.provider} lacks ${k}`);
    assert.equal(p.cacheVersion, PRICE_CONTRACT_VERSION);
    assert.equal(p.state, 'live');
    assert.equal(p.freshness, 'current');
  }
  assert.equal(pts[0].security, 'BRK.B');
  assert.equal(pts[0].adjustment, 'unadjusted');
  assert.equal(pts[1].adjustment, 'unadjusted');
  assert.equal(pts[2].adjustment, 'unadjusted');
});

test('missing or zero prices are unavailable, never zero', () => {
  assert.equal(fromFinnhubQuote('ZZZ', { c: 0, t: 0 }, { asOf: ASOF }).state, 'unavailable');
  assert.equal(fromFmpQuote({ symbol: 'X', price: null }, { asOf: ASOF }).price, null);
  assert.equal(
    fromCacheRow({ ticker: 'X', date: '2026-11-26', close: '' }, { asOf: ASOF }).state,
    'unavailable',
  );
  const u = unavailablePrice('x', 'fmp', 'provider refused (403)');
  assert.equal(u.security, 'X');
  assert.equal(u.reason, 'provider refused (403)');
  assert.equal(usableForValuation(u), false);
});

test('stale closes are labelled and refused for current valuation', () => {
  const p = fromCacheRow({ ticker: 'X', date: '2026-11-10', close: 10, volume: 5 }, { asOf: ASOF });
  assert.equal(p.freshness, 'stale');
  assert.equal(p.ageDays, 17);
  assert.equal(usableForValuation(p), false);
  assert.equal(usableForValuation(p, { allowStale: true }), true);
});

test('a quote stored as a close in the cache is not called adjusted', () => {
  const p = fromCacheRow(
    { ticker: 'X', date: '2026-11-26', close: 10, adj_close: 10, volume: null },
    { asOf: ASOF, preferAdjusted: true },
  );
  assert.equal(p.adjustment, 'unknown');
  assert.equal(p.via, 'fmp');
  const bar = fromCacheRow(
    { ticker: 'X', date: '2026-11-26', close: 10, adj_close: 9.5, volume: 100 },
    { asOf: ASOF, preferAdjusted: true },
  );
  assert.equal(bar.adjustment, 'adjusted');
  assert.equal(bar.price, 9.5);
});

test('sample data never values anything', () => {
  const p = fromFmpQuote(
    { symbol: 'AAPL', price: 100, timestamp: 1764200000, _sample: true },
    { asOf: ASOF },
  );
  assert.equal(p.state, 'sample');
  assert.equal(p.redistribution, 'internal');
  assert.equal(usableForValuation(p), false);
});

test('the contract activates nothing', () => {
  const src = readFileSync('src/lib/prices/price-contract.js', 'utf8');
  assert.ok(!/fetch\(|getAdminClient|from\('|process\.env/.test(src));
  const reg = readFileSync('src/lib/cron/dispatch-registry.js', 'utf8');
  /* SONAR_PRICE_SYNC still gates the screen-price sync. */
  assert.match(reg, /SONAR_PRICE_SYNC/);
});

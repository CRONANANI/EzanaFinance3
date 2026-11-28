/**
 * Predecessor and successor registrants (Sonar 6.4 final integration). Fixtures are the rows of
 * SQL_02 (verified on SEC's submissions API, Nov 28 2026). No network, no database.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  validateSuccession,
  indexSuccessions,
  tickerForFact,
} from '../src/lib/sec/registrant-map.js';

const XOM = {
  ticker: 'XOM',
  successor_cik: '2115436',
  predecessor_cik: '34088',
  effective_date: '2026-07-01',
  relationship: 'holding_company_reorganization',
  source_accession: '0001193125-26-291990',
  verified: true,
};
const DMRC = {
  ticker: 'DMRC',
  successor_cik: '2119322',
  predecessor_cik: '1438231',
  effective_date: '2026-05-18',
  relationship: 'holding_company_reorganization',
  source_accession: '0001437749-26-017527',
  verified: true,
};
const SKYD_UNVERIFIED = {
  ticker: 'SKYD',
  successor_cik: '2041610',
  predecessor_cik: '813828',
  effective_date: '2025-08-07',
  relationship: 'merger_successor',
  source_accession: '0001193125-25-175046',
  verified: false,
};
/* SEC's current ticker list: the ticker sits on the successor only. */
const current = new Map([
  ['2115436', 'XOM'],
  ['2119322', 'DMRC'],
  ['2041610', 'SKYD'],
  ['320193', 'AAPL'],
]);
const succ = indexSuccessions([XOM, DMRC, SKYD_UNVERIFIED]);

test('Exxon: the FY2025 10-K under CIK 34088 maps to XOM, keeping the filing registrant', () => {
  const hit = tickerForFact('0000034088', '2025-12-31', current, succ);
  assert.deepEqual(hit, { ticker: 'XOM', via: 'predecessor', successorCik: '2115436' });
});

test('no look-ahead: predecessor facts on or after the effective date are not used', () => {
  assert.equal(tickerForFact('34088', '2026-07-01', current, succ), null);
  assert.equal(tickerForFact('34088', '2026-09-30', current, succ), null);
  /* The quarter that ended the day before the succession still belongs to the predecessor. */
  assert.equal(tickerForFact('34088', '2026-06-30', current, succ)?.ticker, 'XOM');
  assert.equal(tickerForFact('34088', null, current, succ), null);
});

test('the successor’s own filings map directly', () => {
  assert.deepEqual(tickerForFact('2115436', '2026-09-30', current, succ), {
    ticker: 'XOM',
    via: 'current',
  });
  assert.equal(tickerForFact('1438231', '2025-12-31', current, succ)?.ticker, 'DMRC');
});

test('unverified rows, invalid rows and ticker look-alikes never join two entities', () => {
  /* Paramount (813828) is not joined to SKYD until someone verifies the merger row. */
  assert.equal(tickerForFact('813828', '2024-12-31', current, succ), null);
  /* A row with no source filing is ignored even when marked verified. */
  const bad = indexSuccessions([{ ...XOM, source_accession: '' }]);
  assert.equal(tickerForFact('34088', '2025-12-31', current, bad), null);
  /* An unrelated old registrant that once used a matching symbol has no row: no mapping. */
  assert.equal(tickerForFact('999999', '2020-12-31', current, succ), null);
});

test('applies_from / applies_to bound the periods a row covers', () => {
  const s = indexSuccessions([{ ...XOM, applies_from: '2024-01-01' }]);
  assert.equal(tickerForFact('34088', '2023-12-31', current, s), null);
  assert.equal(tickerForFact('34088', '2024-12-31', current, s)?.ticker, 'XOM');
  const t = indexSuccessions([{ ...XOM, applies_to: '2025-06-30' }]);
  assert.equal(tickerForFact('34088', '2025-12-31', current, t), null);
});

test('row validation', () => {
  assert.deepEqual(validateSuccession(XOM), []);
  assert.ok(
    validateSuccession({ ...XOM, predecessor_cik: '2115436' }).includes('same CIK on both sides'),
  );
  assert.ok(
    validateSuccession({ ...XOM, relationship: 'ticker_match' }).includes(
      'relationship type unknown',
    ),
  );
  assert.ok(
    validateSuccession({ ...XOM, effective_date: '7/1/2026' }).includes('effective_date invalid'),
  );
});

test('the ingest uses the table only behind SEC_PREDECESSOR_MAPPING and prefers the successor', () => {
  const src = readFileSync('src/app/api/cron/ingest-fundamentals/route.js', 'utf8');
  assert.match(src, /SEC_PREDECESSOR_MAPPING === '1'/);
  assert.match(src, /\.eq\('verified', true\)/);
  assert.match(src, /hit\.via === 'predecessor' && direct\.has\(hit\.ticker\)/);
  /* The stored row keeps the CIK that filed it. */
  assert.match(src, /cik: p\.cik,/);
});

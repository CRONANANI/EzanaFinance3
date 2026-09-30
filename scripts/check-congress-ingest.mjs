/**
 * Unit tests for the congressional-trades ingest (pure helpers, no network).
 *   node scripts/check-congress-ingest.mjs   (also `npm run test:congress`)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildMemberIndex,
  candidateFromFmp,
  candidateFromHouse,
  cleanName,
  legislatorsToMembers,
  matchMember,
  normalizeType,
  parseBand,
  photoUrlFor,
  resolveCandidates,
  sourceHash,
  trigramSimilarity,
} from '../src/lib/politicians/congress-ingest.js';

const vendored = JSON.parse(
  readFileSync(new URL('../src/lib/politicians/legislators-current.json', import.meta.url)),
);
const members = legislatorsToMembers(vendored);
const index = buildMemberIndex(members);
const known = new Set(members.map((m) => m.bioguide_id));

test('vendored and raw legislator formats map to the same member row', () => {
  assert.ok(members.length >= 500);
  const raw = legislatorsToMembers([
    {
      id: { bioguide: 'P000197' },
      name: { first: 'Nancy', last: 'Pelosi', official_full: 'Nancy Pelosi' },
      terms: [
        { type: 'sen', state: 'XX', party: 'Republican' },
        { type: 'rep', state: 'CA', district: 11, party: 'Democrat' },
      ],
    },
  ])[0];
  assert.deepEqual(
    { ...raw },
    {
      bioguide_id: 'P000197',
      first_name: 'Nancy',
      last_name: 'Pelosi',
      nickname: null,
      full_name: 'Nancy Pelosi',
      chamber: 'house',
      party: 'D',
      state: 'CA',
      district: 11,
    },
  );
  assert.equal(
    photoUrlFor('P000197'),
    'https://theunitedstates.io/images/congress/225x275/P000197.jpg',
  );
});

test('cleanName drops honorifics, suffixes, initials and accents', () => {
  assert.equal(cleanName('Hon. Donald S. Beyer Jr.'), 'donald beyer');
  assert.equal(cleanName('Nydia M. Velázquez'), 'nydia velazquez');
});

test('match order: last name + chamber + state, then exact, then fuzzy', () => {
  const byLast = matchMember(index, { last: 'Pelosi', chamber: 'house', state: 'CA11' });
  assert.equal(byLast.member.bioguide_id, 'P000197');
  assert.equal(byLast.how, 'last_state');

  const exact = matchMember(index, { full: 'Bernie Sanders', chamber: 'senate' });
  assert.equal(exact.member.bioguide_id, 'S000033');
  assert.equal(exact.how, 'exact');

  const fuzzy = matchMember(index, {
    full: 'Hon. Tommy H Tuberville',
    chamber: 'senate',
    state: 'AL',
  });
  assert.equal(fuzzy.member.bioguide_id, 'T000278');
});

test('wrong chamber or unknown name does not match', () => {
  assert.equal(matchMember(index, { full: 'Bernie Sanders', chamber: 'house' }), null);
  assert.equal(
    matchMember(index, { full: 'Zzyzx Quuxworth', chamber: 'house', state: 'ZZ' }),
    null,
  );
  assert.ok(trigramSimilarity('Nancy Pelosi', 'Nancy Pelosi') > 0.99);
});

test('type and amount normalisation', () => {
  assert.equal(normalizeType('P'), 'purchase');
  assert.equal(normalizeType('S'), 'sale');
  assert.equal(normalizeType('E'), 'exchange');
  assert.equal(normalizeType('Sale (Partial)'), 'sale_partial');
  assert.equal(normalizeType('Sale (Full)'), 'sale');
  assert.equal(normalizeType('Purchase'), 'purchase');
  assert.equal(normalizeType(''), null);
  assert.deepEqual(parseBand('$1,001 - $15,000'), { min: 1001, max: 15000 });
  assert.deepEqual(parseBand('$50,000,000 +'), { min: 50000000, max: null });
  assert.deepEqual(parseBand(''), { min: null, max: null });
});

test('source_hash is stable and owner-case-insensitive', () => {
  const r = {
    bioguide_id: 'P000197',
    transaction_date: '2026-09-01',
    ticker: 'NVDA',
    type: 'purchase',
    amount_min: 1001,
    amount_max: 15000,
    owner: 'Spouse',
  };
  assert.equal(sourceHash(r), sourceHash({ ...r, owner: 'spouse' }));
  assert.notEqual(sourceHash(r), sourceHash({ ...r, ticker: 'AAPL' }));
  assert.match(sourceHash(r), /^[0-9a-f]{64}$/);
});

test('resolveCandidates: never a trade without a bioguide, dedupes, counts', () => {
  const house = candidateFromHouse({
    first_name: 'Nancy',
    last_name: 'Pelosi',
    state_dst: 'CA11',
    ticker: 'nvda',
    asset_name: 'NVIDIA Corporation',
    tx_type: 'P',
    tx_date: '2026-09-01',
    notification_date: '2026-09-10',
    amount_low: 1000001,
    amount_high: 5000000,
    house_disclosure_filings: { pdf_url: 'https://disclosures-clerk.house.gov/x.pdf' },
  });
  const fmp = candidateFromFmp(
    {
      firstName: 'Tommy',
      lastName: 'Tuberville',
      senateID: 'T000278',
      district: 'AL',
      transactionDate: '2026-08-20',
      disclosureDate: '2026-09-05',
      symbol: 'msft',
      type: 'Sale (Partial)',
      amount: '$15,001 - $50,000',
      owner: 'Self',
    },
    'senate',
  );
  const ghost = candidateFromFmp(
    {
      firstName: 'Zzyzx',
      lastName: 'Quuxworth',
      district: 'ZZ',
      transactionDate: '2026-08-01',
      type: 'Purchase',
    },
    'house',
  );
  const undated = candidateFromHouse({ last_name: 'Pelosi', state_dst: 'CA11', tx_type: 'P' });
  const out = resolveCandidates([house, house, fmp, ghost, undated], index, known);
  assert.equal(out.rows.length, 2);
  assert.ok(out.rows.every((r) => r.bioguide_id && r.source_hash));
  assert.equal(out.rows[0].ticker, 'NVDA');
  assert.equal(out.rows[0].source, 'house_clerk');
  assert.equal(out.rows[1].type, 'sale_partial');
  assert.equal(out.rows[1].bioguide_id, 'T000278');
  assert.equal(out.matchedBy.bioguide, 1);
  assert.equal(out.unmatched.size, 1);
  assert.equal(out.skipped, 1);
});

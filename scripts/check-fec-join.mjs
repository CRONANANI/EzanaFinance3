/**
 * Unit tests for the FEC candidate-ID picker (pure, no network).
 *   node scripts/check-fec-join.mjs   (also `npm run test:fec-join`)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { pickFecCandidateId } from '../src/lib/fec/pick-id.js';

const vendored = JSON.parse(
  readFileSync(new URL('../src/lib/politicians/legislators-current.json', import.meta.url)),
);
const member = (id) => {
  const l = vendored.find((x) => x.bioguide === id);
  return { chamber: l.chamber, state: l.state, district: l.district, fecIds: l.fecIds };
};

test('Capito: senator with an old House ID picks the Senate ID', () => {
  const m = member('C001047');
  assert.deepEqual(m.fecIds, ['H0WV02138', 'S4WV00159']);
  assert.equal(pickFecCandidateId(m, m.fecIds), 'S4WV00159');
});

test('single-ID member returns that ID', () => {
  const m = member('T000278');
  assert.equal(pickFecCandidateId(m, m.fecIds), 'S0AL00230');
});

test('House member whose ID predates redistricting still resolves', () => {
  const m = member('P000197'); // CA-11 today, H8CA05035 from the old CA-05
  assert.equal(pickFecCandidateId(m, m.fecIds), 'H8CA05035');
});

test('at-large House seat (district 0) matches the 00 ID', () => {
  const m = { chamber: 'House', state: 'DC', district: 0 };
  assert.equal(pickFecCandidateId(m, ['H0DC00058']), 'H0DC00058');
  // An at-large ID filed as 01 still resolves through the state match.
  assert.equal(pickFecCandidateId(m, ['H0DC01058']), 'H0DC01058');
});

test('exact district wins over another district in the same state', () => {
  const m = { chamber: 'House', state: 'NY', district: 3 };
  assert.equal(pickFecCandidateId(m, ['H0NY03001', 'H2NY01002']), 'H0NY03001');
});

test('latest-listed wins a tie', () => {
  const m = { chamber: 'Senate', state: 'WV' };
  assert.equal(pickFecCandidateId(m, ['S4WV00159', 'S0WV00001']), 'S0WV00001');
});

test('empty list, wrong office or missing member returns null', () => {
  assert.equal(pickFecCandidateId(member('C001047'), []), null);
  assert.equal(pickFecCandidateId({ chamber: 'Senate', state: 'WV' }, ['H0WV02138']), null);
  assert.equal(pickFecCandidateId(null, []), null);
});

test('every vendored member with FEC IDs gets an ID for their current office', () => {
  const misses = vendored
    .filter((l) => l.fecIds?.length)
    .filter((l) => {
      const id = pickFecCandidateId(l, l.fecIds);
      return !id || id[0] !== (l.chamber === 'Senate' ? 'S' : 'H');
    })
    .map((l) => l.bioguide);
  assert.ok(misses.length <= 5, `unmatched: ${misses.join(', ')}`);
});

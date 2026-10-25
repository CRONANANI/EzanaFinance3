/**
 * Landing "Social investing" rating panel: the tier maths, and parity with
 * the platform's real ELO tiers. Run directly:
 *   node --test scripts/check-social-rating.mjs   (npm run test:social-rating)
 *
 * Self-contained node:test file per docs/decisions/004-node-test-check-scripts.md.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { LADDER_TIERS, deriveTierState, tierRowState } =
  await import('../src/components/landing/social-rating.js');

test('the landing ladder is the platform ladder (lib/elo.js ELO_TIERS)', () => {
  const src = readFileSync(new URL('../src/lib/elo.js', import.meta.url), 'utf8');
  const block = src.slice(
    src.indexOf('export const ELO_TIERS'),
    src.indexOf('];', src.indexOf('export const ELO_TIERS')),
  );
  const real = [...block.matchAll(/name:\s*'(\w+)',\s*minRating:\s*(\d+)/g)]
    .map((m) => ({ id: m[1], min: Number(m[2]) }))
    .sort((a, b) => a.min - b.min);
  assert.ok(real.length >= 2, 'could not read ELO_TIERS');
  assert.deepEqual(
    LADDER_TIERS.map((t) => ({ id: t.id, min: t.min })),
    real,
  );
});

test('1476: Apprentice, 32%, 1024 to Strategist, gauge 1000 to 2500', () => {
  const s = deriveTierState(1476);
  assert.equal(s.current.name, 'Apprentice');
  assert.equal(s.next.name, 'Strategist');
  assert.equal(s.pct, 32);
  assert.equal(s.toGo, 1024);
  assert.equal(s.current.min, 1000);
  assert.equal(s.next.min, 2500);
});

test('2600: Strategist current, Tactician next, 4%, 2400 to go', () => {
  const s = deriveTierState(2600);
  assert.equal(s.current.name, 'Strategist');
  assert.equal(s.next.name, 'Tactician');
  assert.equal(s.pct, 4);
  assert.equal(s.toGo, 2400);
});

test('a boundary belongs to the tier it opens', () => {
  const s = deriveTierState(2500);
  assert.equal(s.current.name, 'Strategist');
  assert.equal(s.pct, 0);
});

test('9000: Grandmaster, full, no next, nothing to go', () => {
  const s = deriveTierState(9000);
  assert.equal(s.current.name, 'Grandmaster');
  assert.equal(s.next, null);
  assert.equal(s.pct, 100);
  assert.equal(s.toGo, 0);
});

test('0 and nonsense ratings land on Novice', () => {
  assert.equal(deriveTierState(0).current.name, 'Novice');
  assert.equal(deriveTierState(Number.NaN).current.name, 'Novice');
});

test('row states: completed below, current, one next, locked above', () => {
  const { currentIndex } = deriveTierState(1476);
  const states = LADDER_TIERS.map((_, i) => tierRowState(i, currentIndex));
  assert.deepEqual(states, ['completed', 'current', 'next', 'locked', 'locked', 'locked']);
});

test('every ascent step is a real, positive ledger event and the climb ends on 1498', () => {
  const src = readFileSync(
    new URL('../src/components/landing/SocialLedgerSection.jsx', import.meta.url),
    'utf8',
  );
  const pool = src.slice(
    src.indexOf('const LEDGER_EVENTS'),
    src.indexOf('];', src.indexOf('const LEDGER_EVENTS')),
  );
  const deltas = new Map(
    [...pool.matchAll(/d:\s*(-?\d+),\s*event:\s*("([^"]+)"|'([^']+)')/g)].map((m) => [
      m[3] ?? m[4],
      Number(m[1]),
    ]),
  );
  assert.ok(deltas.size >= 2, 'could not read LEDGER_EVENTS');
  const specs = src.slice(src.indexOf('const ASCENT_SPECS'), src.indexOf('const ASCENT_STEPS'));
  const events = [...specs.matchAll(/event:\s*("([^"]+)"|'([^']+)')/g)].map((m) => m[2] ?? m[3]);
  assert.equal(events.length, 7);
  let sum = 0;
  for (const e of events) {
    assert.ok(deltas.has(e), `ledger has no event ${e}`);
    assert.ok(deltas.get(e) > 0, `ascent step ${e} does not earn rating`);
    sum += deltas.get(e);
  }
  const you = src
    .match(/const YOU_SERIES = \[([^\]]+)\]/)[1]
    .split(',')
    .map(Number);
  const end = you[you.length - 1];
  assert.equal(end, 1498);
  assert.equal(end - sum, 1446, 'the climb starts at 1446');
  assert.ok(!src.includes('SocialRatingPanel'), 'the old rating panel is no longer rendered');
  assert.ok(!/to\s*\{frame\.nextName/.test(src), 'the old ladder caption is gone');
});

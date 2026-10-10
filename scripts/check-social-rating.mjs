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

test('every "fastest way up" is a real ledger event', () => {
  const src = readFileSync(
    new URL('../src/components/landing/SocialLedgerSection.jsx', import.meta.url),
    'utf8',
  );
  const specs = src.slice(src.indexOf('const WAY_UP_SPECS'), src.indexOf('const WAYS_UP'));
  const events = [...specs.matchAll(/event:\s*("([^"]+)"|'([^']+)')/g)].map((m) => m[2] ?? m[3]);
  assert.equal(events.length, 3);
  for (const e of events) {
    const q = e.includes("'") ? `"${e}"` : `'${e}'`;
    assert.ok(src.includes(`event: ${q}`), `ledger has no event ${e}`);
  }
  assert.ok(!/to\s*\{frame\.nextName/.test(src), 'the old ladder caption is gone');
});

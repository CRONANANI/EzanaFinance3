/**
 * Landing "Social investing" board: the one daily timeline that drives the
 * chart, the dot, the standings, the ledger and the climb's step points.
 * Run directly:
 *   node --test scripts/check-social-timeline.mjs   (npm run test:social-timeline)
 *
 * Self-contained node:test file per docs/decisions/004-node-test-check-scripts.md.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const T = await import('../src/components/landing/social-timeline.js');
const { deriveTierState } = await import('../src/components/landing/social-rating.js');

/* The weekly chart the section shipped before the timeline existed. */
const OLD_YOU_SERIES = [2410, 2418, 2412, 2430, 2442, 2454, 2486, 2500];

/* The climb's seven steps, by event text, and their points. */
const CLIMB = {
  "Passed 'Options Greeks I' in the Learning Center": 6,
  '7-day login streak': 5,
  "Beat Priya S. in a 'Season 4 Sprint' heat": 4,
  'Research post upvoted, consensus signal': 8,
  'Trade idea copied by 3 circle members': 3,
  'Maya K. joined your circle on your referral': 2,
  "Won 'Q3 Momentum Sprint'": 24,
};

const ranks = () => {
  let prev = [];
  return Array.from({ length: T.DAYS + 1 }, (_, d) => {
    const s = T.standingsAt(d, prev);
    prev = s.map((r) => r.name);
    return Number(s.find((r) => r.you).rank);
  });
};

test('the weekly anchors reproduce the old chart exactly', () => {
  assert.deepEqual(T.YOU_WEEKLY, OLD_YOU_SERIES);
  assert.deepEqual([0, 7, 14, 21, 28, 35, 42, 49].map(T.youAt), OLD_YOU_SERIES);
});

test('the climb: seven events, 52 points, from 2448 (Apprentice) to 2500 (Strategist)', () => {
  for (const [text, pts] of Object.entries(CLIMB)) {
    const e = T.EVENTS.find((x) => x.event === text);
    assert.ok(e, `missing climb event: ${text}`);
    assert.equal(e.d, pts, text);
  }
  const sum = Object.values(CLIMB).reduce((s, n) => s + n, 0);
  assert.equal(sum, 52);
  const end = T.youAt(T.DAYS);
  assert.equal(end, 2500);
  assert.equal(end - sum, 2448);
  assert.equal(deriveTierState(end - sum).current.name, 'Apprentice');
  assert.equal(deriveTierState(end).current.name, 'Strategist');
});

test('"You" never reaches the leader, and ends 14 behind', () => {
  for (let d = 0; d <= T.DAYS; d += 1) {
    const leader = T.lerpWeekly(T.MEMBER_WEEKLY['Daniel R.'], d);
    assert.ok(T.youAt(d) < leader, `day ${d}: ${T.youAt(d)} vs ${leader}`);
  }
  assert.equal(T.lerpWeekly(T.MEMBER_WEEKLY['Daniel R.'], T.DAYS) - T.youAt(T.DAYS), 14);
});

test('the rank story: #4, #2 on day 30, #4 on day 32, #2 from day 34, never #1', () => {
  const r = ranks();
  assert.equal(r[0], 4);
  assert.ok(
    r.slice(0, 30).every((x) => x === 4),
    'holds #4 to day 29',
  );
  assert.equal(r[30], 2);
  assert.equal(r[32], 4);
  assert.ok(
    r.slice(34).every((x) => x === 2),
    'holds #2 from day 34',
  );
  assert.ok(
    r.every((x) => x !== 1),
    'never #1',
  );
});

test('the ledger chain is continuous and ends at 2500', () => {
  let r = T.YOU_START;
  for (const row of T.LEDGER_ROWS) {
    assert.equal(row.from, r);
    assert.equal(row.to, r + row.d);
    r = row.to;
  }
  assert.equal(r, 2500);
  assert.ok(
    T.EVENTS.every((e, i) => i === 0 || e.day >= T.EVENTS[i - 1].day),
    'chronological',
  );
  assert.equal(T.eventsBy(-1), 0);
  assert.equal(T.eventsBy(T.DAYS), T.EVENTS.length);
});

test('daily ratings stay inside the standings bar scale (2392 to 2542)', () => {
  for (let d = 0; d <= T.DAYS; d += 1) {
    for (const row of T.standingsAt(d)) {
      assert.ok(row.rating >= 2392 && row.rating <= 2542, `${row.name} day ${d}: ${row.rating}`);
    }
  }
});

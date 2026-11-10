/**
 * Learning Center hub (Nov 2026): the pure model (src/lib/learning/hub-model.js)
 * and the page wiring and token rules. Includes the source mock's data bugs
 * as regression cases (tier from rating, series ends at the rating, quest
 * never suggests a finished course, active tracks counted).
 *   node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-learning-hub.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  LEVELS,
  RATING_TIERS,
  activeTrackCount,
  courseCode,
  currentLevel,
  evaluateQuest,
  fmtCountdown,
  fmtRatio,
  fmtSigned,
  foldRating,
  networkTopPct,
  nextCourse,
  nextTier,
  nextUtcMidnight,
  orderedCourses,
  pathRows,
  questEarned,
  questTasks,
  ratingChange,
  ratingSeries,
  recommendations,
  resumeTarget,
  streaksFromDays,
  tierFor,
  tierRows,
  trackStats,
  validTrack,
  yTicks,
} from '../src/lib/learning/hub-model.js';

const read = (p) => fs.readFileSync(p, 'utf8');
const NOW = Date.parse('2026-11-09T15:00:00Z');
const done = (id, extra = {}) => ({
  course_id: id,
  status: 'completed',
  quiz_passed: true,
  quiz_score: 80,
  started_at: '2026-11-01T10:00:00Z',
  completed_at: '2026-11-01T10:30:00Z',
  ...extra,
});
const byId = (rows) => Object.fromEntries(rows.map((r) => [r.course_id, r]));

/* Stocks Bronze 1 to 6 done, Crypto Bronze 1 to 2 done (the mock's user). */
const ROWS = [
  ...[1, 2, 3, 4, 5, 6].map((n) => done(`stocks-basic-${n}`)),
  done('crypto-basic-1'),
  done('crypto-basic-2'),
];
const MAP = byId(ROWS);

test('tiers: one config; tier comes from the rating (562 is Silver, not Gold)', () => {
  assert.deepEqual(
    RATING_TIERS.map((t) => [t.key, t.min]),
    [
      ['bronze', 0],
      ['silver', 500],
      ['gold', 1500],
      ['platinum', 2520],
    ],
  );
  assert.equal(tierFor(562).key, 'silver');
  assert.equal(tierFor(499).key, 'bronze');
  assert.equal(tierFor(2520).key, 'platinum');
  assert.deepEqual(nextTier(562), { tier: RATING_TIERS[2], needed: 938 });
  assert.equal(nextTier(3000), null, 'no footer at the top tier');
  assert.deepEqual(
    tierRows().map((r) => r.range),
    ['2,520+', '1,500 – 2,519', '500 – 1,499', '0 – 499'],
  );
});

test('levels, codes and the path', () => {
  assert.deepEqual(
    LEVELS.map((l) => l.code),
    ['B', 'S', 'G', 'P'],
  );
  const first = orderedCourses('stocks')[0];
  assert.equal(courseCode(first), 'B1');
  assert.equal(currentLevel('stocks', MAP), 'basic');
  const rows = pathRows('stocks', 'basic', MAP, new Set(['stocks-basic-8']));
  assert.equal(rows.filter((r) => r.state === 'completed').length, 6);
  assert.equal(rows.filter((r) => r.state === 'next').length, 1, 'exactly one next course');
  assert.equal(rows.find((r) => r.state === 'next').code, 'B7');
  assert.equal(rows.find((r) => r.id === 'stocks-basic-8').bookmarked, true);
  assert.equal(
    pathRows('stocks', 'intermediate', MAP).some((r) => r.state === 'next'),
    false,
  );
});

test('the next course is never a completed one (the mock suggested B4)', () => {
  const n = nextCourse('stocks', MAP);
  assert.equal(n.id, 'stocks-basic-7');
  assert.ok(!MAP[n.id]);
  const all = byId(orderedCourses('risk').map((c) => done(c.id)));
  assert.equal(nextCourse('risk', all), null);
});

test('resume: in-progress first, else the next course; new users start at the first Bronze course', () => {
  const rows = [
    ...ROWS,
    { course_id: 'crypto-basic-3', status: 'in_progress', started_at: '2026-11-08T09:00:00Z' },
  ];
  assert.equal(resumeTarget('stocks', rows, byId(rows)).course.id, 'crypto-basic-3');
  assert.equal(resumeTarget('stocks', ROWS, MAP).course.id, 'stocks-basic-7');
  const fresh = resumeTarget('crypto', [], {});
  assert.equal(fresh.isNew, true);
  assert.equal(fresh.course.id, orderedCourses('stocks')[0].id);
});

test('active tracks counts every track with a completion (2 / 5, not 1 / 5)', () => {
  assert.equal(activeTrackCount(MAP), 2);
  assert.equal(fmtRatio(activeTrackCount(MAP), 5), '2 / 5');
});

test('track stats: quizzes, accuracy, hours this month, next badge', () => {
  const rows = [
    ...ROWS.slice(0, 5),
    done('stocks-basic-6', { quiz_score: 100, completed_at: '2026-11-08T10:00:00Z' }),
  ];
  const s = trackStats('stocks', rows, byId(rows), NOW);
  assert.equal(s.done, 6);
  assert.equal(s.total, 31);
  assert.equal(s.quizzesPassed, 6);
  assert.equal(s.accuracy, 83);
  assert.ok(s.minutesThisMonth > 0);
  assert.deepEqual(s.nextBadge, { level: 'basic', left: 2, done: 6, total: 8 });
});

test('recommendations are open courses the user has not done, never the next one twice', () => {
  const recs = recommendations('stocks', MAP);
  assert.equal(recs.length, 3);
  assert.equal(recs[0].id, 'stocks-basic-8');
  assert.ok(recs.every((c) => !MAP[c.id]));
  assert.ok(!recs.some((c) => c.id === 'stocks-basic-7'));
});

test('rating: folded from learning events, per track, history ends at the current rating', () => {
  const ev = (d, delta, metadata, reason = 'x') => ({
    created_at: `${d}T12:00:00Z`,
    delta,
    metadata,
    reason,
  });
  const events = [
    ev('2026-08-01', 10, { course_id: 'stocks-basic-1' }),
    ev('2026-10-20', 20, { course_id: 'crypto-intermediate-1' }),
    ev('2026-11-05', 10, { source: 'daily_quest', track: 'stocks' }, 'Daily quest'),
    ev('2026-11-05', 10, { course_id: 'stocks-basic-2' }, 'Completed B2'),
  ];
  const f = foldRating(events);
  assert.equal(f.rating, 50);
  assert.equal(f.byTrack.stocks, 30);
  assert.equal(f.byTrack.crypto, 20);
  assert.equal(f.history.at(-1).rating, 50);
  assert.equal(f.history.at(-1).delta, 20);
  assert.deepEqual(ratingChange(f.history, f.rating, 7, NOW), {
    delta: 20,
    pct: (20 / 30) * 100,
    since: '2026-11-02',
  });

  const pts = ratingSeries(f.history, f.rating, '1M', NOW);
  assert.equal(pts[0].rating, 10, 'carries in the rating at the window start');
  assert.equal(pts.at(-1).date, '2026-11-09');
  assert.equal(pts.at(-1).rating, 50, 'the series ends at the headline rating');
  assert.equal(ratingSeries([], 0, '1M', NOW).length, 0, 'no history, empty state');
  const t = yTicks(pts);
  assert.equal(t.length, 5);
  assert.ok(t[0] <= 10 && t[4] >= 50);
  assert.ok([25, 50, 100].includes(t[1] - t[0]));
});

test('network percentile and streaks', () => {
  assert.equal(networkTopPct(500, []), null);
  assert.equal(networkTopPct(500, [100, 200, 600]), 50);
  assert.equal(networkTopPct(900, [100, 200, 600]), 25);
  const s = streaksFromDays(
    ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-07', '2026-11-08'],
    NOW,
  );
  assert.deepEqual(s, { current: 2, best: 3, lastActive: '2026-11-08' }, 'alive until midnight');
  assert.equal(streaksFromDays(['2026-11-05'], NOW).current, 0);
});

test('daily quest: server-evaluated tasks, rewards counted, countdown', () => {
  const tasks = questTasks({ hasNetwork: true });
  assert.equal(tasks.length, 3);
  assert.ok(tasks.every((t) => t.done === false && t.rewarded === false));
  assert.equal(questTasks({ hasNetwork: false })[1].type, 'ace_quiz');
  const today = '2026-11-09';
  const rows = [
    done('stocks-basic-7', { completed_at: `${today}T09:00:00Z` }),
    done('stocks-basic-8', { completed_at: `${today}T10:00:00Z`, quiz_score: 95 }),
    { course_id: 'crypto-basic-3', status: 'in_progress', started_at: `${today}T11:00:00Z` },
  ];
  const out = evaluateQuest(tasks, {
    date: today,
    progressRows: rows,
    mainTrack: 'stocks',
    ratingAtStart: 100,
    ratingNow: 140,
    friendRatings: [120, 300],
  });
  assert.deepEqual(
    out.map((t) => [t.id, t.done]),
    [
      ['q1', true],
      ['q2', true],
      ['q3', true],
    ],
  );
  assert.equal(questEarned(out), 35);
  const none = evaluateQuest(tasks, {
    date: today,
    progressRows: [],
    mainTrack: 'stocks',
    ratingAtStart: 0,
    ratingNow: 0,
    friendRatings: [5],
  });
  assert.ok(none.every((t) => !t.done));
  assert.equal(nextUtcMidnight(NOW), '2026-11-10T00:00:00.000Z');
  assert.equal(fmtCountdown('2026-11-10T00:00:00Z', NOW), '9h 0m');
  assert.equal(fmtSigned(21), '+21');
  assert.equal(validTrack('nope'), null);
});

/* ------------------------------------------------------------------ */
/* Wiring                                                              */
/* ------------------------------------------------------------------ */

const PAGE = 'src/app/(dashboard)/learning-center/page.js';
const HUB = 'src/components/learning/hub/LearningHub.jsx';
const CARDS = 'src/components/learning/hub/HubCards.jsx';
const CSS = 'src/components/learning/hub/learning-hub.css';

test('page: hub on the flat canvas, real endpoints, no synthesized history', () => {
  const page = read(PAGE);
  assert.match(page, /LearningHub/);
  assert.match(page, /<Suspense/);
  const hook = read('src/components/learning/hub/useLearningHub.js');
  for (const u of [
    '/api/learning/rating',
    '/api/learning/quests/daily',
    '/api/learning/streak',
    '/api/learning/bookmarks',
  ]) {
    assert.ok(hook.includes(u), u);
  }
  assert.doesNotMatch(read(HUB) + read(CARDS), /Math\.sin|Math\.random|lcMappers/);
});

test('quests: read-only checkboxes in the UI, rewards only on the server', () => {
  const cards = read(CARDS);
  assert.match(cards, /readOnly/);
  assert.doesNotMatch(cards, /awardELO|quests\/daily['"`],\s*\{\s*method: 'POST'/);
  const server = read('src/lib/learning/hub-server.js');
  assert.match(server, /awardELO\(/);
  assert.match(server, /key: `quest:\$\{userId\}:\$\{date\}:\$\{t\.id\}`/);
  const sql = read('supabase/migrations/20261115090000_learning_center_hub.sql');
  assert.match(sql, /drop policy if exists "users manage own quests"/);
  assert.match(sql, /drop policy if exists "users manage own streak"/);
});

test('styles and copy: tokens only, tier tokens, no root cap, no em dashes, Bootstrap Icons', () => {
  const css = read(CSS).replace(/\/\*[\s\S]*?\*\//g, '');
  assert.doesNotMatch(css, /#[0-9a-f]{3,8}\b|rgba?\(/i);
  assert.doesNotMatch(css, /\.lh-page\s*\{[^}]*max-width/);
  for (const t of ['--tier-bronze', '--tier-silver', '--tier-gold', '--tier-platinum'])
    assert.ok(css.includes(t), t);
  assert.match(css, /prefers-reduced-motion: reduce/);
  for (const f of [PAGE, HUB, CARDS, 'src/lib/learning/hub-model.js']) {
    const src = read(f);
    assert.doesNotMatch(src, /—/, `${f} has an em dash`);
    assert.doesNotMatch(src, /from 'lucide-react'/, f);
  }
});

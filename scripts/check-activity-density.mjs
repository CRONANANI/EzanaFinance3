/**
 * Home activity density card (Nov 2026): the pure model in
 * src/lib/activity-density.js, the card's wiring and its token discipline.
 *   node --no-warnings --test scripts/check-activity-density.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  DAY_MS,
  buildGrid,
  computeStats,
  dayMs,
  levelOf,
  monthLabels,
  parseCssColor,
  riseAt,
  barHeight,
  ACTIVITY_STAT_KEYS,
  monthlyActivity,
  ordinal,
  percentileLabel,
  statValues,
  topDays,
  topStreaks,
  weekdayActivity,
} from '../src/lib/activity-density.js';

const END = dayMs('2026-11-09');
const key = (offset) => new Date(END - offset * DAY_MS).toISOString().slice(0, 10);

test('levels: empty, logged in, then deeper with more activity', () => {
  assert.equal(levelOf(0, false, 10), 0);
  assert.equal(levelOf(0, true, 10), 1);
  assert.equal(levelOf(1, true, 10), 2);
  assert.equal(levelOf(4, false, 10), 3, 'actions without a login row still count');
  assert.equal(levelOf(7, true, 10), 4);
  assert.equal(levelOf(25, true, 10), 4, 'past the busy day caps at 4');
  assert.equal(levelOf(3, true, 0), 4);
});

test('the grid covers a full year in whole weeks and ends today', () => {
  const g = buildGrid([], END, 0);
  assert.equal(g.cells[g.cells.length - 1].date, '2026-11-09');
  assert.equal(new Date(dayMs(g.cells[0].date)).getUTCDay(), 0, 'weeks start on Sunday');
  assert.ok(g.cells.length >= 365 && g.cells.length <= 371);
  assert.equal(g.weeks, Math.ceil(g.cells.length / 7));
  assert.ok(
    g.cells.every((c) => c.level === 0),
    'no data means an empty year, never invented',
  );
});

test('repeated dates add up and junk rows are ignored', () => {
  const g = buildGrid(
    [
      { date: key(0), actions: 2, login: true },
      { date: key(0), actions: 3, login: false },
      { date: key(1), actions: 0, login: true },
      { date: 'nope', actions: 9 },
      null,
      { date: key(2), actions: -4, login: false },
    ],
    END,
  );
  const today = g.cells[g.cells.length - 1];
  assert.equal(today.count, 5);
  assert.equal(today.login, true);
  assert.equal(g.cells[g.cells.length - 2].level, 1);
  assert.equal(g.cells[g.cells.length - 3].level, 0);
  assert.equal(g.max, 5);
});

test('one freak day does not wash every other day out to light', () => {
  const rows = [];
  for (let i = 0; i < 60; i++) rows.push({ date: key(i), actions: 4, login: true });
  rows.push({ date: key(70), actions: 400, login: true });
  const g = buildGrid(rows, END);
  const ordinary = g.cells.find((c) => c.date === key(5));
  assert.equal(ordinary.level, 4, 'a normal busy day reaches the top level');
});

test('stats: active days, busiest day, longest and current streaks', () => {
  const rows = [
    { date: key(0), actions: 0, login: true },
    { date: key(1), actions: 6, login: true },
    { date: key(2), actions: 1, login: false },
    { date: key(10), actions: 2, login: true },
  ];
  const s = computeStats(buildGrid(rows, END).cells);
  assert.equal(s.activeDays, 4);
  assert.equal(s.total, 9);
  assert.deepEqual(s.busiest, { count: 6, date: key(1) });
  assert.equal(s.longest.days, 3);
  assert.equal(s.current.days, 3);
  assert.equal(s.current.end, key(0));

  const yesterday = computeStats(buildGrid([{ date: key(1), actions: 1, login: true }], END).cells);
  assert.equal(yesterday.current.days, 1, "today isn't over, so a run ending yesterday is current");
});

test('month labels, heights and the rise wave', () => {
  const g = buildGrid([], END);
  const m = monthLabels(g.cells, g.weeks);
  assert.ok(m.length >= 11 && m.length <= 13);
  assert.ok(barHeight(0, false, 10) < barHeight(0, true, 10));
  assert.ok(barHeight(0, true, 10) < barHeight(1, true, 10));
  assert.equal(riseAt(0, 10, 53, 3), 0);
  assert.equal(riseAt(1, 52, 53, 6), 1);
});

test('computed CSS colours parse, including color-mix output', () => {
  assert.deepEqual(parseCssColor('rgb(16, 185, 129)'), [16, 185, 129]);
  assert.deepEqual(parseCssColor('rgba(4, 120, 87, 0.5)'), [4, 120, 87]);
  assert.deepEqual(parseCssColor('color(srgb 0.0627 0.7255 0.5059)'), [16, 185, 129]);
  assert.equal(parseCssColor('rgba(0, 0, 0, 0)'), null);
  assert.equal(parseCssColor('transparent'), null);
});

test('wiring and token discipline', () => {
  const card = fs.readFileSync('src/components/home/ActivityDensityCard.jsx', 'utf8');
  const css = fs.readFileSync('src/components/home/activity-density.css', 'utf8');
  const page = fs.readFileSync('src/app/(dashboard)/home/page.js', 'utf8');
  const route = fs.readFileSync('src/app/api/activity-density/route.js', 'utf8');
  for (const [name, src] of [
    ['card', card],
    ['css', css],
  ]) {
    assert.doesNotMatch(src, /#[0-9a-fA-F]{3,8}\b(?![\w-])/, `${name}: hex colour`);
    assert.ok(!src.includes(String.fromCharCode(8212)), `${name}: em dash`);
    assert.doesNotMatch(src, /lucide-react|tailwind|Math\.random/i, `${name}: stack rules`);
  }
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(card, /new URLSearchParams\(\{ days: '371' \}\)/);
  assert.match(card, /fetch\(`\/api\/activity-density\?\$\{qs\}`/);
  assert.doesNotMatch(card, /generateContributions/, 'no generated sample year');
  assert.match(page, /import\('@\/components\/home\/ActivityDensityCard'\)/);
  assert.match(page, /<ActivityDensityCard \/>/);
  assert.match(route, /requireAuth: true/);
  const lib = fs.readFileSync('src/lib/activity-summary.js', 'utf8');
  assert.match(route, /from '@\/lib\/activity-summary'/);
  assert.match(lib, /rpc\('user_activity_days'/);
  assert.match(lib, /rpc\('activity_stat_percentiles'/);
  assert.match(lib, /privacy_show_activity === false/, 'other members respect activity privacy');
});

test('percentile labels: ordinals, clamped to 1st..99th, null when unranked', () => {
  assert.equal(ordinal(1), '1st');
  assert.equal(ordinal(2), '2nd');
  assert.equal(ordinal(3), '3rd');
  assert.equal(ordinal(11), '11th');
  assert.equal(ordinal(12), '12th');
  assert.equal(ordinal(13), '13th');
  assert.equal(ordinal(22), '22nd');
  assert.equal(ordinal(101), '101st');
  assert.equal(percentileLabel(92.4), '92nd percentile');
  assert.equal(percentileLabel(0), '1st percentile');
  assert.equal(percentileLabel(100), '99th percentile');
  assert.equal(percentileLabel(null), null);
  assert.equal(percentileLabel(undefined), null);
  assert.equal(percentileLabel('abc'), null);
});

test('stat keys line up with the card order and the profile anchors', () => {
  assert.deepEqual(
    ACTIVITY_STAT_KEYS.map((k) => k.anchor),
    [
      'activity-active-days',
      'activity-busiest-day',
      'activity-longest-streak',
      'activity-current-streak',
    ],
  );
  const days = [
    { date: key(0), actions: 2, login: true },
    { date: key(1), actions: 9, login: true },
    { date: key(2), actions: 0, login: true },
    { date: key(5), actions: 1, login: false },
  ];
  const v = statValues(computeStats(buildGrid(days, END, 0).cells));
  assert.deepEqual(v, { activeDays: 4, busiestDay: 9, longestStreak: 3, currentStreak: 3 });
  assert.deepEqual(statValues(null), {
    activeDays: 0,
    busiestDay: 0,
    longestStreak: 0,
    currentStreak: 0,
  });
});

test('profile analytics: months, weekdays, top days and streaks', () => {
  const days = [
    { date: key(0), actions: 2, login: true },
    { date: key(1), actions: 9, login: true },
    { date: key(2), actions: 0, login: true },
    { date: key(5), actions: 4, login: false },
    { date: key(6), actions: 4, login: false },
  ];
  const { cells } = buildGrid(days, END, 0);

  const months = monthlyActivity(cells);
  assert.ok(months.length >= 12 && months.length <= 14, 'a year spans 12 to 14 calendar months');
  assert.equal(
    months.reduce((a, m) => a + m.days, 0),
    cells.length,
  );
  assert.equal(
    months.reduce((a, m) => a + m.activeDays, 0),
    5,
  );
  assert.equal(
    months.reduce((a, m) => a + m.actions, 0),
    19,
  );

  const wk = weekdayActivity(cells);
  assert.equal(wk.length, 7);
  assert.equal(
    wk.reduce((a, w) => a + w.actions, 0),
    19,
  );
  assert.equal(
    wk.reduce((a, w) => a + w.days, 0),
    cells.length,
  );

  assert.deepEqual(
    topDays(cells, 3).map((d) => [d.date, d.count]),
    [
      [key(1), 9],
      [key(5), 4],
      [key(6), 4],
    ],
    'most actions first, newer first on ties',
  );

  const runs = topStreaks(cells, 5);
  assert.deepEqual(runs[0], { days: 3, start: key(2), end: key(0) });
  assert.deepEqual(runs[1], { days: 2, start: key(6), end: key(5) });
  assert.equal(runs.length, 2);
});

test('profile activity: wiring and token discipline', () => {
  const comp = fs.readFileSync('src/components/profile/redesign/ProfileActivity.jsx', 'utf8');
  const css = fs.readFileSync('src/components/profile/redesign/profile-activity.css', 'utf8');
  const stripe = fs.readFileSync('src/components/profile/redesign/ProfilePageStripe.jsx', 'utf8');
  for (const [name, src] of [
    ['profile activity', comp],
    ['profile activity css', css],
  ]) {
    assert.doesNotMatch(src, /#[0-9a-fA-F]{3,8}\b(?![\w-])/, `${name}: hex colour`);
    assert.ok(!src.includes(String.fromCharCode(8212)), `${name}: em dash`);
    assert.doesNotMatch(src, /lucide-react|tailwind|Math\.random/i, `${name}: stack rules`);
  }
  for (const { anchor } of ACTIVITY_STAT_KEYS) {
    assert.match(comp, new RegExp(`id="${anchor}"`), `profile section for ${anchor}`);
  }
  assert.match(comp, /variant="profile"/);
  assert.match(stripe, /<ProfileActivity userId=\{profile\.id\} isOwn=\{isOwn\} \/>/);
  assert.match(stripe, /privacy_show_activity !== false/);
});

/**
 * Recognition (/org-team-hub/recognition, Nov 2026 redesign).
 *   npm run test:org-recognition
 *
 * Pure checks on the page model, the rating fixes and the sample bundle, and
 * source guards for the rules that are easy to regress: only accepted pitches
 * are rated and each change is dated on the day its pitch was scored, decay
 * never raises a rating, badges no longer feed engagement, auto-award reads
 * only its own quarter, faculty advisors are not ranked, the sample is the
 * shared sample council.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  awardsByTeam,
  historyIsDated,
  historyWindow,
  honourRoll,
  isRatedPitch,
  moversFrom,
  parseQuarter,
  pickAutoAwards,
  rankRatings,
  ratingHistory,
  scoredOn,
  signed,
  signedPct,
} from '../src/lib/org-recognition-model.js';
import { DECAY_FLOOR, decayTarget, thesisDelta } from '../src/lib/org-rating-engine.js';
import {
  applySampleAction,
  buildRecognitionSample,
  sampleBase,
  sampleRatings,
  sampleScorecard,
} from '../src/lib/org-recognition-sample.js';

const read = (p) => fs.readFileSync(p, 'utf8');
const NOW = Date.UTC(2026, 10, 15, 12);
const DAY = 86400000;
const iso = (d) => new Date(NOW - d * DAY).toISOString();

test('a pitch is scored 30 days after the decision; only accepted pitches are rated', () => {
  assert.equal(scoredOn('2026-01-01T00:00:00.000Z'), '2026-01-31T00:00:00.000Z');
  assert.equal(scoredOn(null), null);
  assert.equal(isRatedPitch({ decision: 'accepted', decision_at: iso(40) }), true);
  assert.equal(isRatedPitch({ decision: 'rejected', decision_at: iso(40) }), false);
  assert.equal(isRatedPitch({ decision: 'accepted', decision_at: null }), false);
});

test('history is rebuilt from deltas in date order and is dated only when every change is', () => {
  const tx = [
    {
      reason: 'thesis_resolved',
      delta: -40,
      rating_after: 9999,
      created_at: iso(0),
      metadata: { scored_on: iso(10) },
    },
    {
      reason: 'thesis_resolved',
      delta: 100,
      rating_after: 1,
      created_at: iso(0),
      metadata: { scored_on: iso(50) },
    },
    { reason: 'decay', delta: -25, created_at: iso(5), metadata: {} },
  ];
  const h = ratingHistory(tx);
  assert.deepEqual(
    h.map((p) => p.rating),
    [1350, 1310, 1285],
  );
  assert.equal(historyIsDated(tx), true);
  assert.equal(
    historyIsDated([
      ...tx,
      { reason: 'thesis_resolved', delta: 5, created_at: iso(0), metadata: {} },
    ]),
    false,
  );
  const w = historyWindow(h, '30d', NOW);
  assert.equal(w.opening, 1350);
  assert.equal(w.change, -65);
});

test('movers sum only changes inside the window, by scoring date', () => {
  const tx = [
    { member_id: 'a', delta: 50, created_at: iso(0), metadata: { scored_on: iso(60) } },
    { member_id: 'a', delta: -10, created_at: iso(0), metadata: { scored_on: iso(5) } },
    { member_id: 'b', delta: 30, created_at: iso(3), metadata: {} },
  ];
  const m = moversFrom(tx, NOW - 30 * DAY, NOW);
  assert.equal(m.get('a'), -10);
  assert.equal(m.get('b'), 30);
});

test('decay never raises a rating and stops at the floor', () => {
  assert.equal(decayTarget(1300), 1275);
  assert.equal(decayTarget(1260), DECAY_FLOOR);
  assert.equal(decayTarget(1250), 1250);
  assert.equal(decayTarget(1100), 1100);
});

test('auto-award reads only its quarter, needs a positive Best Call and three pitches for Most Accurate', () => {
  const p = (id, member, decided, decision = 'accepted') => ({
    id,
    analyst_member_id: member,
    decision,
    decision_at: decided,
  });
  const pitches = [
    p('old', 'x', '2026-01-10T00:00:00Z'), // scored 2026-02-09 (Q1)
    p('a1', 'a', '2026-06-05T00:00:00Z'), // scored July (Q3)
    p('a2', 'a', '2026-06-20T00:00:00Z'),
    p('a3', 'a', '2026-07-01T00:00:00Z'),
    p('b1', 'b', '2026-07-05T00:00:00Z'),
    p('rej', 'b', '2026-07-06T00:00:00Z', 'rejected'),
  ];
  const outcomes = [
    { pitch_id: 'old', alpha_pct: 50 },
    { pitch_id: 'a1', alpha_pct: 3 },
    { pitch_id: 'a2', alpha_pct: 2 },
    { pitch_id: 'a3', alpha_pct: -1 },
    { pitch_id: 'b1', alpha_pct: 9 },
    { pitch_id: 'rej', alpha_pct: 40 },
  ];
  const r = pickAutoAwards({ pitches, outcomes, range: parseQuarter('2026-Q3'), now: NOW });
  assert.equal(r.best.pitch.id, 'b1');
  assert.equal(r.accurate.memberId, 'a');
  assert.equal(r.accurate.total, 3);
  const none = pickAutoAwards({
    pitches: [p('n', 'a', '2026-07-01T00:00:00Z')],
    outcomes: [{ pitch_id: 'n', alpha_pct: -2 }],
    range: parseQuarter('2026-Q3'),
    now: NOW,
  });
  assert.equal(none.best, null);
  assert.equal(none.accurate, null);
  assert.equal(parseQuarter('T26'), null);
});

test('ranking leaves out faculty advisors and refuses undated Top movers', () => {
  const members = [
    { id: 'a', role: 'analyst' },
    { id: 'f', role: 'executive', sub_role: 'Faculty Advisor' },
    { id: 'v', role: 'executive', sub_role: 'President' },
  ];
  const ratings = [{ member_id: 'a', rating: 1400, rated_thesis_count: 2, tier: 'trainee' }];
  const dated = [
    {
      member_id: 'a',
      delta: 150,
      reason: 'thesis_resolved',
      created_at: iso(0),
      metadata: { scored_on: iso(5) },
    },
  ];
  const all = rankRatings({ members, ratings, transactions: dated, listMode: 'all', now: NOW });
  assert.deepEqual(
    all.rows.map((r) => r.member_id),
    ['a', 'v'],
  );
  assert.equal(all.summary.ratable, 2);
  const mv = rankRatings({
    members,
    ratings,
    transactions: dated,
    listMode: 'movers',
    period: '30d',
    now: NOW,
  });
  assert.equal(mv.rows[0].delta, 150);
  const undated = [{ ...dated[0], metadata: {} }];
  const u = rankRatings({
    members,
    ratings,
    transactions: undated,
    listMode: 'movers',
    period: '30d',
    now: NOW,
  });
  assert.equal(u.summary.dated, false);
  assert.equal(u.rows.length, 0);
  assert.equal(u.summary.top_mover_30d, null);
});

test('awards by team: left out without teams, Unassigned for members with none', () => {
  const recs = [
    { recipient_id: 'u1', created_at: iso(1) },
    { recipient_id: 'u2', created_at: iso(1) },
    { recipient_id: 'u2', created_at: iso(400) },
  ];
  assert.equal(awardsByTeam(recs, [{ user_id: 'u1' }], [], null), null);
  const rows = awardsByTeam(
    recs,
    [{ user_id: 'u1', team_id: 't1' }, { user_id: 'u2' }],
    [{ id: 't1', name: 'Technology' }],
    { start: NOW - 30 * DAY, end: NOW },
  );
  assert.deepEqual(rows, [
    { id: 't1', name: 'Technology', awards: 1 },
    { id: 'unassigned', name: 'Unassigned', awards: 1 },
  ]);
  const roll = honourRoll(recs, [{ user_id: 'u2', id: 'm2', display_name: 'B' }], {
    start: NOW - 30 * DAY,
    end: NOW,
  });
  assert.equal(roll.find((r) => r.user_id === 'u2').awards, 1);
});

test('signed formatting and N/A', () => {
  assert.equal(signed(12), '+12');
  assert.equal(signed(-3), '-3');
  assert.equal(signed(null), 'N/A');
  assert.equal(signedPct(1.234), '+1.2%');
});

test('sample: the shared council, real rating rules, flagged rows, nothing saved', () => {
  const b = buildRecognitionSample({
    userId: 'me',
    memberId: 'm-me',
    role: 'executive',
    displayName: 'Test',
    subRole: 'Faculty Advisor',
    now: NOW,
  });
  const names = b.members.map((m) => m.display_name);
  for (const n of ['Amara Tesfaye', 'Selam Haile', 'Elena Rossi', 'Tomas Alvarez', 'Jonas Weber']) {
    assert.ok(names.includes(n), n);
  }
  assert.deepEqual(b.teams.map((t) => t.name).sort(), [
    'Financials',
    'Healthcare',
    'Industrials',
    'Technology',
  ]);
  for (const list of [b.members, b.recognitions, b.transactions, b.pitches]) {
    assert.ok(list.every((r) => r.is_demo === true));
  }
  /* PFE and DE were rejected: never rated. */
  const tickers = b.transactions.map((t) => t.metadata.ticker);
  assert.ok(!tickers.includes('PFE') && !tickers.includes('DE'));
  assert.ok(historyIsDated(b.transactions));
  const nvda = b.transactions.find((t) => t.metadata.ticker === 'NVDA');
  assert.equal(nvda.delta, thesisDelta(12.48, { convictionLevel: 5 }));
  /* The viewer is a faculty advisor: not ranked, still able to award. */
  const r = sampleRatings(b, 'all', '30d', NOW);
  assert.ok(!r.rows.some((x) => x.member_id === 'm-me'));
  assert.equal(b.viewer.canAward, true);
  /* Auto-awards match the rules for the quarter they name. */
  const auto = b.recognitions.filter((x) => x.auto_generated);
  assert.equal(auto.length, 2);
  assert.ok(auto.every((x) => x.period === '2026-Q3'));
  const base = sampleBase(b);
  assert.equal(
    base.recognitions.find((x) => x.badge_type === 'most_accurate').recipient_name,
    'Amara Tesfaye',
  );
  /* Calibration is conviction against the share that beat the market. */
  const card = sampleScorecard(b, 'sample-member-007', NOW);
  assert.deepEqual(
    card.calibration_series.map((s) => [s.conviction, s.hitRate]),
    [
      [2, 0],
      [3, 0],
      [5, 1],
    ],
  );
  assert.equal(card.history.at(-1).rating, card.rating.value);
  /* Actions stay on the page and keep the route rules. */
  const res = applySampleAction(
    b,
    {
      type: 'award',
      form: { recipient_id: 'sample-user-009', badge_type: 'rising_star', title: 'Rising Star' },
    },
    NOW,
  );
  assert.equal(res.ok, true);
  assert.equal(res.bundle.recognitions.length, b.recognitions.length + 1);
  assert.equal(b.recognitions.length, auto.length + 9);
  assert.equal(
    applySampleAction(b, {
      type: 'award',
      form: { recipient_id: 'nobody', badge_type: 'rising_star', title: 'x' },
    }).ok,
    false,
  );
  const analyst = buildRecognitionSample({
    userId: 'me',
    memberId: 'm-me',
    role: 'analyst',
    now: NOW,
  });
  assert.equal(applySampleAction(analyst, { type: 'recompute' }).ok, false);
});

test('source guards', () => {
  const engine = read('src/lib/org-rating-engine.js');
  assert.match(engine, /isRatedPitch\(p\)/);
  assert.match(engine, /created_at: t\.resolved_at/);
  assert.match(engine, /scored_on: t\.resolved_at/);
  assert.doesNotMatch(engine, /from\('org_recognition'\)/, 'badges must not feed engagement');
  assert.match(engine, /filter\(\(x\) => !isFacultyAdvisor\(x\)\)/);
  const auto = read('src/app/api/org/recognition/auto/route.js');
  assert.match(auto, /pickAutoAwards\(/);
  assert.match(auto, /parseQuarter\(period\)/);
  const post = read('src/app/api/org/recognition/route.js');
  assert.match(post, /\.eq\('is_active', true\)/);
  assert.match(post, /assertOrgRole\(member, MANAGER_ROLES\)/);
  const card = read('src/app/api/org/recognition/scorecard/[memberId]/route.js');
  assert.match(card, /\.eq\('org_id', orgId\)\s*\n\s*\.eq\('id', memberId\)/);
  const dialogs = read('src/components/org/recognition/Dialogs.jsx');
  assert.match(dialogs, /<Modal/);
  for (const f of [
    'src/lib/org-recognition-model.js',
    'src/lib/org-recognition-sample.js',
    'src/components/org/recognition/RecognitionPage.jsx',
    'src/components/org/recognition/Scorecard.jsx',
    'src/components/org/recognition/Dialogs.jsx',
    'src/components/org/recognition/Charts.jsx',
    'src/components/org/recognition/recognition.css',
  ]) {
    assert.doesNotMatch(read(f), /\u2014/, `${f} has an em dash`);
  }
});

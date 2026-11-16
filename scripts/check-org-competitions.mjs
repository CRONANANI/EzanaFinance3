/**
 * Competitions (/org-competitions): model rules, sample bundle, the Fund
 * Analytics link, anonymous feedback and the fund challenge routes.
 * Run: npm run test:org-competitions
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  anonymousFeedback,
  circuitDeadlinesOf,
  fmtRank,
  fundRowsOf,
  kpisOf,
  nextDeadlineOf,
  nextMilestoneOf,
  obligationsOf,
  openFundChallenges,
  pageTabOf,
  publicStandings,
  rankStandings,
  readinessOf,
  trophyTally,
  workspaceTabs,
  isSampleSlug,
  FUND_CHALLENGES_HREF,
} from '../src/lib/org-competitions-model.js';
import { buildCompetitionsSample, applySampleAction } from '../src/lib/org-competitions-sample.js';
import { buildFundAnalyticsSample } from '../src/lib/org-fund-analytics-sample.js';

const read = (p) => fs.readFileSync(p, 'utf8');
const NOW = Date.parse('2026-11-16T12:00:00Z');
const nowIso = new Date(NOW).toISOString();

test('Fund Analytics "Open fund challenges" lands on the Fund challenges tab', () => {
  const src = read('src/components/org/fund-analytics/Sections.jsx');
  const hrefs = [...src.matchAll(/href="(\/org-competitions[^"]*)"/g)].map((m) => m[1]);
  assert.ok(hrefs.length >= 2, 'both links found');
  for (const h of hrefs) assert.equal(h, FUND_CHALLENGES_HREF);
  assert.equal(FUND_CHALLENGES_HREF, '/org-competitions?tab=fund');
  /* The landing page reads ?tab and opens that tab. */
  const page = read('src/app/(dashboard)/org-competitions/page.js');
  assert.match(page, /initialTab=\{one\(params\.tab\)\}/);
  assert.equal(pageTabOf('fund'), 'fund');
  assert.equal(pageTabOf(null), 'pitch');
  assert.equal(pageTabOf('other'), 'pitch');
  const landing = read('src/components/org/competitions/landing/CompetitionsPage.jsx');
  assert.match(landing, /useState\(pageTabOf\(initialTab\)\)/);
  /* The old unlinked page sends readers to the same tab. */
  assert.match(
    read('src/app/(dashboard)/org-team-hub/competitions/page.js'),
    /redirect\('\/org-competitions\?tab=fund'\)/,
  );
});

test('anonymous feedback: comment text only, never a label, order not tied to judges', () => {
  const rows = [
    { label: 'Priya Raman, Crestline Partners', comment: ' Zesty thesis. ' },
    { label: 'Judge from Kestrel Research', comment: 'Add a downside case.' },
    { label: 'Judge from X', comment: '   ' },
  ];
  const out = anonymousFeedback(rows);
  assert.deepEqual(out, [{ comment: 'Add a downside case.' }, { comment: 'Zesty thesis.' }]);
  assert.deepEqual(anonymousFeedback([...rows].reverse()), out);
  for (const f of out) assert.deepEqual(Object.keys(f), ['comment']);
  /* The results route sends entrants the stripped shape. */
  const route = read('src/app/api/org/pitch-competitions/[id]/results/route.js');
  assert.match(route, /feedback: isHost \? feedback : anonymousFeedback\(feedback\)/);
});

test('fund challenge standings never carry a dollar figure', () => {
  const names = new Map([
    ['a', 'Alpha'],
    ['b', 'Beta'],
  ]);
  const ranked = rankStandings(
    [
      { org_id: 'a', current_value: 900000, return_pct: 1.5 },
      { org_id: 'b', current_value: 120000, return_pct: 3.25 },
      { org_id: 'c', current_value: 50, return_pct: null },
    ],
    names,
    'a',
  );
  assert.deepEqual(
    ranked.map((r) => [r.org_id, r.rank, r.isMine]),
    [
      ['b', 1, false],
      ['a', 2, true],
      ['c', 3, false],
    ],
  );
  for (const r of ranked) assert.ok(!('current_value' in r) && !('value' in r));
  for (const r of publicStandings([{ org_id: 'x', rank: 1, current_value: 5, return_pct: 2 }])) {
    assert.ok(!('current_value' in r));
  }
  const lb = read('src/app/api/org/competitions/[id]/leaderboard/route.js');
  assert.doesNotMatch(lb, /current_value/);
  assert.match(read('src/lib/competitions/fund-challenges.js'), /rankStandings/);
});

test('entering a fund challenge needs a running challenge (server check)', () => {
  const route = read('src/app/api/org/competitions/route.js');
  assert.match(route, /comp\.status !== 'active'/);
  assert.match(route, /status: 409/);
  const comps = [
    { id: '1', status: 'active', myEntry: null },
    { id: '2', status: 'closed', myEntry: null },
    { id: '3', status: 'active', myEntry: { status: 'active' } },
  ];
  assert.deepEqual(
    openFundChallenges(comps).map((c) => c.id),
    ['1'],
  );
});

test('fund challenge standing: only entered challenges, same numbers as Fund Analytics', () => {
  const s = buildCompetitionsSample({ now: NOW });
  const rows = fundRowsOf(s.fund.competitions, s.fund.boards);
  assert.equal(rows.length, 2, 'the sample council entered two');
  assert.ok(rows.every((r) => s.fund.competitions.find((c) => c.id === r.id).myEntry));
  const fa = buildFundAnalyticsSample({ now: NOW }).standing;
  const first = rows.find((r) => r.id === fa.id);
  assert.equal(first.name, 'Sample intercollegiate fund challenge');
  assert.equal(first.rank, 3);
  assert.equal(first.field, 12);
  assert.equal(first.rank, fa.rank);
  assert.equal(first.field, fa.field);
  assert.ok(Math.abs(first.return_pct - fa.return_pct) < 1e-9);
  assert.equal(fmtRank(first.rank, first.field), '3 of 12');
  for (const board of Object.values(s.fund.boards)) {
    for (const r of board) assert.ok(!('current_value' in r));
  }
});

test('sample: scores 0 to 100, no judge labels, entrant sees own rank only, rows flagged', () => {
  const s = buildCompetitionsSample({ now: NOW });
  for (const h of s.hosted) for (const r of h.scoreboard) assert.ok(r.mean >= 0 && r.mean <= 100);
  for (const e of s.entered) {
    assert.equal(e.is_demo, true);
    if (!e.result) continue;
    assert.ok(e.result.weighted_total >= 0 && e.result.weighted_total <= 100);
    for (const f of e.result.feedback) assert.deepEqual(Object.keys(f), ['comment']);
    assert.ok(!('field' in e.result), 'no field size for an entrant');
  }
  for (const x of [...s.hosted, ...s.joinable]) assert.equal(x.is_demo, true);
  assert.ok([...s.entered, ...s.hosted].every((e) => isSampleSlug(e.slug)));
  /* Actions stay on the page and obey the rules. */
  const open = s.fund.competitions.find((c) => !c.myEntry);
  const entered = applySampleAction(s, { type: 'enter_fund', id: open.id });
  assert.ok(entered.ok);
  assert.ok(!applySampleAction(entered.bundle, { type: 'enter_fund', id: open.id }).ok);
  const analyst = buildCompetitionsSample({ now: NOW, role: 'analyst' });
  assert.ok(!applySampleAction(analyst, { type: 'enter_fund', id: open.id }).ok);
  assert.ok(!applySampleAction(analyst, { type: 'create', form: { name: 'X' } }).ok);
});

test('obligations, next deadline and placement', () => {
  const day = (d) => new Date(NOW + d * 86400000).toISOString();
  const entered = [
    {
      id: 'e1',
      slug: 'a',
      name: 'A',
      status: 'in_progress',
      config: { deliverable_deck: true, deliverable_thesis: true, deliverable_due_at: day(3) },
      submittedKinds: ['thesis'],
      slot: { room: 'Room B', starts_at: day(10) },
    },
    {
      id: 'e2',
      slug: 'b',
      name: 'B',
      status: 'complete',
      config: { deliverable_deck: true, deliverable_due_at: day(1) },
      submittedKinds: [],
    },
  ];
  const ob = obligationsOf(entered, nowIso);
  assert.deepEqual(
    ob.map((o) => o.key),
    ['e1:deck', 'e1:slot'],
  );
  assert.equal(nextDeadlineOf(ob, nowIso).key, 'e1:deck');
  const k = kpisOf({ entered, hosted: [], joinable: [], fund: [], obligations: ob }, nowIso);
  assert.equal(k.entered, 2);
  assert.equal(k.nextDeadline, day(3));
});

test('host readiness and next milestone', () => {
  const r = readinessOf({ rounds: 1, rooms: 2, teams: 8, judges: 3 }, 0);
  assert.equal(r.met, 4);
  assert.equal(r.allMet, false);
  assert.equal(
    nextMilestoneOf({ status: 'draft', readiness: r }, nowIso).label,
    'Define the rubric',
  );
  const full = readinessOf({ rounds: 1, rooms: 1, teams: 1, judges: 1 }, 4);
  assert.equal(
    nextMilestoneOf({ status: 'judging', readiness: full }, nowIso).label,
    'Reveal results',
  );
});

test('trophies count distinct members this season', () => {
  const t = trophyTally(
    [
      { org_member_id: 'a', badge_key: 'winner', awarded_at: '2026-10-01T00:00:00Z' },
      { org_member_id: 'a', badge_key: 'winner', awarded_at: '2026-10-05T00:00:00Z' },
      { org_member_id: 'b', badge_key: 'top3', awarded_at: '2026-09-01T00:00:00Z' },
      { org_member_id: 'c', badge_key: 'winner', awarded_at: '2026-03-01T00:00:00Z' },
    ],
    nowIso,
  );
  assert.deepEqual(
    t.map((x) => [x.key, x.members]),
    [
      ['winner', 1],
      ['top3', 1],
      ['participant', 0],
    ],
  );
});

test('circuit deadlines are the next dated milestones', () => {
  const out = circuitDeadlinesOf(
    [
      {
        slug: 'x',
        name: 'X',
        keyDates: [
          { label: 'Past', date: '2026-01-01' },
          { label: 'Finals', date: '2026-12-01' },
        ],
      },
      {
        slug: 'y',
        name: 'Y',
        shortName: 'Ycup',
        keyDates: [{ label: 'Deadline', date: '2026-11-20' }],
      },
    ],
    '2026-11-16',
  );
  assert.deepEqual(
    out.map((d) => [d.name, d.date]),
    [
      ['Ycup', '2026-11-20'],
      ['X', '2026-12-01'],
    ],
  );
});

test('workspace tabs by role; every sub-page address still has a route', () => {
  const host = workspaceTabs({ slug: 's', isHost: true, canManage: true }).map((t) => t.href);
  assert.deepEqual(host, [
    '/org-competitions/s',
    '/org-competitions/s/config',
    '/org-competitions/s/live',
    '/org-competitions/s/results',
    '/org-competitions/s?tab=structure',
  ]);
  const entrant = workspaceTabs({ slug: 's', isHost: false, canManage: false }).map((t) => t.key);
  assert.deepEqual(entrant, ['overview', 'rules', 'deliverables', 'live', 'results']);
  for (const sub of [
    'config',
    'deliverables',
    'join',
    'live',
    'requests',
    'results',
    'scoreboard',
  ]) {
    assert.ok(fs.existsSync(`src/app/(dashboard)/org-competitions/[slug]/${sub}/page.js`), sub);
  }
  for (const p of ['circuit/page.js', 'circuit/[slug]/page.js', 'council/page.js']) {
    assert.ok(fs.existsSync(`src/app/(dashboard)/org-competitions/${p}`), p);
  }
});

test('page rules: flat CSS, no browser prompts, no Withdraw control, shell untouched', () => {
  for (const f of [
    'src/components/org/competitions/landing/landing.css',
    'src/components/org/competitions/competitions.css',
  ]) {
    const css = read(f);
    assert.doesNotMatch(css, /box-shadow|#[0-9a-fA-F]{3,6}\b|rgba?\(/, f);
    assert.doesNotMatch(css, /--org-primary|--bg-secondary|--card-bg/, f);
  }
  const dir = 'src/components/org/competitions';
  const files = fs
    .readdirSync(dir, { recursive: true })
    .filter((f) => /\.jsx?$/.test(f))
    .map((f) => read(`${dir}/${f}`));
  for (const src of files) {
    assert.doesNotMatch(src, /window\.(confirm|prompt)\(/);
    assert.doesNotMatch(src, />\s*Withdraw\s*</);
    assert.doesNotMatch(src, /pcx-h1|pcx-eyebrow|pcx-lead/);
  }
  assert.match(read('src/app/(dashboard)/org-competitions/layout.js'), /TeamHubShell/);
});

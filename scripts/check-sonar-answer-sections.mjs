/**
 * One layout for every Sonar answer (Nov 2026): the twelve sections and who opens them, the
 * side navigation's locked list and call to action, anchors, scroll-spy, the ping board's
 * helpers, and the wiring (every answer on /datasets is a board, the research route says who
 * ran it, the templates are in the repo).
 *
 * Run: node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-sonar-answer-sections.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const A = await import('@/lib/sonar/answer-sections');
const P = await import('@/lib/sonar/ping-board');
const R = await import('@/lib/sonar/research-state');
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

test('twelve sections: five free, seven deep, unique keys', () => {
  assert.equal(A.ANSWER_SECTIONS.length, 12);
  assert.deepEqual(A.FREE_KEYS, ['answer', 'metrics', 'findings', 'charts', 'sources']);
  assert.equal(A.DEEP_KEYS.length, 7);
  assert.equal(new Set(A.ANSWER_SECTIONS.map((s) => s.key)).size, 12);
  assert.ok(!JSON.stringify(A.ANSWER_SECTIONS).includes('—'));
  assert.equal(A.sectionId('charts'), 'sa-charts');
});

test('who unlocks the deep sections: a deep run on Starter or higher, or a seat', () => {
  const ok = (o) => A.sectionAccess(o).unlocked;
  assert.equal(ok({ depth: 'deep', planTier: 1, isGuest: false }), true, 'Starter, deep');
  assert.equal(ok({ depth: 'deep', planTier: 4, isGuest: false }), true, 'Pro, deep');
  assert.equal(
    ok({ depth: 'deep', planTier: 0, isGuest: false, version: 'org' }),
    true,
    'org seat',
  );
  assert.equal(ok({ depth: 'deep', planTier: 0, isGuest: false }), false, 'free member, deep');
  assert.equal(ok({ depth: 'standard', planTier: 2, isGuest: false }), false, 'Advanced, standard');
  assert.equal(ok({ depth: 'quick', planTier: 4, isGuest: false }), false, 'a quick ping never');
  assert.equal(ok({ depth: 'deep', planTier: 3, isGuest: true }), false, 'a guest never');
});

test('the call to action fits the reader', () => {
  const g = A.sectionAccess({ isGuest: true });
  assert.equal(g.cta.kind, 'signup');
  assert.match(g.cta.href, /^\/auth\/continue\?intent=signup&next=/);
  const f = A.sectionAccess({ isGuest: false, planTier: 0, depth: 'deep' });
  assert.equal(f.cta.kind, 'upgrade');
  assert.equal(f.cta.href, '/pricing?plan=starter');
  const s = A.sectionAccess({ isGuest: false, planTier: 1, depth: 'quick' });
  assert.equal(s.cta.kind, 'deep');
  assert.equal(s.cta.href, null, 'the host runs deep research');
  assert.equal(A.sectionAccess({ isGuest: false, planTier: 1, depth: 'deep' }).cta, null);
  for (const c of [g, f, s]) assert.ok(!JSON.stringify(c).includes('—'));
});

test('the navigation: free sections present, all seven deep ones locked until unlocked', () => {
  const locked = A.answerNav(['answer', 'metrics', 'charts', 'sources', 'scenarios']);
  assert.deepEqual(
    locked.filter((s) => !s.locked).map((s) => s.key),
    ['answer', 'metrics', 'charts', 'sources'],
    'a free section the page lacks is not listed',
  );
  assert.equal(locked.filter((s) => s.locked).length, 7, 'every deep section is listed, locked');
  assert.ok(locked.length <= 12);
  const open = A.answerNav(['answer', 'findings', 'team', 'explorer'], { unlocked: true });
  assert.deepEqual(
    open.map((s) => [s.key, s.locked]),
    [
      ['answer', false],
      ['findings', false],
      ['team', false],
      ['explorer', false],
    ],
  );
});

test('rendering, anchors and scroll-spy', () => {
  assert.equal(A.canRender('charts', false), true);
  assert.equal(A.canRender('scenarios', false), false);
  assert.equal(A.canRender('scenarios', true), true);
  const anchors = A.anchorCells([
    { id: 'exec', section: 'answer' },
    { id: 'intel', section: 'answer' },
    { id: 'kpis', section: 'metrics' },
  ]);
  assert.deepEqual(
    [...anchors],
    [
      ['exec', 'sa-answer'],
      ['kpis', 'sa-metrics'],
    ],
  );
  const nav = A.answerNav(['answer', 'metrics', 'findings']);
  const tops = nav.map((s, i) => (s.locked ? undefined : [-200, 100, 900][i]));
  assert.equal(A.activeKey(nav, tops, 300), 'metrics');
  assert.equal(
    A.activeKey(nav, tops, 300, true),
    'findings',
    'the last open section at the bottom',
  );
  /* Page order is not nav order: a later section whose anchor sits higher on the page (or has
     scrolled past) must not win over the one nearest the line. */
  const nav2 = A.answerNav(['answer', 'metrics', 'findings', 'sources']);
  const at = { answer: 88, metrics: 88, findings: 520, sources: -400 };
  const tops2 = nav2.map((s) => (s.locked ? undefined : at[s.key]));
  assert.equal(A.activeKey(nav2, tops2, 300), 'answer', 'a shared row goes to the earlier section');
  at.answer = -300;
  const tops3 = nav2.map((s) => (s.locked ? undefined : at[s.key]));
  assert.equal(A.activeKey(nav2, tops3, 300), 'metrics', 'the nearest anchor above the line');
});

/* ------------------------------------------------------------------ ping board */

const live = {
  query: 'Lockheed Martin',
  answer: 'Lockheed Martin is the largest federal contractor.\n\nIt won $X in awards.\n\nMore.',
  evidence: [
    {
      dataset: 'gov-contracts',
      title: 'Award',
      snippet: 'F-35 sustainment',
      url: 'https://x.test/a',
    },
  ],
  sources: [{ id: 'gov-contracts', label: 'Government contracts', used: true }],
  webSources: [{ url: 'https://www.reuters.com/a', title: 'Reuters story' }],
  newsColumns: [{ items: [{ url: 'https://n.test/1', title: 'n' }] }],
  dossier: {
    kind: 'company',
    ticker: 'LMT',
    fundamentals: { price: 455.1, marketCap: 1.07e11, peTtm: 16.2, evToEbitdaTtm: 13.4 },
    matches: {},
  },
};

test('the ping board: paragraphs, KPI tiles and top matches', () => {
  assert.deepEqual(P.answerParagraphs(live.answer), [
    'Lockheed Martin is the largest federal contractor.',
    'It won $X in awards.',
    'More.',
  ]);
  assert.deepEqual(
    P.pingKpis(live).map((t) => [t.id, t.value]),
    [
      ['price', '$455.10'],
      ['mcap', '$107.00B'],
      ['pe', '16.20'],
      ['ev', '13.40'],
    ],
  );
  /* Nov 9, 2026: no fundamentals, no strip (the datasets matched / records cited / web pages
     / news count tiles are gone from every answer). */
  const noFund = { ...live, dossier: { kind: 'politician', matches: {} } };
  assert.deepEqual(P.pingKpis(noFund), []);
  assert.equal(P.topMatches(live)[0].title, 'Award');
});

test('chart-first answers: the insider-buying race replaces the desk summary', () => {
  assert.equal(P.leadsWithVisual({ dossier: { kind: 'insider_buying' } }), true);
  assert.equal(P.leadsWithVisual(live), false);
  assert.equal(P.leadsWithVisual(null), false);
  const src = read('src/components/landing/SonarPingBoard.jsx');
  assert.match(src, /const lead = leadsWithVisual\(live\)/);
  assert.match(src, /const right = lead \? null/, 'no top matches beside a chart-first answer');
  assert.match(src, /visual && !lead/, 'the chart is not repeated lower down');
  assert.match(src, /kpiTiles\.length\s*\?/, 'no empty KPI row');
  const pb = read('src/lib/sonar/ping-board.js');
  assert.ok(!/Ezana datasets matched|Records cited/.test(pb), 'count tiles removed');
});

/* ------------------------------------------------------------------ wiring */

test('every answer on /datasets is a board with the side navigation', () => {
  const band = read('src/components/landing/SonarSection.jsx');
  assert.match(band, /const pingBoard = isPage && answerReady && !board && Boolean\(live\)/);
  assert.match(band, /const anyBoard = board \|\| pingBoard/);
  assert.match(band, /<SonarPingBoard/);
  assert.match(band, /depth: 'quick'/);
  assert.match(band, /\{anyBoard \? null : stackBlock\}/);
  for (const f of [
    'src/components/landing/SonarCountryBoard.jsx',
    'src/components/landing/SonarPingBoard.jsx',
    'src/components/sonar/research/ResearchBoard.jsx',
  ]) {
    const src = read(f);
    assert.match(
      src,
      /<SonarAnswerFrame\s+present=\{present\}\s+access=\{access\}\s+onDeep=\{onDeep\}[\s\S]{0,120}?>/,
      f,
    );
    assert.match(src, /anchorCells\(/, f);
    assert.ok(!src.includes('—'), `${f}: no em dash`);
  }
  const rb = read('src/components/sonar/research/ResearchBoard.jsx');
  assert.match(rb, /canRender\(c\.section, unlocked\)/);
  assert.match(rb, /!unlocked && limitations\.length/, 'data gaps stay visible on free answers');
  const cb = read('src/components/landing/SonarCountryBoard.jsx');
  assert.match(cb, /canRender\(c\.section, Boolean\(access\?\.unlocked\)\)/);
});

test('the frame: locked items are spans, never links; the research route says who ran it', () => {
  const frame = read('src/components/sonar/SonarAnswerFrame.jsx');
  assert.match(frame, /<span className="san-link is-locked" aria-disabled="true">/);
  assert.match(frame, /aria-label="Answer sections"/);
  assert.match(frame, /capture: true/);
  const css = read('src/components/sonar/sonar-answer-frame.css');
  assert.ok(!/border(-[a-z]+)?:\s*\d+px solid/.test(css), 'no outlines');
  assert.ok(!/#[0-9a-f]{3,8}\b/i.test(css), 'no hex');
  assert.match(css, /cursor: not-allowed/);
  const route = read('src/app/api/sonar/research/route.js');
  assert.match(route, /send\('access', \{/);
  const s = R.reduceEvent(R.EMPTY_RESEARCH_STATE, [
    'access',
    { depth: 'deep', planTier: 1, version: 'regular', guest: false },
  ]);
  assert.equal(s.access.planTier, 1);
});

test('the templates are in the repo, with the rules and a project skill', () => {
  for (const f of [
    'docs/sonar/answer-templates/README.md',
    'docs/sonar/answer-templates/01-country-fx-turkey-lira.webp',
    'docs/sonar/answer-templates/02-ranking-crude-oil-producers.webp',
    '.claude/skills/sonar-answer-layout/SKILL.md',
  ])
    assert.ok(existsSync(new URL(`../${f}`, import.meta.url)), f);
  const readme = read('docs/sonar/answer-templates/README.md');
  assert.match(readme, /Sonar card rule/);
  assert.ok(!readme.includes('—'));
});

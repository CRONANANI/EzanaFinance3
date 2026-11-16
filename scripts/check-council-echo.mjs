/**
 * Council band of Ezana Echo (/ezana-echo).
 *   npm run test:council-echo
 *
 * The model's honesty rules (stories matched by tagged tickers only, open
 * pitches only, saved list private to the viewer, published research only),
 * the sample council, the routes' access rules and the page's gating (the
 * public front page unchanged, council band and Our names tab only for
 * council members once membership is known, Login only when signed out).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  NA,
  councilReads,
  namesRows,
  openPitches,
  ourTickers,
  pitchPrepRows,
  sampleSavedRows,
  savedRows,
  sectorRows,
  stripFigures,
} from '../src/lib/org-ezana-echo-model.js';
import { buildCompanyResearchSample } from '../src/lib/org-company-research-sample.js';
import { buildEzanaEchoSample } from '../src/lib/org-ezana-echo-sample.js';
import { DEFAULT_FILTERS, filterStories, toStory } from '../src/lib/echo/home-feed.js';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const viewer = { userId: 'u-1', memberId: 'm-1', role: 'executive', displayName: 'Viewer' };
const NOW = Date.UTC(2026, 10, 16, 15);
const fundRaw = buildCompanyResearchSample({ ...viewer, now: NOW });
const extras = buildEzanaEchoSample({ ...viewer, now: NOW });
const story = (id, tickers, day) =>
  toStory({
    id,
    title: `Story ${id}`,
    category: 'markets-companies',
    tickers,
    publishedAt: new Date(NOW - day * 86400000).toISOString(),
  });
const stories = [
  story('a', ['nvda', 'MSFT'], 1),
  story('b', ['AVGO'], 3),
  story('c', ['XOM'], 2),
  story('d', ['ORCL', 'AVGO'], 5),
];

test('our names are holdings plus open pitches only', () => {
  const t = ourTickers(fundRaw, extras.pitches);
  assert.ok(t.held.has('NVDA') && t.held.has('JPM'));
  assert.ok(t.pitch.has('AVGO') && t.pitch.has('COST') && t.pitch.has('ORCL'));
  for (const p of openPitches(extras.pitches))
    assert.ok(!['rejected', 'exited', 'in_portfolio', 'approved'].includes(p.stage));
  assert.equal(stripFigures(fundRaw, extras.pitches, 3).holdings, 12);
});

test('stories match by tagged ticker, newest first, held named before pitched', () => {
  const t = ourTickers(fundRaw, extras.pitches);
  const n = namesRows(stories, t);
  assert.equal(n.total, 3);
  assert.deepEqual(
    n.rows.map((r) => r.id),
    ['a', 'b', 'd'],
  );
  assert.equal(n.rows[0].ticker, 'NVDA');
  assert.equal(n.rows[0].kind, 'Held');
  assert.equal(n.rows[1].kind, 'Open pitch');
});

test('pitch prep lists open pitches that have stories', () => {
  const p = pitchPrepRows(stories, extras.pitches, extras.members);
  assert.ok(p.open > 0);
  assert.deepEqual(p.rows.map((r) => r.ticker).sort(), ['AVGO', 'ORCL']);
  const avgo = p.rows.find((r) => r.ticker === 'AVGO');
  assert.equal(avgo.count, 2);
  assert.equal(avgo.story.id, 'b');
});

test('saved list is the viewer own, unpublished saves counted not shown', () => {
  const s = savedRows(stories, [
    { id: 'c', savedAt: '2026-11-10T00:00:00Z' },
    { id: 'gone', savedAt: null },
  ]);
  assert.deepEqual(
    s.rows.map((r) => r.id),
    ['c'],
  );
  assert.equal(s.missing, 1);
  assert.equal(savedRows(stories, [{ id: 'a', savedAt: null }]).rows[0].date, NA);
  assert.equal(sampleSavedRows(stories).rows.length, 3);
});

test('council reads are published research, exemplars first', () => {
  const r = councilReads(extras.notes, extras.members);
  assert.ok(r.length > 0);
  assert.equal(r[0].kind, 'Exemplar');
  assert.ok(extras.notes.every((n) => n.status === 'published'));
});

test('sector coverage reads the teams, no focus column', () => {
  const rows = sectorRows(fundRaw, stories);
  assert.equal(rows.length, 4);
  const tech = rows.find((r) => /tech/i.test(r.name));
  assert.ok(tech.count >= 1);
  assert.ok(!('focus' in rows[0]));
});

test('Our names filter applies only with a ticker set', () => {
  const f = { ...DEFAULT_FILTERS, ours: true };
  assert.equal(filterStories(stories, f, NOW, new Set(['XOM'])).length, 1);
  assert.equal(filterStories(stories, f, NOW).length, 4);
});

test('sample bundle is flagged and uses invented names', () => {
  assert.equal(extras.is_demo, true);
  for (const n of extras.notes) assert.equal(n.is_demo, true);
  for (const p of extras.pitches) assert.equal(p.is_demo, true);
});

test('routes: member-only, user client, sample gated, published only', () => {
  const live = read('src/app/api/org/ezana-echo/route.js');
  assert.match(live, /getUserClient/);
  assert.match(live, /getCurrentOrgMember/);
  assert.match(live, /\.eq\('status', 'published'\)/);
  assert.doesNotMatch(live, /getAdminClient|getServiceClient|SERVICE_ROLE|supabaseAdmin/);
  assert.doesNotMatch(live, /vote_yes_count|vote_no_count|tally|echo_saved_articles/);
  const sample = read('src/app/api/org/ezana-echo/sample/route.js');
  assert.match(sample, /isCommunityDemoViewer\(user\)/);
  assert.match(sample, /sample: null/);
});

test('page: council parts only for council members once known; Login only signed out', () => {
  const page = read('src/app/(dashboard)/ezana-echo/EchoHomeClient.jsx');
  assert.match(page, /councilReady = Boolean\(user && isOrgUser && !orgLoading\)/);
  assert.match(page, /useCouncilEcho\(councilReady\)/);
  assert.match(page, /councilReady \? \(\s*<EchoCouncilBand/);
  assert.match(page, /ourNames=\{councilReady\}/);
  assert.match(page, /!authLoading && !user \?/);
  const hook = read('src/components/echo/council/useCouncilEcho.js');
  assert.doesNotMatch(hook, /org-ezana-echo-model/, 'public bundle carries no model');
  const band = read('src/components/echo/council/EchoCouncilBand.jsx');
  assert.doesNotMatch(band, /Required reading|In focus|onArchive/);
  assert.match(band, /localStorage/);
});

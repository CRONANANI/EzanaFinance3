/**
 * Council Rankings (/council-rankings): ranking rules, own standing, sample
 * bundle, generic change reasons and page rules.
 * Run: npm run test:council-rankings
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  changeReason,
  filterRows,
  fmtDrawdown,
  fmtPctSigned,
  fmtSigned,
  nextTier,
  ownStanding,
  partsLine,
  rankRows,
  validateRatios,
  ratioBody,
  applySampleRatios,
} from '../src/lib/council-rankings-model.js';
import {
  buildCouncilRankingsSample,
  isSampleCouncilId,
  sampleCouncilDetail,
  SAMPLE_SELF_ID,
} from '../src/lib/org-council-rankings-sample.js';
import { blendRating, tierForRating } from '../src/lib/council-elo/model.js';

const read = (p) => fs.readFileSync(p, 'utf8');
const NOW = Date.parse('2026-11-16T12:00:00Z');

test('equal ratings share a rank; sorting follows the chosen part', () => {
  const rows = [
    { orgId: 'a', name: 'A', rating: 1100, comp: 1000, fund: 1250 },
    { orgId: 'b', name: 'B', rating: 1100, comp: 1200, fund: 950 },
    { orgId: 'c', name: 'C', rating: 1050, comp: 1100, fund: 975 },
  ];
  assert.deepEqual(
    rankRows(rows).map((r) => [r.orgId, r.rank]),
    [
      ['a', 1],
      ['b', 1],
      ['c', 3],
    ],
  );
  assert.deepEqual(
    rankRows(rows, 'competition').map((r) => r.orgId),
    ['b', 'c', 'a'],
  );
  assert.deepEqual(
    filterRows(rankRows(rows), 'c').map((r) => [r.orgId, r.rank]),
    [['c', 3]],
  );
});

test('own standing: gap to the council above, neighbours, own gap is null', () => {
  const s = buildCouncilRankingsSample({ now: NOW });
  const own = ownStanding(s.rows, s.myOrgId);
  assert.equal(own.rank, 3);
  assert.equal(own.field, 12);
  const ranked = rankRows(s.rows);
  assert.equal(own.gapToNext, ranked[1].rating - ranked[2].rating);
  assert.deepEqual(
    own.nearest.map((r) => r.rank),
    [2, 3, 4],
  );
  assert.equal(own.nearest[1].gap, null);
  assert.ok(own.nearest[0].gap > 0 && own.nearest[2].gap < 0);
  assert.equal(ownStanding(s.rows, 'not-there'), null);
  assert.equal(ownStanding(s.rows, null), null);
});

test('tiers and parts', () => {
  assert.deepEqual(nextTier(1084), { tier: 'established', points: 36 });
  assert.equal(nextTier(1500), null);
  assert.equal(partsLine(1062, 1117).text, 'Fund ahead of competition by');
  assert.equal(partsLine(1062, 1117).by, 55);
  assert.equal(partsLine(1100, 1000).weaker, 'fund');
});

test('formatting: signed, N/A for missing, drawdown negative', () => {
  assert.equal(fmtSigned(27), '+27');
  assert.equal(fmtSigned(-12), '-12');
  assert.equal(fmtSigned(null), 'N/A');
  assert.equal(fmtPctSigned(22.6), '+22.6%');
  assert.equal(fmtPctSigned(-0.9), '-0.9%');
  assert.equal(fmtPctSigned(null), 'N/A');
  assert.equal(fmtDrawdown(8.2), '-8.2%');
  assert.equal(fmtDrawdown(-8.2), '-8.2%');
});

test('change reasons never name an event', () => {
  for (const c of ['competition', 'fund', 'decay', 'admin']) {
    const r = changeReason(c);
    assert.doesNotMatch(r, /placed|challenge|invitational|pitch|1st|2nd|3rd/i);
  }
  const detail = read('src/components/org/council-rankings/CouncilDetail.jsx');
  assert.doesNotMatch(detail, /\.reason\b/, 'the stored reason text is never shown');
  assert.match(detail, /changeReason\(t\.component\)/);
});

test('sample bundle follows the real rating rules and uses invented names', () => {
  const s = buildCouncilRankingsSample({ now: NOW });
  assert.equal(s.rows.length, 12);
  assert.equal(s.myOrgId, SAMPLE_SELF_ID);
  assert.equal(s.rows.find((r) => r.orgId === SAMPLE_SELF_ID).name, 'Sample council');
  const real =
    /toronto|waterloo|mcgill|queen|british columbia|western|mcmaster|calgary|university/i;
  for (const r of s.rows) {
    assert.equal(r.is_demo, true);
    assert.ok(isSampleCouncilId(r.orgId));
    assert.doesNotMatch(r.name, real);
    assert.equal(r.rating, blendRating(r.comp, r.fund));
    assert.equal(r.tier, tierForRating(r.rating));
    if (!r.reported) assert.equal(r.fund, 1000);
    if (r.reported) assert.equal(r.selfReported, true);
    const d = s.details[r.orgId];
    assert.equal(d.name, r.name, 'each council page shows its own data');
    assert.equal(d.txns[0].rating_after, r.rating);
    assert.equal(d.txns[d.txns.length - 1].rating_before, 1000);
    assert.ok(d.peak >= r.rating);
    for (const t of d.txns) assert.ok(t.delta !== 0);
    assert.equal(r.move, d.txns[0].delta);
  }
  assert.equal(sampleCouncilDetail('sample-council-12', { now: NOW }).name, s.rows[11].name);
  assert.equal(sampleCouncilDetail('7e510000-0000-4000-8000-000000000003'), null);
});

test('ratio form: ratios only, sample saves stay local', () => {
  assert.deepEqual(validateRatios({ period_label: 'FY2026', sharpe: '1.2' }), {});
  assert.ok(validateRatios({ sharpe: 'abc' }).sharpe);
  assert.ok(validateRatios({ period_label: '$5m' }).period_label);
  assert.deepEqual(ratioBody({ period_label: ' Q2 ', roi_pct: '3.5', sharpe: '' }), {
    period_label: 'Q2',
    roi_pct: 3.5,
    sharpe: null,
    benchmark_alpha_pct: null,
    max_drawdown_pct: null,
    volatility_pct: null,
  });
  const s = buildCouncilRankingsSample({ now: NOW });
  const next = applySampleRatios(s, SAMPLE_SELF_ID, { roi_pct: '1', sharpe: '0.5' });
  const me = next.rows.find((r) => r.orgId === SAMPLE_SELF_ID);
  assert.equal(me.roi, 1);
  assert.equal(me.rating, s.rows.find((r) => r.orgId === SAMPLE_SELF_ID).rating);
});

test('routes: sample gated, sample council pages gated, form route kept', () => {
  const sampleRoute = read('src/app/api/org/council-rankings/sample/route.js');
  assert.match(sampleRoute, /isCommunityDemoViewer\(user\)/);
  assert.match(sampleRoute, /requireAuth: true/);
  assert.match(sampleRoute, /getCurrentOrgMember/);
  const detail = read('src/app/(dashboard)/council-rankings/[orgId]/page.js');
  assert.match(detail, /isSampleCouncilId\(orgId\)/);
  assert.match(detail, /isCommunityDemoViewer/);
  assert.match(detail, /notFound\(\)/);
  assert.ok(fs.existsSync('src/app/(dashboard)/org-competitions/council/page.js'));
  const page = read('src/components/org/council-rankings/RankingsPage.jsx');
  assert.match(
    page,
    /sampleActive \? sample\.bundle\.rows : liveRows/,
    'sample replaces, never mixes',
  );
  assert.match(read('src/components/org/council-rankings/ReportRatiosDialog.jsx'), /<Modal/);
});

test('page rules: flat CSS, tokens only, shell untouched', () => {
  const css = read('src/app/(dashboard)/council-rankings/council-rankings.css');
  assert.doesNotMatch(css, /box-shadow|#[0-9a-fA-F]{3,6}\b|rgba?\(/);
  for (const f of fs.readdirSync('src/components/org/council-rankings')) {
    const src = read(`src/components/org/council-rankings/${f}`);
    assert.doesNotMatch(src, /window\.(confirm|prompt)\(/);
    assert.doesNotMatch(src, /\bCard\b|PageHeader|Eyebrow/);
  }
  assert.match(read('src/app/(dashboard)/council-rankings/layout.js'), /TeamHubShell/);
});

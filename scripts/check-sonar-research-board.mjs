/**
 * Sonar research board (Nov 2026): a ranking question answers with its ranking, the claim
 * validator reads a record's stated scale, the commodity evidence text prints a number, and
 * the board's headline, bullets, KPIs, table and resources come out right for
 * "Which countries produce the most crude oil?".
 *
 * Run: node --no-warnings --import ./scripts/register-sonar-loader.mjs --test scripts/check-sonar-research-board.mjs
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { oilState } from './fixtures/sonar-research-oil.mjs';

const F = await import('@/lib/sonar/engine/findings');
const E = await import('@/lib/sonar/engine/evidence');
const B = await import('@/lib/sonar/research-board');
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const clone = () => structuredClone(oilState);

/* ------------------------------------------------------------------ validator scale */

test('a claim quoting a record at its stated scale is kept', () => {
  const ev = oilState.run.evidence[0];
  const rec = {
    ...ev,
    numbers: E.numbersOf(`${ev.title} ${ev.text}`),
    entities: ['United States', 'Russia'],
  };
  const ctx = { byMarker: new Map([['S1', rec]]), metricsById: new Map() };
  const v = (t) =>
    F.validateClaim(
      {
        title: 'x',
        explanation: t,
        classification: 'verified_fact',
        evidence: ['S1'],
        entities: ['United States'],
      },
      ctx,
    );
  assert.equal(
    v('The United States leads at 13,792 thousand barrels per day in Jun 2026.').action,
    'kept',
  );
  assert.equal(v('The United States produces about 13.8 million barrels per day.').action, 'kept');
  assert.equal(
    v('The United States produces 13,792 kb/d, ahead of Russia (9,582).').action,
    'kept',
  );
  /* Still strict: a figure the record does not state is removed. */
  assert.equal(v('The United States produces 15,000 thousand barrels per day.').action, 'removed');
  assert.equal(v('The United States produces 19.2 million barrels per day.').action, 'removed');
});

test('statedScale reads the unit a record states, not a figure with a multiplier', () => {
  assert.equal(
    F.statedScale('Highest crude oil production (thousand barrels per day): 1. US 13,792'),
    1e3,
  );
  assert.equal(F.statedScale('Revenue in millions of US dollars: 4,200'), 1e6);
  assert.equal(F.statedScale('Contract worth 5 million dollars'), 1);
  assert.equal(F.statedScale('Obligations of $2 billion'), 1);
  assert.equal(F.statedScale('No scale here: 42'), 1);
});

/* ------------------------------------------------------------------ ranking answer */

test('a ranking report with no surviving ranking claim answers with the ranking', () => {
  const s = clone();
  F.ensureRankingAnswer(s.report, {
    visualizations: s.analysis.visualizations,
    marked: s.run.evidence,
    metrics: s.analysis.metrics,
  });
  const c = s.report.executiveConclusion;
  assert.equal(
    c.text,
    'United States ranks first on crude oil production (13,791.9 thousand barrels per day, Jun 2026), followed by Russia, Saudi Arabia, Canada and Brazil.',
  );
  assert.deepEqual(c.markers, ['S1']);
  assert.equal(c.classification, 'verified_fact');
  assert.equal(s.report.keyFindings[0].id, 'finding_rank');
  assert.match(
    s.report.keyFindings[0].explanation,
    /^Highest crude oil production \(thousand barrels per day\): 1\. United States 13,791\.9 \(Jun 2026\); 2\. Russia 9,582/,
  );
  assert.equal(s.report.keyFindings[1].id, 'finding_6', 'the model findings follow');
  assert.ok(!JSON.stringify(s.report).includes('—'), 'no em dash');
});

test('the ranking answer leaves a report alone when a claim already names the leader', () => {
  const s = clone();
  s.report.executiveConclusion = { text: 'The United States leads, at 13,792.', markers: ['S1'] };
  const before = JSON.stringify(s.report);
  F.ensureRankingAnswer(s.report, {
    visualizations: s.analysis.visualizations,
    marked: s.run.evidence,
  });
  assert.equal(JSON.stringify(s.report), before);
  /* No ranking visualization: nothing changes. */
  const t = clone();
  const b2 = JSON.stringify(t.report);
  F.ensureRankingAnswer(t.report, { visualizations: [t.analysis.visualizations[0]] });
  assert.equal(JSON.stringify(t.report), b2);
});

test('the engine calls the ranking answer and the commodity text prints its close', () => {
  assert.match(
    read('src/lib/sonar/engine/engine.js'),
    /if \(!memo\) ensureRankingAnswer\(report, \{ visualizations, marked, metrics \}\)/,
  );
  const src = read('src/lib/sonar/engine/sources.js');
  assert.ok(!src.includes('s.last?.toFixed?.(2) ?? s.last'), 'no object in the text');
  assert.match(src, /Number\(s\.last\?\.v \?\? s\.last\)\.toFixed\(2\)/);
});

/* ------------------------------------------------------------------ board view */

test('the board: ranking, headline, summary and bullets', () => {
  const s = clone();
  F.ensureRankingAnswer(s.report, {
    visualizations: s.analysis.visualizations,
    marked: s.run.evidence,
    metrics: s.analysis.metrics,
  });
  const rank = B.rankingOf(s.analysis.visualizations);
  assert.equal(rank.id, 'macro_rank_oil_production');
  assert.deepEqual(rank.of, { count: 215, noun: 'countries' });
  assert.equal(
    B.boardHeadline(s.report, rank),
    'United States ranks first on crude oil production, followed by Russia, Saudi Arabia, Canada and Brazil.',
  );
  assert.match(
    B.boardSummary(s.report, rank),
    /United States 13,791\.9, Russia 9,582, Saudi Arabia 7,290/,
  );
  const bullets = B.boardBullets(s.report, rank);
  assert.equal(
    bullets[0].text,
    'United States leads at 13,791.9 thousand barrels per day, 44% above Russia.',
  );
  assert.equal(bullets[1].text, 'The top five hold 72% of the top 10 listed.');
  assert.ok(
    bullets.some((b) => b.text === 'WTI crude oil prices have risen 31.4% over three years.'),
  );
  assert.ok(
    !bullets.some((b) => /leads the ranking/.test(b.text)),
    'the ranking finding is not repeated',
  );
  /* Without the ranking answer the headline still comes from the ranking. */
  const raw = clone();
  assert.match(B.boardHeadline(raw.report, rank), /^United States ranks first/);
});

test('the board: KPI tiles, table and methodology lines', () => {
  const s = clone();
  const rank = B.rankingOf(s.analysis.visualizations);
  const k = B.boardKpis({
    metrics: s.analysis.metrics,
    run: s.run,
    plan: s.plan,
    team: { audit: s.run.team.audit },
    rank,
  });
  assert.deepEqual(
    k.map((t) => [t.id, t.value, t.label]),
    [
      ['metric', '+31.4%', 'Crude oil (WTI) change'],
      ['confidence', 'HIGH', 'Confidence'],
      ['universe', '215', 'Countries ranked'],
      ['checks', '10 of 11', 'Methodology checks passed'],
    ],
  );
  /* An empty company universe never shows as "screened". */
  const noRank = B.boardKpis({ metrics: [], run: null, plan: s.plan, team: null, rank: null });
  assert.ok(!noRank.some((t) => t.id === 'universe'));
  const rows = B.rankingRows(rank, 10);
  assert.equal(rows.length, 10);
  assert.equal(rows[1].display, '9,582.0', 'one decimal across the column');
  assert.ok(Math.abs(rows.reduce((a, r) => a + r.share, 0) - 100) < 0.01);
  assert.equal(rows[0].width, 100);
  const lines = B.methodologyLines({
    rank,
    metrics: s.analysis.metrics,
    run: s.run,
    limitations: s.run.limitations,
    sourceLabels: { macro_series: 'Macro and commodity indicators' },
  });
  assert.deepEqual(
    lines.map((l) => l.id),
    ['approach', 'period', 'sources', 'caveat'],
  );
  assert.match(lines[2].text, /Macro and commodity indicators/);
});

test('the board: evidence groups, cited records, belt resources, chart geometry', () => {
  const s = clone();
  const g = B.evidenceGroups(s.run.evidence, [
    ['market_data', 'Financial and market data'],
    ['historical', 'Historical information'],
    ['supporting_research', 'Supporting research'],
  ]);
  assert.deepEqual(
    g.map((x) => [x.id, x.count]),
    [
      ['market_data', 1],
      ['historical', 2],
      ['supporting_research', 1],
    ],
  );
  assert.deepEqual(
    B.citedEvidence(s.report.analysis[0], s.run.evidence).map((e) => e.marker),
    ['S2', 'S3'],
  );
  const r = B.researchResources(s, {
    sourceLabels: {
      macro_series: 'Macro and commodity indicators',
      commodity_series: 'Commodity prices',
      echo: 'Ezana Echo',
    },
  });
  assert.deepEqual(
    r.filter((x) => x.kind === 'dataset').map((x) => x.label),
    ['Commodity prices', 'Macro and commodity indicators', 'Ezana Echo'],
    'only sources that returned evidence',
  );
  assert.ok(
    r.some((x) => x.kind === 'publisher' && /Energy Information Administration/.test(x.label)),
  );
  const geo = B.lineGeometry(s.analysis.visualizations[0].series);
  assert.equal(geo.from, '2023-11-08');
  assert.equal(geo.to, '2026-11-07');
  assert.ok(geo.ticks.length >= 3 && geo.ticks.every((t) => t.y >= -0.01 && t.y <= 100.01));
  assert.match(geo.line, /^M0 [\d.]+ L/);
  assert.equal(B.lineGeometry([{ x: 'a', y: 1 }]), null);
});

test('wiring: the report renders the board, the run passes deep research inline, no outlines', () => {
  const rep = read('src/components/sonar/research/ResearchReport.jsx');
  assert.match(rep, /report\.format !== 'investment_memo'/);
  assert.match(rep, /<ResearchBoard/);
  /* Nov 6: a locked answer has no explorer; a citation lands on its supporting row. */
  assert.match(
    rep,
    /document\.getElementById\(`evs-\$\{m\}`\)/,
    'a citation finds its supporting row',
  );
  assert.match(rep, /plan\.universe\?\.count > 0/, 'an empty universe is not shown');
  const run = read('src/components/sonar/DeepResearch.jsx');
  assert.match(run, /placement="inline"/);
  assert.match(run, /estimate && onDeep && !onBoard \?/);
  const css = read('src/components/sonar/research/research-board.css');
  assert.ok(!/border(-[a-z]+)?:\s*\d+px solid/.test(css), 'no 1px outlines');
  assert.ok(!/#[0-9a-f]{3,8}\b/i.test(css), 'no hex');
  const board = read('src/components/sonar/research/ResearchBoard.jsx');
  assert.ok(!board.includes('—'), 'no em dash');
});

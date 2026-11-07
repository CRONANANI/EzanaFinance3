/**
 * Sonar congressional activity (Nov 7): "How has disclosed congressional
 * trading activity changed over the last three years?" reads
 * sonar_congress_activity instead of falling to a general briefing that says
 * the data is unavailable. Fixture: the production payload of Nov 6, 2026.
 *   npm run test:sonar-congress-activity
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const M = await import('@/lib/sonar/landing-congress-activity');
const { twoProportionZ, logChangeDecomposition, QUANT } =
  await import('@/lib/sonar/analysts/quant');

const payload = JSON.parse(
  readFileSync(new URL('./fixtures/sonar-congress-activity-2026-11-06.json', import.meta.url)),
);
const d = M.mapActivityPayload(payload);
const analysis = M.analyzeCongressActivity(d);
const dossier = { kind: 'congress_activity', ...d, analysis };
const QUESTION =
  'How has disclosed congressional trading activity changed over the last three years? Compare transaction counts, purchases versus sales, and House versus Senate activity, accounting for reporting limitations.';

test('the founder ping is detected, with three years and every focus', () => {
  assert.deepEqual(M.detectCongressActivityPing(QUESTION), {
    years: 3,
    focus: { chambers: true, sides: true, limits: true },
  });
  assert.equal(M.detectCongressActivityPing('Are senators trading more than last year?').years, 2);
  assert.ok(M.detectCongressActivityPing('house vs senate trading volume'));
  assert.equal(
    M.detectCongressActivityPing('Has congressional trading increased over the past five years?')
      .years,
    5,
  );
});

test('member, sector, flows and unrelated pings never route here', () => {
  for (const q of [
    'What has Nancy Pelosi been buying lately?',
    'Which defense stocks are members of Congress trading?',
    'What are hedge funds selling right now?',
    'Congress approval rating',
    'Is Turkey’s lira under pressure?',
  ])
    assert.equal(M.detectCongressActivityPing(q), null, q);
});

test('windows end 45 days before as-of and the tail is kept apart', () => {
  assert.equal(d.cutoff, '2026-09-22');
  assert.deepEqual(
    d.windows.map((w) => w.to),
    ['2024-09-22', '2025-09-22', '2026-09-22'],
  );
  assert.equal(d.tailWindow.k, 0);
  assert.equal(d.house.tail.trades, 316);
});

test('thin Senate windows are coverage gaps, never a trend', () => {
  assert.deepEqual(analysis.house.gaps, [null, null, null]);
  assert.match(analysis.senate.gaps[0], /^1 member in/);
  assert.match(analysis.senate.gaps[1], /16 members/);
  assert.equal(analysis.senate.gaps[2], null);
  assert.equal(analysis.senate.changeVsPrior, null);
  /* A back-loaded window (median lag above 180 days) is a gap too. */
  assert.match(M.coverageGap({ trades: 500, members: 30, lagP50: 824 }, 30), /older filings/);
});

test('House change, decomposition and completeness estimate', () => {
  const h = analysis.house;
  assert.equal(Math.round(h.changeFirstToPrior), 160);
  assert.equal(Math.round(h.changeVsPrior), -20);
  assert.ok(h.decomposition.intensityShare > 0.95, 'members flat, intensity drove it');
  assert.ok(h.completeness.estimate > h.completeness.observed);
  assert.ok(h.completeness.estimate < h.completeness.observed * 1.2);
});

test('purchase share shift is tested and the member split is kept', () => {
  const t = analysis.house.sideTest;
  assert.ok(t.value < -4 && t.pValue < 0.001);
  assert.ok(t.warnings.some((w) => /cluster/.test(w)));
  assert.equal(analysis.house.latest.netSellers, 56);
});

test('House vs Senate is per member and names a dominant filer', () => {
  const sh = analysis.shared;
  assert.ok(Math.abs(sh.housePerMember - 52.4) < 0.1);
  assert.ok(Math.abs(sh.senatePerMember - 53.5) < 0.1);
  assert.ok(analysis.senate.topOneShare > 0.4);
});

test('the brief answers first, carries the limits and has no em dash', () => {
  const b = M.congressActivityBrief(dossier);
  assert.match(b, /^Disclosed House trading more than doubled, then eased: 2,506 trades/);
  assert.match(b, /up 160%/);
  assert.match(b, /down 20%/);
  assert.match(b, /once typical late filings arrive/);
  assert.match(b, /per member/);
  assert.match(b, /too few senators \(1 and 16\)/);
  assert.match(b, /not yet due/);
  assert.doesNotMatch(b, /\u2014/);
  assert.doesNotMatch(
    b,
    /\b(lack|cannot verify|my knowledge|insider|illegal|should (?:buy|sell))\b/i,
  );
  const words = b.split(/\s+/).length;
  assert.ok(words <= 175, `brief is ${words} words`);
});

test('evidence is congress corpus with the method stated', () => {
  const ev = M.congressActivityEvidence(dossier);
  assert.ok(ev.length >= 5);
  assert.ok(ev.every((e) => e.corpus === 'congress'));
  assert.ok(ev.some((e) => /not comparable/.test(e.snippet)));
  assert.ok(ev.some((e) => /z = -4\.3/.test(e.snippet)));
});

test('quant: two-proportion z and log decomposition', () => {
  const z = twoProportionZ({ x: 50, n: 100 }, { x: 60, n: 100 });
  assert.ok(Math.abs(z.value - 1.4213) < 0.001);
  assert.ok(Math.abs(z.pValue - 0.1552) < 0.001);
  const dcp = logChangeDecomposition({ total: 100, units: 10 }, { total: 200, units: 20 });
  assert.ok(Math.abs(dcp.unitsShare - 1) < 1e-9);
  assert.ok(Math.abs(dcp.intensityShare) < 1e-9);
  assert.equal(typeof QUANT.twoProportionZ, 'function');
  assert.equal(typeof QUANT.logChangeDecomposition, 'function');
});

test('the pipeline and the board are wired', () => {
  const pipe = readFileSync(
    new URL('../src/lib/sonar/landing-pipeline.js', import.meta.url),
    'utf8',
  );
  assert.match(pipe, /detectCongressActivityPing\(query\)/);
  assert.match(pipe, /congressActivityBrief\(activityDossier\)/);
  assert.match(pipe, /const aggregatePing = flowsPing \|\| activityPing/);
  const ui = readFileSync(
    new URL('../src/components/landing/SonarSection.jsx', import.meta.url),
    'utf8',
  );
  assert.match(ui, /kind === 'congress_activity'/);
  assert.match(ui, /'congress-activity': m\?\.congressActivity/);
});

/* ── Nov 7: the research board and the deep run ─────────────────────── */

const B = await import('@/lib/sonar/congress-activity-board');
const { scoreDomains } = await import('@/lib/sonar/engine/domain-score');
const { analyze } = await import('@/lib/sonar/engine/analysis');

test('the board opens with the answer, never the coverage caveat', () => {
  const h = B.activityHeadline(dossier);
  assert.match(
    h,
    /^Over the last three years, disclosed House trading more than doubled, then eased\. House sales now outnumber purchases/,
  );
  assert.doesNotMatch(h, /not comparable|coverage/i);
  assert.ok(!/\d/.test(h), 'headline carries no figures');
  const sum = B.activitySummary(dossier);
  assert.doesNotMatch(sum, /duplicate rows/, 'the limits sentence lives in the limits card');
});

test('board snapshot, takeaways, KPIs, findings and limits come from the data', () => {
  const snap = B.activitySnapshot(dossier);
  assert.equal(snap.rows[0].display, '2,506 to 5,189');
  assert.equal(snap.shares[0].value, '76.4%');
  const k = B.activityKpis(dossier);
  assert.deepEqual(
    k.map((t) => t.value),
    ['6,795', '3,518', '3,231', '76.4%'],
  );
  assert.equal(k[0].delta.text, 'House down 20% vs prior year');
  assert.equal(B.activityTakeaways(dossier).length, 5);
  assert.match(B.activityFindings(dossier)[0], /2,506 \(To Sep 22, 2024\), 6,511/);
  const lim = B.activityLimits(dossier).map((l) => l.id);
  assert.deepEqual(lim, ['lag', 'coverage', 'scope', 'quality']);
  assert.match(B.activityLimits(dossier)[1].text, /1 senator on file/);
});

test('charts: window bars, chamber split and the purchase index', () => {
  const bars = B.windowBars(dossier, 'house');
  assert.deepEqual(
    bars.map((b) => b.total),
    [2495, 6490, 5144],
  );
  assert.ok(bars.every((b) => !b.gap));
  assert.ok(B.windowBars(dossier, 'both')[0].gap, 'thin Senate years are marked');
  const split = B.chamberSplit(dossier);
  assert.equal(split.total, 6795);
  const idx = B.sideIndex(dossier, 'house');
  assert.equal(idx[0].purchases, 100);
  assert.equal(B.sideIndex(dossier, 'senate'), null, 'one comparable Senate window');
});

test('deep run: congressional trading only, no company domains', () => {
  const ids = scoreDomains(QUESTION, { intent: 'comparison', entities: [] }).map((x) => x.id);
  assert.equal(ids[0], 'congress_trading');
  for (const id of ['company', 'company_financials', 'market_performance'])
    assert.ok(!ids.includes(id), id);
  /* A named member keeps its own domains. */
  const pel = scoreDomains('How has Nancy Pelosi trading changed over the last three years?', {
    intent: 'politician',
    entities: [{ kind: 'person_politician' }],
  }).map((x) => x.id);
  assert.ok(pel.includes('politician'));
});

test('deep run: the activity figures become citable metrics', () => {
  const rows = M.activityMetricRows(dossier);
  assert.ok(rows.find((m) => m.id === 'congress_house_trades_change'));
  const { metrics } = analyze([
    { id: 'ev1', period: { label: 'x' }, data: { metric: 'trade_count', activity: rows } },
  ]);
  assert.equal(metrics.length, rows.length);
  assert.equal(Math.round(metrics.find((m) => m.id === 'congress_house_trades_change').value), -20);
});

test('the research board and report are wired', () => {
  const board = readFileSync(
    new URL('../src/components/sonar/research/ResearchBoard.jsx', import.meta.url),
    'utf8',
  );
  assert.match(board, /isActivityPanel\(state\.panels\?\.congressActivity\)/);
  assert.match(board, /congressActivityCells\(activity/);
  const report = readFileSync(
    new URL('../src/components/sonar/research/ResearchReport.jsx', import.meta.url),
    'utf8',
  );
  assert.match(report, /congress_activity: 'Congressional trades by chamber'/);
  const engine = readFileSync(
    new URL('../src/lib/sonar/engine/engine.js', import.meta.url),
    'utf8',
  );
  assert.match(engine, /wantedByDomain\(src\)/);
});

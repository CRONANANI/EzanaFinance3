/**
 * Fund Analytics (/org-team-hub/fund-analytics, Nov 2026 redesign).
 *   npm run test:org-fund-analytics
 *
 * Pure checks on the page model and the sample bundle, plus source guards for
 * the rules that are easy to regress: the headline and the chart share one
 * period, a losing holding is never a contributor, there is one sector cap,
 * the sample fund is the Command Center and Trading Desk fund, and the page
 * claims nothing it does not do.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  analystByTicker,
  attentionGroups,
  buildReturnChart,
  composeInsight,
  concentrationOf,
  contributorsOf,
  coverageNote,
  fmtPct,
  funnelRows,
  headlineOf,
  leaderboardOf,
  nextSort,
  pickCompetition,
  pipelineOf,
  pitchState,
  scopeFundSeries,
  sectorRows,
  sortRows,
  standingOf,
} from '../src/lib/org-fund-analytics-model.js';
import { buildFundAnalyticsSample } from '../src/lib/org-fund-analytics-sample.js';
import { buildTradingDeskSample } from '../src/lib/org-trading-desk-sample.js';
import { buildCommandCenterSample } from '../src/lib/org-command-center-sample.js';

const read = (p) => fs.readFileSync(p, 'utf8');
const NOW = Date.UTC(2026, 10, 15, 12);
const DAY = 86400000;
const cents = (v) => Math.round(v * 100) / 100;
const viewer = { userId: 'u-me', memberId: 'm-me', role: 'executive', displayName: 'Viewer' };
const sample = (over = {}) =>
  buildFundAnalyticsSample({ ...viewer, canAttention: true, canHealth: true, now: NOW, ...over });

const rows = (n, f) =>
  Array.from({ length: n }, (_, i) => ({
    snapshot_date: new Date(NOW - (n - 1 - i) * DAY).toISOString().slice(0, 10),
    ...f(i),
  }));

test('period: a window inside the history is re-based, and the headline is its last point', () => {
  const all = rows(300, (i) => ({
    total_value: 1000 + i,
    return_pct: 10 + i * 0.1,
    benchmark_return_pct: i * 0.05,
    alpha_pct: null,
  }));
  const s = scopeFundSeries(all, 'semester');
  assert.equal(s.periodStats.rebased, true);
  assert.equal(s.series[0].fund_return_pct, 0);
  assert.equal(s.series[0].benchmark_return_pct, 0);
  const last = s.series[s.series.length - 1];
  assert.equal(s.periodStats.return_pct, last.fund_return_pct);
  assert.equal(s.periodStats.benchmark_return_pct, last.benchmark_return_pct);
  assert.ok(
    Math.abs(s.periodStats.alpha_pct - (last.fund_return_pct - last.benchmark_return_pct)) < 1e-9,
  );
  /* The latest record itself is not re-based. */
  assert.ok(Math.abs(s.latest.return_pct - 39.9) < 1e-9);
  const h = headlineOf({ periodStats: s.periodStats, performance: { return_pct: 99 } });
  assert.equal(h.returnPct, s.periodStats.return_pct);
  assert.match(coverageNote(h, 'semester'), /in points/);
});

test('period: a window that covers the whole history uses the stored figures', () => {
  const all = rows(40, (i) => ({
    total_value: 1000 + i,
    return_pct: 5 + i,
    benchmark_return_pct: i / 2,
    alpha_pct: 5 + i / 2,
  }));
  for (const period of ['semester', 'inception']) {
    const s = scopeFundSeries(all, period);
    assert.equal(s.periodStats.full_history, true);
    assert.equal(s.series[0].fund_return_pct, 5);
    assert.equal(s.periodStats.return_pct, 44);
    assert.equal(s.periodStats.alpha_pct, 24.5);
  }
  assert.match(
    coverageNote(headlineOf(scopeFundSeries(all, 'semester')), 'semester'),
    /full history/,
  );
  assert.deepEqual(scopeFundSeries([], 'ytd'), { series: [], latest: null, periodStats: null });
});

test('headline: with no daily records the current book stands in, and says so', () => {
  const h = headlineOf({ periodStats: null, performance: { total_value: 5, return_pct: 2 } });
  assert.equal(h.source, 'book');
  assert.equal(h.returnPct, 2);
  assert.match(coverageNote(h, 'ytd'), /No daily fund records yet/);
  assert.equal(headlineOf(null).source, 'none');
});

test('chart: percent axis with zero in range, signed ticks, a gap where the benchmark is missing', () => {
  const series = rows(30, (i) => i).map((r, i) => ({
    date: r.snapshot_date,
    fund_value: 100 + i,
    fund_return_pct: -3 + i,
    benchmark_return_pct: i === 10 ? null : i / 2,
  }));
  const c = buildReturnChart(series, { width: 600, height: 260 });
  assert.ok(c.yTicks.some((t) => t.label === '0.00%' && t.zero));
  assert.ok(c.yTicks.every((t) => /^(0\.00%|[+-]\d+\.\d\d%)$/.test(t.label)));
  assert.equal((c.benchLine.match(/M/g) || []).length, 2);
  assert.equal(c.points.length, 30);
  assert.equal(buildReturnChart(series.slice(0, 1)), null);
});

test('sectors: one cap for every sector; no cap rule means nothing is flagged', () => {
  const positions = [
    { ticker: 'A', sector: 'Tech', team_id: 't1', value: 60, cost: 50, pl: 10 },
    { ticker: 'B', sector: 'Health', team_id: 't2', value: 40, cost: 44, pl: -4 },
    { ticker: 'C', sector: null, team_id: null, value: 0, cost: 0, pl: 0 },
  ];
  const teams = [{ id: 't1', name: 'One' }];
  const members = [{ id: 'm1', team_id: 't1', role: 'portfolio_manager', display_name: 'Pat' }];
  const r = sectorRows({ positions, teams, members, capPct: 50 });
  assert.deepEqual(
    r.map((x) => [x.sector, x.cap_pct, x.over_cap]),
    [
      ['Tech', 50, true],
      ['Health', 50, false],
      ['Unclassified', 50, false],
    ],
  );
  assert.equal(r[0].pm_name, 'Pat');
  assert.equal(r[0].contribution_pct, 10);
  assert.equal(r[1].contribution_pct, -4);
  const c = concentrationOf(positions, 50);
  assert.deepEqual([c.breach, c.sector, c.over_count, c.sector_count], [true, 'Tech', 1, 3]);
  assert.deepEqual(concentrationOf(positions, null), { breach: false, source: 'none' });
  assert.equal(sectorRows({ positions, teams, members, capPct: null })[0].over_cap, false);
});

test('holdings: a loss is never a contributor and a gain never a detractor', () => {
  const positions = [
    { ticker: 'UP', value: 12, cost: 10, pl: 2 },
    { ticker: 'DN', value: 8, cost: 10, pl: -2 },
    { ticker: 'FLAT', value: 10, cost: 10, pl: 0 },
  ];
  const c = contributorsOf({ positions, pitches: [], members: [] });
  assert.deepEqual(
    c.top.map((r) => r.ticker),
    ['UP'],
  );
  assert.deepEqual(
    c.bottom.map((r) => r.ticker),
    ['DN'],
  );
  assert.equal(c.top[0].analyst_name, null);
});

test('credit: an approved pitch takes the holding from a rejected one', () => {
  const pitches = [
    { id: 1, ticker: 'X', analyst_member_id: 'a', decision: 'accepted' },
    { id: 2, ticker: 'X', analyst_member_id: 'b', decision: 'rejected' },
    { id: 3, ticker: 'Y', analyst_member_id: 'b', decision: 'rejected' },
  ];
  const m = analystByTicker(pitches);
  assert.equal(m.get('X'), 'a');
  assert.equal(m.get('Y'), 'b');
});

test('leaderboard: hit rate follows the scorecard rule; no pitches means no figures', () => {
  const members = [
    { id: 'a', role: 'analyst', display_name: 'Ann', team_id: 't' },
    { id: 'b', role: 'analyst', display_name: '', title: '', team_id: null },
    { id: 'gone', role: 'analyst', display_name: 'Gone', is_active: false },
  ];
  const pitches = [
    { id: 1, ticker: 'X', analyst_member_id: 'a', decision: 'accepted' },
    { id: 2, ticker: 'Y', analyst_member_id: 'a', decision: 'rejected' },
    { id: 3, ticker: 'Z', analyst_member_id: 'a', decision: null },
  ];
  const hindsightByPitch = new Map([
    [1, { return_pct: 10, alpha_pct: 4 }],
    [2, { return_pct: 6, alpha_pct: -2 }],
  ]);
  const positions = [{ ticker: 'X', team_id: 't', sector: 'Tech', value: 12, cost: 10, pl: 2 }];
  const lb = leaderboardOf({
    members,
    teams: [{ id: 't', name: 'T' }],
    positions,
    pitches,
    hindsightByPitch,
  });
  assert.deepEqual(
    lb.map((r) => r.name),
    ['Ann', 'Unassigned'],
  );
  assert.deepEqual(
    [
      lb[0].pitches,
      lb[0].hit_rate_pct,
      lb[0].avg_return_pct,
      lb[0].avg_alpha_pct,
      lb[0].contribution_usd,
      lb[0].sleeve,
      lb[0].rank,
    ],
    [3, 50, 8, 1, 2, 'Tech', 1],
  );
  assert.deepEqual(
    [lb[1].pitches, lb[1].hit_rate_pct, lb[1].avg_alpha_pct, lb[1].contribution_usd, lb[1].sleeve],
    [0, null, null, null, null],
  );
});

test('funnel, states and sorting', () => {
  const p = pipelineOf({
    pitches: [
      { ticker: 'X', analyst_member_id: 'a', decision: 'Accepted' },
      { ticker: 'Q', analyst_member_id: 'a', decision: 'accepted' },
      { ticker: 'Y', analyst_member_id: 'a', decision: null },
    ],
    positions: [{ ticker: 'X' }, { ticker: 'H', sector: 'Tech' }],
  });
  assert.deepEqual([p.submitted, p.approved, p.executed], [3, 2, 1]);
  assert.deepEqual(p.coverage_gaps, [{ ticker: 'H', sector: 'Tech', team_id: null }]);
  assert.deepEqual(
    funnelRows(p).map((r) => [r.label, r.count, fmtPct(r.pct)]),
    [
      ['Submitted', 3, '100.00%'],
      ['Approved', 2, '66.67%'],
      ['Executed', 1, '33.33%'],
    ],
  );
  assert.equal(funnelRows({ submitted: 0 })[1].pct, null);
  assert.equal(pitchState('roughly_inline').label, 'Roughly in line');
  assert.equal(pitchState('Outperforming').icon, 'bi-arrow-up');
  assert.equal(pitchState(null).label, 'Pending');
  const data = [{ v: 2 }, { v: null }, { v: 5 }];
  assert.deepEqual(
    sortRows(data, 'v', 'desc').map((r) => r.v),
    [5, 2, null],
  );
  assert.deepEqual(
    sortRows(data, 'v', 'asc').map((r) => r.v),
    [2, 5, null],
  );
  assert.deepEqual(nextSort({ key: 'a', dir: 'desc' }, 'a'), { key: 'a', dir: 'asc' });
  assert.deepEqual(nextSort({ key: 'a', dir: 'desc' }, 'b', 'asc'), { key: 'b', dir: 'asc' });
});

test('insight: describes and never advises', () => {
  const h = { source: 'records', alphaPct: -2.1, start: '2026-07-01', end: '2026-11-15' };
  const a = composeInsight({ headline: h, concentration: { source: 'none' }, benchLabel: 'SPY' });
  assert.equal(a.text, 'The fund is behind SPY by 2.10 points from Jul 01, 2026 to Nov 15, 2026.');
  const b = composeInsight({
    headline: { ...h, alphaPct: 3 },
    concentration: { source: 'ips', breach: true, sector: 'Tech', weight_pct: 41, limit_pct: 35 },
    benchLabel: 'N/A',
  });
  assert.equal(b.tone, 'warning');
  assert.match(b.text, /ahead of its benchmark by 3\.00 points/);
  assert.match(b.text, /Tech is 41\.00% of the fund, above the 35\.00% sector cap\./);
  assert.equal(composeInsight({ headline: { alphaPct: null }, concentration: null }), null);
  for (const t of [a.text, b.text]) assert.doesNotMatch(t, /should|recommend|diversify|review/i);
});

test('standing and attention map', () => {
  const comps = [
    { id: 'x', status: 'active', myEntry: null },
    { id: 'old', status: 'completed', myEntry: { status: 'active', rank: 1 } },
    {
      id: 'c',
      name: 'Cup',
      status: 'active',
      myEntry: { status: 'active', rank: 4, return_pct: 1 },
    },
  ];
  const c = pickCompetition(comps);
  assert.equal(c.id, 'c');
  assert.equal(pickCompetition([comps[0]]), null);
  const s = standingOf(c, [
    { rank: 1, return_pct: 9 },
    { rank: 2, return_pct: 3, isMine: true },
    { rank: 3, return_pct: null },
  ]);
  assert.deepEqual([s.rank, s.field, s.return_pct], [2, 3, 3]);
  assert.deepEqual([standingOf(c, []).rank, standingOf(c, []).field], [4, null]);
  const g = attentionGroups({
    theme: Array.from({ length: 7 }, (_, i) => ({
      value: `t${i}`,
      score: 70 - i,
      memberCount: 9 - i,
    })),
    geo: [],
  });
  assert.equal(g.length, 1);
  assert.equal(g[0].rows.length, 5);
  assert.equal(g[0].label, 'Themes');
});

test('sample: the same fund as the Command Center and the Trading Desk', () => {
  const b = sample();
  const desk = buildTradingDeskSample({ ...viewer, now: NOW });
  const cc = buildCommandCenterSample({ userId: 'u-me', role: 'executive', now: NOW });
  const f = { ...b.fund, ...b.byPeriod.inception };
  assert.equal(f.performance.total_value, cc.summary.performance.total_value);
  assert.equal(f.periodStats.fund_value, 240050);
  assert.ok(Math.abs(f.periodStats.return_pct - cc.summary.performance.return_pct) < 1e-9);
  assert.equal(f.holdingsCount, desk.book.positions.length);
  /* Sector weights are the Command Center's sector teams. */
  for (const s of cc.summary.sectors) {
    const row = f.sectorVsTarget.find((r) => r.sector === s.name);
    assert.ok(row, s.name);
    assert.equal(cents((row.weight_pct / 100) * 240050), s.value);
  }
  /* Holding gains are the Trading Desk's positions, to the cent. */
  const pl = new Map(desk.book.positions.map((p) => [p.ticker, p.pl]));
  for (const r of [...f.contributors.top, ...f.contributors.bottom]) {
    assert.equal(r.contribution_usd, pl.get(r.ticker));
  }
  /* Every analyst on the board is a Trading Desk member, and covers what they pitched. */
  const names = new Set(desk.roster.members.map((m) => m.display_name));
  for (const r of f.analystLeaderboard) assert.ok(names.has(r.name), r.name);
  for (const d of desk.dossier.positions) {
    if (!d.analyst) continue;
    const row = [...f.contributors.top, ...f.contributors.bottom].find(
      (r) => r.ticker === d.ticker,
    );
    if (row) assert.equal(row.analyst_name, d.analyst);
  }
  assert.deepEqual(
    f.pipeline.coverage_gaps.map((g) => g.ticker),
    ['HON'],
  );
});

test('sample: obeys the real rules and is flagged', () => {
  const b = sample();
  const f = b.fund;
  assert.equal(b.is_demo, true);
  assert.equal(f.concentration.breach, true);
  assert.equal(f.concentration.sector, 'Financials');
  assert.ok(f.sectorVsTarget.every((r) => r.cap_pct === 35));
  assert.ok(f.contributors.top.every((r) => r.contribution_usd > 0));
  assert.ok(f.contributors.bottom.every((r) => r.contribution_usd < 0));
  for (const p of f.attribution.byPitch) {
    assert.equal(p.is_demo, true);
    if (!p.has_outcome) continue;
    const want =
      p.alpha_pct > 5 ? 'outperforming' : p.alpha_pct < -5 ? 'underperforming' : 'roughly_inline';
    assert.equal(p.current_state, want);
  }
  /* A leaderboard row and the scorecard it opens agree. */
  for (const r of f.analystLeaderboard) {
    const card = b.scorecards[r.member_id];
    assert.equal(card.pitch_count, r.pitches);
    assert.equal(card.hit_rate, r.hit_rate_pct);
    assert.ok(card.avg_alpha == null || Math.abs(card.avg_alpha - r.avg_alpha_pct) < 1e-9);
  }
  for (const list of Object.values(b.attention.dimensions)) {
    assert.ok(list.every((t) => t.memberCount >= 3));
  }
  assert.equal(b.health.positions.unpriced, 1);
  /* Only for members who can already see them. */
  const analyst = sample({ role: 'analyst', canAttention: false, canHealth: false });
  assert.equal(analyst.attention, null);
  assert.equal(analyst.health, null);
  assert.equal(analyst.fund.viewer.canReport, false);
});

test('source guards', () => {
  const dir = 'src/components/org/fund-analytics';
  const page = read(`${dir}/FundAnalytics.jsx`);
  const sections = read(`${dir}/Sections.jsx`);
  const hook = read(`${dir}/useFundAnalyticsData.js`);
  const css = read(`${dir}/fund-analytics.css`);
  const all = [
    page,
    sections,
    hook,
    read(`${dir}/Performance.jsx`),
    read(`${dir}/ScorecardDialog.jsx`),
  ];
  const route = read('src/app/api/org/analytics/sample/route.js');

  /* Sample content only for master admin and demo accounts who are members. */
  assert.match(route, /isCommunityDemoViewer\(user\)/);
  assert.match(route, /getCurrentOrgMember/);
  assert.match(page, /Sample content/);
  assert.match(page, /Show council data/);
  /* Nothing is written anywhere but the existing report export. */
  const writes = all.join('\n').match(/method: '(POST|PATCH|PUT|DELETE)'/g) || [];
  assert.equal(writes.length, 1);
  assert.match(page, /if \(sampleActive\) \{\s*setNotice/);
  /* No claims the page does not keep. */
  for (const src of all) {
    assert.doesNotMatch(src, /\bCSV\b|\bPDF\b/);
    assert.doesNotMatch(src, /real-time|k-anonymous|preselect/i);
    assert.doesNotMatch(src, /match the current filters/i);
  }
  /* The estimate wording comes only from the shared benchmark helper. */
  assert.match(page, /bench\.estimated \? 'Pitch benchmark \(est\.\)' : 'Benchmark'/);
  /* Section 6 items the wireframe left out. */
  assert.match(sections, /Team attention map/);
  assert.match(sections, /Executives and permitted managers only/);
  assert.match(read(`${dir}/ScorecardDialog.jsx`), /You can only view your own scorecard\./);
  assert.match(sections, /Current holdings/);
  assert.match(sections, /All pitches/);
  assert.match(sections, /href=\{ORG_CHART\}/);
  /* The page never draws the shell, and uses no card surface. */
  assert.doesNotMatch(page, /TeamHubSidebar|TeamHubShell\b.*from/);
  assert.doesNotMatch(css, /box-shadow|#[0-9a-fA-F]{3,6}\b|rgba?\(/);
  assert.doesNotMatch(css, /var\(--chart-cat|var\(--blue|var\(--purple|var\(--amber/);
  /* Routes that already exist. */
  for (const r of [
    '/api/org/analytics/attention',
    '/api/org/fund-health',
    '/api/org/competitions',
  ]) {
    assert.ok(hook.includes(r), r);
  }
});

/* Owner review, Nov 15 2026: the percent chart started near -100% because the
   council's earliest daily records held almost no value, and its first date
   labels could overlap. */
test('chart start: near-empty leading records are left out of the series and the headline', () => {
  const cost = 160000;
  const all = rows(120, (i) => i).map((r, i) => {
    const value = i < 3 ? [12.4, 40, 310][i] : cost * (1.2 + i / 1000);
    const ret = (value / cost - 1) * 100;
    return {
      ...r,
      total_value: value,
      return_pct: ret,
      benchmark_return_pct: 2,
      alpha_pct: ret - 2,
    };
  });
  const s = scopeFundSeries(all, 'inception');
  assert.equal(s.series.length, 117);
  assert.equal(s.series[0].date, all[3].snapshot_date);
  assert.ok(
    s.series.every((p) => p.fund_return_pct > -50),
    'no point near -100%',
  );
  assert.equal(s.periodStats.full_history, true, 'inception still uses the stored figures');
  assert.equal(s.periodStats.start_date, all[3].snapshot_date);
  const c = buildReturnChart(s.series, { width: 600, height: 260 });
  assert.ok(c.yTicks[0].label !== '-100.00%');
  /* A window that reaches back into the near-empty run starts where the chart does. */
  const sem = scopeFundSeries(all, 'semester');
  assert.equal(sem.series[0].date, all[3].snapshot_date);
  assert.equal(sem.periodStats.return_pct, s.periodStats.return_pct);
});

test('chart x axis: date labels never overlap', () => {
  for (const width of [280, 340, 460, 600, 900]) {
    for (const n of [2, 3, 5, 12, 40, 200]) {
      const series = rows(n, (i) => i).map((r) => ({
        date: r.snapshot_date,
        fund_value: 1,
        fund_return_pct: 1,
        benchmark_return_pct: 1,
      }));
      const c = buildReturnChart(series, { width, height: 260 });
      const box = c.xTicks.map((t) => {
        const w = t.label.length * 6.8;
        const from = t.anchor === 'start' ? t.x : t.anchor === 'end' ? t.x - w : t.x - w / 2;
        return [from, from + w];
      });
      assert.ok(
        box.every((b, i) => i === 0 || b[0] >= box[i - 1][1]),
        `${width}px ${n} points`,
      );
      assert.equal(new Set(c.xTicks.map((t) => t.label)).size, c.xTicks.length, 'no repeated date');
    }
  }
  assert.ok(
    read('src/components/org/fund-analytics/Performance.jsx').includes('textAnchor={t.anchor}'),
  );
});

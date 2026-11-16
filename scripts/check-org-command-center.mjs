/**
 * Command Center and the shared Team Hub sidebar (Nov 2026 redesign).
 *   npm run test:org-command-center
 *
 * Pure checks on the navigation model, the page model and the sample bundle,
 * plus source guards for the rules that are easy to regress: one shell for
 * every org layout, selected item as text only, and newest snapshots first.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  TEAM_HUB_NAV,
  teamHubNavFor,
  isTeamHubNavActive,
  teamHubCount,
  teamHubMemberLine,
} from '../src/components/org/team-hub-nav.js';
import {
  NA,
  fmtSignedPct,
  fmtMoneyCompact,
  toneOf,
  dueThisWeek,
  buildFundChart,
  firstMeaningfulIndex,
  placeXTicks,
  MEANINGFUL_SHARE,
  buildAttentionRows,
  buildDigestRows,
  benchmarkInfo,
} from '../src/lib/org-command-center.js';
import { buildCommandCenterSample } from '../src/lib/org-command-center-sample.js';

const read = (p) => fs.readFileSync(p, 'utf8');
const NOW = Date.UTC(2026, 10, 15, 12);

test('sidebar: 17 destinations in order, with the role rules', () => {
  assert.equal(TEAM_HUB_NAV.length, 17);
  assert.deepEqual(
    TEAM_HUB_NAV.map((i) => i.label),
    [
      'Command Center',
      'Trading Desk',
      'Fund Analytics',
      'Assignments',
      'Org Chart',
      'Pitch Pipeline',
      'Research Library',
      'Sonar Research',
      'Meetings',
      'Recognition',
      'Grades',
      'Competitions',
      'Council Rankings',
      'Cohorts',
      'Compliance',
      'Reports',
      'Team Permissions',
    ],
  );
  assert.equal(teamHubNavFor('executive').length, 17);
  const pm = teamHubNavFor('portfolio_manager').map((i) => i.key);
  assert.equal(pm.length, 16);
  assert.ok(!pm.includes('cohorts'));
  const analyst = teamHubNavFor('analyst').map((i) => i.key);
  assert.equal(analyst.length, 14);
  for (const k of ['cohorts', 'compliance', 'reports']) assert.ok(!analyst.includes(k));
});

test('sidebar: current page, counts and the member line', () => {
  const by = Object.fromEntries(TEAM_HUB_NAV.map((i) => [i.key, i]));
  assert.ok(isTeamHubNavActive('/org-team-hub', by.commandCenter));
  assert.ok(!isTeamHubNavActive('/org-team-hub/meetings', by.commandCenter));
  assert.ok(isTeamHubNavActive('/org-team-hub/pitches', by.pitchPipeline));
  assert.ok(isTeamHubNavActive('/org-team-hub/pitch-archive/compare', by.pitchPipeline));
  assert.ok(isTeamHubNavActive('/council-rankings/abc', by.councilRankings));
  assert.equal(teamHubCount(by.meetings, { meetings: null }), null);
  assert.equal(teamHubCount(by.meetings, { meetings: { value: 0, tone: 'neutral' } }), null);
  assert.equal(teamHubCount(by.assignments, { assignments: { value: '0/16' } }), null);
  assert.equal(teamHubCount(by.assignments, { assignments: { value: '4/16' } }).text, '4/16');
  assert.equal(
    teamHubCount(by.compliance, { compliance: { value: 2, tone: 'danger' } }).negative,
    true,
  );
  assert.equal(teamHubMemberLine('VP of Operations', 'executive'), 'VP · Operations');
  assert.equal(teamHubMemberLine('', 'analyst'), 'Analyst');
});

test('one shell: every org layout renders TeamHubShell, selection is text only', () => {
  for (const dir of ['org-team-hub', 'org-trading', 'org-competitions', 'council-rankings']) {
    const src = read(`src/app/(dashboard)/${dir}/layout.js`);
    assert.match(src, /TeamHubShell/, dir);
  }
  const css = read('src/components/org/team-hub-shell.css');
  const current = css.match(/\.thub-item\.is-current[^{]*\{([^}]*)\}/)[1];
  assert.match(current, /color:\s*var\(--emerald-text\)/);
  assert.doesNotMatch(current, /background|border|box-shadow/);
  assert.doesNotMatch(css, /--org-primary/);
});

test('formatting: signed, compact, and N/A for missing values', () => {
  assert.equal(fmtSignedPct(46.134), '+46.13%');
  assert.equal(fmtSignedPct(-0.92), '-0.92%');
  assert.equal(fmtSignedPct(null), NA);
  assert.equal(fmtMoneyCompact(240050), '$240.05K');
  assert.equal(fmtMoneyCompact(undefined), NA);
  assert.equal(toneOf(null), 'na');
  assert.equal(benchmarkInfo({ benchmark_source: 'pitch_proxy' }).estimated, true);
  assert.equal(benchmarkInfo({ benchmark_source: 'index', benchmark_symbol: 'SPY' }).label, 'SPY');
});

test('sample bundle obeys the real rules and flags every row', () => {
  const s = buildCommandCenterSample({
    userId: 'u1',
    role: 'executive',
    displayName: 'A B',
    now: NOW,
  });
  const perf = s.summary.performance;
  const sum = s.summary.sectors.reduce((a, x) => a + x.value, 0);
  assert.equal(perf.total_value, sum);
  assert.ok(Math.abs(perf.alpha_pct - (perf.return_pct - perf.benchmark_return_pct)) < 1e-9);
  const snaps = s.summary.snapshots;
  assert.equal(snaps[snaps.length - 1].value, perf.total_value);
  assert.ok(snaps.every((x, i) => i === 0 || x.date > snaps[i - 1].date));
  assert.equal(s.tasks.openCount, s.tasks.tasks.filter((t) => t.status !== 'completed').length);
  for (const row of [...s.tasks.tasks, ...s.meetings.meetings, ...s.assignments.assignments]) {
    assert.equal(row.is_demo, true);
  }
  assert.ok(buildFundChart(snaps, 'YTD', { now: NOW }));
  assert.equal(buildFundChart(snaps.slice(0, 2), 'YTD', { now: NOW }), null);
});

test('page model: due this week, attention rows by role, digest caps', () => {
  const s = buildCommandCenterSample({
    userId: 'u1',
    role: 'analyst',
    displayName: 'A B',
    now: NOW,
  });
  const due = dueThisWeek({
    meetings: s.meetings.meetings,
    tasks: s.tasks.tasks,
    assignments: s.assignments.assignments,
    now: NOW,
  });
  assert.ok(due > 0);
  const base = {
    filter: 'pending',
    userId: 'u1',
    tasks: s.tasks.tasks,
    assignments: s.assignments.assignments,
    meetings: s.meetings.meetings,
    openBreaches: 2,
    awaitingReview: 1,
    now: NOW,
  };
  const analyst = buildAttentionRows({ ...base, role: 'analyst', canManage: false });
  assert.ok(analyst.filter((r) => r.kind === 'task').every((r) => r.canChange));
  assert.ok(!analyst.some((r) => r.kind === 'breaches' || r.kind === 'grading'));
  const exec = buildAttentionRows({ ...base, role: 'executive', canManage: true });
  assert.ok(exec.some((r) => r.kind === 'breaches'));
  assert.equal(exec[0].urgent, true);
  assert.ok(
    exec.filter((r) => r.kind === 'task').length > analyst.filter((r) => r.kind === 'task').length,
  );
  assert.equal(buildDigestRows({ counts: { votes: 40 } }).rows[1].value, '40+');
  assert.equal(buildDigestRows(null).rows[0].value, NA);
});

test('the chart reads the newest snapshots, and sample content is gated', () => {
  const loader = read('src/app/api/org/team-hub/summary/_loader.js');
  assert.match(loader, /order\('snapshot_date', \{ ascending: false \}\)/);
  assert.match(loader, /\.reverse\(\)/);
  const route = read('src/app/api/org/team-hub/sample/route.js');
  assert.match(route, /isCommunityDemoViewer\(user\)/);
  assert.match(route, /getCurrentOrgMember/);
});

/* Owner review, Nov 15 2026: on live data the first x-axis labels overlapped,
   and the line started with a cliff from near $0 because the council's
   earliest daily records held almost no value. */
const DAYMS = 86400000;
const daily = (n, valueAt, end = NOW) =>
  Array.from({ length: n }, (_, i) => ({
    date: new Date(end - (n - 1 - i) * DAYMS).toISOString().slice(0, 10),
    value: valueAt(i),
    benchmarkValue: null,
  }));
const overlaps = (ticks, charWidth = 6.8) => {
  const box = ticks.map((t) => {
    const w = t.label.length * charWidth;
    const from = t.anchor === 'start' ? t.x : t.anchor === 'end' ? t.x - w : t.x - w / 2;
    return [from, from + w];
  });
  return box.some((b, i) => i > 0 && b[0] < box[i - 1][1]);
};

test('chart start: leading records below 5% of the peak are left off, later dips stay', () => {
  assert.equal(MEANINGFUL_SHARE, 0.05);
  assert.equal(firstMeaningfulIndex([12.4, 40, 310, 160000, 170000]), 3);
  assert.equal(
    firstMeaningfulIndex([null, 0, 9000, 200000]),
    3,
    '9,000 is 4.5% of the peak, so 200,000 is the first meaningful record',
  );
  assert.equal(firstMeaningfulIndex([160000, 10, 170000]), 0, 'only the leading run');
  assert.equal(firstMeaningfulIndex([]), 0);
  assert.equal(firstMeaningfulIndex([null, null]), 0);
  assert.equal(firstMeaningfulIndex([0, 0]), 0);

  const snaps = daily(150, (i) => (i < 3 ? [12.4, 40, 310][i] : 160000 + i * 300));
  const c = buildFundChart(snaps, '1Y', { now: NOW, width: 620 });
  assert.equal(c.skipped, 3);
  assert.equal(c.points[0].value, 160000 + 3 * 300);
  assert.equal(c.firstDate, snaps[3].date);
  assert.ok(c.yTicks[0].label !== '$0', 'the axis no longer reaches down to zero');
  /* A healthy fund is drawn from its first record. */
  const healthy = buildFundChart(
    daily(60, (i) => 1000 + i),
    '1Y',
    { now: NOW },
  );
  assert.equal(healthy.skipped, 0);
  assert.equal(healthy.points.length, 60);
});

test('chart x axis: labels never overlap, at any width or range', () => {
  for (const width of [300, 360, 460, 620, 900]) {
    for (const range of ['1M', '3M', 'YTD', '1Y']) {
      for (const n of [5, 20, 31, 32, 45, 95, 200, 366]) {
        const c = buildFundChart(
          daily(n, (i) => 1000 + i),
          range,
          { now: NOW, width },
        );
        if (!c) continue;
        assert.ok(!overlaps(c.xTicks), `${width}px ${range} ${n} days`);
        for (const t of c.xTicks) {
          assert.ok(['start', 'middle', 'end'].includes(t.anchor));
        }
        assert.ok(c.xTicks.length >= 1);
      }
    }
  }
  /* The case seen live: a first label at the left edge and the next month a
     few days later. */
  const t = placeXTicks(
    [
      { x: 52, label: 'Jun' },
      { x: 60, label: 'Jul' },
      { x: 200, label: 'Aug' },
      { x: 396, label: 'Sep' },
    ],
    { left: 52, right: 396 },
  );
  assert.deepEqual(
    t.map((x) => [x.label, x.anchor]),
    [
      ['Jun', 'start'],
      ['Aug', 'middle'],
      ['Sep', 'end'],
    ],
  );
  assert.ok(
    read('src/components/org/command-center/FundPerformance.jsx').includes('textAnchor={t.anchor}'),
  );
});

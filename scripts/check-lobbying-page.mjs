#!/usr/bin/env node
/* Lobbying Activity page model and formatters (src/lib/lobbying/page-model.js,
   src/lib/lobbying/page-format.js). Coverage figures mirror the live ingest
   state on 2026-10-21 (every quarter about half loaded, 2026 Q3 inside its
   filing window).
   Usage: node --no-warnings --test scripts/check-lobbying-page.mjs */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  activeFilterCount,
  awardsPerDollar,
  clampToPeriod,
  defaultPeriod,
  doorShare,
  entityShortLabel,
  filingsCsv,
  filterPayload,
  gatedYoy,
  heatScale,
  issueShareRows,
  leaderboardRows,
  logDomain,
  mappingBadge,
  membersPayload,
  parseFilters,
  periodCoverage,
  pickFilters,
  pressureMatrix,
  quarterSeries,
  quarterStatus,
  resolvePeriod,
  serializeFilters,
  shareOfTotal,
  snapMin,
  sparkPath,
  viewQuery,
  yoyDelta,
} from '../src/lib/lobbying/page-model.js';
import {
  coverageChip,
  emptyMessage,
  fmtMinStop,
  fmtPeriod,
  fmtSignedPct,
  fmtSpend,
  membersScopeLabel,
} from '../src/lib/lobbying/page-format.js';

const NOW = Date.UTC(2026, 9, 21, 12); // Oct 21, 2026

const COVERAGE = [
  {
    year: 2024,
    quarter: 'q1',
    rowsLoaded: 12249,
    totalCount: 24797,
    coveragePct: 49,
    complete: false,
  },
  {
    year: 2025,
    quarter: 'q1',
    rowsLoaded: 12535,
    totalCount: 27474,
    coveragePct: 46,
    complete: false,
  },
  {
    year: 2025,
    quarter: 'q2',
    rowsLoaded: 12870,
    totalCount: 27454,
    coveragePct: 47,
    complete: false,
  },
  {
    year: 2025,
    quarter: 'q3',
    rowsLoaded: 12488,
    totalCount: 27001,
    coveragePct: 46,
    complete: false,
  },
  {
    year: 2025,
    quarter: 'q4',
    rowsLoaded: 12730,
    totalCount: 27244,
    coveragePct: 47,
    complete: false,
  },
  {
    year: 2026,
    quarter: 'q3',
    rowsLoaded: 12450,
    totalCount: 24440,
    coveragePct: 51,
    complete: false,
  },
  { year: 2026, quarter: 'q4', rowsLoaded: 67, totalCount: 67, coveragePct: 100, complete: true },
];

test('yoyDelta: prior zero or missing is null, never Infinity', () => {
  assert.equal(yoyDelta(100, 0), null);
  assert.equal(yoyDelta(100, null), null);
  assert.equal(yoyDelta(null, 100), null);
  assert.equal(yoyDelta(110, 100), 10);
  assert.equal(yoyDelta(90, 100), -10);
  assert.equal(fmtSignedPct(null), '·');
  assert.equal(fmtSignedPct(4.25), '+4.3%');
  assert.equal(fmtSignedPct(-1), '-1.0%');
});

test('gatedYoy: hidden until both periods are fully loaded', () => {
  assert.deepEqual(gatedYoy(110, 100, { pct: 47 }, { pct: 49 }), {
    value: null,
    reason: 'coverage',
  });
  assert.deepEqual(gatedYoy(110, 100, { pct: 100 }, { pct: 98 }), { value: 10, reason: null });
  assert.deepEqual(gatedYoy(110, 0, { pct: 100 }, { pct: 100 }), {
    value: null,
    reason: 'no_prior',
  });
});

test('shareOfTotal and doorShare are null-safe', () => {
  assert.equal(shareOfTotal(1, 0), null);
  assert.equal(shareOfTotal(null, 10), null);
  assert.equal(shareOfTotal(1, 3), 33.3);
  assert.equal(doorShare(21742, 50623), 42.9);
});

test('heatScale: zero cell 0, max cell 0.88, monotonic', () => {
  assert.equal(heatScale(0, 100), 0);
  assert.equal(heatScale(5, 0), 0);
  assert.equal(heatScale(100, 100), 0.88);
  assert.ok(heatScale(1, 100) >= 0.05);
  assert.ok(heatScale(50, 100) < heatScale(51, 100));
});

test('issueShareRows: shares of filings, multi-cite flag', () => {
  const r = issueShareRows({
    total: 100,
    issues: [
      { code: 'BUD', label: 'Budget', filings: 60 },
      { code: 'TAX', label: 'Tax', filings: 50 },
    ],
  });
  assert.equal(r.rows[0].share, 60);
  assert.equal(r.rows[0].bar, 100);
  assert.equal(r.multiCite, true);
  assert.ok(!('amount' in r.rows[0]) && !('spend' in r.rows[0]));
});

test('leaderboardRows: share of period total and bar vs rank 1', () => {
  const rows = leaderboardRows(
    [
      { name: 'A', spend: 200 },
      { name: 'B', spend: 100 },
      { name: 'C', spend: 0 },
    ],
    1000,
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[1].bar, 50);
  assert.equal(rows[1].share, 10);
  assert.equal(rows[1].rank, 2);
});

test('quarterStatus: future, inside the window, incomplete, complete', () => {
  assert.equal(quarterStatus(2026, 'q4', COVERAGE[6], NOW).status, 'not_yet_filed');
  assert.deepEqual(quarterStatus(2026, 'q3', COVERAGE[5], NOW), { status: 'filing', pct: 51 });
  assert.deepEqual(quarterStatus(2025, 'q1', COVERAGE[1], NOW), { status: 'incomplete', pct: 46 });
  assert.equal(quarterStatus(2025, 'q1', { complete: true }, NOW).status, 'complete');
});

test('quarterSeries: 2024 Q1 to 2026 Q4, zero-filing quarter and ghost quarter', () => {
  const s = quarterSeries(
    [
      { year: 2024, quarter: 'q1', filings: 10, spend: 5 },
      { year: 2026, quarter: 'q4', filings: 67, spend: 40000 },
    ],
    COVERAGE,
    NOW,
  );
  assert.equal(s.length, 12);
  assert.equal(s[0].key, '2024q1');
  assert.equal(s[1].filings, 0); // a quarter with zero filings is a real zero
  const last = s[11];
  assert.equal(last.status, 'not_yet_filed');
  assert.equal(last.spend, null); // never a bar for an unfiled quarter
});

test('periodCoverage and the partial chip', () => {
  const fy = periodCoverage('fy2025', COVERAGE, NOW);
  assert.equal(fy.status, 'incomplete');
  assert.equal(fy.pct, 46); // 50,623 of 109,173
  assert.equal(coverageChip('fy2025', fy, NOW), 'FY 2025: 46% of filings loaded so far');
  const q3 = periodCoverage('2026q3', COVERAGE, NOW);
  assert.equal(coverageChip('2026q3', q3, NOW), '2026 Q3 is still being filed, 51% received');
  assert.equal(periodCoverage('fy2024', COVERAGE, NOW).status, 'unknown'); // 3 quarters missing
  assert.equal(periodCoverage('fy2025', COVERAGE, NOW, 'prior').status, 'unknown');
  assert.equal(periodCoverage('2026q3', COVERAGE, NOW, 'prior').pct, 46);
});

test('awardsPerDollar: whole dollars, null when lobbying is 0', () => {
  assert.equal(awardsPerDollar(1000, 0), null);
  assert.equal(awardsPerDollar(1000, 3), 333);
});

test('clampToPeriod: filer typos land on the period edge', () => {
  assert.deepEqual(clampToPeriod('2004-03-01', 2025, 'year_end'), {
    date: '2025-07-01',
    clamped: true,
  });
  assert.deepEqual(clampToPeriod('2029-01-01', 2025, 'mid_year'), {
    date: '2025-06-30',
    clamped: true,
  });
  assert.deepEqual(clampToPeriod('2025-02-24', 2025, 'mid_year'), {
    date: '2025-02-24',
    clamped: false,
  });
  assert.equal(clampToPeriod('nope', 2025, 'mid_year'), null);
  assert.equal(clampToPeriod('2025-02-24', 2025, 'q1'), null);
});

test('mappingBadge: verified, name match, unmapped', () => {
  assert.equal(mappingBadge({ ticker: 'COP', verified: true }), 'verified');
  assert.equal(mappingBadge({ ticker: 'GD', verified: false }), 'name_match');
  assert.equal(mappingBadge({ ticker: null }), 'none');
  assert.equal(mappingBadge(null), 'none');
});

test('fmtSpend: the B/M/K rule and the $1B boundary', () => {
  assert.equal(fmtSpend(999_999_999), '$1.00B');
  assert.equal(fmtSpend(1_000_000_000), '$1.00B');
  assert.equal(fmtSpend(2_199_559_430.67), '$2.20B');
  assert.equal(fmtSpend(645_571_866), '$646M');
  assert.equal(fmtSpend(8_097_958), '$8.1M');
  assert.equal(fmtSpend(208_000), '$208K');
  assert.equal(fmtSpend(950), '$950');
  assert.equal(fmtSpend(null), '·');
  assert.doesNotMatch(fmtSpend(1_284_000_000), /\$\d{4}M/);
});

test('periods: defaults, YTD, quarter, 90 days, prior twins', () => {
  assert.equal(defaultPeriod(NOW), 'fy2025');
  const ytd = resolvePeriod('ytd', NOW);
  assert.deepEqual(ytd.quarters, ['q1', 'q2', 'q3']);
  assert.deepEqual(ytd.prior, { year: 2025, quarters: ['q1', 'q2', 'q3'], from: null, to: null });
  assert.equal(resolvePeriod('2026q3', NOW).prior.year, 2025);
  assert.equal(resolvePeriod('2027q1', NOW).key, 'fy2025'); // future quarter falls back
  assert.equal(resolvePeriod('90d', NOW).year, null);
  assert.equal(fmtPeriod('2026q3', NOW), '2026 Q3');
  assert.deepEqual(resolvePeriod('2026q2', NOW).members, { year: 2026, periods: ['mid_year'] });
});

test('filters: parse, validate, serialize round trip, payload', () => {
  const f = parseFilters(
    new URLSearchParams('period=2026q3&issue=def&entity=congress&min=120000&public=1&q=boeing'),
    NOW,
  );
  assert.deepEqual(f, {
    period: '2026q3',
    issue: 'DEF',
    entity: 'congress',
    min: 100000,
    public: true,
    q: 'boeing',
  });
  assert.equal(
    serializeFilters(f, NOW).toString(),
    'period=2026q3&issue=DEF&entity=congress&min=100000&public=1&q=boeing',
  );
  assert.equal(serializeFilters(parseFilters(new URLSearchParams(''), NOW), NOW).toString(), '');
  const bad = parseFilters({ period: 'drop table', issue: 'x;--', entity: 'nope', min: '-5' }, NOW);
  assert.deepEqual(bad, {
    period: 'fy2025',
    issue: null,
    entity: 'all',
    min: 0,
    public: false,
    q: '',
  });
  assert.equal(activeFilterCount(f, NOW), 6);
  const p = filterPayload(f, NOW);
  assert.deepEqual(p, {
    year: 2026,
    quarters: ['q3'],
    issue: 'DEF',
    buckets: ['house', 'senate'],
    min: 100000,
    public: true,
    q: '%boeing%',
  });
  assert.equal(filterPayload({ ...f, q: '50%_off' }, NOW).q, '%50\\%\\_off%');
  assert.equal(snapMin(9_999_999), 5_000_000);
  assert.equal(fmtMinStop(1_000_000), '$1M+');
});

test('pickFilters: each card reads only its filters', () => {
  const f = {
    period: 'fy2025',
    issue: 'DEF',
    entity: 'congress',
    min: 10000,
    public: true,
    q: 'x',
  };
  assert.deepEqual(pickFilters(f, 'pressure'), {
    period: 'fy2025',
    issue: null,
    entity: 'all',
    min: 10000,
    public: true,
    q: '',
  });
  assert.equal(pickFilters(f, 'rhythm').period, null);
  assert.deepEqual(membersPayload(f, NOW, ['feca']), {
    year: 2025,
    periods: ['mid_year', 'year_end'],
    min: 10000,
    types: ['feca'],
  });
});

test('emptyMessage names the live filters', () => {
  const msg = emptyMessage(
    { period: '90d', issue: 'DEF', entity: 'agencies', min: 10_000_000, public: false, q: '' },
    NOW,
    'Defense',
  );
  assert.equal(
    msg,
    'No filings match these filters. Defense · Agencies · $10M+ · Last 90 days is a narrow slice; widen the period or clear the minimum.',
  );
  assert.ok(!msg.includes(String.fromCharCode(0x2014)));
});

test('pressureMatrix: totals, heat, ink flip, short labels', () => {
  const m = pressureMatrix({
    total: 10,
    issues: [{ code: 'DEF', label: 'Defense', filings: 9 }],
    entities: [
      { name: 'SENATE', filings: 8 },
      { name: 'Defense, Dept of (DOD)', filings: 3 },
    ],
    cells: [
      { issue: 'DEF', entity: 'SENATE', filings: 8, topClients: ['A'] },
      { issue: 'DEF', entity: 'Defense, Dept of (DOD)', filings: 1, topClients: [] },
    ],
  });
  assert.deepEqual(
    m.cols.map((c) => c.label),
    ['Senate', 'DOD'],
  );
  assert.equal(m.rows[0].cells[0].heat, 0.88);
  assert.equal(m.rows[0].cells[0].dark, true);
  assert.equal(m.rows[0].cells[1].dark, false);
  assert.equal(m.rows[0].shown, 9);
  assert.equal(entityShortLabel('Treasury, Dept of'), 'Treasury');
  assert.equal(entityShortLabel('HOUSE OF REPRESENTATIVES'), 'House');
});

test('charts and CSV helpers', () => {
  assert.deepEqual(logDomain([8e6, 3.2e7]).ticks, [1e6, 1e7, 1e8]);
  assert.equal(sparkPath([1], 10, 10), '');
  assert.match(sparkPath([1, 2, 3], 10, 10), /^M1 9L5 5L9 1$/);
  const csv = filingsCsv([
    { client: '=HYPERLINK("x")', ticker: 'GD', verified: false, issues: ['Defense'] },
  ]);
  assert.match(csv, /"'=HYPERLINK\(""x""\)"/);
  assert.match(csv, /"name_match"/);
});

test('membersScopeLabel', () => {
  assert.equal(
    membersScopeLabel([
      { year: 2025, period: 'year_end' },
      { year: 2025, period: 'mid_year' },
    ]),
    'LD-203 · 2025 mid-year and year-end',
  );
});

test('viewQuery: view, options, then only the filters the card applies', () => {
  const now = Date.UTC(2026, 9, 21);
  const f = { ...parseFilters({ issue: 'tax', min: '50000', public: '1' }, now) };
  const pulse = new URLSearchParams(viewQuery('pulse', f, now));
  assert.equal(pulse.get('view'), 'pulse');
  assert.equal(pulse.get('issue'), 'TAX');
  assert.equal(pulse.get('min'), '50000');
  const pressure = new URLSearchParams(viewQuery('pressure', f, now));
  assert.equal(pressure.get('issue'), null, 'pressure does not apply the issue filter');
  assert.equal(
    viewQuery('leaders', f, now, { by: 'firm' }).startsWith('view=leaders&by=firm&'),
    true,
  );
  assert.equal(viewQuery('issues', f, now), viewQuery('issues', { ...f, issue: 'DEF' }, now));
});

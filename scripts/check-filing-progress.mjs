/**
 * 13F filing-progress math: period selection, the business-day deadline
 * (weekend and federal-holiday roll), the day offset across quarter
 * boundaries, and the filed / expected / pacing definition.
 * Run: npm run test:filing-progress (wired into npm test).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

const {
  currentReportQuarter,
  priorQuarterEnd,
  filingDeadline,
  nextBusinessDay,
  dayOffset,
  usFederalHolidays,
} = await import('../src/lib/sec/quarters.js');
const { computeFilingProgress, filedCiks, originalFirstFiled } =
  await import('../src/lib/datasets/institutional/filing-progress-model.js');

test('period: the most recent quarter-end, across quarter boundaries', () => {
  assert.equal(currentReportQuarter('2026-10-23'), '2026-09-30');
  assert.equal(currentReportQuarter('2026-10-01'), '2026-09-30');
  assert.equal(currentReportQuarter('2026-09-30'), '2026-06-30');
  assert.equal(currentReportQuarter('2027-01-01'), '2026-12-31');
  assert.equal(currentReportQuarter('2026-12-31'), '2026-09-30');
  assert.equal(priorQuarterEnd('2026-09-30'), '2026-06-30');
  assert.equal(priorQuarterEnd('2026-03-31'), '2025-12-31');
});

test('deadline: Sep 30 2026 is nominally Nov 14 (a Saturday), due Monday Nov 16', () => {
  assert.deepEqual(filingDeadline('2026-09-30'), {
    nominal: '2026-11-14',
    effective: '2026-11-16',
  });
});

test('deadline: weekday deadlines do not move', () => {
  /* 2026-06-30 + 45 = Friday 2026-08-14. */
  assert.deepEqual(filingDeadline('2026-06-30'), {
    nominal: '2026-08-14',
    effective: '2026-08-14',
  });
});

test('next business day: weekends and federal holidays roll forward', () => {
  assert.equal(nextBusinessDay('2026-11-14'), '2026-11-16'); // Sat -> Mon
  assert.equal(nextBusinessDay('2026-11-15'), '2026-11-16'); // Sun -> Mon
  assert.equal(nextBusinessDay('2026-11-11'), '2026-11-12'); // Veterans Day (Wed)
  assert.equal(nextBusinessDay('2026-11-26'), '2026-11-27'); // Thanksgiving
  assert.equal(nextBusinessDay('2026-07-03'), '2026-07-06'); // Jul 4 observed Fri, then weekend
  assert.equal(nextBusinessDay('2026-10-21'), '2026-10-21'); // ordinary Wednesday
});

test('holidays: observed dates and floating Mondays are right for 2026', () => {
  const h = usFederalHolidays(2026);
  for (const d of [
    '2026-01-01',
    '2026-01-19',
    '2026-02-16',
    '2026-05-25',
    '2026-06-19',
    '2026-07-03',
    '2026-09-07',
    '2026-10-12',
    '2026-11-11',
    '2026-11-26',
    '2026-12-25',
  ]) {
    assert.ok(h.has(d), `missing ${d}`);
  }
});

test('day offset counts whole days from the quarter-end', () => {
  assert.equal(dayOffset('2026-09-30', '2026-10-23'), 23);
  assert.equal(dayOffset('2026-09-30', '2026-09-30'), 0);
  assert.equal(dayOffset('2026-12-31', '2027-01-15'), 15);
});

test('filed counts originals once, amendment-only CIKs, never 13F-NT', () => {
  const rows = [
    { cik: 'A', form_type: '13F-HR' },
    { cik: 'A', form_type: '13F-HR/A' }, // amendment of an original: no double count
    { cik: 'B', form_type: '13F-HR/A' }, // amendment only: counts
    { cik: 'C', form_type: '13F-NT' }, // notice: never counts
    { cik: 'D', form_type: '13F-HR' },
  ];
  assert.deepEqual([...filedCiks(rows)].sort(), ['A', 'B', 'D']);
});

test('expected counts only prior-period originals, with first filing dates', () => {
  const first = originalFirstFiled([
    { cik: 'A', form_type: '13F-HR', filed_at: '2026-08-10T00:00:00Z' },
    { cik: 'A', form_type: '13F-HR', filed_at: '2026-07-20T00:00:00Z' },
    { cik: 'B', form_type: '13F-HR/A', filed_at: '2026-07-21T00:00:00Z' },
  ]);
  assert.equal(first.size, 1);
  assert.equal(first.get('A'), '2026-07-20');
});

test('progress: pct, pacing and a late-starting prior record set', () => {
  const p = computeFilingProgress({
    period: '2026-09-30',
    prior: '2026-06-30',
    now: '2026-10-23T12:00:00Z',
    counts: { filed: 94, expected: 1406, priorFiledByOffset: 0, priorCoverageStart: '2026-07-24' },
    lastIngestedAt: '2026-10-23T08:00:00Z',
  });
  assert.equal(p.deadline, '2026-11-16');
  assert.equal(p.daysLeft, 24);
  assert.equal(p.dayOffset, 23);
  assert.ok(Math.abs(p.pct - 94 / 1406) < 1e-9);
  /* Records for Q2 start Jul 24, after the day-23 cutoff (Jul 23): pacing is
     unknowable, so null, never a misleading 0%. */
  assert.equal(p.pacingPct, null);
  assert.equal(p.pacing, null);
  assert.equal(p.stale, false);
  assert.equal(p.closed, false);
});

test('progress: pacing words, the 100% cap and staleness', () => {
  const base = { period: '2026-09-30', prior: '2026-06-30', now: '2026-10-23T12:00:00Z' };
  const onPace = computeFilingProgress({
    ...base,
    counts: {
      filed: 100,
      expected: 1000,
      priorFiledByOffset: 100,
      priorCoverageStart: '2026-07-01',
    },
    lastIngestedAt: '2026-10-21T00:00:00Z',
  });
  assert.equal(onPace.pacing, 'on_pace');
  assert.equal(onPace.stale, true); // older than 24h during an open window
  const over = computeFilingProgress({
    ...base,
    counts: {
      filed: 1100,
      expected: 1000,
      priorFiledByOffset: 50,
      priorCoverageStart: '2026-07-01',
    },
  });
  assert.equal(over.barPct, 1);
  assert.ok(over.pct > 1);
  assert.equal(over.pacing, 'ahead');
});

test('progress: after the effective deadline the season reads closed', () => {
  const p = computeFilingProgress({
    period: '2026-09-30',
    prior: '2026-06-30',
    now: '2026-11-17T12:00:00Z',
    counts: {
      filed: 900,
      expected: 1000,
      priorFiledByOffset: 950,
      priorCoverageStart: '2026-07-01',
    },
    lastIngestedAt: '2026-10-01T00:00:00Z',
  });
  assert.equal(p.closed, true);
  assert.equal(p.daysLeft, 0);
  assert.equal(p.stale, false); // staleness only matters while the window is open
});

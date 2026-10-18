/**
 * Reporting deadlines for congressional campaign committees.
 *
 * Config, not component code: update this list each cycle. Dates checked on
 * Oct 18, 2026 against the official 2026 reporting-date notices (pre-general
 * report due Oct 22, books close Oct 14; post-general due Dec 3, covering
 * Oct 15 to Nov 23; year-end due Jan 31, 2027, covering Nov 24 to Dec 31).
 * `kind: 'election'` rows are election days, not filing deadlines.
 */
export const REPORTING_CALENDAR = [
  {
    date: '2026-10-15',
    name: 'October quarterly report',
    sub: 'Covers Jul 1 to Sep 30',
    kind: 'report',
  },
  {
    date: '2026-10-22',
    name: 'Pre-general report',
    sub: 'Covers activity through Oct 14',
    kind: 'report',
  },
  { date: '2026-11-03', name: 'General election', sub: 'Election day', kind: 'election' },
  {
    date: '2026-12-03',
    name: 'Post-general report',
    sub: 'Covers Oct 15 to Nov 23',
    kind: 'report',
  },
  {
    date: '2027-01-31',
    name: 'Year-end report',
    sub: 'Covers Nov 24 to Dec 31',
    kind: 'report',
  },
];

/** 48-hour notice window before the general election (20th to 2nd day before). */
export const FORTY_EIGHT_HOUR_WINDOW = { from: '2026-10-15', to: '2026-10-31' };

/** The next `n` entries on or after `todayIso` (YYYY-MM-DD). */
export function upcomingDeadlines(todayIso, n = 4) {
  const today = String(todayIso || '').slice(0, 10);
  return REPORTING_CALENDAR.filter((e) => e.date >= today).slice(0, n);
}

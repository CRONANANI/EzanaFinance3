/**
 * Calendar-quarter helpers for 13F work. Pure (no imports), unit tested by
 * scripts/check-titans.mjs.
 *
 * A 13F covers a calendar quarter and is due 45 days after the quarter ends.
 * Dates are 'YYYY-MM-DD' strings or Date objects, read in UTC.
 */

export const FILING_DEADLINE_DAYS = 45;
const DAY = 86400000;

function toUtc(d) {
  if (d instanceof Date)
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(d || ''));
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
}
const iso = (d) => d.toISOString().slice(0, 10);

/** The quarter-end ('YYYY-MM-DD') of the quarter containing `date`. */
export function quarterEnd(date) {
  const d = toUtc(date);
  if (!d) return null;
  const qEndMonth = Math.floor(d.getUTCMonth() / 3) * 3 + 3; // 3, 6, 9, 12
  return iso(new Date(Date.UTC(d.getUTCFullYear(), qEndMonth, 0)));
}

/** Quarter-end `n` quarters before (n > 0) or after (n < 0) a quarter-end. */
export function shiftQuarter(qEnd, n = 1) {
  const d = toUtc(qEnd);
  if (!d) return null;
  const monthIndex = d.getUTCFullYear() * 12 + d.getUTCMonth() - 3 * n;
  const y = Math.floor(monthIndex / 12);
  const m = monthIndex - y * 12;
  return iso(new Date(Date.UTC(y, m + 1, 0)));
}

/** The quarter-end immediately before a period of report. */
export function priorQuarterEnd(period) {
  const q = quarterEnd(period);
  return q ? shiftQuarter(q, 1) : null;
}

/**
 * The latest quarter whose 13F deadline has passed or is running: the quarter
 * that has ended most recently. On 2026-10-06 that is 2026-09-30 (filings due
 * by 2026-11-14).
 */
export function currentReportQuarter(now = new Date()) {
  return shiftQuarter(quarterEnd(now), 1);
}

/**
 * The latest quarter whose 13F deadline has passed, so its filings are
 * complete. On 2026-10-06 that is 2026-06-30.
 */
export function latestCompleteQuarter(now = new Date()) {
  const running = currentReportQuarter(now);
  const deadline = new Date(toUtc(running).getTime() + FILING_DEADLINE_DAYS * DAY);
  return toUtc(now) > deadline ? running : shiftQuarter(running, 1);
}

/**
 * The quarter-ends worth parsing and scoring: the latest complete quarter, the
 * `quarters - 1` before it (so it has a prior to compare with), and the quarter
 * whose filing window is still open. Newest first.
 */
export function recentPeriods(now = new Date(), quarters = 2) {
  const complete = latestCompleteQuarter(now);
  const out = [];
  const running = currentReportQuarter(now);
  if (running !== complete) out.push(running);
  for (let i = 0; i < quarters; i += 1) out.push(shiftQuarter(complete, i));
  return out;
}

/** True when a period of report falls in recentPeriods(now, quarters). */
export function isRecentPeriod(period, now = new Date(), quarters = 2) {
  const q = quarterEnd(period);
  return !!q && q === String(period).slice(0, 10) && recentPeriods(now, quarters).includes(q);
}

/** 'Jun 30, 2026' for captions. */
export function quarterLabelLong(qEnd) {
  const d = toUtc(qEnd);
  return d
    ? d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      })
    : null;
}

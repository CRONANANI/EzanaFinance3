/**
 * Which periods on the dataset tiles are still incomplete, so they draw
 * dashed and say so. Pure, no imports (the check script tests it).
 */

const iso = (d) => new Date(d).toISOString().slice(0, 10);

/** The current calendar month ('YYYY-MM') is still filling. */
export const monthPartial = (m, today = iso(Date.now())) => String(m) === String(today).slice(0, 7);

/**
 * LDA quarterly reports are due 20 days after the quarter ends; a quarter
 * whose reports are not all due yet is partial.
 */
export function quarterPartial(year, q, today = iso(Date.now())) {
  const n = Number(String(q).replace(/\D/g, ''));
  if (!n) return false;
  const end = Date.UTC(Number(year), n * 3, 0); // last day of the quarter
  return Date.parse(today) < end + 20 * 86400000;
}

/**
 * A fiscal year (October to September) is partial while it is running, or
 * when its figures were loaded before it closed.
 */
export function fiscalYearPartial(fy, syncedAt = null, today = iso(Date.now())) {
  const end = Date.UTC(Number(fy), 8, 30); // September 30 of the fiscal year
  if (Date.parse(today) <= end) return true;
  return syncedAt ? Date.parse(syncedAt) <= end : false;
}

/** 'Q3 2026', 'Oct 2026'. */
export const quarterLabel = (y, q) => `${String(q).toUpperCase()} ${y}`;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function monthLabel(m) {
  const [y, mm] = String(m).split('-');
  return `${MONTHS[Number(mm) - 1] || ''} ${y}`;
}

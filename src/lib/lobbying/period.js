/**
 * LDA filing-period helpers. The cache's `filing_period` column stores whatever
 * the LDA API returns for a filing's period — in practice a label like
 * "First Quarter (Jan 1 - Mar 31)" / "first_quarter" / "Q1" (quarterly since
 * 2008), plus legacy "Mid-Year" / "Year-End" semi-annual values. We map those
 * robustly to q1–q4 so the Top Spenders board can scope by quarter.
 */

/** Normalize a raw filing_period value → 'q1'|'q2'|'q3'|'q4'|null. */
export function normalizeQuarter(filingPeriod) {
  const s = String(filingPeriod || '').toLowerCase();
  if (!s) return null;
  if (/first|1st|\bq1\b|quarter_1|q_1/.test(s)) return 'q1';
  if (/second|2nd|\bq2\b|quarter_2|q_2|mid[-_ ]?year/.test(s)) return 'q2';
  if (/third|3rd|\bq3\b|quarter_3|q_3/.test(s)) return 'q3';
  if (/fourth|4th|\bq4\b|quarter_4|q_4|year[-_ ]?end/.test(s)) return 'q4';
  return null;
}

export const PERIOD_LABELS = {
  year: 'Full year',
  ytd: 'Year to date',
  q1: 'Q1',
  q2: 'Q2',
  q3: 'Q3',
  q4: 'Q4',
  range: 'Last 90 days',
};

/** Human label for a period key (for card titles / chips). */
export function periodLabel(period, days) {
  if (period === 'range') return `Last ${days || 90} days`;
  return PERIOD_LABELS[period] || 'Full year';
}

/** Valid period keys accepted by the top-spenders route. */
export const PERIOD_KEYS = ['year', 'ytd', 'q1', 'q2', 'q3', 'q4', 'range'];

/** The four quarters, and the LDA `filing_period` filter value each maps to. */
export const QUARTERS = ['q1', 'q2', 'q3', 'q4'];
export const QUARTER_PERIOD_CODE = {
  q1: 'first_quarter',
  q2: 'second_quarter',
  q3: 'third_quarter',
  q4: 'fourth_quarter',
};

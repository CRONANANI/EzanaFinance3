/**
 * Sonar 6.5: reporting-period semantics and temporal compatibility (Nov 28 2026).
 *
 * Every dataset runs on its own clock, and "2026" means different things in each:
 *   congress        a transaction date and a later disclosure date (screens filter on the
 *                   transaction date; the disclosure date is when it became public)
 *   contracts       an award action date (dated awards) or a federal fiscal year of
 *                   obligations (October to September); neither is recognized revenue
 *   holders13f      a report period (quarter end) and a filing date up to 45 days later
 *   ratios          each company's own fiscal year end
 *   prices          a trading date
 *   macro           an observation period and a publication date
 *
 * comparable(a, b) says whether two observations can be related in time; when not, Sonar
 * may still show them side by side, labelled as separate contextual observations.
 * Pure; unit-tested in scripts/check-sonar-6-5.mjs.
 */

export const PERIOD_SEMANTICS = {
  congress: { clock: 'transaction_date', published: 'disclosure_date', kind: 'event' },
  insider: { clock: 'transaction_date', published: 'filing_date', kind: 'event' },
  contracts_window: {
    clock: 'action_date',
    kind: 'event',
    note: 'awards signed in the window; obligations, not revenue',
  },
  contracts: {
    clock: 'federal_fiscal_year',
    kind: 'period',
    note: 'prime awards that started in the federal fiscal year, obligated to date; not revenue',
  },
  holders13f: {
    clock: 'report_period',
    published: 'filing_date',
    kind: 'snapshot',
    note: 'holdings as of the quarter end, filed up to 45 days later',
  },
  holders13f_change: {
    clock: 'report_period',
    published: 'filing_date',
    kind: 'change',
    note: 'comparable filers, quarter over quarter',
  },
  ratios: { clock: 'fiscal_year_end', kind: 'period', note: "each company's own fiscal year" },
  valuation: { clock: 'trading_date', kind: 'snapshot' },
  lobbying: { clock: 'filing_year', kind: 'period' },
  macro: { clock: 'observation_period', published: 'publication_date', kind: 'period' },
};

const d = (v) => {
  const t = v ? Date.parse(v) : NaN;
  return Number.isFinite(t) ? t : null;
};
const DAY = 86_400_000;

/** The federal fiscal year a date falls in (FY2026 = Oct 1 2025 to Sep 30 2026). */
export function federalFiscalYear(date) {
  const t = new Date(date);
  return t.getUTCMonth() >= 9 ? t.getUTCFullYear() + 1 : t.getUTCFullYear();
}

/** A period object: { source, clock, from, to, published?, label }. */
export function period(source, { from = null, to = null, published = null, label = null } = {}) {
  const sem = PERIOD_SEMANTICS[source] || { clock: 'unknown', kind: 'unknown' };
  return {
    source,
    clock: sem.clock,
    kind: sem.kind,
    from,
    to,
    published,
    label: label || [from, to].filter(Boolean).join(' to ') || null,
    note: sem.note || null,
  };
}

/**
 * Whether two periods can be related.
 * -> { comparable, overlapDays, reason }
 * Rules: both need dates; they must overlap (or one must sit inside the other); a fiscal
 * year and a federal fiscal year overlap only by their shared months; a snapshot compares
 * with a period that contains its date.
 */
export function comparable(a, b, { minOverlapDays = 1 } = {}) {
  if (!a || !b) return { comparable: false, overlapDays: 0, reason: 'a period is missing' };
  const af = d(a.from) ?? d(a.to);
  const at = d(a.to) ?? d(a.from);
  const bf = d(b.from) ?? d(b.to);
  const bt = d(b.to) ?? d(b.from);
  if ([af, at, bf, bt].some((x) => x === null))
    return { comparable: false, overlapDays: 0, reason: 'a period has no dates' };
  /* Inclusive of both end days, so a one-day record inside a period overlaps it. */
  const overlap = Math.max(0, Math.min(at, bt) - Math.max(af, bf) + DAY) / DAY;
  const snapshotInside =
    (a.kind === 'snapshot' && af >= bf && af <= bt) ||
    (b.kind === 'snapshot' && bf >= af && bf <= at);
  if (overlap >= minOverlapDays || snapshotInside)
    return { comparable: true, overlapDays: Math.round(overlap), reason: null };
  return {
    comparable: false,
    overlapDays: 0,
    reason: `${a.source} (${a.label}, ${a.clock}) and ${b.source} (${b.label}, ${b.clock}) do not overlap`,
  };
}

/**
 * The fiscal-year periods of several companies: whether they can be merged as one period.
 * Different calendars are reported, never merged.
 */
export function alignFiscalYears(byTicker = {}) {
  const ends = [...new Set(Object.values(byTicker).filter(Boolean))].sort();
  return {
    aligned: ends.length <= 1,
    ends,
    note:
      ends.length > 1
        ? `Fiscal years end on different dates (${ends[0]} to ${ends[ends.length - 1]}); figures are each company's own latest year, not one shared period.`
        : null,
  };
}

/** A record is usable for a window when its own clock date is inside the window and not in the future. */
export function inWindow(dateStr, window, now) {
  const t = d(dateStr);
  if (t === null) return false;
  return t >= d(window.from) && t <= d(window.to) && t <= (now?.getTime?.() ?? Date.now());
}

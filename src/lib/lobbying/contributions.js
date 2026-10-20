/**
 * LD-203 contribution reports (lda.gov /contributions/): pure helpers, no I/O.
 *
 * Every registrant and every active lobbyist files one report per half year:
 * mid_year (Jan 1 - Jun 30, due Jul 30) and year_end (Jul 1 - Dec 31, due
 * Jan 30). A report lists FECA contributions of $200 or more, honorary and
 * meeting expenses, and presidential library and inaugural committee gifts,
 * each with a payee and an honoree. Most reports say "no contributions".
 *
 * Shape verified against the live API on 2026-10-20:
 *   { filing_uuid, filing_type, filing_year, filing_period, filing_document_url,
 *     filer_type: 'lobbyist'|'organization', dt_posted,
 *     registrant: { id, name, ... }, lobbyist: { id, first_name, middle_name,
 *     last_name, suffix_display, ... } | null, no_contributions, pacs: [],
 *     contribution_items: [{ contribution_type, contributor_name, payee_name,
 *     honoree_name, amount: '5000.00', date: '2025-02-24' }] }
 */

export const CONTRIBUTION_PERIODS = ['mid_year', 'year_end'];

const DAY_MS = 86400000;

/** When a period's reports fall due: Jul 30 of the year, or Jan 30 of the next. */
export function periodDueDate(year, period) {
  return period === 'mid_year' ? Date.UTC(year, 6, 30) : Date.UTC(year + 1, 0, 30);
}

/** True once filings for the period can exist (the half year has ended). */
export function periodOpened(year, period, nowMs) {
  const end = period === 'mid_year' ? Date.UTC(year, 6, 1) : Date.UTC(year + 1, 0, 1);
  return nowMs >= end;
}

/**
 * A complete period keeps a cheap tail check (one page) for a year after its
 * due date, because late and amended reports keep arriving.
 */
export function periodStillReceiving(year, period, nowMs) {
  return nowMs < periodDueDate(year, period) + 365 * DAY_MS;
}

/**
 * The periods one run should touch, in order: unfinished periods newest first
 * (the freshest money is the most useful), then finished periods that are
 * still receiving late filings. Periods that have not opened are skipped.
 * @param {number[]} years
 * @param {Map<string, object>} states keyed `${year}-${period}`
 * @param {number} nowMs
 */
export function planTargets(years, states, nowMs) {
  const all = [];
  for (const year of [...years].sort((a, b) => b - a)) {
    for (const period of [...CONTRIBUTION_PERIODS].reverse()) {
      if (!periodOpened(year, period, nowMs)) continue;
      all.push({ year, period, state: states.get(`${year}-${period}`) || null });
    }
  }
  const unfinished = all.filter((t) => !t.state?.complete);
  const tail = all.filter(
    (t) => t.state?.complete && periodStillReceiving(t.year, t.period, nowMs),
  );
  return [...unfinished, ...tail];
}

/**
 * Where to resume a period: the last page read, read again, because it may
 * have been short when it was read and have grown since. Rows from pages
 * before it carry over unchanged.
 */
export function resumePoint(state) {
  const lastPage = state?.last_page || 0;
  if (!lastPage) return { page: 1, rowsBefore: 0 };
  return {
    page: lastPage,
    rowsBefore: Math.max(0, (state.rows_fetched || 0) - (state.last_page_rows || 0)),
  };
}

const text = (v) => {
  if (v == null) return null;
  const s = String(v).replace(/\s+/g, ' ').trim();
  return s ? s : null;
};

const num = (v) => {
  if (v == null || v === '') return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
};

const isoDay = (v) => {
  const s = text(v);
  if (!s || !/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  const day = s.slice(0, 10);
  return Number.isNaN(Date.parse(`${day}T00:00:00Z`)) ? null : day;
};

/** 'CONNOR RUSSELL PFEIFFER' from the lobbyist object, null when absent. */
export function lobbyistName(l) {
  if (!l || typeof l !== 'object') return null;
  return text(
    [l.first_name, l.middle_name, l.last_name, l.suffix_display || l.suffix]
      .map(text)
      .filter(Boolean)
      .join(' '),
  );
}

function pacNames(pacs) {
  if (!Array.isArray(pacs)) return [];
  return pacs.map((p) => text(typeof p === 'string' ? p : p?.name)).filter(Boolean);
}

/**
 * One API result → { report, items } rows, or null when the result has no
 * usable identity (no uuid, year or period).
 */
export function normalizeContribution(raw, syncedAt = new Date().toISOString()) {
  const uuid = text(raw?.filing_uuid);
  const year = num(raw?.filing_year);
  const period = text(raw?.filing_period);
  if (!uuid || !year || !CONTRIBUTION_PERIODS.includes(period)) return null;

  const rawItems = Array.isArray(raw.contribution_items) ? raw.contribution_items : [];
  const items = rawItems.map((it, i) => ({
    filing_uuid: uuid,
    item_index: i,
    contribution_type: text(it?.contribution_type),
    contributor_name: text(it?.contributor_name),
    payee_name: text(it?.payee_name),
    honoree_name: text(it?.honoree_name),
    amount: num(it?.amount),
    contribution_date: isoDay(it?.date),
  }));
  const total = items.reduce((s, it) => s + (it.amount > 0 ? it.amount : 0), 0);

  return {
    report: {
      filing_uuid: uuid,
      filing_year: year,
      filing_period: period,
      filing_type: text(raw.filing_type),
      dt_posted: text(raw.dt_posted),
      filer_type: text(raw.filer_type),
      registrant_id: num(raw.registrant?.id),
      registrant_name: text(raw.registrant?.name),
      lobbyist_id: num(raw.lobbyist?.id),
      lobbyist_name: lobbyistName(raw.lobbyist),
      no_contributions: raw.no_contributions === true,
      pacs: pacNames(raw.pacs),
      item_count: items.length,
      total_amount: Math.round(total * 100) / 100,
      document_url: text(raw.filing_document_url),
      synced_at: syncedAt,
    },
    items,
  };
}

/** Escape a user string for a PostgREST ilike pattern, capped at 80 chars. */
export function ilikeTerm(s) {
  const t = String(s || '')
    .trim()
    .slice(0, 80);
  if (!t) return null;
  return `%${t.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

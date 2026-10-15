/**
 * Pure helpers for the Sanctions & Trade Policy page: timeline summaries,
 * concentration, comparisons and the data-integrity rules. No imports, so
 * the node tests can load it directly.
 *
 * Vocabulary, used consistently on the page:
 *   listing record      one OFAC entry (one entry number)
 *   program assignment  one (record, program) pair; a record under three
 *                       programs is three assignments
 *   country association one (record, address country) pair
 */

/** Percent change, or null when there is no valid base to compare with. */
export function pctChange(current, previous) {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Share as a 0-100 number with one decimal, or null when the base is missing. */
export function share(n, d) {
  if (!Number.isFinite(n) || !Number.isFinite(d) || d <= 0) return null;
  return Math.round((n / d) * 1000) / 10;
}

/** Monthly rows [{month:'YYYY-MM-01', listings}] -> total, peak month, average. */
export function timelineSummary(rows) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return { total: 0, months: 0, peak: null, avg: null };
  let total = 0;
  let peak = null;
  for (const r of list) {
    const n = Number(r.listings) || 0;
    total += n;
    if (n > 0 && (!peak || n > peak.listings)) peak = { month: r.month, listings: n };
  }
  return { total, months: list.length, peak, avg: Math.round((total / list.length) * 10) / 10 };
}

/** Monthly rows -> yearly rows [{year:'YYYY', listings}] for the all-time view. */
export function toYears(rows) {
  const by = new Map();
  for (const r of rows || []) {
    const y = String(r.month).slice(0, 4);
    by.set(y, (by.get(y) || 0) + (Number(r.listings) || 0));
  }
  return [...by.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([year, listings]) => ({ year, listings }));
}

/** First and last day of a 'YYYY-MM-01' month, as ISO dates. */
export function monthRange(month) {
  const m = /^(\d{4})-(\d{2})/.exec(String(month || ''));
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return { from: `${m[1]}-${m[2]}-01`, to: `${m[1]}-${m[2]}-${String(last).padStart(2, '0')}` };
}

/**
 * Concentration from the page summary.
 *   programs  [{code,total}] (total = records under that program)
 *   countries [{name,total}]
 * Shares are of ASSIGNMENTS / ASSOCIATIONS, which is the only denominator
 * under which they add to 100%.
 */
export function concentration(summary) {
  const programs = summary?.programs || [];
  const countries = summary?.countries || [];
  const programAssignments = programs.reduce((s, p) => s + (p.total || 0), 0);
  const countryAssociations = countries.reduce((s, c) => s + (c.total || 0), 0);
  const top = programs[0] || null;
  const top5Countries = countries.slice(0, 5).reduce((s, c) => s + (c.total || 0), 0);
  const top5Programs = programs.slice(0, 5).reduce((s, p) => s + (p.total || 0), 0);
  return {
    programAssignments,
    countryAssociations,
    largestProgram: top
      ? { code: top.code, total: top.total, share: share(top.total, programAssignments) }
      : null,
    top5CountryShare: share(top5Countries, countryAssociations),
    top5ProgramShare: share(top5Programs, programAssignments),
    multiProgramRatio:
      summary?.active > 0 ? Math.round((programAssignments / summary.active) * 100) / 100 : null,
  };
}

/* ── data integrity ───────────────────────────────────────────────────── */

/**
 * The page's sources and how often each is expected to refresh. A source is
 * stale when its last SUCCESSFUL run is older than staleAfterHours.
 */
export const SOURCES = [
  {
    id: 'ofac-sdn',
    label: 'OFAC SDN list',
    url: 'https://ofac.treasury.gov/specially-designated-nationals-and-blocked-persons-list-sdn-human-readable-lists',
    files: 'SDN.CSV, ADD.CSV',
    cadence: 'Daily',
    staleAfterHours: 48,
  },
  {
    id: 'ofac-dates',
    label: 'OFAC listing dates',
    url: 'https://ofac.treasury.gov/sanctions-list-service',
    files: 'SDN_ADVANCED.XML',
    cadence: 'Daily',
    staleAfterHours: 48,
  },
  {
    id: 'ofac-details',
    label: 'OFAC aliases, addresses and remarks',
    url: 'https://ofac.treasury.gov/sanctions-list-service',
    files: 'ALT.CSV, ADD.CSV, SDN_COMMENTS.CSV',
    cadence: 'Daily',
    staleAfterHours: 48,
  },
  {
    id: 'ofac-actions',
    label: 'OFAC Recent Actions',
    url: 'https://ofac.treasury.gov/recent-actions',
    files: 'Recent Actions notices',
    cadence: 'Every 6 hours',
    staleAfterHours: 24,
  },
  {
    id: 'sanctions-news',
    label: 'Sanctions news (press)',
    url: null,
    files: 'Publisher articles via a news API',
    cadence: 'Every 6 hours',
    staleAfterHours: 24,
  },
];

/**
 * One source's state from its run log row, by fixed rules:
 *   unavailable  the run log itself could not be read
 *   never        no run recorded
 *   failed       the latest attempt failed (a previous success may exist)
 *   stale        the latest success is older than staleAfterHours
 *   ok           the latest success is recent and the latest attempt did not fail
 * A timestamp alone never makes a source "ok".
 */
export function sourceState(row, rule, now = Date.now()) {
  if (row === undefined || row === null)
    return { state: 'unavailable', reason: 'Run history unavailable.' };
  if (!row.last_attempt_at) return { state: 'never', reason: 'No run recorded yet.' };
  const okAt = row.last_ok_at ? Date.parse(row.last_ok_at) : null;
  if (row.last_status === 'failed' || row.last_status === 'partial') {
    return {
      state: 'failed',
      reason:
        row.last_status === 'partial' ? 'Last run finished with write errors.' : 'Last run failed.',
    };
  }
  if (!okAt) return { state: 'never', reason: 'No successful run recorded yet.' };
  const ageH = (now - okAt) / 3600000;
  if (ageH > rule.staleAfterHours) {
    return {
      state: 'stale',
      reason: `Last success ${Math.round(ageH)} hours ago (expected within ${rule.staleAfterHours}).`,
    };
  }
  return { state: 'ok', reason: null };
}

/** Coverage meter: n of d, with null (not measurable) kept distinct from 0. */
export function meter(n, d) {
  if (d == null || n == null || !Number.isFinite(d) || d <= 0)
    return { n: n ?? null, d: d ?? null, pct: null };
  return { n, d, pct: share(n, d) };
}

/* ── CSV ──────────────────────────────────────────────────────────────── */

/* A cell starting with = + - @ (or tab / carriage return) runs as a formula
   in spreadsheet apps; prefix it with an apostrophe so it stays text. */
const FORMULA = /^[=+\-@\t\r]/;

export function csvCell(v) {
  let s = v == null ? '' : String(v);
  if (FORMULA.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** rows + [[header, (row) => value]] -> CSV text with a header line. */
export function toCsv(rows, columns) {
  const head = columns.map(([h]) => csvCell(h)).join(',');
  const body = (rows || []).map((r) => columns.map(([, get]) => csvCell(get(r))).join(','));
  return [head, ...body].join('\n');
}

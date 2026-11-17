/**
 * 13F historical backfill helpers (Nov 2026). Shared by the holdings parser and the
 * backfill driver (/api/cron/sec-13f-backfill). Pure functions; no I/O.
 */

const QUARTER_END = /^\d{4}-(03-31|06-30|09-30|12-31)$/;

/** Validated ?periods= list (quarter ends, not in the future, at most four, newest first), or null. */
export function explicitPeriods(raw, now = new Date()) {
  if (!raw) return null;
  const today = now.toISOString().slice(0, 10);
  const list = [
    ...new Set(
      String(raw)
        .split(',')
        .map((p) => p.trim())
        .filter((p) => QUARTER_END.test(p) && p <= today),
    ),
  ]
    .sort()
    .reverse()
    .slice(0, 4);
  return list.length ? list : null;
}

/** tableEntryTotal and tableValueTotal from a 13F cover page. */
export function parseDeclaredTotals(xml) {
  const num = (tag) => {
    const m = new RegExp(`<(?:\\w+:)?${tag}>\\s*([\\d.,]+)\\s*<`, 'i').exec(String(xml || ''));
    if (!m) return null;
    const n = Number(m[1].replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  };
  return { entries: num('tableEntryTotal'), value: num('tableValueTotal') };
}

/** Every calendar day from `from` to `to` inclusive, as YYYY-MM-DD. */
export function daysBetween(from, to) {
  const out = [];
  const end = new Date(`${to}T00:00:00Z`);
  for (let d = new Date(`${from}T00:00:00Z`); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

/**
 * The filing days to search for one quarter's 13Fs: from the day after the quarter ends to
 * the 45-day deadline plus a grace month for late filers, capped at `today`. Amendments
 * filed later are caught by the rolling ingest.
 */
export function filingWindow(period, today = new Date().toISOString().slice(0, 10)) {
  const end = new Date(`${period}T00:00:00Z`);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() + 1);
  const last = new Date(end);
  last.setUTCDate(last.getUTCDate() + 75);
  const to = last.toISOString().slice(0, 10) < today ? last.toISOString().slice(0, 10) : today;
  return daysBetween(start.toISOString().slice(0, 10), to);
}

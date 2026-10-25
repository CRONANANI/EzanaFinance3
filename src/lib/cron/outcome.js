/**
 * A cron response -> its ingest_runs outcome. Pure (no imports) for tests.
 * Unlike summarizeRun (src/lib/ingest-runs-summary.js), a 2xx body without
 * `ok` counts as 'ok': most crons never set it.
 */
const num = (...vals) => {
  for (const v of vals) if (Number.isFinite(v)) return Math.trunc(v);
  return null;
};

export function cronRunOutcome(body, httpStatus) {
  const b = body && typeof body === 'object' ? body : {};
  const written = num(b.rowsWritten, b.written, b.upserted, b.stored, b.inserted);
  const read = num(b.rowsRead, b.parsed, b.entries, b.read, b.fetched);
  const errors = Array.isArray(b.errors) ? b.errors.filter(Boolean) : [];
  let status;
  if (b.skipped) status = 'skipped';
  else if (httpStatus >= 400 || b.ok === false || b.error)
    status = written > 0 ? 'partial' : 'failed';
  else if (errors.length) status = 'partial';
  else status = 'ok';
  const note =
    [b.error, b.reason, ...errors.slice(0, 3)]
      .filter(Boolean)
      .map((x) => (typeof x === 'string' ? x : JSON.stringify(x)))
      .join('; ')
      .slice(0, 500) || null;
  return { status, rows_read: read, rows_written: written, note };
}

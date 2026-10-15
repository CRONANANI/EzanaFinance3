/**
 * Pure half of src/lib/ingest-runs.js: a cron route's JSON body -> the run
 * log row's outcome fields. No imports, so the node tests can load it.
 */
const pickNumber = (...vals) => {
  for (const v of vals) if (Number.isFinite(v)) return Math.trunc(v);
  return null;
};

export function summarizeRun(body, httpStatus) {
  const b = body && typeof body === 'object' ? body : {};
  const written = pickNumber(b.rowsWritten, b.written, b.upserted, b.stored, b.inserted);
  const read = pickNumber(b.rowsRead, b.parsed, b.entries, b.read, b.fetched);
  let status;
  if (b.skipped) status = 'skipped';
  else if (b.ok === true && httpStatus < 400) status = 'ok';
  else if (written && written > 0) status = 'partial';
  else status = 'failed';
  const errors = Array.isArray(b.errors) ? b.errors.filter(Boolean) : [];
  const note =
    [b.error, b.reason, ...errors.slice(0, 3)].filter(Boolean).join('; ').slice(0, 500) || null;
  const validation = typeof b.validation === 'string' ? b.validation.slice(0, 300) : null;
  return { status, rows_read: read, rows_written: written, note, validation };
}

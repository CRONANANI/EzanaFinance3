/**
 * Writing a column that a pending migration has not created yet.
 *
 * Migrations in this repo are written by the change that needs them and
 * applied by hand afterwards, so there is always a window where the deployed
 * code knows about a column the database does not have. PostgREST rejects the
 * WHOLE row for one unknown column, so a write that sends the new field
 * unconditionally fails outright in that window — usually a worse failure than
 * whatever the migration was fixing.
 *
 * These two helpers make such a write degrade instead: attempt it with the new
 * field, and if — and only if — the database says that specific column does
 * not exist, drop the field and write the rest.
 */

/**
 * True when `error` is the database reporting that `column` does not exist.
 *
 * 42703 is Postgres's own undefined_column. PGRST204 is PostgREST's schema
 * cache reporting the same thing before the query is ever sent. The message
 * must also name the column, so an unrelated missing column is never papered
 * over by dropping the one field this caller happens to know about.
 */
export function isUnknownColumn(error, column) {
  if (!error || !column) return false;
  if (error.code !== '42703' && error.code !== 'PGRST204') return false;
  return String(error.message || '').includes(column);
}

/**
 * Run `write(payload)` and, if it fails only because `column` is missing,
 * run it again without that key.
 *
 * @param {object} payload the row to write, including the optional column
 * @param {string} column the column that may not exist yet
 * @param {(row: object) => Promise<{error?: object|null}>} write performs the
 *   write and resolves to a PostgREST-shaped result
 * @param {(column: string) => void} [onFallback] called once if the retry
 *   happens, so the caller can log which migration is outstanding
 * @returns {Promise<{error: object|null, degraded: boolean}>}
 */
export async function writeWithOptionalColumn(payload, column, write, onFallback) {
  const first = await write(payload);
  if (!isUnknownColumn(first?.error, column)) {
    return { error: first?.error ?? null, degraded: false };
  }
  onFallback?.(column);
  const { [column]: _omitted, ...rest } = payload;
  const second = await write(rest);
  return { error: second?.error ?? null, degraded: true };
}

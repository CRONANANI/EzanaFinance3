/**
 * Idempotent org_positions imports (QA ORG-12).
 *
 * CSV and brokerage-connect imports upsert on the natural key
 * (org_id, team_id, ticker, source, unified_account_id), backed by the unique
 * index `org_positions_import_key` (migration 20261026140000, NULLS NOT
 * DISTINCT so CSV rows with a null team / account still collide). Re-running
 * an import refreshes the existing rows instead of duplicating them, and
 * revives a soft-archived row (is_active = true).
 */

export const POSITION_IMPORT_CONFLICT = 'org_id,team_id,ticker,source,unified_account_id';

const keyOf = (r) =>
  [r.org_id, r.team_id ?? '', r.ticker, r.source, r.unified_account_id ?? ''].join('|');

/**
 * Collapse rows that share the import key (a CSV listing a ticker twice, or a
 * brokerage reporting several lots): shares are summed and avg_cost is the
 * share-weighted average, so one upsert never touches the same row twice
 * (Postgres rejects that with "cannot affect row a second time").
 *
 * @param {Array<object>} rows
 * @returns {Array<object>}
 */
export function mergeImportRows(rows) {
  const byKey = new Map();
  for (const r of rows || []) {
    const k = keyOf(r);
    const prev = byKey.get(k);
    if (!prev) {
      byKey.set(k, { ...r });
      continue;
    }
    const shares = Number(prev.shares) + Number(r.shares);
    const cost =
      Number(prev.avg_cost) * Number(prev.shares) + Number(r.avg_cost) * Number(r.shares);
    byKey.set(k, {
      ...prev,
      ...Object.fromEntries(Object.entries(r).filter(([, v]) => v != null)),
      shares,
      avg_cost: shares > 0 ? Math.round((cost / shares) * 1e6) / 1e6 : 0,
    });
  }
  return [...byKey.values()];
}

/**
 * Upsert import rows into org_positions. Callers pass the service-role client
 * AFTER their own permission check (canManagePositionsServer).
 *
 * @returns {Promise<{ data: Array<{id: string}> | null, error: object | null, merged: number }>}
 */
export async function upsertImportedPositions(admin, rows) {
  const now = new Date().toISOString();
  const merged = mergeImportRows(rows).map((r) => ({ ...r, is_active: true, updated_at: now }));
  const { data, error } = await admin
    .from('org_positions')
    .upsert(merged, { onConflict: POSITION_IMPORT_CONFLICT })
    .select('id');
  return { data, error, merged: merged.length };
}

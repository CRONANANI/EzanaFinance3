/**
 * Last-good copy of the /api/politicians/trades payload, in the single-row
 * table public.congress_trades_snapshot (service role only, no anon policy).
 *
 * The route serves it with X-Data-Stale when its live read fails, so an
 * upstream outage shows yesterday's disclosures under a "Last updated"
 * caption instead of blanking the page. Both functions swallow errors
 * (missing table, no service key): the snapshot is a safety net, and a
 * broken net must never be the thing that fails the request.
 */
import { getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';

/** Rows kept in the snapshot: what the tracker loads (3 pages of 500). */
export const SNAPSHOT_ROWS = 1500;

function admin() {
  if (!isServerSupabaseConfigured()) return null;
  try {
    return getAdminClient();
  } catch {
    return null;
  }
}

/** @returns {Promise<{ payload: { trades: object[], feeds?: object }, fetchedAt: string } | null>} */
export async function readTradesSnapshot() {
  const db = admin();
  if (!db) return null;
  try {
    const { data, error } = await db
      .from('congress_trades_snapshot')
      .select('payload, fetched_at')
      .eq('id', 1)
      .maybeSingle();
    if (error || !data?.payload || !Array.isArray(data.payload.trades)) return null;
    if (!data.payload.trades.length) return null;
    return { payload: data.payload, fetchedAt: data.fetched_at };
  } catch {
    return null;
  }
}

/** Upsert the snapshot. Returns true when written. */
export async function writeTradesSnapshot({ trades, feeds = null }) {
  const db = admin();
  if (!db || !Array.isArray(trades) || !trades.length) return false;
  try {
    const { error } = await db.from('congress_trades_snapshot').upsert(
      {
        id: 1,
        payload: { trades: trades.slice(0, SNAPSHOT_ROWS), feeds },
        fetched_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
    if (error) console.warn('[politicians/snapshot] write failed:', error.message);
    return !error;
  } catch (err) {
    console.warn('[politicians/snapshot] write failed:', err?.message);
    return false;
  }
}

/** Page a snapshot payload the way the live route pages its rows. */
export function pageSnapshot(payload, page, limit) {
  const rows = payload?.trades || [];
  return rows.slice(page * limit, page * limit + limit);
}

/**
 * Read one precomputed dataset snapshot through the Next data cache
 * (datasets-cleanup-and-speed, Step 4.2). Uses the service-role client, so it
 * never touches cookies() or headers() and a page that only reads snapshots
 * can render statically with ISR. Tags: the caller's dataset tag plus
 * `snapshot:<key>`, which rebuild() busts.
 *
 *   const snap = await readSnapshot('committees:overview', 'dataset:committees');
 *   snap?.payload, snap?.builtAt, snap?.sourceMaxUpdatedAt
 *
 * A missing table or row resolves to null (the page falls back to its live
 * loader), never an error page.
 */
import 'server-only';
import { unstable_cache } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';

export function readSnapshot(key, tag, { revalidate = 900 } = {}) {
  return unstable_cache(
    async () => {
      try {
        const { data, error } = await getAdminClient()
          .from('dataset_snapshots')
          .select('payload, built_at, source_max_updated_at')
          .eq('key', key)
          .maybeSingle();
        if (error || !data) return null;
        return {
          payload: data.payload,
          builtAt: data.built_at,
          sourceMaxUpdatedAt: data.source_max_updated_at,
        };
      } catch {
        return null;
      }
    },
    ['dataset-snapshot', key],
    { revalidate, tags: [tag, `snapshot:${key}`].filter(Boolean) },
  )();
}

/* Set when the table is not there yet (migration 20261024200000 unapplied),
   so a page render does not pay a failing round trip per card. */
let tableMissingUntil = 0;
const TABLE_MISSING_BACKOFF_MS = 10 * 60 * 1000;
const isMissingTable = (error) =>
  error?.code === '42P01' ||
  error?.code === 'PGRST205' ||
  /dataset_snapshots/.test(String(error?.message || '')) ||
  /does not exist|schema cache/i.test(String(error?.message || ''));

/**
 * One snapshot row, read directly (no Next data cache: for callers that are
 * already inside their own unstable_cache). Resolves to { payload, builtAt }
 * or null. Never throws: a missing table, a missing row, an error or a slow
 * read (> timeoutMs) all resolve to null.
 */
export async function readSnapshotRow(key, { timeoutMs = 2000 } = {}) {
  if (Date.now() < tableMissingUntil) return null;
  try {
    const { data, error } = await getAdminClient()
      .from('dataset_snapshots')
      .select('payload, built_at')
      .eq('key', key)
      .abortSignal(AbortSignal.timeout(timeoutMs))
      .maybeSingle();
    if (error) {
      if (isMissingTable(error)) tableMissingUntil = Date.now() + TABLE_MISSING_BACKOFF_MS;
      return null;
    }
    return data ? { payload: data.payload, builtAt: data.built_at } : null;
  } catch {
    return null;
  }
}

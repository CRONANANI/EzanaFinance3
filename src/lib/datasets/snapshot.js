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

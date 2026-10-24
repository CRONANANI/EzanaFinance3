/**
 * Snapshot builders and the rebuild loop (datasets-cleanup-and-speed,
 * Step 4.2). One builder per dataset page section returns the JSON the page's
 * above-the-fold cards draw (aggregates, top lists, the first page of rows,
 * <= 150 KB). rebuild(key) writes the row, busts its cache tag and warms the
 * page so the first real visitor never renders cold.
 *
 * BUILDERS is filled page by page in Step 4.3, slowest page first, after the
 * baseline is measured (docs/perf/datasets-baseline.md). A key with no
 * builder is skipped, not an error.
 */
import 'server-only';
import { revalidateTag } from 'next/cache';
import { getAdminClient } from '@/lib/supabase';

/** key -> { route, build: async (admin) => ({ payload, sourceMaxUpdatedAt? }) } */
export const BUILDERS = {};

export const PAYLOAD_BUDGET_KB = 150;

export async function rebuild(key, { warm = true } = {}) {
  const def = BUILDERS[key];
  if (!def) return { key, skipped: 'no builder' };
  const admin = getAdminClient();
  const t0 = Date.now();
  const built = await def.build(admin);
  const payload = built?.payload ?? built;
  const kb = JSON.stringify(payload).length / 1024;
  const { error } = await admin.from('dataset_snapshots').upsert({
    key,
    payload,
    build_ms: Date.now() - t0,
    built_at: new Date().toISOString(),
    source_max_updated_at: built?.sourceMaxUpdatedAt || null,
  });
  if (error) throw new Error(`snapshot ${key}: ${error.message}`);
  try {
    revalidateTag(`snapshot:${key}`);
  } catch {
    /* outside a request scope */
  }
  let warmed = null;
  const base = process.env.SNAPSHOT_WARM_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (warm && base && def.route) {
    warmed = await fetch(`${base.replace(/\/$/, '')}${def.route}`, { headers: { 'x-warm': '1' } })
      .then((r) => r.status)
      .catch(() => 'unreachable');
  }
  return {
    key,
    ms: Date.now() - t0,
    kb: Math.round(kb * 10) / 10,
    overBudget: kb > PAYLOAD_BUDGET_KB,
    warmed,
  };
}

export async function rebuildAll(keys = Object.keys(BUILDERS)) {
  const out = [];
  for (const k of keys) {
    try {
      // eslint-disable-next-line no-await-in-loop
      out.push(await rebuild(k));
    } catch (e) {
      out.push({ key: k, error: String(e?.message || e).slice(0, 200) });
    }
  }
  return out;
}

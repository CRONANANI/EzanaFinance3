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
import { buildMacroRankings } from '@/lib/sonar/macro/store';
import {
  SUMMARY_LABELS,
  LINKAGE_IDS,
  loadSummaryOrThrow,
  loadLinkageOrThrow,
  summarySnapshotKey,
  linkageSnapshotKey,
} from '@/lib/datasets/hub-data';
import { createLimiter } from '@/lib/concurrency';

/** key -> { route, build: async (admin) => ({ payload, sourceMaxUpdatedAt? }) } */
export const BUILDERS = {
  /* Country rankings for Sonar's country_rank briefing (one common year,
     sovereigns only). Rebuilt by /api/cron/macro-worldbank after each import. */
  'macro:rankings': { route: null, build: (admin) => buildMacroRankings(admin) },
  /* Dataset hub cards (QA PLAT-2): /datasets/[hub] reads these first when
     they are under 24 hours old, so a visit no longer fans out 15+ live
     aggregates. One row per summary label and per linkage card. */
  ...Object.fromEntries(
    SUMMARY_LABELS.map((label) => [
      summarySnapshotKey(label),
      { route: null, hub: true, build: async () => ({ payload: await loadSummaryOrThrow(label) }) },
    ]),
  ),
  ...Object.fromEntries(
    LINKAGE_IDS.map((id) => [
      linkageSnapshotKey(id),
      { route: null, hub: true, build: async () => ({ payload: await loadLinkageOrThrow(id) }) },
    ]),
  ),
};

export const PAYLOAD_BUDGET_KB = 150;

export async function rebuild(key, { warm = true } = {}) {
  const def = BUILDERS[key];
  if (!def) return { key, skipped: 'no builder' };
  const admin = getAdminClient();
  const t0 = Date.now();
  const built = await def.build(admin);
  const payload = built?.payload ?? built;
  if (payload == null) return { key, skipped: 'no payload' };
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

/* Rebuild keys, at most `concurrency` at a time, stalest row first (so a run
   cut short by the time budget still refreshes the oldest rows). Keys not
   started within `budgetMs` are reported as deferred to the next run. */
export async function rebuildAll(
  keys = Object.keys(BUILDERS),
  { concurrency = 2, budgetMs = 240000 } = {},
) {
  const t0 = Date.now();
  let ordered = keys;
  try {
    const { data } = await getAdminClient()
      .from('dataset_snapshots')
      .select('key, built_at')
      .in('key', keys);
    const builtAt = new Map((data || []).map((r) => [r.key, Date.parse(r.built_at) || 0]));
    ordered = [...keys].sort((a, b) => (builtAt.get(a) || 0) - (builtAt.get(b) || 0));
  } catch {
    /* table not applied yet: keep the given order */
  }
  const limit = createLimiter(concurrency);
  const out = await Promise.all(
    ordered.map((k) =>
      limit(async () => {
        if (Date.now() - t0 > budgetMs) return { key: k, deferred: true };
        try {
          return await rebuild(k);
        } catch (e) {
          return { key: k, error: String(e?.message || e).slice(0, 200) };
        }
      }),
    ),
  );
  /* Hub pages cache their reads under `hubs` for 15 minutes; bust it once so
     the fresh rows show. */
  if (ordered.some((k) => BUILDERS[k]?.hub)) {
    try {
      revalidateTag('hubs');
    } catch {
      /* outside a request scope */
    }
  }
  return out;
}

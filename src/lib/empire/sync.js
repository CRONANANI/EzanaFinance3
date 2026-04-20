/**
 * @fileoverview
 * Empire Rankings sync orchestrator. Loads the country catalog + metric
 * map from Supabase, dispatches requests to every registered
 * `SourceFetcher`, and upserts the combined observations into
 * `country_scores_raw`. Finally, refreshes the `country_dimension_scores`
 * materialized view so reads see fresh composite 0-100 scores.
 *
 * Invoked by the weekly cron at `/api/cron/sync-empire-data`. Can also be
 * driven from a server shell for backfill:
 *
 *     curl -H "Authorization: Bearer $CRON_SECRET" \
 *          "https://<host>/api/cron/sync-empire-data"
 *
 * Idempotent: the upsert uses
 *   (country_iso3, dimension_id, metric_id, year, source) as the conflict
 * target, so re-running overwrites values without creating duplicates.
 */

import { getServerSupabase } from '@/lib/supabase/server';
import { worldBankFetcher } from './sources/world-bank';

/** @typedef {import('./sources/types.js').SourceFetcher} SourceFetcher */
/** @typedef {import('./sources/types.js').FetchedObservation} FetchedObservation */

/** Registered source fetchers. Add new providers here as they come online. */
/** @type {SourceFetcher[]} */
const SOURCES = [
  worldBankFetcher,
  // imfFetcher,    // pending
  // sipriFetcher,  // pending
  // wipoFetcher,   // pending
  // unescoFetcher, // pending
  // wtoFetcher,    // pending
  // wjpFetcher,    // pending
  // tiFetcher,     // pending
  // giiFetcher,    // pending
  // fredFetcher,   // pending
  // acledFetcher,  // pending
  // vdemFetcher,   // pending
];

const DEFAULT_LOOKBACK_YEARS = 25;
const UPSERT_CHUNK_SIZE = 1000;

/**
 * @param {{ yearStart?: number, yearEnd?: number } | undefined} opts
 * @returns {Promise<{ observations: number, sources: Record<string, { fetched: number, errors: number }>, refreshed: boolean }>}
 */
export async function syncAllSources(opts = {}) {
  const supabase = getServerSupabase();
  const currentYear = new Date().getFullYear();
  const yearStart = opts.yearStart ?? currentYear - DEFAULT_LOOKBACK_YEARS;
  const yearEnd = opts.yearEnd ?? currentYear;

  // ─── 1. Load country catalog ────────────────────────────────────────────────
  const { data: countries, error: cErr } = await supabase
    .from('empire_countries')
    .select('code, included')
    .eq('included', true);

  if (cErr) throw new Error(`[empire-sync] country load failed: ${cErr.message}`);
  const iso3List = (countries ?? []).map((c) => c.code).filter((c) => c && c.length === 3);
  if (iso3List.length === 0) {
    console.warn('[empire-sync] no included countries — aborting');
    return { observations: 0, sources: {}, refreshed: false };
  }

  // ─── 2. Load metric map ─────────────────────────────────────────────────────
  const { data: metricMap, error: mErr } = await supabase
    .from('dimension_metric_map')
    .select('metric_id, source, dimension_id');
  if (mErr) throw new Error(`[empire-sync] metric map load failed: ${mErr.message}`);

  /** @type {Map<string, Set<string>>} */
  const metricsBySource = new Map();
  /** @type {Map<string, string>} key: `${metric_id}:${source}` → dimension_id */
  const dimensionByMetricSource = new Map();

  for (const row of metricMap ?? []) {
    if (!metricsBySource.has(row.source)) metricsBySource.set(row.source, new Set());
    metricsBySource.get(row.source).add(row.metric_id);
    dimensionByMetricSource.set(`${row.metric_id}:${row.source}`, row.dimension_id);
  }

  // ─── 3. Fetch per source ────────────────────────────────────────────────────
  /** @type {Array<FetchedObservation & { source: string, dimensionId: string }>} */
  const allObs = [];
  /** @type {Record<string, { fetched: number, errors: number }>} */
  const sourceStats = {};

  for (const fetcher of SOURCES) {
    const metricIds = Array.from(metricsBySource.get(fetcher.sourceId) ?? []);
    if (metricIds.length === 0) {
      console.log(`[empire-sync] ${fetcher.sourceId}: no mapped metrics — skipping`);
      continue;
    }

    console.log(
      `[empire-sync] ${fetcher.sourceId}: fetching ${metricIds.length} metrics × ${iso3List.length} countries × ${yearEnd - yearStart + 1} years`,
    );

    const stats = { fetched: 0, errors: 0 };
    try {
      const obs = await fetcher.fetch({ iso3List, metricIds, yearStart, yearEnd });
      for (const o of obs) {
        const dimensionId = dimensionByMetricSource.get(`${o.metricId}:${fetcher.sourceId}`);
        if (!dimensionId || !o.countryIso3) continue;
        allObs.push({ ...o, source: fetcher.sourceId, dimensionId });
      }
      stats.fetched = obs.length;
    } catch (err) {
      stats.errors += 1;
      console.error(`[empire-sync] ${fetcher.sourceId} threw:`, err);
    }
    sourceStats[fetcher.sourceId] = stats;
  }

  // ─── 4. Upsert in chunks ────────────────────────────────────────────────────
  const rows = allObs.map((o) => ({
    country_iso3: o.countryIso3,
    dimension_id: o.dimensionId,
    metric_id: o.metricId,
    year: o.year,
    raw_value: o.rawValue,
    unit: o.unit ?? null,
    source: o.source,
    source_series_id: o.sourceSeriesId ?? null,
  }));

  let upsertedCount = 0;
  for (const chunk of chunked(rows, UPSERT_CHUNK_SIZE)) {
    const { error: upErr, count } = await supabase
      .from('country_scores_raw')
      .upsert(chunk, {
        onConflict: 'country_iso3,dimension_id,metric_id,year,source',
        count: 'exact',
      });
    if (upErr) {
      console.error('[empire-sync] upsert chunk failed:', upErr.message);
      continue;
    }
    upsertedCount += count ?? chunk.length;
  }

  // ─── 5. Refresh the materialized view ───────────────────────────────────────
  // The normalized view runs window functions over `country_scores_raw` on
  // every query; the matview caches the result. Refresh after ingest so
  // reads see fresh composite scores.
  let refreshed = false;
  if (upsertedCount > 0) {
    const { error: refreshErr } = await supabase.rpc('refresh_empire_scores_mat');
    if (refreshErr) {
      console.error('[empire-sync] matview refresh failed:', refreshErr.message);
    } else {
      refreshed = true;
    }
  }

  console.log(
    `[empire-sync] done — upserted ${upsertedCount} observations, refreshed=${refreshed}`,
  );

  return { observations: upsertedCount, sources: sourceStats, refreshed };
}

/**
 * Generator that yields successive slices of the given array.
 * @template T
 * @param {T[]} arr
 * @param {number} size
 * @returns {Generator<T[]>}
 */
function* chunked(arr, size) {
  for (let i = 0; i < arr.length; i += size) yield arr.slice(i, i + size);
}

/**
 * Read-only, server-side access to the Empire Rankings scoring backbone for the
 * PUBLIC OECD explorer. Mirrors the table reads and year-resolution of the
 * auth-gated `/api/empire/scores` route (same `country_dimension_scores_mat`
 * matview + `empire_dimensions`/`empire_countries` catalogs) so a figure on the
 * public page matches the dashboard for the same year — the client bundle never
 * calls the dashboard API.
 *
 * HONESTY: this surface is live-only. There is NO mock fallback. On any failure —
 * missing env, matview absent/unsynced, zero score rows — it resolves `null`, and
 * the explorer renders a quiet "unavailable" state. It never throws.
 *
 * Returns a JSON-SERIALIZABLE object (arrays, not Maps) so a server component can
 * pass it straight to the client explorer; the client rebuilds the score lookup:
 *   {
 *     year: number,
 *     dimensions: [{ id, name, category, higher_is_better, display_order, has_data }],
 *     scores:     [{ iso3, dimensionId, score }],   // score is 0–100 (backbone scale)
 *     countries:  [{ code, name }],                 // included countries only
 *   }
 */
import { getServerSupabase } from '@/lib/supabase/server';
import {
  metricLabel,
  metricUnitLabel,
  metricDirection,
  dimensionShort,
} from '@/lib/empire-metric-directions';

const SCORE_LIMIT = 20000;
const METRIC_LIMIT = 40000;
const METRIC_MAX_AGE_YEARS = 6;

export async function getEmpireScoresForExplorer() {
  let supabase;
  try {
    supabase = getServerSupabase();
  } catch {
    return null; // env not configured — degrade, never throw
  }

  try {
    // 1. Resolve the latest year with any score (matches the route).
    const { data: latest, error: yearErr } = await supabase
      .from('country_dimension_scores_mat')
      .select('year')
      .order('year', { ascending: false })
      .limit(1);
    if (yearErr) return null;
    const year = latest?.[0]?.year;
    if (year == null) return null;

    // 2. Scores for that year, plus the dimension + country catalogs.
    const [scoreRes, dimRes, countryRes] = await Promise.all([
      supabase
        .from('country_dimension_scores_mat')
        .select('country_iso3, dimension_id, score')
        .eq('year', year)
        .limit(SCORE_LIMIT),
      supabase
        .from('empire_dimensions')
        .select('id, name, category, higher_is_better, display_order')
        .order('display_order', { ascending: true }),
      supabase
        .from('empire_countries')
        .select('code, name')
        .eq('included', true)
        .order('economic_rank', { ascending: true }),
    ]);

    if (scoreRes.error || dimRes.error || countryRes.error) return null;

    const scoreRows = scoreRes.data ?? [];
    if (scoreRows.length === 0) return null; // unsynced backbone → unavailable state

    const dimensionsWithData = new Set(scoreRows.map((r) => r.dimension_id));
    const dimensions = (dimRes.data ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      category: d.category,
      higher_is_better: d.higher_is_better,
      display_order: d.display_order,
      has_data: dimensionsWithData.has(d.id),
    }));

    const scores = scoreRows
      .filter((r) => r.score != null)
      .map((r) => ({
        iso3: r.country_iso3,
        dimensionId: r.dimension_id,
        score: Number(r.score),
      }));

    const countries = (countryRes.data ?? []).map((c) => ({ code: c.code, name: c.name }));

    return { year, dimensions, scores, countries };
  } catch {
    return null;
  }
}

/**
 * Matrix payload for the empire-dimension view of the OECD explorer. Server-side,
 * read-only, live-only, `null` on any failure. Adds — on top of dimension scores
 * — the metric map (which raw World Bank metrics feed each dimension) and each
 * country's latest raw metric observation (bounded to the last 6 years so stale
 * figures render as missing, not misleading).
 *
 * JSON-serializable (arrays, not Maps); the client rebuilds the lookups:
 *   {
 *     year,
 *     dimensions: [{ id, name, short, category, higher_is_better, display_order,
 *                    has_data, metricIds: string[] }],
 *     metrics: { [metricId]: { label, unit, higherIsBetter } },
 *     scores: [{ iso3, dimensionId, score }],
 *     metricValues: [{ iso3, metricId, value, year }],
 *     countries: [{ code, name }],
 *   }
 */
export async function getEmpireMatrixData() {
  let supabase;
  try {
    supabase = getServerSupabase();
  } catch {
    return null;
  }

  try {
    // 1. Resolve score year (matches getEmpireScoresForExplorer / the route).
    const { data: latest, error: yearErr } = await supabase
      .from('country_dimension_scores_mat')
      .select('year')
      .order('year', { ascending: false })
      .limit(1);
    if (yearErr) return null;
    const year = latest?.[0]?.year;
    if (year == null) return null;

    const [scoreRes, dimRes, mapRes, countryRes] = await Promise.all([
      supabase
        .from('country_dimension_scores_mat')
        .select('country_iso3, dimension_id, score')
        .eq('year', year)
        .limit(SCORE_LIMIT),
      supabase
        .from('empire_dimensions')
        .select('id, name, category, higher_is_better, display_order')
        .order('display_order', { ascending: true }),
      supabase.from('dimension_metric_map').select('dimension_id, metric_id, invert'),
      supabase
        .from('empire_countries')
        .select('code, name')
        .eq('included', true)
        .order('economic_rank', { ascending: true }),
    ]);

    if (scoreRes.error || dimRes.error || mapRes.error || countryRes.error) return null;
    const scoreRows = scoreRes.data ?? [];
    if (scoreRows.length === 0) return null;

    const dimensionsWithData = new Set(scoreRows.map((r) => r.dimension_id));

    // Metric map: metricIds per dimension + per-metric invert (first seen).
    const mapRows = mapRes.data ?? [];
    const metricIdsByDim = new Map();
    const invertByMetric = new Map();
    for (const m of mapRows) {
      if (!metricIdsByDim.has(m.dimension_id)) metricIdsByDim.set(m.dimension_id, []);
      const list = metricIdsByDim.get(m.dimension_id);
      if (!list.includes(m.metric_id)) list.push(m.metric_id);
      if (!invertByMetric.has(m.metric_id)) invertByMetric.set(m.metric_id, m.invert);
    }

    const dimHibById = new Map((dimRes.data ?? []).map((d) => [d.id, d.higher_is_better]));

    const dimensions = (dimRes.data ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      short: dimensionShort(d.id, d.name),
      category: d.category,
      higher_is_better: d.higher_is_better,
      display_order: d.display_order,
      has_data: dimensionsWithData.has(d.id),
      metricIds: metricIdsByDim.get(d.id) ?? [],
    }));

    // Metric catalog (label/unit/direction) for every mapped metric.
    const metrics = {};
    for (const [metricId, invert] of invertByMetric) {
      // A metric can feed several dimensions; take any parent for HIB fallback.
      const parentDim = mapRows.find((m) => m.metric_id === metricId)?.dimension_id;
      metrics[metricId] = {
        label: metricLabel(metricId),
        unit: metricUnitLabel(metricId),
        higherIsBetter: metricDirection(metricId, invert, dimHibById.get(parentDim)),
      };
    }

    // 2. Latest raw metric observation per (country, metric), last 6 years only.
    const minYear = year - METRIC_MAX_AGE_YEARS;
    const { data: rawRows, error: rawErr } = await supabase
      .from('country_scores_raw')
      .select('country_iso3, metric_id, year, raw_value')
      .neq('source', 'placeholder')
      .gte('year', minYear)
      .not('raw_value', 'is', null)
      .order('year', { ascending: true })
      .limit(METRIC_LIMIT);
    if (rawErr) return null;

    // Keep the latest year per (country, metric); ascending order means the last
    // write wins.
    const latestByKey = new Map();
    for (const r of rawRows ?? []) {
      latestByKey.set(`${r.country_iso3}|${r.metric_id}`, {
        iso3: r.country_iso3,
        metricId: r.metric_id,
        value: Number(r.raw_value),
        year: r.year,
      });
    }
    const metricValues = [...latestByKey.values()];

    const scores = scoreRows
      .filter((r) => r.score != null)
      .map((r) => ({ iso3: r.country_iso3, dimensionId: r.dimension_id, score: Number(r.score) }));

    const countries = (countryRes.data ?? []).map((c) => ({ code: c.code, name: c.name }));

    return { year, dimensions, metrics, scores, metricValues, countries };
  } catch {
    return null;
  }
}

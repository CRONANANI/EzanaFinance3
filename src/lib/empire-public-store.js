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

const SCORE_LIMIT = 20000;

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

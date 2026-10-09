import { getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';

/*
 * Empire Ranking reads. Server only: the empire_* tables are not readable with
 * the public key, so the browser reaches them through /api/empire/data.
 * Each function returns the shape the page already expects, or the empty value
 * on failure (logged, never thrown to the caller).
 */

function db() {
  if (!isServerSupabaseConfigured()) return null;
  return getAdminClient();
}

export async function getEmpireRankings() {
  const sb = db();
  if (!sb) return [];
  const { data, error } = await sb
    .from('empire_rankings')
    .select(
      'country_code, overall_score, rank, trajectory, as_of_year, computed_at, empire_countries ( name, flag, region, is_eurozone )',
    )
    .order('rank', { ascending: true });
  if (error) {
    console.error('[empire-db] rankings error:', error.message);
    return [];
  }
  return (data || []).map((row) => ({
    code: row.country_code,
    name: row.empire_countries?.name || row.country_code,
    flag: row.empire_countries?.flag || '🏳️',
    region: row.empire_countries?.region,
    score: Number(row.overall_score),
    rank: row.rank,
    trajectory: row.trajectory,
    asOfYear: row.as_of_year,
  }));
}

export async function getDimensionScores(countryCode, year) {
  const sb = db();
  if (!sb) return {};
  const { data, error } = await sb
    .from('empire_dimension_scores')
    .select('dimension, z_score, raw_value')
    .eq('country_code', countryCode)
    .eq('year', year);
  if (error) {
    console.error('[empire-db] dimensions error:', error.message);
    return {};
  }
  const scores = {};
  for (const row of data || []) scores[row.dimension] = Number(row.z_score);
  return scores;
}

export async function getBigCycleHistory(countryCode, startYear, endYear) {
  const sb = db();
  if (!sb) return [];
  const { data, error } = await sb
    .from('empire_dimension_scores')
    .select('year, z_score')
    .eq('country_code', countryCode)
    .gte('year', startYear)
    .lte('year', endYear)
    .order('year', { ascending: true });
  if (error) {
    console.error('[empire-db] history error:', error.message);
    return [];
  }
  return (data || []).map((row) => ({ year: row.year, value: Number(row.z_score) }));
}

export async function getIndicatorTimeSeries(indicatorCode, countryCodes, startYear, endYear) {
  const sb = db();
  if (!sb) return [];
  const { data, error } = await sb
    .from('empire_indicators')
    .select('country_code, year, value')
    .eq('indicator_code', indicatorCode)
    .in('country_code', countryCodes)
    .gte('year', startYear)
    .lte('year', endYear)
    .order('year', { ascending: true });
  if (error) {
    console.error('[empire-db] indicators error:', error.message);
    return [];
  }
  const pivoted = {};
  for (const row of data || []) {
    if (!pivoted[row.year]) pivoted[row.year] = { year: row.year };
    pivoted[row.year][row.country_code] = Number(row.value);
  }
  return Object.values(pivoted);
}

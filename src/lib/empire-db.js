'use client';

import { supabase } from '@/lib/supabase';

/**
 * Fetches all countries with their current ranking data.
 * Joined with country metadata for display (name, flag, region).
 */
export async function fetchEmpireRankings() {
  const { data, error } = await supabase
    .from('empire_rankings')
    .select(
      `
      country_code,
      overall_score,
      rank,
      trajectory,
      as_of_year,
      computed_at,
      empire_countries (
        name,
        flag,
        region,
        is_eurozone
      )
    `
    )
    .order('rank', { ascending: true });

  if (error) {
    console.error('[empire-db] fetchEmpireRankings error:', error);
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

/**
 * Fetches the 18 Dalio power dimension scores for a specific country and year.
 */
export async function fetchDimensionScores(countryCode, year) {
  const { data, error } = await supabase
    .from('empire_dimension_scores')
    .select('dimension, z_score, raw_value')
    .eq('country_code', countryCode)
    .eq('year', year);

  if (error) {
    console.error('[empire-db] fetchDimensionScores error:', error);
    return {};
  }

  const scores = {};
  for (const row of data || []) {
    scores[row.dimension] = Number(row.z_score);
  }
  return scores;
}

/**
 * Fetches a time series for one country (z_score by year).
 * Note: empire_dimension_scores has multiple dimensions per year; narrow by dimension in Phase 4 if needed.
 */
export async function fetchBigCycleHistory(countryCode, startYear = 1500, endYear = 2030) {
  const { data, error } = await supabase
    .from('empire_dimension_scores')
    .select('year, z_score')
    .eq('country_code', countryCode)
    .gte('year', startYear)
    .lte('year', endYear)
    .order('year', { ascending: true });

  if (error) {
    console.error('[empire-db] fetchBigCycleHistory error:', error);
    return [];
  }

  return (data || []).map((row) => ({
    year: row.year,
    value: Number(row.z_score),
  }));
}

/**
 * Raw indicator values pivoted for recharts: { year, USA: v, CHN: v, ... }.
 */
export async function fetchIndicatorTimeSeries(indicatorCode, countryCodes, startYear, endYear) {
  const { data, error } = await supabase
    .from('empire_indicators')
    .select('country_code, year, value')
    .eq('indicator_code', indicatorCode)
    .in('country_code', countryCodes)
    .gte('year', startYear)
    .lte('year', endYear)
    .order('year', { ascending: true });

  if (error) {
    console.error('[empire-db] fetchIndicatorTimeSeries error:', error);
    return [];
  }

  const pivoted = {};
  for (const row of data || []) {
    if (!pivoted[row.year]) pivoted[row.year] = { year: row.year };
    pivoted[row.year][row.country_code] = Number(row.value);
  }
  return Object.values(pivoted);
}

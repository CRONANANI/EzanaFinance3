/**
 * Supabase reads for the OECD dataset page (mirrors usaspending-store.js
 * shape: every function resolves to null/[] on failure — never throws — so the
 * page degrades to its static sample rather than an error boundary).
 */
import { createClient } from '@supabase/supabase-js';
import { OECD_CURATED_SLUGS } from './oecd-curated';

function getAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Latest + prior value per (curated slug, country). null on any failure. */
export async function getOecdLatest() {
  const sb = getAnonClient();
  if (!sb) return null;
  const { data, error } = await sb.rpc('oecd_latest_observations', {
    p_slugs: OECD_CURATED_SLUGS,
    p_max_year: null,
  });
  if (error || !Array.isArray(data) || data.length === 0) return null;
  return data;
}

/** Coverage catalog (all synced slugs). null on failure. */
export async function getOecdCoverage() {
  const sb = getAnonClient();
  if (!sb) return null;
  const { data, error } = await sb
    .from('oecd_series_coverage')
    .select('ezana_slug, measure_name, unit_name, country_count, year_min, year_max, synced_at')
    .order('ezana_slug');
  if (error || !Array.isArray(data) || data.length === 0) return null;
  return data;
}

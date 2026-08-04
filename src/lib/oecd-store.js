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

/**
 * Full 1961–2025 history for ONE indicator across all areas (~1,200–1,800 rows,
 * ~80 KB). Consumed by the history chart. Returns null on any failure (the page
 * degrades — never throws).
 *
 * Supabase caps a select at 1,000 rows by default, and these series exceed that,
 * so we page with `.range()` until a short page signals exhaustion. Truncating
 * silently at 1,000 would drop whole decades — the single most likely bug here.
 */
export async function getOecdHistory(slug) {
  const sb = getAnonClient();
  if (!sb) return null;
  if (!OECD_CURATED_SLUGS.includes(slug)) return null;

  const PAGE = 1000;
  const rows = [];
  try {
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await sb
        .from('oecd_series_observations')
        .select('ref_area, ref_area_name, year, obs_value')
        .eq('ezana_slug', slug)
        .order('ref_area')
        .order('year')
        .range(from, from + PAGE - 1);
      if (error) return null;
      if (!Array.isArray(data) || data.length === 0) break;
      rows.push(...data);
      if (data.length < PAGE) break; // last (short) page
    }
  } catch {
    return null;
  }
  return rows.length ? rows : null;
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

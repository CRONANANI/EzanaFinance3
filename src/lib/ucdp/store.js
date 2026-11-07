/**
 * Server reads for UCDP conflict data: the Armed Conflict Tracker page
 * (/datasets/conflict), its API routes, and Sonar's country conflict panel. Three RPCs from
 * the ucdp migration, cached and revalidated by the ingest through the 'macro-ucdp' tag
 * (src/app/api/cron/macro-sync). Every read degrades to null, never a guessed number.
 */
import { unstable_cache } from 'next/cache';
import { getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';

const TAG = 'macro-ucdp';
const ISO3_RE = /^[A-Z]{3}$/;
export const MAP_MONTHS = [3, 12, 36];
export const VIOLENCE_TYPES = [1, 2, 3];

async function rpc(name, args, admin) {
  if (!admin && !isServerSupabaseConfigured()) return null;
  try {
    const { data, error } = await (admin || getAdminClient()).rpc(name, args);
    if (error) {
      console.warn(`[ucdp] ${name}:`, error.message);
      return null;
    }
    return data ?? null;
  } catch (e) {
    console.warn(`[ucdp] ${name}:`, e?.message || e);
    return null;
  }
}

/** Page overview: KPIs, monthly series by type, countries, conflicts, regions, releases. */
export const getConflictOverview = unstable_cache(
  async () => {
    const d = await rpc('ucdp_overview', {});
    return d && d.asof ? d : null;
  },
  ['ucdp-overview-v1'],
  { revalidate: 21600, tags: [TAG] },
);

/** Map cells (1 degree grid) over 3, 12 or 36 months, optionally one violence type. */
export function parseMapParams(sp) {
  const months = Number(sp.get('months') || 12);
  const typeRaw = sp.get('type');
  const type = typeRaw == null || typeRaw === '' || typeRaw === 'all' ? null : Number(typeRaw);
  if (!MAP_MONTHS.includes(months)) return { error: 'months must be 3, 12 or 36' };
  if (type != null && !VIOLENCE_TYPES.includes(type)) return { error: 'type must be 1, 2 or 3' };
  return { months, type };
}

export const getConflictMap = unstable_cache(
  async (months = 12, type = null) => {
    const d = await rpc('ucdp_map_cells', { p_months: months, p_type: type });
    return d && Array.isArray(d.cells) ? d : null;
  },
  ['ucdp-map-v1'],
  { revalidate: 21600, tags: [TAG] },
);

export const normIso3 = (v) => {
  const s = String(v || '')
    .trim()
    .toUpperCase();
  return ISO3_RE.test(s) ? s : null;
};

const countryCached = unstable_cache(
  async (iso3) => rpc('ucdp_country', { p_iso3: iso3 }),
  ['ucdp-country-v1'],
  { revalidate: 21600, tags: [TAG] },
);

/**
 * One country's conflict picture, or null (no events, bad code, or not migrated). Sonar
 * passes its own admin client and skips the cache wrapper's request scope.
 */
export async function getConflictCountry(iso3, { admin = null } = {}) {
  const code = normIso3(iso3);
  if (!code) return null;
  return admin ? rpc('ucdp_country', { p_iso3: code }, admin) : countryCached(code);
}

/**
 * Read layer for the Global Empire Lighthouse and crowd-forecast dataset
 * pages. Service-role reads on the server; only the ingest jobs write. Every
 * function returns [] on an error or an empty table, so each page shows its
 * honest empty state instead of failing.
 */
import { getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';

async function safe(label, fn) {
  if (!isServerSupabaseConfigured()) return [];
  try {
    return await fn(getAdminClient());
  } catch (e) {
    console.error(`[lighthouse] ${label}:`, e?.message || e);
    return [];
  }
}

/** Latest and prior observation per (indicator, area) for one source. */
export function lighthouseLatest(source, indicators = null) {
  return safe(`latest ${source}`, async (admin) => {
    const { data, error } = await admin.rpc('lighthouse_latest', {
      p_source: source,
      p_indicators: indicators,
    });
    if (error) throw new Error(error.message);
    return data || [];
  });
}

/** Newest OFAC SDN entries still on the list, plus the first-load date. */
export function sanctionsEntries(limit = 300) {
  return safe('sanctions', async (admin) => {
    const { data, error } = await admin
      .from('sanctions_entries')
      .select('ent_num, name, entry_type, programs, countries, first_seen, synced_at')
      .is('removed_on', null)
      .order('first_seen', { ascending: false })
      .order('ent_num', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data || [];
  });
}

/** Open Manifold crowd forecasts, most forecasters first. */
export function openCrowdForecasts(limit = 150) {
  return safe('crowd forecasts', async (admin) => {
    const { data, error } = await admin
      .from('crowd_forecasts')
      .select(
        'forecast_id, question, probability, forecasters, close_date, link, category, indexed_at',
      )
      .eq('status', 'open')
      .or(`close_date.is.null,close_date.gt."${new Date().toISOString()}"`)
      .order('forecasters', { ascending: false, nullsFirst: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return data || [];
  });
}

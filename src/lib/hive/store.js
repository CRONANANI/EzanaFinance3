/**
 * Read layer for The Hive dataset pages. Service-role reads on the server;
 * only the index crons write. Returns [] on any error or empty table so the
 * page shows its honest empty state.
 */
import { getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';

const COLS =
  'market_id, platform, question, probability, volume, volume_unit, end_date, link, category, indexed_at';

async function openOn(platform, limit) {
  const admin = getAdminClient();
  const { data, error } = await admin
    .from('prediction_market_index')
    .select(COLS)
    .eq('platform', platform)
    .eq('status', 'active')
    .or(`end_date.is.null,end_date.gt."${new Date().toISOString()}"`)
    .order('volume', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return data || [];
}

/** Open markets: Polymarket by dollars traded, then Kalshi by contracts traded. */
export async function getOpenMarkets({ polymarket = 100, kalshi = 50 } = {}) {
  if (!isServerSupabaseConfigured()) return [];
  try {
    const [poly, kal] = await Promise.all([
      openOn('polymarket', polymarket),
      openOn('kalshi', kalshi),
    ]);
    return [...poly, ...kal];
  } catch (e) {
    console.error('[hive] open markets:', e?.message || e);
    return [];
  }
}

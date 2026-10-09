/**
 * Read layer for Whale Moves — the composite-scored institutional & activist
 * signal. The page reads this small Supabase table (populated by the
 * compute-whale-moves cron) rather than scoring at request time. Service-role
 * reads on the server; only the cron writes. Returns [] on any error or
 * empty table so the page shows its honest empty state.
 */
import { getAdminClient, isServerSupabaseConfigured } from '@/lib/supabase';

/* Server-side reads go through the service-role client: the dataset tables
   are not readable with the public (anon) key, so they can only be reached
   through this app's rate-limited routes and pages. */
function getAnonClient() {
  if (!isServerSupabaseConfigured()) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  }
  return getAdminClient();
}

/**
 * Highest-scoring whale moves, best first. Returns [] on any error/empty so the
 * page shows its empty state.
 * @param {{ kind?: 'institutional'|'activist', limit?: number }} opts
 */
export async function getWhaleMoves({ kind, limit = 100 } = {}) {
  try {
    const supabase = getAnonClient();
    let q = supabase
      .from('whale_moves')
      .select(
        'id, kind, filer_name, filer_cik, ticker, issuer, quarter, value_usd, conviction_pct, change_type, percent_of_class, form, whale_score, tier, factors, filed_at',
      )
      .order('whale_score', { ascending: false })
      .limit(Math.min(Math.max(Number(limit) || 100, 1), 300));
    if (kind) q = q.eq('kind', kind);
    const { data, error } = await q;
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

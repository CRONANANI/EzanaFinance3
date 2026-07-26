/**
 * Read layer for Whale Moves — the composite-scored institutional & activist
 * signal. The page reads this small Supabase table (populated by the
 * compute-whale-moves cron) rather than scoring at request time. Plain anon
 * client (public RLS read); only the cron writes. Returns [] on any error or
 * empty table so the page falls through to its clearly-labeled sample.
 */
import { createClient } from '@supabase/supabase-js';

let _anon = null;
function getAnonClient() {
  if (_anon) return _anon;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key)
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY');
  _anon = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return _anon;
}

/**
 * Highest-scoring whale moves, best first. Returns [] on any error/empty so the
 * page shows its sample.
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

/**
 * Read layer for the hosted SEC EDGAR filings. The sec-filings page reads these
 * small Supabase tables (populated by the ingest-sec-filings cron) instead of
 * calling EDGAR on every request — same rule as "the page never queries
 * BigQuery directly". Plain anon client (public RLS read); only the cron writes.
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
 * Newest filings for one form family (or all). Returns [] on any error so the
 * page falls through to its sample fallback.
 * @param {{ family?: 'insider'|'institutional'|'activist', limit?: number }} opts
 */
export async function getSecFilings({ family, limit = 50 } = {}) {
  try {
    const supabase = getAnonClient();
    let q = supabase
      .from('sec_filings')
      .select(
        'accession_no, form_type, form_family, cik, filer_name, ticker, filed_at, period_of_report, primary_doc_url, index_url',
      )
      .order('filed_at', { ascending: false })
      .limit(Math.min(Math.max(Number(limit) || 50, 1), 200));
    if (family) q = q.eq('form_family', family);
    const { data, error } = await q;
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

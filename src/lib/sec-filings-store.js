/**
 * Read layer for the hosted SEC EDGAR filings. The sec-filings page reads these
 * small Supabase tables (populated by the ingest-sec-filings cron) instead of
 * calling EDGAR on every request — same rule as "the page never queries
 * BigQuery directly". Service-role reads on the server; only the cron writes.
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

/** Parsed 13F positions for one filing, largest value first. [] on any error. */
export async function get13FHoldings({ accessionNo }) {
  try {
    const supabase = getAnonClient();
    const { data, error } = await supabase
      .from('sec_13f_holdings')
      .select('name_of_issuer, cusip, ticker, value_usd, shares, share_type, put_call')
      .eq('accession_no', accessionNo)
      .order('value_usd', { ascending: false });
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

/** Parsed 13D/13G stake for one filing, or null. */
export async function getActivistPosition({ accessionNo }) {
  try {
    const supabase = getAnonClient();
    const { data, error } = await supabase
      .from('sec_activist_positions')
      .select('subject_name, subject_cik, subject_ticker, percent_of_class, shares')
      .eq('accession_no', accessionNo)
      .maybeSingle();
    if (error) return null;
    return data || null;
  } catch {
    return null;
  }
}

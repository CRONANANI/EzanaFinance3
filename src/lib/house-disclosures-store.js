/**
 * Read layer for the House financial-disclosure index (and Phase 2 trades). The
 * Capitol Watch page reads these small Supabase tables (populated by the
 * ingest-house-disclosures / parse-house-ptrs crons) rather than hitting the Clerk
 * on every request. Service-role reads on the server; only the crons write.
 * Returns [] / null on any error so the page falls through to its sample.
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
 * Filing index rows, newest first. `ptrOnly` restricts to Periodic Transaction
 * Reports (the trade filings).
 * @param {{ ptrOnly?: boolean, year?: number, limit?: number }} opts
 */
export async function getHouseFilings({ ptrOnly = false, year, limit = 200 } = {}) {
  try {
    const supabase = getAnonClient();
    let q = supabase
      .from('house_disclosure_filings')
      .select(
        'doc_id, prefix, last_name, first_name, suffix, filing_type, filing_type_label, state_dst, state, district, filing_year, filing_date, pdf_url, is_ptr, is_electronic, trades_parsed',
      )
      .order('filing_date', { ascending: false, nullsFirst: false })
      .limit(Math.min(Math.max(Number(limit) || 200, 1), 500));
    if (ptrOnly) q = q.eq('is_ptr', true);
    if (year) q = q.eq('filing_year', Number(year));
    const { data, error } = await q;
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

/** Parsed trades for one PTR filing, newest transaction first. [] on any error. */
export async function getHouseTrades({ docId }) {
  try {
    const supabase = getAnonClient();
    const { data, error } = await supabase
      .from('house_trades')
      .select(
        'ticker, asset_name, tx_type, tx_date, notification_date, amount_low, amount_high, amount_midpoint, amount_bracket_label',
      )
      .eq('doc_id', docId)
      .order('tx_date', { ascending: false, nullsFirst: false });
    if (error || !data) return [];
    return data;
  } catch {
    return [];
  }
}

/** Distinct filing years present, newest first — for the year filter. */
export async function getHouseFilingYears() {
  try {
    const supabase = getAnonClient();
    const { data, error } = await supabase
      .from('house_disclosure_filings')
      .select('filing_year')
      .order('filing_year', { ascending: false })
      .limit(2000);
    if (error || !data) return [];
    return [...new Set(data.map((r) => r.filing_year).filter(Boolean))];
  } catch {
    return [];
  }
}

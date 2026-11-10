/**
 * Top institutional holders of a ticker from the latest 13F period
 * (titans_13f_positions + titans_13f_filers, the Titans Shadow data). Server
 * only. Used by the Watchlist "Top holders & owners" strip (Nov 2026).
 */
export async function topInstitutions(admin, ticker, { limit = 10 } = {}) {
  const sym = String(ticker || '')
    .trim()
    .toUpperCase();
  if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(sym)) return { period: null, holders: [], total: 0 };

  const { data: latest, error: pErr } = await admin
    .from('titans_13f_positions')
    .select('period')
    .eq('ticker', sym)
    .order('period', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (pErr) throw pErr;
  if (!latest?.period) return { period: null, holders: [], total: 0 };

  const {
    data: rows,
    error,
    count,
  } = await admin
    .from('titans_13f_positions')
    .select('cik, shares, value_usd', { count: 'exact' })
    .eq('period', latest.period)
    .eq('ticker', sym)
    .is('put_call', null)
    .order('value_usd', { ascending: false })
    .limit(limit);
  if (error) throw error;

  const ciks = [...new Set((rows || []).map((r) => r.cik))];
  const { data: filers, error: fErr } = ciks.length
    ? await admin
        .from('titans_13f_filers')
        .select('cik, filer_name')
        .eq('period', latest.period)
        .in('cik', ciks)
    : { data: [], error: null };
  if (fErr) throw fErr;
  const names = new Map((filers || []).map((f) => [f.cik, f.filer_name]));

  return {
    period: latest.period,
    total: count ?? (rows || []).length,
    holders: (rows || []).map((r) => ({
      id: r.cik,
      name: names.get(r.cik) || `CIK ${r.cik}`,
      shares: r.shares != null ? Number(r.shares) : null,
      valueUsd: r.value_usd != null ? Number(r.value_usd) : null,
    })),
  };
}

/**
 * Curated lobbying client → public-ticker join helpers (SERVER ONLY).
 *
 * The lobbying_client_tickers table maps an UPPERCASE client legal name to a
 * verified public stock ticker. lobbying_filings.client_name is stored
 * uppercase, so matching is exact on the uppercased name. A filing/spender is
 * "public" iff its client name has a row here — never fuzzy-guessed.
 */

/**
 * Ticker rows for a set of client names → Map<UPPERCASE name, row>. One indexed
 * `.in()` query (chunked), so enriching a page is a single round-trip.
 */
export async function fetchTickerMap(admin, clientNames) {
  const names = [
    ...new Set(
      (clientNames || [])
        .map((n) =>
          String(n || '')
            .toUpperCase()
            .trim(),
        )
        .filter(Boolean),
    ),
  ];
  const map = new Map();
  if (!names.length) return map;
  for (let i = 0; i < names.length; i += 200) {
    const chunk = names.slice(i, i + 200);
    const { data, error } = await admin
      .from('lobbying_client_tickers')
      .select('client_name,ticker,exchange,company_label')
      .in('client_name', chunk);
    if (!error && Array.isArray(data)) {
      for (const r of data) map.set(String(r.client_name).toUpperCase(), r);
    }
  }
  return map;
}

/** All public client names (UPPERCASE) — for onlyPublic DB filtering. */
export async function fetchPublicClientNames(admin) {
  const { data, error } = await admin.from('lobbying_client_tickers').select('client_name');
  if (error || !Array.isArray(data)) return [];
  return data.map((r) => String(r.client_name).toUpperCase());
}

/** Ticker fields for a raw client name given a fetched map. */
export function tickerFor(clientName, tickerMap) {
  const t = tickerMap.get(
    String(clientName || '')
      .toUpperCase()
      .trim(),
  );
  return {
    ticker: t?.ticker || null,
    exchange: t?.exchange || null,
    companyLabel: t?.company_label || null,
    isPublic: !!t,
  };
}

/**
 * Canonical org position book — the ONE way to read an organization's
 * holdings. Reads `org_positions` (multi-source: manual / CSV / brokerage),
 * explicitly scoped by org_id (never team-id-only, never RLS-only).
 *
 * HONEST-EMPTY CONTRACT: returns [] when the org holds nothing. No mock
 * rows, no placeholder figures.
 *
 * VALUATION: value = shares × (current_price ?? avg_cost). An unpriced
 * position (current_price null — e.g. a CSV import before the Phase B
 * price-refresh cron runs) is carried AT COST: it contributes its cost to
 * total value and zero to return. `priced` marks which rows have a live
 * price so callers can badge coverage or null-out return math when nothing
 * is priced. This is conservative, never fabricated.
 *
 * COMPAT ALIASES: rows expose both `ticker` and `ticker_symbol`, plus
 * `current_value` (= value) and `added_at` (= created_at), so former
 * `org_team_portfolios` readers migrate with a fetch-swap only.
 */

const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

/** @returns {{id,org_id,team_id,ticker,ticker_symbol,name,shares,avg_cost,current_price,sector,source,priced,value,cost,pl,current_value,added_at}[]} */
export async function getOrgPositionBook(supabase, orgId) {
  if (!orgId) return [];
  const { data, error } = await supabase
    .from('org_positions')
    .select(
      'id, org_id, team_id, ticker, name, shares, avg_cost, current_price, sector, source, created_at, last_priced_at',
    )
    .eq('org_id', orgId)
    .eq('is_active', true);
  if (error || !data) return [];

  return data.map((p) => {
    const shares = num(p.shares) ?? 0;
    const avgCost = num(p.avg_cost) ?? 0;
    const price = num(p.current_price);
    const priced = price != null;
    const cost = shares * avgCost;
    const value = shares * (priced ? price : avgCost);
    return {
      id: p.id,
      org_id: p.org_id,
      team_id: p.team_id ?? null,
      ticker: (p.ticker || '').toUpperCase(),
      ticker_symbol: (p.ticker || '').toUpperCase(), // compat alias
      name: p.name ?? null,
      shares,
      avg_cost: avgCost,
      current_price: price,
      sector: p.sector ?? null,
      source: p.source,
      priced,
      value,
      cost,
      pl: value - cost,
      current_value: value, // compat alias for former org_team_portfolios readers
      added_at: p.created_at, // compat alias
      last_priced_at: p.last_priced_at ?? null,
    };
  });
}

/** Sum helper used by several routes. */
export function bookTotals(book) {
  let value = 0;
  let cost = 0;
  let pricedCount = 0;
  for (const p of book) {
    value += p.value;
    cost += p.cost;
    if (p.priced) pricedCount += 1;
  }
  return { value, cost, pricedCount, unpricedCount: book.length - pricedCount };
}

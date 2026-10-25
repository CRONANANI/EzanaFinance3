/**
 * Row builders and reader normalisers for the legacy Plaid tables
 * (`plaid_accounts`, `plaid_holdings`).
 *
 * Every key written here must be a real live column. The contract test
 * `scripts/check-plaid-columns.mjs` extracts the keys of each object literal
 * tagged with a `plaid-row:` comment below (and every literal written to these
 * tables anywhere in `src/`) and fails on any key that is not in its
 * LIVE_COLUMNS list.
 *
 * Live shape (verified against the catalog, QA RET-8):
 *   plaid_accounts: id, user_id, plaid_item_id, account_id, account_name,
 *     official_name, account_type, account_subtype, account_mask,
 *     balance_current, balance_available, balance_limit, currency,
 *     created_at, updated_at  (unique: account_id)
 *   plaid_holdings: id, user_id, account_id, security_id, ticker_symbol,
 *     security_name, security_type, quantity, price_per_share, total_value,
 *     cost_basis, currency, synced_at  (unique: user_id, ticker_symbol)
 */

/** onConflict target for `plaid_accounts` (constraint plaid_accounts_account_id_key). */
export const PLAID_ACCOUNTS_CONFLICT = 'account_id';
/** onConflict target for `plaid_holdings` (constraint plaid_holdings_user_ticker_unique). */
export const PLAID_HOLDINGS_CONFLICT = 'user_id,ticker_symbol';

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * One `plaid_accounts` row from a Plaid `accounts[]` entry.
 * @param {{ userId: string, plaidItemRowId: string, account: object, now?: string }} args
 */
export function toPlaidAccountRow({ userId, plaidItemRowId, account: a, now }) {
  // plaid-row: plaid_accounts
  return {
    user_id: userId,
    plaid_item_id: plaidItemRowId,
    account_id: a.account_id,
    account_name: a.name || a.official_name || 'Account',
    official_name: a.official_name ?? null,
    account_type: a.type || 'other',
    account_subtype: a.subtype ?? null,
    account_mask: a.mask ?? null,
    balance_current: num(a.balances?.current),
    balance_available: num(a.balances?.available),
    balance_limit: num(a.balances?.limit),
    currency: a.balances?.iso_currency_code || 'USD',
    updated_at: now || new Date().toISOString(),
  };
}

/**
 * `plaid_holdings` rows from Plaid `holdings[]` + securities.
 *
 * The live unique key is (user_id, ticker_symbol), so one row per ticker:
 * the same ticker held in two accounts is merged (quantities, values and cost
 * bases summed; account_id is the account with the largest position), because
 * Postgres rejects an upsert batch that hits the same conflict key twice.
 * Holdings without a ticker cannot be upserted idempotently (NULL never
 * conflicts) and are skipped.
 *
 * @returns {{ rows: object[], skipped: number }}
 */
export function toPlaidHoldingRows({ userId, holdings, securitiesByID, now }) {
  const syncedAt = now || new Date().toISOString();
  const byTicker = new Map();
  let skipped = 0;
  for (const h of holdings || []) {
    const sec = securitiesByID?.[h.security_id];
    const ticker = sec?.ticker_symbol || sec?.symbol || null;
    if (!sec || !ticker) {
      skipped += 1;
      continue;
    }
    const value = num(h.institution_value) ?? 0;
    const prev = byTicker.get(ticker);
    if (!prev) {
      // plaid-row: plaid_holdings
      const row = {
        user_id: userId,
        account_id: h.account_id,
        security_id: h.security_id,
        ticker_symbol: ticker,
        security_name: sec.name ?? null,
        security_type: sec.type ?? null,
        quantity: num(h.quantity) ?? 0,
        price_per_share: num(h.institution_price),
        total_value: value,
        cost_basis: num(h.cost_basis),
        currency: h.iso_currency_code || sec.iso_currency_code || 'USD',
        synced_at: syncedAt,
      };
      byTicker.set(ticker, { row, topValue: value });
      continue;
    }
    prev.row.quantity += num(h.quantity) ?? 0;
    prev.row.total_value = (prev.row.total_value ?? 0) + value;
    const cb = num(h.cost_basis);
    if (cb != null) prev.row.cost_basis = (prev.row.cost_basis ?? 0) + cb;
    if (value > prev.topValue) {
      prev.topValue = value;
      prev.row.account_id = h.account_id;
      prev.row.security_id = h.security_id;
    }
  }
  return { rows: [...byTicker.values()].map((e) => e.row), skipped };
}

/**
 * Normalise a `plaid_holdings` row for API consumers: keeps the raw columns
 * and adds the short aliases the dashboard reads (`ticker`, `name`, `type`,
 * `price`, `value`).
 */
export function normalizePlaidHolding(h) {
  const quantity = Number(h.quantity) || 0;
  const price = num(h.price_per_share);
  const value = num(h.total_value) ?? (price != null ? quantity * price : 0);
  return {
    ...h,
    ticker: h.ticker_symbol ?? null,
    name: h.security_name ?? null,
    type: h.security_type ?? null,
    quantity,
    price,
    value,
    cost_basis: num(h.cost_basis) ?? 0,
  };
}

/** Sum of `total_value` across holdings rows (falls back to quantity x price). */
export function sumPlaidHoldingsValue(holdings) {
  return (holdings || []).reduce((s, h) => s + (normalizePlaidHolding(h).value || 0), 0);
}

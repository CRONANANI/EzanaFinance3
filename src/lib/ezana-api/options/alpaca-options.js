/**
 * Alpaca options data for the Ezana API (server only).
 *
 *   contracts    Broker API GET /v1/options/contracts (open interest, size)
 *                (or Trading API GET /v2/options/contracts when
 *                ALPACA_OPTIONS_CONTRACTS_URL points at api.alpaca.markets)
 *   chain        Market Data GET /v1beta1/options/snapshots/{underlying}
 *                (greeks, implied volatility, latest quote)
 *   spot         Market Data GET /v2/stocks/{symbol}/trades/latest
 *
 * Credentials and hosts follow src/lib/alpaca.js (ALPACA_ENV, broker or
 * legacy key pair, HTTP Basic). ALPACA_OPTIONS_FEED picks the options feed:
 * "indicative" (default; delayed, free) or "opra" (needs the paid plan).
 *
 * Licensing: Alpaca and OPRA terms restrict redistributing this data. The
 * route that uses it sits behind the restricted `options` scope (no tier
 * grants it) until redistribution rights are confirmed.
 */
import { ApiError } from '../query';

const ENV = process.env.ALPACA_ENV || 'sandbox';
const BROKER_BASE =
  process.env.ALPACA_BROKER_BASE_URL ||
  (ENV === 'production'
    ? 'https://broker-api.alpaca.markets'
    : 'https://broker-api.sandbox.alpaca.markets');
const DATA_BASE =
  ENV === 'production' ? 'https://data.alpaca.markets' : 'https://data.sandbox.alpaca.markets';
const CONTRACTS_URL =
  process.env.ALPACA_OPTIONS_CONTRACTS_URL ||
  `${BROKER_BASE.replace(/\/$/, '')}/v1/options/contracts`;
const KEY = process.env.ALPACA_BROKER_API_KEY || process.env.ALPACA_API_KEY || '';
const SECRET = process.env.ALPACA_BROKER_API_SECRET || process.env.ALPACA_API_SECRET || '';
const FEED = process.env.ALPACA_OPTIONS_FEED === 'opra' ? 'opra' : 'indicative';
const STOCK_FEED = process.env.ALPACA_STOCK_FEED || 'iex';

export const optionsFeed = () => FEED;
const optionsConfigured = () => Boolean(KEY && SECRET);

async function get(url, label) {
  if (!optionsConfigured()) {
    throw new ApiError(503, 'not_available', 'Options data is not configured on this server.');
  }
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${Buffer.from(`${KEY}:${SECRET}`).toString('base64')}`,
      Accept: 'application/json',
    },
    cache: 'no-store',
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    console.warn('[options]', label, res.status);
    throw new ApiError(
      503,
      'not_available',
      'The options data source did not answer. Retry shortly.',
    );
  }
  return res.json();
}

const qs = (o) =>
  new URLSearchParams(Object.entries(o).filter(([, v]) => v != null && v !== '')).toString();

/** Every active contract for the underlying in the expiration window (bounded). */
export async function fetchContracts(underlying, { expirationGte, expirationLte }) {
  const out = [];
  let token = null;
  for (let page = 0; page < 10; page += 1) {
    // eslint-disable-next-line no-await-in-loop
    const body = await get(
      `${CONTRACTS_URL}?${qs({
        underlying_symbols: underlying,
        status: 'active',
        expiration_date_gte: expirationGte,
        expiration_date_lte: expirationLte,
        limit: 10000,
        page_token: token,
      })}`,
      'contracts',
    );
    if (!body) break;
    const rows = body.option_contracts || body.contracts || (Array.isArray(body) ? body : null);
    if (!rows) throw new ApiError(503, 'not_available', 'Unexpected options contracts response.');
    out.push(...rows);
    token = body.next_page_token || null;
    if (!token) break;
  }
  return out;
}

/** Greeks and quotes for the chain, keyed by OCC symbol (bounded). */
export async function fetchChain(underlying, { expirationGte, expirationLte }) {
  const snaps = {};
  let token = null;
  for (let page = 0; page < 20; page += 1) {
    // eslint-disable-next-line no-await-in-loop
    const body = await get(
      `${DATA_BASE}/v1beta1/options/snapshots/${encodeURIComponent(underlying)}?${qs({
        feed: FEED,
        limit: 1000,
        expiration_date_gte: expirationGte,
        expiration_date_lte: expirationLte,
        page_token: token,
      })}`,
      'chain',
    );
    if (!body) break;
    Object.assign(snaps, body.snapshots || {});
    token = body.next_page_token || null;
    if (!token) break;
  }
  return snaps;
}

/** Latest trade price of the underlying, or null. */
export async function fetchSpot(symbol) {
  const body = await get(
    `${DATA_BASE}/v2/stocks/${encodeURIComponent(symbol)}/trades/latest?${qs({ feed: STOCK_FEED })}`,
    'spot',
  );
  const p = Number(body?.trade?.p);
  return Number.isFinite(p) && p > 0 ? { price: p, at: body.trade.t || null } : null;
}

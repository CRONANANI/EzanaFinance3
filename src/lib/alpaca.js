/**
 * Alpaca Broker API Client — Server-side only
 *
 * ENV VARS (.env.local):
 *   ALPACA_API_KEY        — your Broker API key ID
 *   ALPACA_API_SECRET     — your Broker API secret key
 *   ALPACA_ENV            — sandbox | production (defaults to sandbox)
 */

const ALPACA_BASE = {
  sandbox: 'https://broker-api.sandbox.alpaca.markets',
  production: 'https://broker-api.alpaca.markets',
};

const DATA_BASE = {
  sandbox: 'https://data.sandbox.alpaca.markets',
  production: 'https://data.alpaca.markets',
};

const env = process.env.ALPACA_ENV || 'sandbox';
const BASE_URL = ALPACA_BASE[env];
const DATA_URL = DATA_BASE[env];

const AUTH_HEADER = 'Basic ' + Buffer.from(
  `${process.env.ALPACA_API_KEY || ''}:${process.env.ALPACA_API_SECRET || ''}`
).toString('base64');

/**
 * Make an authenticated request to the Alpaca Broker API
 */
export async function alpacaRequest(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': AUTH_HEADER,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = { message: text }; }
    const err = new Error(parsed.message || `Alpaca API error ${res.status}`);
    err.status = res.status;
    err.details = parsed;
    throw err;
  }

  if (res.status === 204) return null;
  return res.json();
}

/**
 * Make a request to the Alpaca Market Data API
 */
export async function alpacaDataRequest(path) {
  const url = `${DATA_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Authorization': AUTH_HEADER },
  });
  if (!res.ok) throw new Error(`Alpaca Data API error ${res.status}`);
  return res.json();
}

export { BASE_URL, DATA_URL, AUTH_HEADER };

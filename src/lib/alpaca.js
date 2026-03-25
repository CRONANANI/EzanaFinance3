/**
 * Alpaca Broker API — server-side only
 *
 * ENV (preferred):
 *   ALPACA_BROKER_BASE_URL   — e.g. https://broker-api.sandbox.alpaca.markets
 *   ALPACA_BROKER_API_KEY
 *   ALPACA_BROKER_API_SECRET
 *
 * Legacy fallbacks:
 *   ALPACA_ENV + ALPACA_API_KEY + ALPACA_API_SECRET
 */

import { Buffer } from 'node:buffer';

const LEGACY_BASE = {
  sandbox: 'https://broker-api.sandbox.alpaca.markets',
  production: 'https://broker-api.alpaca.markets',
};

const envName = process.env.ALPACA_ENV || 'sandbox';

const BASE_URL =
  process.env.ALPACA_BROKER_BASE_URL ||
  LEGACY_BASE[envName] ||
  LEGACY_BASE.sandbox;

const API_KEY = process.env.ALPACA_BROKER_API_KEY || process.env.ALPACA_API_KEY || '';
const API_SECRET = process.env.ALPACA_BROKER_API_SECRET || process.env.ALPACA_API_SECRET || '';

const AUTH_HEADER =
  'Basic ' + Buffer.from(`${API_KEY}:${API_SECRET}`).toString('base64');

const DATA_BASE = {
  sandbox: 'https://data.sandbox.alpaca.markets',
  production: 'https://data.alpaca.markets',
};

const DATA_URL = DATA_BASE[envName] || DATA_BASE.sandbox;

/**
 * Authenticated request to Alpaca Broker API
 */
export async function alpacaRequest(endpoint, options = {}) {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${BASE_URL.replace(/\/$/, '')}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: AUTH_HEADER,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 204) return null;

  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    console.error(`Alpaca API error [${response.status}]:`, data);
    const err = new Error(data.message || data.error || `Alpaca API error: ${response.status}`);
    err.status = response.status;
    err.details = data;
    throw err;
  }

  return data;
}

/** Convenience helpers (Broker API paths include leading slash, e.g. `/v1/accounts`) */
export const alpaca = {
  get: (endpoint) => alpacaRequest(endpoint, { method: 'GET' }),
  post: (endpoint, body) =>
    alpacaRequest(endpoint, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: (endpoint, body) =>
    alpacaRequest(endpoint, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
  delete: (endpoint) => alpacaRequest(endpoint, { method: 'DELETE' }),
};

/**
 * Market Data API (same auth as broker in sandbox/production)
 */
export async function alpacaDataRequest(path) {
  const url = `${DATA_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    headers: { Authorization: AUTH_HEADER },
  });
  if (!res.ok) throw new Error(`Alpaca Data API error ${res.status}`);
  return res.json();
}

export { BASE_URL as ALPACA_BASE_URL, DATA_URL, AUTH_HEADER };

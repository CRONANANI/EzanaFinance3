// src/lib/quants/model-data.js
// SERVER ONLY. Loads daily closes for the Model Library routes through the
// shared price helper, so every model reads the same series.
import { getDailyBars } from '@/lib/prices/daily-bars';

const TICKER_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;

/** Uppercased ticker, or null when it is not a plausible symbol. */
export function cleanTicker(raw) {
  const t = String(raw || '')
    .trim()
    .toUpperCase();
  return TICKER_RE.test(t) ? t : null;
}

/** Up to `max` unique valid tickers from an array or a comma/space string. */
export function cleanTickers(raw, max = 10) {
  const list = Array.isArray(raw) ? raw : String(raw || '').split(/[,\s]+/);
  const out = [];
  for (const item of list) {
    const t = cleanTicker(item);
    if (t && !out.includes(t)) out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * Daily closes going back `days` calendar days, oldest first.
 * @returns {Promise<{ date: string, close: number }[]>}
 */
export async function loadCloses(ticker, days) {
  const from = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const { candles } = await getDailyBars(ticker, from);
  return candles || [];
}

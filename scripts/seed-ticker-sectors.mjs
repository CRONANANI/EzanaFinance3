/**
 * Upserts scripts/data/ticker-sectors.json into public.ticker_sectors, the
 * sector lookup behind the Politician Tracker's member portfolio panel.
 * The same rows ship as supabase/migrations/20261003120100_ticker_sectors_seed.sql;
 * use this to refresh after editing the JSON (for example to classify a new
 * ticker that shows up as 'Unclassified').
 *
 *   node scripts/seed-ticker-sectors.mjs
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 *
 * The JSON was built from S&P 500 constituents (GICS sectors,
 * github.com/datasets/s-and-p-500-companies), the NYSE / Nasdaq / NYSE American
 * listings in github.com/rreichel3/US-Stock-Symbols (Nasdaq sectors mapped onto
 * GICS names: Finance -> Financials, Technology -> Information Technology,
 * Telecommunications -> Communication Services, Basic Materials -> Materials),
 * a hand list of delisted, renamed and ADR tickers seen in congressional
 * filings, and broad ETFs as 'Funds & ETFs'. S&P 500 GICS wins where both
 * sources have a ticker.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
const map = JSON.parse(readFileSync(new URL('./data/ticker-sectors.json', import.meta.url)));
const rows = Object.entries(map).map(([ticker, sector]) => ({
  ticker,
  sector,
  updated_at: new Date().toISOString(),
}));
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
for (let i = 0; i < rows.length; i += 1000) {
  const { error } = await db.from('ticker_sectors').upsert(rows.slice(i, i + 1000), {
    onConflict: 'ticker',
  });
  if (error) throw new Error(error.message);
}
console.log(`upserted ${rows.length} tickers`);

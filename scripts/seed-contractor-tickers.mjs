/**
 * Upserts scripts/data/contractor-tickers.json into public.contractor_tickers
 * and public.contractor_ticker_prefixes, then re-resolves every profiled
 * recipient. The same rows ship as
 * supabase/migrations/20261003140100_contractor_tickers_seed.sql; use this to
 * refresh after editing the JSON (a subsidiary that resolved to nothing, a
 * contractor that went public or private).
 *
 *   node scripts/seed-contractor-tickers.mjs
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 *
 * JSON shape: { exact: [[name_key, ticker|null, company, is_public, source]],
 *               prefix: [[prefix_key, ticker]] }. Keys are nameKey() output
 * (src/lib/contractors/name-key.js); a row whose key is not already
 * normalised will never match anything.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { nameKey } from '../src/lib/contractors/name-key.js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
const data = JSON.parse(readFileSync(new URL('./data/contractor-tickers.json', import.meta.url)));
const now = new Date().toISOString();
const bad = data.exact.filter(([k]) => nameKey(k) !== k).map(([k]) => k);
if (bad.length) {
  console.error(
    `These keys are not normalised; fix them first:\n  ${bad.slice(0, 20).join('\n  ')}`,
  );
  process.exit(1);
}
const exact = data.exact.map(([name_key, ticker, company, is_public, source]) => ({
  name_key,
  ticker: is_public ? ticker : null,
  company,
  is_public,
  source,
  updated_at: now,
}));
const prefix = data.prefix.map(([prefix_key, ticker]) => ({
  prefix_key,
  ticker,
  source: 'manual',
  updated_at: now,
}));

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
for (let i = 0; i < exact.length; i += 1000) {
  const { error } = await db
    .from('contractor_tickers')
    .upsert(exact.slice(i, i + 1000), { onConflict: 'name_key' });
  if (error) throw new Error(`contractor_tickers: ${error.message}`);
}
const { error: pe } = await db
  .from('contractor_ticker_prefixes')
  .upsert(prefix, { onConflict: 'prefix_key' });
if (pe) throw new Error(`contractor_ticker_prefixes: ${pe.message}`);
const { error: ue } = await db
  .from('contractor_recipients')
  .update({ tickered_at: null })
  .not('recipient_id', 'is', null);
if (ue) throw new Error(`reset: ${ue.message}`);
const { data: n, error: re } = await db.rpc('contractor_resolve_tickers');
if (re) throw new Error(`resolve: ${re.message}`);
console.log(
  `upserted ${exact.length} exact rows, ${prefix.length} prefix rules; re-resolved ${n} recipients`,
);

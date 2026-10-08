/**
 * CLI for the Eyes Above ingest (same code as the crons in
 * src/app/api/cron/eyes-*). Needs NEXT_PUBLIC_SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY, plus FRED_API_KEY / PATENTSVIEW_API_KEY for
 * those jobs. Loads .env.local when present.
 *
 *   npm run ingest:eyes -- portwatch
 *   npm run ingest:eyes -- fred
 *   npm run ingest:eyes -- patents --from=2024-10-01 --to=2026-10-08   backfill (2 years is roughly 700 requests at 45 a minute, about 20 minutes)
 */
import { existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { ingestFred, ingestPatents, ingestPortWatch } from '../src/lib/eyes/ingest.js';

if (existsSync('.env.local')) dotenv.config({ path: '.env.local' });

const [job, ...rest] = process.argv.slice(2);
const args = Object.fromEntries(
  rest.map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const log = (m) => console.log(`  ${m}`);

let result;
if (job === 'portwatch') result = await ingestPortWatch(db);
else if (job === 'fred') result = await ingestFred(db);
else if (job === 'patents') {
  result = await ingestPatents(db, { from: args.from || null, to: args.to || null, log });
} else {
  console.error(
    'Usage: npm run ingest:eyes -- portwatch | fred | patents [--from=YYYY-MM-DD --to=YYYY-MM-DD]',
  );
  process.exit(1);
}
console.log(JSON.stringify(result, null, 2));

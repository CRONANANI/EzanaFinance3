/**
 * CLI for the congressional-trades ingest (same code as the daily cron,
 * /api/cron/ingest-congress-trades). Needs NEXT_PUBLIC_SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY; FMP_API_KEY and FMP_CONGRESS_ENABLED as in prod.
 *
 *   npm run ingest:congress                  members + trades
 *   npm run ingest:congress -- --chamber=house
 *   npm run ingest:congress -- --photos      mirror portraits into Storage
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { mirrorPhotos, runCongressIngest } from '../src/lib/politicians/congress-ingest.js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

if (args.photos) {
  const out = await mirrorPhotos({ db, max: Number(args.max) || 600 });
  console.log(JSON.stringify(out, null, 2));
} else {
  const legislators = JSON.parse(
    readFileSync(new URL('../src/lib/politicians/legislators-current.json', import.meta.url)),
  );
  const summary = await runCongressIngest({
    db,
    fallbackLegislators: legislators,
    fmpKey: process.env.FMP_API_KEY || '',
    fmpEnabled: String(process.env.FMP_CONGRESS_ENABLED ?? 'true').toLowerCase() !== 'false',
    chamber: ['house', 'senate'].includes(args.chamber) ? args.chamber : 'all',
  });
  console.log(JSON.stringify(summary, null, 2));
  if (summary.errors.length) process.exitCode = 1;
}

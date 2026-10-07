/**
 * CLI for the Brazil asset-declaration ingest (same code as the cron route,
 * /api/cron/ingest-tse-assets). See src/lib/politicians/tse-ingest.js.
 *
 *   npm run ingest:tse                          2022 and 2018
 *   npm run ingest:tse -- --years=2022,2018
 *   npm run ingest:tse -- --years=2022 --dry    parse and count, write nothing
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (from
 * .env.local when present) and network access to cdn.tse.jus.br.
 * TSE_CDN_BASE points it at a mirror or a local fixture server.
 */
import { existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { ingestTseYear } from '../src/lib/politicians/tse-ingest.js';
import { TSE_CDN } from '../src/lib/politicians/brazil.js';

if (existsSync('.env.local')) dotenv.config({ path: '.env.local' });

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const dry = Boolean(args.dry);
const years = String(args.years || '2022,2018')
  .split(',')
  .map((y) => Number(y.trim()))
  .filter((y) => Number.isInteger(y) && y >= 2006 && y % 2 === 0)
  .sort((a, b) => b - a);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!dry && (!url || !key)) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
const db = dry
  ? null
  : createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

const keepPeople = new Set();
for (const year of years) {
  console.log(`\n${year}`);
  // eslint-disable-next-line no-await-in-loop
  const r = await ingestTseYear({
    db,
    year,
    dry,
    keepPeople,
    base: process.env.TSE_CDN_BASE || TSE_CDN,
    log: (m) => console.log(`  ${m}`),
  });
  for (const k of r.electedKeys) keepPeople.add(k);
}
console.log(dry ? '\nDry run: nothing written.' : '\nDone.');

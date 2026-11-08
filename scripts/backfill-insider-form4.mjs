#!/usr/bin/env node
/**
 * Backfill Form 4 filings and their transactions for a date range, straight
 * from EDGAR (Nov 2026). Run LOCALLY, never on Vercel:
 *
 *   node scripts/backfill-insider-form4.mjs 2026-10-01 2026-11-07
 *   node scripts/backfill-insider-form4.mjs 2026-10-01 2026-10-31 --index-only
 *
 * For each business day: read the SEC daily form index (every Form 4 and 4/A
 * accepted that day), upsert the filings into sec_filings (existing rows
 * untouched), then fetch each filing not yet parsed as its full-submission
 * .txt (one request, the XML is inline), parse it with the app's own parser
 * (src/lib/sec/form4.js) and upsert into sec_insider_transactions on the same
 * key the cron uses (accession_no, table_kind, line_no).
 *
 * The SEC quarterly insider data sets (backfill-insider-datasets.mjs) do not
 * cover the current quarter until it closes; this fills the gap.
 *
 * Throttled to about 6 requests a second (SEC fair access caps at 10). A month
 * of Form 4s is roughly 30,000 to 40,000 filings: expect 1.5 to 2 hours. Safe
 * to stop and rerun; parsed filings are skipped.
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
 * Sends SEC_USER_AGENT (or the app default).
 */
import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { parseForm4Xml, form4ToRows } from '../src/lib/sec/form4.js';
import {
  dailyIndexUrl,
  businessDays,
  parseFormIndex,
  toInsiderFilingRows,
  submissionTxtUrl,
  extractForm4Xml,
} from '../src/lib/sec/daily-form-index.js';

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
loadEnv('.env.local');

const [from, to] = process.argv.slice(2).filter((a) => /^\d{4}-\d{2}-\d{2}$/.test(a));
const INDEX_ONLY = process.argv.includes('--index-only');
if (!from || !to) {
  console.error(
    'Usage: node scripts/backfill-insider-form4.mjs YYYY-MM-DD YYYY-MM-DD [--index-only]',
  );
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const UA = process.env.SEC_USER_AGENT || 'Ezana Finance admin@ezana.world';

/* ── SEC fetch, ~6 req/s ─────────────────────────────────────────────── */
const GAP_MS = 170;
let last = 0;
let requests = 0;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function secText(u, tries = 3) {
  for (let i = 0; i < tries; i += 1) {
    const wait = last + GAP_MS - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    requests += 1;
    try {
      const res = await fetch(u, { headers: { 'User-Agent': UA } });
      if (res.status === 404) return null;
      if (res.status === 429 || res.status >= 500) {
        await sleep(2000 * (i + 1));
        continue;
      }
      if (!res.ok) throw new Error(`SEC ${res.status}`);
      return await res.text();
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(1000 * (i + 1));
    }
  }
  return null;
}

async function tickerIndex() {
  const raw = await secText('https://www.sec.gov/files/company_tickers.json');
  const idx = new Map();
  if (!raw) return idx;
  const plain = (t) => /^[A-Z]{1,5}$/.test(String(t));
  for (const row of Object.values(JSON.parse(raw))) {
    if (row?.cik_str == null || !row?.ticker) continue;
    const cik = String(row.cik_str);
    const cur = idx.get(cik);
    if (!cur || (!plain(cur) && plain(row.ticker))) idx.set(cik, row.ticker);
  }
  return idx;
}

async function parsedSet(accessions) {
  const seen = new Set();
  for (let i = 0; i < accessions.length; i += 200) {
    const { data, error } = await db
      .from('sec_insider_transactions')
      .select('accession_no')
      .in('accession_no', accessions.slice(i, i + 200))
      .limit(10000);
    if (error) throw new Error(error.message);
    for (const r of data || []) seen.add(r.accession_no);
  }
  return seen;
}

const totals = { days: 0, form4s: 0, parsed: 0, rows: 0, purchases: 0, holdingsOnly: 0, failed: 0 };
const cikTicker = await tickerIndex();
console.log(`ticker map: ${cikTicker.size} CIKs`);

for (const day of businessDays(from, to)) {
  const text = await secText(dailyIndexUrl(day));
  if (!text) {
    console.log(`${day}  no index (holiday or not yet published)`);
    continue;
  }
  const entries = parseFormIndex(text);
  const filings = toInsiderFilingRows(entries, cikTicker);
  for (let i = 0; i < filings.length; i += 500) {
    const { error } = await db
      .from('sec_filings')
      .upsert(filings.slice(i, i + 500), { onConflict: 'accession_no', ignoreDuplicates: true });
    if (error) console.error(`${day} sec_filings: ${error.message}`);
  }
  totals.days += 1;
  totals.form4s += filings.length;
  if (INDEX_ONLY) {
    console.log(`${day}  indexed ${filings.length}`);
    continue;
  }

  const done = await parsedSet(filings.map((f) => f.accession_no));
  const queue = filings.filter((f) => !done.has(f.accession_no));
  let dayRows = 0;
  let dayBuys = 0;
  for (const f of queue) {
    try {
      const sub = await secText(submissionTxtUrl({ cik: f.cik, accessionNo: f.accession_no }));
      const parsed = parseForm4Xml(extractForm4Xml(sub));
      if (!parsed) {
        totals.failed += 1;
        continue;
      }
      const rows = form4ToRows(parsed, { accessionNo: f.accession_no, filedAt: f.filed_at });
      if (!rows.length) {
        totals.holdingsOnly += 1;
        continue;
      }
      const { error } = await db
        .from('sec_insider_transactions')
        .upsert(rows, { onConflict: 'accession_no,table_kind,line_no' });
      if (error) {
        totals.failed += 1;
        console.error(`${f.accession_no}: ${error.message}`);
        continue;
      }
      totals.parsed += 1;
      dayRows += rows.length;
      dayBuys += rows.filter((r) => r.transaction_code === 'P').length;
    } catch (e) {
      totals.failed += 1;
      console.error(`${f.accession_no}: ${e?.message || e}`);
    }
  }
  totals.rows += dayRows;
  totals.purchases += dayBuys;
  console.log(
    `${day}  form4s ${filings.length}  queued ${queue.length}  rows ${dayRows}  open-market buy rows ${dayBuys}  sec requests ${requests}`,
  );
}

console.log('done', totals);

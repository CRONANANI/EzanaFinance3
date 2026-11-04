#!/usr/bin/env node
/**
 * Backfill one quarter of 13F filings for the filers Ezana already tracks,
 * then parse their holdings. Run by hand, never scheduled.
 *
 * Why (Nov 4, 2026): the quarter-over-quarter 13F comparison behind Sonar's
 * flows pings, the Titans buyers/sellers panels and the flow leaders only sees
 * filers that filed BOTH quarters. Q2 2026 has 1,477 filers on file but Q1 2026
 * only 73 (its filings went out in April and May, before the rolling ingest
 * existed, and the one-shot backfill hit the 60-page cap), so 54 filers holding
 * about 0.25% of reported value were all the comparison could see.
 *
 * What it does:
 *   1. Day by day across the filing window, calls the existing backfill mode
 *        GET /api/cron/ingest-sec-filings?from=D&to=D&forms=13F-HR,13F-HR/A&pages=60
 *      One day per call keeps every day under the 60-page (6,000 hit) cap.
 *      The route inserts only CIKs that already have a 13F on file.
 *   2. Calls GET /api/cron/ingest-sec-holdings?max13f=60&maxActivist=1 until a
 *      run parses no 13F filings twice in a row (the parser works newest
 *      quarter first, so the backfilled quarter comes last).
 *   3. Prints the SQL to run afterwards (SQL_02 in the hand-off).
 *
 * Usage (from the repo root, CRON_SECRET from Vercel production env):
 *   CRON_SECRET=... node scripts/backfill-13f-quarter.mjs \
 *     --from 2026-04-01 --to 2026-05-31 [--base https://ezana.world] [--skip-holdings]
 */
const args = process.argv.slice(2);
const val = (k, d = null) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const base = String(val('base', 'https://ezana.world')).replace(/\/$/, '');
const from = val('from');
const to = val('to');
const secret = process.env.CRON_SECRET;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

if (!secret || !DATE_RE.test(from || '') || !DATE_RE.test(to || '')) {
  console.error(
    'Usage: CRON_SECRET=... node scripts/backfill-13f-quarter.mjs --from YYYY-MM-DD --to YYYY-MM-DD',
  );
  process.exit(1);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(path) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await fetch(`${base}${path}`, {
        headers: { authorization: `Bearer ${secret}` },
        signal: AbortSignal.timeout(320_000),
      });
      const text = await res.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = { raw: text.slice(0, 200) };
      }
      if (res.ok) return json;
      console.warn(`  HTTP ${res.status} (attempt ${attempt})`, json?.error || json?.raw || '');
    } catch (e) {
      console.warn(`  request failed (attempt ${attempt}): ${e?.message}`);
    }
    // eslint-disable-next-line no-await-in-loop
    await wait(15_000 * attempt);
  }
  return null;
}

function days(a, b) {
  const out = [];
  for (
    let d = new Date(`${a}T00:00:00Z`);
    d <= new Date(`${b}T00:00:00Z`);
    d = new Date(d.getTime() + 864e5)
  ) {
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

let indexed = 0;
const periods = {};
for (const day of days(from, to)) {
  let r = null;
  /* The hourly ingest holds the same lock; a locked call ran nothing. */
  for (let tries = 0; tries < 8; tries += 1) {
    // eslint-disable-next-line no-await-in-loop
    r = await call(
      `/api/cron/ingest-sec-filings?from=${day}&to=${day}&forms=${encodeURIComponent('13F-HR,13F-HR/A')}&pages=60`,
    );
    if (!r?.skipped) break;
    console.log(`${day}: ingest locked by the scheduled run, waiting 60s`);
    // eslint-disable-next-line no-await-in-loop
    await wait(60_000);
  }
  if (!r || r.skipped) {
    console.error(`${day}: gave up after retries; rerun with --from ${day}`);
    process.exit(2);
  }
  indexed += Number(r.indexed) || 0;
  for (const [k, v] of Object.entries(r.periods || {})) periods[k] = (periods[k] || 0) + v;
  const capped = Number(r.seen) >= 6000 ? '  (hit the page cap: some filings may be missing)' : '';
  console.log(`${day}: seen ${r.seen ?? '?'} indexed ${r.indexed ?? 0}${capped}`);
}
console.log(`\nFilings indexed: ${indexed}`, periods);

if (!args.includes('--skip-holdings')) {
  console.log('\nParsing holdings (newest quarter first)...');
  let dry = 0;
  for (let run = 1; run <= 120 && dry < 2; run += 1) {
    // eslint-disable-next-line no-await-in-loop
    const r = await call('/api/cron/ingest-sec-holdings?max13f=60&maxActivist=1&maxReparse=0');
    const n = Number(r?.filings_13f) || 0;
    console.log(
      `run ${run}: 13F filings parsed ${n}, holdings rows ${r?.holdings_rows ?? 0}${r?.skipped ? ' (locked, waiting)' : ''}`,
    );
    if (r?.skipped || !r) {
      // eslint-disable-next-line no-await-in-loop
      await wait(60_000);
      continue;
    }
    dry = n === 0 ? dry + 1 : 0;
  }
}

console.log(`
Done. Now run SQL_02 in the Supabase SQL Editor:
  select public.titans_13f_materialise('<quarter end>'::date);
  select public.refresh_titans_institutional_latest();
  select public.refresh_titans_flows_current();
`);

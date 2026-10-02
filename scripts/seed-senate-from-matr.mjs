/**
 * One-off Senate backfill from github.com/matr-co/senate-ptr, a public JSON
 * mirror of the same eFD Periodic Transaction Reports that
 * /api/cron/ingest-senate-ptrs reads directly (2023 onward, refreshed every
 * two hours by that repo's GitHub Action).
 *
 * Use it to fill history in one pass instead of draining eFD a few dozen
 * reports an hour, or as a fallback if eFD ever refuses Vercel's IPs. It
 * writes the same tables the cron writes, and marks electronic PTRs
 * trades_parsed = true, so the cron skips anything already loaded here and
 * carries on from there. The daily /api/cron/ingest-congress-trades then lands
 * the rows in congress_trades as source 'senate_efd'.
 *
 * Third-party mirror, no licence on the repo: the records are public, but the
 * hourly eFD cron stays the source of record. This script is never scheduled.
 *
 *   node scripts/seed-senate-from-matr.mjs --dry-run
 *   node scripts/seed-senate-from-matr.mjs
 *   node scripts/seed-senate-from-matr.mjs --file=./senate_ptrs.json
 *
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY unless --dry-run.
 */
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const SOURCE = 'https://raw.githubusercontent.com/matr-co/senate-ptr/main/senate_ptrs.json';
const BATCH = 500;

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const dry = Boolean(args['dry-run']);

const clean = (s) =>
  String(s ?? '')
    .replace(/\s+/g, ' ')
    .trim();
const tickerOf = (t) => {
  const s = clean(t).toUpperCase();
  return /^[A-Z][A-Z0-9.\-]{0,9}$/.test(s) ? s : null;
};
const band = (lo, hi) => {
  if (lo == null && hi == null) return null;
  const f = (n) => `$${Math.round(n).toLocaleString('en-US')}`;
  return hi == null || hi === lo ? `${f(lo)} +` : `${f(lo)} - ${f(hi)}`;
};
const lastKey = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z ]/g, ' ')
    .trim()
    .split(/\s+/)
    .pop();

const raw = args.file ? readFileSync(args.file, 'utf8') : await (await fetch(SOURCE)).text();
const data = JSON.parse(raw);
if (!Array.isArray(data?.reports)) {
  console.error('Unexpected payload: no reports array. The mirror may have changed shape.');
  process.exit(1);
}

let db = null;
const stateByLast = new Map();
if (!dry) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or pass --dry-run.');
    process.exit(1);
  }
  db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  /* Same state lookup the cron uses: unique last name among senators. */
  const { data: senators } = await db
    .from('congress_members')
    .select('last_name, state')
    .eq('chamber', 'senate');
  for (const s of senators || []) {
    const k = lastKey(s.last_name);
    stateByLast.set(k, stateByLast.has(k) ? null : s.state);
  }
}

const filings = [];
const trades = [];
for (const r of data.reports) {
  const id = String(r.id || '').toLowerCase();
  const filed = /^\d{4}-\d{2}-\d{2}$/.test(r.filed || '') ? r.filed : null;
  if (!id || !filed) continue;
  const paper = /\/paper\//.test(r.url || '');
  const amendment = /amendment/i.test(r.title || '');
  const state = stateByLast.get(lastKey(r.last)) || null;
  filings.push({
    doc_id: id,
    first_name: clean(r.first),
    last_name: clean(r.last),
    state,
    filing_type: paper ? 'paper' : 'ptr',
    filing_type_label: amendment
      ? 'Periodic Transaction Report (Amendment)'
      : 'Periodic Transaction Report',
    filing_year: Number(filed.slice(0, 4)),
    filing_date: filed,
    report_url: r.url || null,
    is_ptr: true,
    trades_parsed: !paper,
  });
  for (const t of r.trades || []) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t.date || '')) continue;
    const lo = t.lo ?? null;
    const hi = t.hi ?? null;
    trades.push({
      doc_id: id,
      first_name: clean(r.first),
      last_name: clean(r.last),
      state,
      ticker: tickerOf(t.ticker),
      asset_name: clean(t.asset).slice(0, 500) || 'Unknown asset',
      asset_type: clean(t.asset_type) || null,
      owner: clean(t.owner) || null,
      tx_type: clean(t.type) || null,
      tx_date: t.date,
      notification_date: filed,
      amount_low: lo,
      amount_high: hi,
      amount_midpoint: lo == null ? null : hi == null ? lo : (lo + hi) / 2,
      amount_bracket_label: band(lo, hi),
      raw_row: 'matr-co/senate-ptr',
    });
  }
}

console.log(
  `mirror updated ${data.updated} · ${filings.length} filings ` +
    `(${filings.filter((f) => f.filing_type === 'paper').length} paper) · ${trades.length} trades`,
);
if (dry) process.exit(0);

/* Filings first (the trades reference them). Existing filings are left as
   they are, so anything the eFD cron already parsed is not touched. */
let newFilings = 0;
for (let i = 0; i < filings.length; i += BATCH) {
  const { data: ins, error } = await db
    .from('senate_disclosure_filings')
    .upsert(filings.slice(i, i + BATCH), { onConflict: 'doc_id', ignoreDuplicates: true })
    .select('doc_id');
  if (error) throw new Error(`filings: ${error.message}`);
  newFilings += ins?.length || 0;
}

/* Trades only for filings that have none yet, so a rerun never doubles rows
   and never overwrites what the cron parsed. */
const loaded = new Set();
for (let from = 0; ; from += 1000) {
  /* Paged: PostgREST caps a select at 1000 rows. */
  const { data: have, error } = await db
    .from('senate_trades')
    .select('doc_id')
    .order('id', { ascending: true })
    .range(from, from + 999);
  if (error) throw new Error(`existing trades: ${error.message}`);
  for (const r of have || []) loaded.add(r.doc_id);
  if (!have || have.length < 1000) break;
}
const todo = trades.filter((t) => !loaded.has(t.doc_id));
for (let i = 0; i < todo.length; i += BATCH) {
  const { error } = await db.from('senate_trades').insert(todo.slice(i, i + BATCH));
  if (error) throw new Error(`trades: ${error.message}`);
}
console.log(`inserted ${newFilings} new filings, ${todo.length} trades`);
console.log(
  'Next: run /api/cron/ingest-congress-trades?days=1400 to land them in congress_trades.',
);

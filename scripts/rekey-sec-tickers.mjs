// One-time fix (Nov 2026): re-key stored SEC rows to each company's primary
// ticker. Before the buildCikTickerIndex fix, a CIK with several listed
// symbols kept the LAST one, so Alphabet was stored as GOOGM, Meta as METAM,
// Oracle as ORCL-PD, Boeing as BA-PA. New ingests are correct; this rewrites
// the rows already stored, by CIK.
//
//   node --env-file=.env.local scripts/rekey-sec-tickers.mjs            (dry run)
//   node --env-file=.env.local scripts/rekey-sec-tickers.mjs --write
//
// Tables: sec_fundamentals (cik, ticker) and sec_filings (cik, ticker).
import { createClient } from '@supabase/supabase-js';
import { buildCikTickerIndex } from '../src/lib/sec-edgar.js';

const write = process.argv.includes('--write');
const UA = process.env.SEC_USER_AGENT || 'Ezana Finance admin@ezana.world';
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
  },
);

const res = await fetch('https://www.sec.gov/files/company_tickers.json', {
  headers: { 'User-Agent': UA },
});
if (!res.ok) throw new Error(`company_tickers.json: ${res.status}`);
const index = buildCikTickerIndex(await res.json());
const norm = (cik) => String(parseInt(String(cik).replace(/\D/g, ''), 10) || '');

async function rekey(table) {
  const stale = new Map(); // cik -> { from:Set, to }
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from(table)
      .select('cik, ticker')
      .not('ticker', 'is', null)
      .order('cik')
      .range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    for (const r of data || []) {
      const want = index.get(norm(r.cik));
      if (want && want !== r.ticker) {
        const s = stale.get(r.cik) || { from: new Set(), to: want };
        s.from.add(r.ticker);
        stale.set(r.cik, s);
      }
    }
    if (!data || data.length < 1000) break;
  }
  let updated = 0;
  for (const [cik, s] of stale) {
    console.log(`${table}: CIK ${cik} ${[...s.from].join(',')} -> ${s.to}`);
    if (!write) continue;
    const { error, count } = await db
      .from(table)
      .update({ ticker: s.to }, { count: 'exact' })
      .eq('cik', cik)
      .neq('ticker', s.to);
    if (error) console.error(`  failed: ${error.message}`);
    else updated += count || 0;
  }
  return { companies: stale.size, rowsUpdated: write ? updated : 0 };
}

const out = {};
for (const table of ['sec_fundamentals', 'sec_filings']) out[table] = await rekey(table);
console.log(write ? 'Written.' : 'Dry run. Add --write to apply.', out);

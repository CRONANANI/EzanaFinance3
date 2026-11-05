// One-time backfill of 13F history from the SEC "Form 13F data sets"
// (Nov 2026, deep research step 3). Runs locally, with no 300 s limit.
//
// 1. Download the quarterly zips from https://www.sec.gov/data-research/sec-markets-data/form-13f-data-sets
//    (send a User-Agent with a contact email; one zip covers the filings made
//    in a three-month window, so a report quarter's filings land in the zip
//    for the following window).
// 2. Dry run (counts only):
//      node --env-file=.env.local scripts/backfill-13f-datasets.mjs --zip a.zip,b.zip
// 3. Write and rebuild the quarters:
//      node --env-file=.env.local scripts/backfill-13f-datasets.mjs --zip a.zip,b.zip --write
//
// Options:
//   --periods 2025-06-30,2025-09-30   only these report quarters (default: all in the zip)
//   --filers tracked|all              tracked (default): managers already in titans_13f_filers;
//                                     all: every filer (a quarter is ~3M holdings rows)
//   --write                           write sec_filings + sec_13f_holdings, then run
//                                     titans_13f_materialise for each quarter loaded
//
// Writes go through the same objects the incremental ingest uses: sec_filings
// rows and the replace_13f_holdings RPC (one transaction per filing), then
// titans_13f_materialise(period). Re-running is safe.
import { createClient } from '@supabase/supabase-js';
import yauzl from 'yauzl';
import readline from 'node:readline';
import { datasetDate, filingRow, holdingRow, tsvRow } from '../src/lib/sec/form13f-datasets.js';

const arg = (k, d = null) => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 ? process.argv[i + 1] : d;
};
const zips = String(arg('zip', '')).split(',').filter(Boolean);
const periods = new Set(String(arg('periods', '')).split(',').filter(Boolean));
const filersMode = arg('filers', 'tracked');
const write = process.argv.includes('--write');
if (!zips.length) {
  console.error('Pass --zip path/to/form13f.zip[,more.zip]');
  process.exit(1);
}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false },
  },
);

function openZip(path) {
  return new Promise((resolve, reject) =>
    yauzl.open(path, { lazyEntries: true }, (e, z) => (e ? reject(e) : resolve(z))),
  );
}

/** Stream one named table out of the zip, line by line, as objects. */
async function* table(path, name) {
  const zip = await openZip(path);
  const entry = await new Promise((resolve, reject) => {
    zip.on('entry', (en) => {
      if (new RegExp(`(^|/)${name}\\.tsv$`, 'i').test(en.fileName)) resolve(en);
      else zip.readEntry();
    });
    zip.on('end', () => resolve(null));
    zip.on('error', reject);
    zip.readEntry();
  });
  if (!entry) {
    zip.close();
    throw new Error(`${name}.tsv not found in ${path}`);
  }
  const stream = await new Promise((resolve, reject) =>
    zip.openReadStream(entry, (e, s) => (e ? reject(e) : resolve(s))),
  );
  const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  let header = null;
  for await (const line of rl) {
    if (!line) continue;
    if (!header) {
      header = line.split('\t').map((h) => h.trim().toUpperCase());
      continue;
    }
    yield tsvRow(header, line);
  }
  zip.close();
}

async function trackedCiks() {
  const out = new Set();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from('titans_13f_filers')
      .select('cik')
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    for (const r of data || []) out.add(String(r.cik).padStart(10, '0'));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function tickersFor(cusips) {
  const map = new Map();
  const list = [...new Set(cusips.filter(Boolean))];
  for (let i = 0; i < list.length; i += 500) {
    const { data } = await db
      .from('sec_cusip_map')
      .select('cusip, ticker')
      .in('cusip', list.slice(i, i + 500));
    for (const r of data || []) if (r.ticker) map.set(r.cusip, r.ticker);
  }
  return map;
}

const tracked = filersMode === 'all' ? null : await trackedCiks();
const touched = new Set();
const totals = { filings: 0, holdings: 0, skippedFilers: 0, failed: 0 };

for (const path of zips) {
  console.log(`\n${path}`);
  /* Submissions and cover pages first (small), then the holdings. */
  const subs = new Map();
  for await (const s of table(path, 'SUBMISSION')) {
    if (!/^13F-HR/.test(String(s.SUBMISSIONTYPE))) continue;
    const period = datasetDate(s.PERIODOFREPORT);
    if (periods.size && !periods.has(period)) continue;
    const cik = String(s.CIK).replace(/\D/g, '').padStart(10, '0');
    if (tracked && !tracked.has(cik)) {
      totals.skippedFilers += 1;
      continue;
    }
    subs.set(s.ACCESSION_NUMBER, s);
  }
  const covers = new Map();
  for await (const c of table(path, 'COVERPAGE')) {
    if (subs.has(c.ACCESSION_NUMBER)) covers.set(c.ACCESSION_NUMBER, c);
  }
  console.log(`  ${subs.size} filings selected`);

  const byAcc = new Map();
  for await (const info of table(path, 'INFOTABLE')) {
    if (!subs.has(info.ACCESSION_NUMBER)) continue;
    const list = byAcc.get(info.ACCESSION_NUMBER) || [];
    list.push(info);
    byAcc.set(info.ACCESSION_NUMBER, list);
  }

  let n = 0;
  for (const [acc, s] of subs) {
    const filing = filingRow(s, covers.get(acc));
    const infos = byAcc.get(acc) || [];
    totals.filings += 1;
    totals.holdings += infos.length;
    touched.add(filing.period_of_report);
    if (!write) continue;
    const tick = await tickersFor(
      infos.map((i) =>
        String(i.CUSIP || '')
          .trim()
          .toUpperCase(),
      ),
    );
    const rows = infos.map((i) =>
      holdingRow(i, {
        periodOfReport: filing.period_of_report,
        filedAt: filing.filed_at,
        ticker:
          tick.get(
            String(i.CUSIP || '')
              .trim()
              .toUpperCase(),
          ) || null,
      }),
    );
    const f = await db.from('sec_filings').upsert(filing, { onConflict: 'accession_no' });
    const h = f.error
      ? f
      : await db.rpc('replace_13f_holdings', { p_accession: acc, p_rows: rows });
    if (h.error) {
      totals.failed += 1;
      console.error(`  ${acc}: ${h.error.message}`);
    }
    n += 1;
    if (n % 100 === 0) console.log(`  ${n}/${subs.size} filings written`);
  }
}

console.log('\nTotals', totals, 'quarters', [...touched].sort());
if (write) {
  for (const p of [...touched].sort()) {
    const { data, error } = await db.rpc('titans_13f_materialise', { p_period: p });
    console.log(`materialise ${p}:`, error ? error.message : `${data} positions`);
  }
} else {
  console.log('Dry run. Add --write to load and rebuild these quarters.');
}

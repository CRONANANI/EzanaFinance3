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
//   --write                           write sec_filings + sec_13f_holdings. Each filing is one
//                                     transaction and its row count is checked against the zip
//   --materialise                     with --write: rebuild titans_13f_* for a quarter, but ONLY
//                                     if every filing selected for it was written and its row
//                                     count matched. A quarter that failed the check is left alone
//
// Nov 17, 2026: the dry run now writes a per-quarter report to
// validation/13f-backfill-dry-run-<date>.md (filings, amendments, holdings rows, what is
// already indexed, estimated storage). Materialising is a separate, checked step, because
// titans_13f_materialise deletes a quarter's positions before rebuilding them from
// sec_13f_holdings: rebuilding a quarter whose raw holdings are incomplete would lose data.
//
// Writes go through the same objects the incremental ingest uses: sec_filings
// rows and the replace_13f_holdings RPC (one transaction per filing), then
// titans_13f_materialise(period). Re-running is safe.
import { createClient } from '@supabase/supabase-js';
import yauzl from 'yauzl';
import readline from 'node:readline';
import fs from 'node:fs';
import { datasetDate, filingRow, holdingRow, tsvRow } from '../src/lib/sec/form13f-datasets.js';

const arg = (k, d = null) => {
  const i = process.argv.indexOf(`--${k}`);
  return i >= 0 ? process.argv[i + 1] : d;
};
const zips = String(arg('zip', '')).split(',').filter(Boolean);
const periods = new Set(String(arg('periods', '')).split(',').filter(Boolean));
const filersMode = arg('filers', 'tracked');
const write = process.argv.includes('--write');
const materialise = process.argv.includes('--materialise');
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
/* Per report quarter: what the zips hold, and after a write, what landed. */
const byPeriod = new Map();
const stat = (period) => {
  if (!byPeriod.has(period))
    byPeriod.set(period, {
      period,
      filings: 0,
      originals: 0,
      amendments: 0,
      newHoldingsAmendments: 0,
      restatements: 0,
      filers: new Set(),
      holdings: 0,
      accessions: [],
      firstFiled: null,
      lastFiled: null,
      written: 0,
      mismatched: 0,
    });
  return byPeriod.get(period);
};

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
    const st = stat(filing.period_of_report);
    st.filings += 1;
    st.holdings += infos.length;
    st.filers.add(filing.cik);
    st.accessions.push(acc);
    if (/\/A$/i.test(filing.form_type)) {
      st.amendments += 1;
      if (filing.amendment_type === 'NEW HOLDINGS') st.newHoldingsAmendments += 1;
      else st.restatements += 1;
    } else st.originals += 1;
    if (!st.firstFiled || filing.filed_at < st.firstFiled) st.firstFiled = filing.filed_at;
    if (!st.lastFiled || filing.filed_at > st.lastFiled) st.lastFiled = filing.filed_at;
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
    } else if (Number(h.data) !== rows.length) {
      /* replace_13f_holdings returns the rows it inserted: it must equal the filing's lines. */
      st.mismatched += 1;
      console.error(`  ${acc}: wrote ${h.data} of ${rows.length} holdings rows`);
    } else st.written += 1;
    n += 1;
    if (n % 100 === 0) console.log(`  ${n}/${subs.size} filings written`);
  }
}

console.log('\nTotals', totals, 'quarters', [...touched].sort());

/* What is already indexed for the same quarters, for the report. */
async function indexedFor(st) {
  let filings = 0;
  for (let i = 0; i < st.accessions.length; i += 300) {
    const { count } = await db
      .from('sec_filings')
      .select('accession_no', { count: 'exact', head: true })
      .in('accession_no', st.accessions.slice(i, i + 300));
    filings += count || 0;
  }
  const { count: filers } = await db
    .from('titans_13f_filers')
    .select('cik', { count: 'exact', head: true })
    .eq('period', st.period);
  return { filings, filers: filers || 0 };
}

/* Bytes per row measured on the live tables on Nov 17, 2026 (table plus indexes). */
const BYTES = { holding: 223, position: 405 };
const mb = (b) => `${(b / 1048576).toFixed(0)} MB`;
const rows = [];
for (const st of [...byPeriod.values()].sort((a, b) => a.period.localeCompare(b.period))) {
  // eslint-disable-next-line no-await-in-loop
  const have = await indexedFor(st);
  rows.push({ ...st, have });
}

if (write) {
  for (const st of rows) {
    const complete = st.written === st.filings && st.mismatched === 0;
    if (!materialise) {
      console.log(
        `${st.period}: ${st.written}/${st.filings} filings written. Not materialised (pass --materialise).`,
      );
      continue;
    }
    if (!complete) {
      console.error(
        `${st.period}: NOT materialised. ${st.written}/${st.filings} filings written, ${st.mismatched} with a row-count mismatch. Fix and re-run; the existing positions for this quarter are untouched.`,
      );
      continue;
    }
    // eslint-disable-next-line no-await-in-loop
    const { data, error } = await db.rpc('titans_13f_materialise', { p_period: st.period });
    console.log(`materialise ${st.period}:`, error ? error.message : `${data} positions`);
  }
} else {
  const day = new Date().toISOString().slice(0, 10);
  const lines = [
    `# 13F backfill: dry run, ${day}`,
    '',
    `Zips: ${zips.map((z) => z.split('/').pop()).join(', ')}. Filers: ${filersMode}${tracked ? ` (${tracked.size.toLocaleString('en-US')} managers already tracked)` : ''}. Nothing was written.`,
    '',
    '| Quarter | Filings | Originals | Amendments (new holdings / restatements) | Managers | Holdings rows | Filed | Already indexed (filings / managers) | Est. storage |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...rows.map(
      (r) =>
        `| ${r.period} | ${r.filings} | ${r.originals} | ${r.amendments} (${r.newHoldingsAmendments} / ${r.restatements}) | ${r.filers.size} | ${r.holdings.toLocaleString('en-US')} | ${r.firstFiled} to ${r.lastFiled} | ${r.have.filings} / ${r.have.filers} | ${mb(r.holdings * BYTES.holding + r.holdings * 0.7 * BYTES.position)} |`,
    ),
    '',
    `Total: ${totals.filings.toLocaleString('en-US')} filings, ${totals.holdings.toLocaleString('en-US')} holdings rows; ${totals.skippedFilers.toLocaleString('en-US')} filings skipped because the manager is not tracked.`,
    '',
    'How a write behaves: each filing is upserted on its accession number and its holdings are replaced in one transaction, so re-running cannot duplicate rows. Amendments are kept as their own filings; the rebuild counts the latest full filing per manager plus later NEW HOLDINGS amendments. Reporting period and filing date come from the filing and are not changed.',
    '',
    'Storage is estimated from the live tables (raw holdings plus about 0.7 materialised positions per raw row). No paid service is called: the source is the SEC Form 13F data sets.',
  ];
  fs.mkdirSync('validation', { recursive: true });
  fs.writeFileSync(`validation/13f-backfill-dry-run-${day}.md`, `${lines.join('\n')}\n`);
  console.log(
    `Dry run. Report: validation/13f-backfill-dry-run-${day}.md. Add --write to load, and --materialise to rebuild checked quarters.`,
  );
}

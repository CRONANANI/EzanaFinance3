#!/usr/bin/env node
/**
 * One-time history load: SEC "Insider Transactions Data Sets" -> public.sec_insider_transactions.
 * Run LOCALLY (never on Vercel):
 *
 *   node scripts/backfill-insider-datasets.mjs            # last four complete quarters
 *   node scripts/backfill-insider-datasets.mjs 2025q3     # one quarter
 *
 * Source: https://www.sec.gov/data-research/sec-markets-data/insider-transactions-data-sets
 * Each quarter is a zip of tab-separated files
 * (…/files/structureddata/data/insider-transactions-data-sets/2025q3_form345.zip):
 *   SUBMISSION.tsv      ACCESSION_NUMBER, FILING_DATE, DOCUMENT_TYPE, ISSUERCIK, ISSUERNAME, ISSUERTRADINGSYMBOL
 *   REPORTINGOWNER.tsv  ACCESSION_NUMBER, RPTOWNERCIK, RPTOWNERNAME, RPTOWNER_RELATIONSHIP, RPTOWNER_TITLE
 *   NONDERIV_TRANS.tsv  ACCESSION_NUMBER, NONDERIV_TRANS_SK, SECURITY_TITLE, TRANS_DATE, TRANS_CODE,
 *                       TRANS_SHARES, TRANS_PRICEPERSHARE, TRANS_ACQUIRED_DISP_CD,
 *                       SHRS_OWND_FOLWNG_TRANS, DIRECT_INDIRECT_OWNERSHIP
 *   DERIV_TRANS.tsv     the same with DERIV_TRANS_SK
 * The script checks every column it needs against the file header and stops
 * with a clear message if the layout differs (check the readme PDF linked from
 * the page above).
 *
 * Keeps DOCUMENT_TYPE 4 and 4/A. Rows parsed from Form 4 XML always win: the
 * upsert ignores existing keys, so a form4_xml row is never overwritten.
 * Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local,
 * and sends SEC_USER_AGENT (or the app default) on the download.
 */
import { readFileSync, existsSync } from 'node:fs';
import { unzipSync, strFromU8 } from 'fflate';
import { createClient } from '@supabase/supabase-js';

function loadEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
loadEnv('.env.local');

const UA = process.env.SEC_USER_AGENT || 'Ezana Finance admin@ezana.world';
const BASE = 'https://www.sec.gov/files/structureddata/data/insider-transactions-data-sets';
const CHUNK = 1000;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

/** The last n complete calendar quarters as '2025q3' labels, newest first. */
function lastQuarters(n, now = new Date()) {
  let y = now.getUTCFullYear();
  let q = Math.floor(now.getUTCMonth() / 3); // current quarter index 0..3 -> previous complete is q
  const out = [];
  for (let i = 0; i < n; i += 1) {
    if (q === 0) {
      y -= 1;
      q = 4;
    }
    out.push(`${y}q${q}`);
    q -= 1;
  }
  return out;
}

function parseTsv(text, file, required) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines
    .shift()
    .split('\t')
    .map((h) => h.trim().toUpperCase());
  const missing = required.filter((c) => !header.includes(c));
  if (missing.length) {
    throw new Error(
      `${file}: missing columns ${missing.join(', ')} (header: ${header.join(', ')})`,
    );
  }
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  return lines.map((l) => {
    const cells = l.split('\t');
    const row = {};
    for (const c of required) row[c] = (cells[idx[c]] ?? '').trim() || null;
    return row;
  });
}

const MON = {
  JAN: '01',
  FEB: '02',
  MAR: '03',
  APR: '04',
  MAY: '05',
  JUN: '06',
  JUL: '07',
  AUG: '08',
  SEP: '09',
  OCT: '10',
  NOV: '11',
  DEC: '12',
};
/** '15-SEP-2025' or '2025-09-15' -> '2025-09-15'. */
function day(s) {
  if (!s) return null;
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})-([A-Z]{3})-(\d{4})$/i.exec(s);
  return m ? `${m[3]}-${MON[m[2].toUpperCase()]}-${m[1].padStart(2, '0')}` : null;
}
const num = (s) => {
  if (s == null || s === '') return null;
  const n = Number(String(s).replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};
const cik = (s) => (s && /\d/.test(s) ? String(parseInt(s.replace(/\D/g, ''), 10)) : null);

async function loadQuarter(label) {
  const zipUrl = `${BASE}/${label}_form345.zip`;
  const res = await fetch(zipUrl, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`download ${zipUrl}: HTTP ${res.status}`);
  const files = unzipSync(new Uint8Array(await res.arrayBuffer()));
  const get = (name) => {
    const k = Object.keys(files).find((f) => f.toUpperCase().endsWith(name));
    if (!k) throw new Error(`${label}: ${name} not in the zip (${Object.keys(files).join(', ')})`);
    return strFromU8(files[k]);
  };

  const subs = parseTsv(get('SUBMISSION.TSV'), 'SUBMISSION.tsv', [
    'ACCESSION_NUMBER',
    'FILING_DATE',
    'DOCUMENT_TYPE',
    'ISSUERCIK',
    'ISSUERNAME',
    'ISSUERTRADINGSYMBOL',
  ]);
  const owners = parseTsv(get('REPORTINGOWNER.TSV'), 'REPORTINGOWNER.tsv', [
    'ACCESSION_NUMBER',
    'RPTOWNERCIK',
    'RPTOWNERNAME',
    'RPTOWNER_RELATIONSHIP',
    'RPTOWNER_TITLE',
  ]);
  const txCols = [
    'ACCESSION_NUMBER',
    'SECURITY_TITLE',
    'TRANS_DATE',
    'TRANS_CODE',
    'TRANS_SHARES',
    'TRANS_PRICEPERSHARE',
    'TRANS_ACQUIRED_DISP_CD',
    'SHRS_OWND_FOLWNG_TRANS',
    'DIRECT_INDIRECT_OWNERSHIP',
  ];
  const nonDeriv = parseTsv(get('NONDERIV_TRANS.TSV'), 'NONDERIV_TRANS.tsv', [
    ...txCols,
    'NONDERIV_TRANS_SK',
  ]);
  const deriv = parseTsv(get('DERIV_TRANS.TSV'), 'DERIV_TRANS.tsv', [...txCols, 'DERIV_TRANS_SK']);

  const subBy = new Map();
  for (const s of subs) {
    const type = String(s.DOCUMENT_TYPE || '').toUpperCase();
    if (type === '4' || type === '4/A') subBy.set(s.ACCESSION_NUMBER, s);
  }
  const ownersBy = new Map();
  for (const o of owners) {
    if (!subBy.has(o.ACCESSION_NUMBER)) continue;
    if (!ownersBy.has(o.ACCESSION_NUMBER)) ownersBy.set(o.ACCESSION_NUMBER, []);
    ownersBy.get(o.ACCESSION_NUMBER).push(o);
  }

  const rows = [];
  const add = (list, kind, skCol) => {
    const byAcc = new Map();
    for (const t of list) {
      if (!subBy.has(t.ACCESSION_NUMBER)) continue;
      if (!byAcc.has(t.ACCESSION_NUMBER)) byAcc.set(t.ACCESSION_NUMBER, []);
      byAcc.get(t.ACCESSION_NUMBER).push(t);
    }
    for (const [acc, txs] of byAcc) {
      // line_no follows the order within the filing, as the XML parser does.
      txs.sort((a, b) => Number(a[skCol]) - Number(b[skCol]));
      const s = subBy.get(acc);
      const os = ownersBy.get(acc) || [];
      const first = os[0] || {};
      const rel = String(first.RPTOWNER_RELATIONSHIP || '').toLowerCase();
      const sym = String(s.ISSUERTRADINGSYMBOL || '')
        .trim()
        .toUpperCase();
      txs.forEach((t, i) => {
        const shares = num(t.TRANS_SHARES);
        const price = num(t.TRANS_PRICEPERSHARE);
        const ad = t.TRANS_ACQUIRED_DISP_CD;
        const di = t.DIRECT_INDIRECT_OWNERSHIP;
        rows.push({
          accession_no: acc,
          table_kind: kind,
          line_no: i,
          form_type: String(s.DOCUMENT_TYPE).toUpperCase(),
          filed_at: day(s.FILING_DATE),
          issuer_cik: cik(s.ISSUERCIK),
          issuer_name: s.ISSUERNAME,
          issuer_ticker: sym && sym !== 'NONE' ? sym : null,
          reporter_cik: cik(first.RPTOWNERCIK),
          reporter_name:
            os
              .map((o) => o.RPTOWNERNAME)
              .filter(Boolean)
              .join(' and ') || null,
          reporter_title: first.RPTOWNER_TITLE || null,
          is_director: rel.includes('director'),
          is_officer: rel.includes('officer'),
          is_ten_pct_owner: rel.includes('tenpercentowner') || rel.includes('10%'),
          is_other: rel.includes('other'),
          security_title: t.SECURITY_TITLE,
          transaction_date: day(t.TRANS_DATE),
          transaction_code: t.TRANS_CODE,
          acquired_disposed: ad === 'A' || ad === 'D' ? ad : null,
          shares,
          price,
          value_usd:
            shares != null && price != null ? Math.round(shares * price * 100) / 100 : null,
          shares_owned_after: num(t.SHRS_OWND_FOLWNG_TRANS),
          direct_indirect: di === 'D' || di === 'I' ? di : null,
          source: 'sec_dataset',
        });
      });
    }
  };
  add(nonDeriv, 'non_derivative', 'NONDERIV_TRANS_SK');
  add(deriv, 'derivative', 'DERIV_TRANS_SK');

  let written = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error } = await db.from('sec_insider_transactions').upsert(rows.slice(i, i + CHUNK), {
      onConflict: 'accession_no,table_kind,line_no',
      ignoreDuplicates: true, // never overwrite a form4_xml row
    });
    if (error) throw new Error(`${label} upsert @${i}: ${error.message}`);
    written += Math.min(CHUNK, rows.length - i);
    process.stdout.write(`\r${label}: ${written}/${rows.length}`);
  }
  process.stdout.write('\n');
  return { filings: subBy.size, rows: rows.length };
}

const quarters = process.argv.slice(2).length ? process.argv.slice(2) : lastQuarters(4);
const summary = {};
for (const q of quarters) {
  try {
    summary[q] = await loadQuarter(q);
  } catch (e) {
    summary[q] = { error: e?.message || String(e) };
  }
  console.log(q, JSON.stringify(summary[q]));
}
console.log('done', JSON.stringify(summary));

/**
 * SEC "Form 13F data sets" (Nov 2026, deep research step 3).
 *
 * The SEC publishes every 13F filing of a quarter as one zip of tab-separated
 * files (SUBMISSION, COVERPAGE, INFOTABLE, ...). Loading them fills a quarter
 * completely in one pass, where the incremental ingest reads filings one by
 * one. These pure helpers turn the dataset rows into the shapes Ezana's
 * tables use (sec_filings, and the replace_13f_holdings payload), so the
 * existing titans_13f_materialise(period) builds the quarter as usual.
 *
 * Format (form_13f_readme.pdf): tab-delimited UTF-8; dates DD-MON-YYYY;
 * VALUE in thousands before 2023-01-03 and in dollars after (normalised by
 * the same normalize13FValue the ingest uses).
 */
import { normalize13FValue } from '../sec-13f-parse.js';

const MON = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
};

/** "30-JUN-2025" -> "2025-06-30"; ISO input passes through; else null. */
export function datasetDate(v) {
  const s = String(v || '').trim();
  const m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (m) {
    const mm = MON[m[2].toUpperCase()];
    return mm ? `${m[3]}-${String(mm).padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
  }
  return /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
}

const pad10 = (cik) =>
  String(cik || '')
    .replace(/\D/g, '')
    .padStart(10, '0');

/** The sec_filings row for one dataset submission (with its cover page). */
export function filingRow(sub, cover = {}) {
  const cik = pad10(sub.CIK);
  const acc = String(sub.ACCESSION_NUMBER);
  const cikInt = String(parseInt(cik, 10));
  const base = `https://www.sec.gov/Archives/edgar/data/${cikInt}/${acc.replace(/-/g, '')}`;
  return {
    accession_no: acc,
    form_type: String(sub.SUBMISSIONTYPE || '13F-HR').trim(),
    form_family: 'institutional',
    cik,
    filer_name: cover.FILINGMANAGER_NAME ? String(cover.FILINGMANAGER_NAME).trim() : null,
    filed_at: datasetDate(sub.FILING_DATE),
    period_of_report: datasetDate(sub.PERIODOFREPORT),
    amendment_type: cover.AMENDMENTTYPE ? String(cover.AMENDMENTTYPE).trim().toUpperCase() : null,
    index_url: `${base}/${acc}-index.htm`,
    primary_doc_url: `${base}/primary_doc.xml`,
  };
}

/** One replace_13f_holdings row from an INFOTABLE line. */
export function holdingRow(info, { periodOfReport, filedAt, ticker = null }) {
  const cusip = info.CUSIP ? String(info.CUSIP).trim().toUpperCase() : null;
  return {
    name_of_issuer: info.NAMEOFISSUER ? String(info.NAMEOFISSUER).trim() : null,
    cusip,
    ticker,
    value_usd: normalize13FValue(Number(info.VALUE), { periodOfReport, filedAt }),
    shares: Number(info.SSHPRNAMT) || 0,
    share_type: info.SSHPRNAMTTYPE ? String(info.SSHPRNAMTTYPE).trim().toUpperCase() : null,
    put_call: info.PUTCALL ? String(info.PUTCALL).trim() : null,
  };
}

/** Split one TSV line into an object with the header's keys. */
export function tsvRow(header, line) {
  const cells = line.split('\t');
  const o = {};
  for (let i = 0; i < header.length; i += 1) o[header[i]] = cells[i] ?? '';
  return o;
}

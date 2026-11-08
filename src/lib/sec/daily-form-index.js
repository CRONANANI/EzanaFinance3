/**
 * SEC EDGAR daily form index (Nov 2026): the complete list of every filing
 * accepted on one business day, one plain-text file per day.
 *
 *   https://www.sec.gov/Archives/edgar/daily-index/2026/QTR4/form.20261103.idx
 *
 * Why: the efts full-text browse that ingest-sec-filings pages through was
 * indexing about 10 Form 4s a day against the 1,500 or more the SEC accepts,
 * so sec_insider_transactions held 29 October purchases. The daily index is
 * one request per day and lists every Form 4 and 4/A.
 *
 * Layout (fixed header, then one line per filer per filing):
 *   Form Type   Company Name   CIK   Date Filed   File Name
 *   4           BAKER HUGHES CO  1701605  20261104  edgar/data/1701605/0001701605-26-000123.txt
 * A Form 4 appears once per filer on it (the issuer and each reporting
 * owner), all with the same File Name, so entries are grouped by accession.
 *
 * Pure parsing here (no network, no '@/' imports) so scripts can import it.
 */

const pad2 = (n) => String(n).padStart(2, '0');

/** The form.idx URL for one ISO date (YYYY-MM-DD). */
export function dailyIndexUrl(dateIso) {
  const [y, m, d] = String(dateIso).split('-').map(Number);
  const q = Math.floor((m - 1) / 3) + 1;
  return `https://www.sec.gov/Archives/edgar/daily-index/${y}/QTR${q}/form.${y}${pad2(m)}${pad2(d)}.idx`;
}

/** Weekdays from `from` to `to` inclusive (ISO dates). Holidays simply 404. */
export function businessDays(from, to) {
  const out = [];
  let t = Date.parse(`${from}T12:00:00Z`);
  const end = Date.parse(`${to}T12:00:00Z`);
  while (t <= end) {
    const d = new Date(t);
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) out.push(d.toISOString().slice(0, 10));
    t += 86_400_000;
  }
  return out;
}

const LINE_RE =
  /^(\S+)\s+(.+?)\s+(\d{1,10})\s+(\d{8}|\d{4}-\d{2}-\d{2})\s+(edgar\/data\/(\d+)\/(\d{10}-\d{2}-\d{6})\.txt)\s*$/;

/**
 * Parse a form.idx body into one entry per accession for the wanted forms.
 * Returns [{ accessionNo, formType, filedAt, pathCik, ciks: [], names: {} }].
 */
export function parseFormIndex(text, { forms = ['4', '4/A'] } = {}) {
  const want = new Set(forms.map((f) => f.toUpperCase()));
  const lines = String(text || '').split(/\r?\n/);
  const start = lines.findIndex((l) => /^-{20,}\s*$/.test(l));
  const byAcc = new Map();
  for (const line of lines.slice(start + 1)) {
    const m = LINE_RE.exec(line);
    if (!m) continue;
    const formType = m[1].toUpperCase();
    if (!want.has(formType)) continue;
    const [, , name, cik, date, , pathCik, accessionNo] = m;
    const filedAt = date.includes('-')
      ? date
      : `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
    const e = byAcc.get(accessionNo) || {
      accessionNo,
      formType,
      filedAt,
      pathCik,
      ciks: [],
      names: {},
    };
    const c = String(parseInt(cik, 10));
    if (!e.ciks.includes(c)) e.ciks.push(c);
    e.names[c] = name.trim();
    byAcc.set(accessionNo, e);
  }
  return [...byAcc.values()];
}

/**
 * Entries -> sec_filings rows. The issuer is the CIK that maps to a listed
 * ticker (best effort, as in ingest-sec-filings); else the path CIK.
 * primary_doc_url is the filing index page (for display); the parser reads
 * the full submission .txt (one request, the XML is inline).
 */
export function toInsiderFilingRows(entries, cikTicker = new Map()) {
  return entries.map((e) => {
    let ticker = null;
    let issuer = null;
    for (const c of e.ciks) {
      const t = cikTicker.get(c);
      if (t) {
        ticker = t;
        issuer = c;
        break;
      }
    }
    const cik = issuer || String(parseInt(e.pathCik, 10));
    const accNoDash = e.accessionNo.replace(/-/g, '');
    const base = `https://www.sec.gov/Archives/edgar/data/${cik}/${accNoDash}`;
    return {
      accession_no: e.accessionNo,
      form_type: e.formType,
      form_family: 'insider',
      cik: cik.padStart(10, '0'),
      filer_name: (e.names[cik] || Object.values(e.names)[0] || 'Unknown filer').slice(0, 200),
      ticker,
      filed_at: e.filedAt,
      period_of_report: null,
      primary_doc_url: `${base}/${e.accessionNo}-index.htm`,
      index_url: `${base}/${e.accessionNo}-index.htm`,
    };
  });
}

/** The full-submission text URL for a filing (holds the Form 4 XML inline). */
export function submissionTxtUrl({ cik, accessionNo }) {
  const cikInt = String(parseInt(String(cik).replace(/\D/g, ''), 10));
  return `https://www.sec.gov/Archives/edgar/data/${cikInt}/${String(accessionNo).replace(/-/g, '')}/${accessionNo}.txt`;
}

/** The ownershipDocument XML inside a full submission, or null. */
export function extractForm4Xml(submissionText) {
  const t = String(submissionText || '');
  const m = /<XML>([\s\S]*?)<\/XML>/i.exec(t);
  if (m && /<ownershipDocument/i.test(m[1])) return m[1].trim();
  const d = /<ownershipDocument[\s\S]*?<\/ownershipDocument>/i.exec(t);
  return d ? d[0] : null;
}

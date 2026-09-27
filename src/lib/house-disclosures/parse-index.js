/**
 * Parse the U.S. House Clerk's yearly financial-disclosure INDEX bulk file.
 *
 * The Clerk ships <YEAR>FD.txt (tab-delimited) and <YEAR>FD.xml — the SAME data
 * in two formats. We parse the TXT (one header row, `\r\n` endings). It is a
 * filing INDEX only — NO trades live here. Trade-level detail (ticker/amount)
 * is inside each filing's PDF and is parsed in Phase 2.
 *
 * THE FILE SHIPS IN TWO LAYOUTS, and which one you get depends on the year:
 *
 *   2015-2026, 9 columns:
 *     Prefix  Last  First  Suffix  FilingType  StateDst  Year  FilingDate  DocID
 *   2008-2014, 11 columns:
 *     Prefix  Last  First  Suffix  FilingType  StateDst  Year  "Filing Year"
 *     FilingDate  DocID  DisclosureType
 *
 * The two extra columns are inserted in the MIDDLE, so a positional read of the
 * nine-column shape does not merely miss them — it shifts. This parser used to
 * destructure by position, and on the eleven-column years it silently took
 * "Filing Year" as the filing date (so toISO saw '2013' and returned null) and
 * FilingDate as the DocID (so the primary key became '1/2/2013'). That is seven
 * years of data, 2008 through 2014, landing wrong without an error. Columns are
 * therefore resolved BY HEADER NAME, and a header without the columns we depend
 * on throws rather than guessing.
 *
 * Pure and deterministic (no I/O) — the ingest cron fetches the file and calls
 * this. Unit-tested in scripts/check-house-disclosures.mjs.
 */

/**
 * Header name → the row field it feeds. Matching is exact (after trim and
 * lowercase), never substring: the eleven-column header contains both 'year'
 * and 'filing year', and a substring match would bind whichever came first to
 * both.
 *
 * On the naming: the column literally labelled "Filing Year" maps to
 * covered_year, not to filing_year. In the eleven-column years "Year" is the
 * year of the bundle (and the one the PDF path needs), which is what
 * filing_year has always meant here; "Filing Year" is the separate reporting
 * year the filing covers. Confusing in the source, not worth renaming our own
 * column over.
 */
const HEADER_ALIASES = {
  prefix: ['prefix'],
  last: ['last'],
  first: ['first'],
  suffix: ['suffix'],
  filingType: ['filingtype'],
  stateDst: ['statedst'],
  year: ['year'],
  coveredYear: ['filing year', 'filingyear'],
  filingDate: ['filingdate'],
  docId: ['docid'],
  disclosureType: ['disclosuretype'],
};

/** Columns we cannot sensibly guess at. Absent → throw, never parse blind. */
const REQUIRED_COLUMNS = ['last', 'first', 'filingType', 'stateDst', 'year', 'filingDate', 'docId'];

/** Map the header row to column positions. Throws when a required column is absent. */
export function headerIndex(headerLine) {
  const cols = String(headerLine || '')
    .split('\t')
    .map((h) => h.trim().toLowerCase());
  const idx = {};
  for (const [key, names] of Object.entries(HEADER_ALIASES)) {
    const i = cols.findIndex((c) => names.includes(c));
    if (i >= 0) idx[key] = i;
  }
  const missing = REQUIRED_COLUMNS.filter((k) => idx[k] == null);
  if (missing.length) {
    throw new Error(`House index header missing columns: ${missing.join(', ')}`);
  }
  return idx;
}

/* The 2015+ vocabulary. The 2008-2014 files use a WIDER and partly different
   set — 2013 alone carries O (5,231), plus E, G, N, F, R, B on top of the
   A/X/T/D/W below. No label is added for those here: the Clerk's documentation
   for the legacy codes could not be reached from the build sandbox, and an
   invented label is worse than none. Unlabelled codes fall through to the raw
   letter (see filing_type_label), which is the intended rendering.

   Note also that the letters shared between the two vocabularies are assumed,
   not confirmed, to mean the same thing in both. */
export const FILING_TYPE_LABELS = {
  P: 'Periodic Transaction Report',
  A: 'Annual Report',
  C: 'Candidate Report',
  X: 'Extension',
  W: 'Withdrawal',
  D: 'New Filer Report',
  T: 'Termination Report',
  H: 'Other',
};

/** A finite integer, or null. Used for the year columns, which are free text. */
function toInt(v) {
  const n = Number(String(v || '').trim());
  return Number.isFinite(n) ? n : null;
}

/* The Clerk's files contain digit typos in dates — 2013 alone has three
   '6/14/3013' and three '5/15/2031'. They are shape-valid, so they used to be
   stored as real dates, and one of them is enough to anchor every "latest
   filing" query to the year 3013. Anything outside this window is rejected;
   the caller keeps the raw string so the anomaly stays auditable rather than
   disappearing. */
const MIN_YEAR = 1990;

/** 'M/D/YYYY' → 'YYYY-MM-DD'. Null when unparseable OR implausible. */
export function toISO(mdy) {
  const m = String(mdy || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, mo, d, y] = m;
  /* Plus one, not the current year exactly: filings legitimately carry a date
     a little ahead of the bundle around a year boundary. */
  const year = Number(y);
  if (year < MIN_YEAR || year > new Date().getFullYear() + 1) return null;
  return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

/**
 * DocID heuristic: an ELECTRONIC filing is a 9-digit id beginning 100/300 — its
 * PDF has real text and can be parsed directly. Short ids (e.g. '8068') are older
 * scanned paper filings that need OCR (deferred).
 */
export function isElectronicDocId(docId) {
  return /^\d{9}$/.test(docId) && /^(100|300)/.test(docId);
}

/** PTR source PDF path. Only valid for PTRs (FilingType 'P'); annual/other filings
 *  live under a different Clerk path (/financial-pdfs/). */
export function ptrPdfUrl(year, docId) {
  return `https://disclosures-clerk.house.gov/public_disc/ptr-pdfs/${year}/${docId}.pdf`;
}

/** Parse a <YEAR>FD.txt string into filing rows (shape matches
 *  house_disclosure_filings). Malformed / short lines are skipped, not guessed.
 *  Throws when the header lacks a column we depend on — see headerIndex. */
export function parseHouseIndexTxt(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .filter((l) => l.trim());
  if (!lines.length) return [];

  const idx = headerIndex(lines[0]);
  /* A row is usable when it actually reaches every column we resolved, which
     depends on the layout rather than on a hardcoded 9. */
  const lastIndex = Math.max(...Object.values(idx));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split('\t').map((x) => x.trim());
    if (c.length <= lastIndex) continue; // malformed
    const at = (key) => (idx[key] == null ? '' : c[idx[key]] || '');
    const prefix = at('prefix');
    const last = at('last');
    const first = at('first');
    const suffix = at('suffix');
    const filingType = at('filingType');
    const stateDst = at('stateDst');
    const year = at('year');
    const filingDate = at('filingDate');
    const docId = at('docId');
    if (!docId || !last) continue;

    const st = (stateDst.match(/^[A-Z]{2}/) || [])[0] || null;
    const dist = st ? stateDst.slice(2) || null : null;
    const yr = Number(year);

    /* PTR detection differs by layout, and reading only the modern signal made
       seven years of trade filings invisible. 2015+ marks a PTR with
       FilingType 'P'. The 2008-2014 files carry a separate DisclosureType
       column where 'PTR' is the marker and FilingType means something else
       entirely — in 2013, 2,146 of the 2,318 PTRs are FilingType 'O'. Read
       whichever signal the file actually provides, and never infer one from
       the other: a legacy 'P' is not a PTR, and a modern row has no
       DisclosureType to consult. */
    const disclosureType = idx.disclosureType == null ? '' : (c[idx.disclosureType] || '').trim();
    const isPtr = disclosureType ? disclosureType.toUpperCase() === 'PTR' : filingType === 'P';

    const filingDateIso = toISO(filingDate);

    rows.push({
      doc_id: docId,
      prefix: prefix || null,
      last_name: last,
      first_name: first,
      suffix: suffix || null,
      filing_type: filingType,
      filing_type_label: FILING_TYPE_LABELS[filingType] || filingType,
      state_dst: stateDst || null,
      state: st,
      district: dist,
      filing_year: Number.isFinite(yr) ? yr : null,
      /* Present only in the eleven-column (2008-2014) layout; null otherwise,
         which is the honest answer rather than copying filing_year into it. */
      covered_year: idx.coveredYear == null ? null : toInt(c[idx.coveredYear]),
      disclosure_type: disclosureType || null,
      filing_date: filingDateIso,
      /* Only when a date was present and REJECTED. A withdrawal row
         legitimately carries no date at all, and that is not an anomaly to
         record — so this stays null there, which is what lets the ingest count
         genuine bad dates without them. */
      filing_date_raw: filingDateIso === null && filingDate ? filingDate : null,
      /* PTR PDFs live under /ptr-pdfs/<YEAR>/<DocID>.pdf. Only meaningful for
         PTRs; annual/other filings use a different Clerk path, so those stay
         null.

         UNVERIFIED for the 2008-2014 PTRs this parser now detects. They were
         pdf_url null before (their FilingType is 'O', so the old check never
         fired), and most carry short scanned DocIDs rather than the 9-digit
         electronic ones the ptr-pdfs path was built for, so they may well live
         under /financial-pdfs/ instead. disclosures-clerk.house.gov is not
         reachable from the build sandbox, so the three-URL spot-check the
         change called for could not be run. This keeps the single path for
         now; if those 404, the fix is one branch here on `year` — or null for
         that era — not a change to the detection above. */
      pdf_url: isPtr ? ptrPdfUrl(year, docId) : null,
      is_ptr: isPtr,
      is_electronic: isElectronicDocId(docId),
    });
  }
  return rows;
}

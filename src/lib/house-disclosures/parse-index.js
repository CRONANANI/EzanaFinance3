/**
 * Parse the U.S. House Clerk's yearly financial-disclosure INDEX bulk file.
 *
 * The Clerk ships <YEAR>FD.txt (tab-delimited) and <YEAR>FD.xml — the SAME data
 * in two formats. We parse the TXT (simpler: one header row, `\r\n` endings,
 * 9 columns). It is a filing INDEX only — NO trades live here. Trade-level detail
 * (ticker/amount) is inside each filing's PDF and is parsed in Phase 2.
 *
 * Columns: Prefix  Last  First  Suffix  FilingType  StateDst  Year  FilingDate  DocID
 *
 * Pure and deterministic (no I/O) — the ingest cron fetches the file and calls
 * this. Unit-tested in scripts/check-house-index.mjs.
 */

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

/** 'M/D/YYYY' → 'YYYY-MM-DD', or null when unparseable. */
export function toISO(mdy) {
  const m = String(mdy || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [, mo, d, y] = m;
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
 *  house_disclosure_filings). Malformed / short lines are skipped, not guessed. */
export function parseHouseIndexTxt(text) {
  const lines = String(text || '').split(/\r?\n/).filter((l) => l.trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    // skip header row
    const c = lines[i].split('\t');
    if (c.length < 9) continue; // malformed
    const [prefix, last, first, suffix, filingType, stateDst, year, filingDate, docId] = c.map((x) =>
      x.trim(),
    );
    if (!docId || !last) continue;

    const st = (stateDst.match(/^[A-Z]{2}/) || [])[0] || null;
    const dist = st ? stateDst.slice(2) || null : null;
    const yr = Number(year);
    const isPtr = filingType === 'P';

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
      filing_date: toISO(filingDate),
      // PTR PDFs live under /ptr-pdfs/<YEAR>/<DocID>.pdf. Only meaningful for PTRs;
      // annual/other filings use a different Clerk path, so leave those null.
      pdf_url: isPtr ? ptrPdfUrl(year, docId) : null,
      is_ptr: isPtr,
      is_electronic: isElectronicDocId(docId),
    });
  }
  return rows;
}

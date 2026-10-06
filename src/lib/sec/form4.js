/**
 * Form 4 (statement of changes in beneficial ownership) XML parser. Pure: no
 * network, unit tested by scripts/check-titans-2.mjs against real filings in
 * scripts/fixtures/form4.
 *
 * Rules:
 *   - Numbers come from <value> nodes. A value given only as a footnote
 *     reference stays null, and a missing price stays null (never 0). A price
 *     the filer reported as 0 (option exercises often do) stays 0.
 *   - value_usd = shares * price only when both are reported.
 *   - Several reporting owners: names join with " and "; the first owner's CIK,
 *     title and role flags go on every row.
 *   - issuer ticker from issuerTradingSymbol, upper-cased; null when blank or
 *     "NONE".
 */
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false, // keep strings; numbers are converted explicitly
  trimValues: true,
  isArray: (name) =>
    [
      'reportingOwner',
      'nonDerivativeTransaction',
      'derivativeTransaction',
      'nonDerivativeHolding',
      'derivativeHolding',
    ].includes(name),
});

const arr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const str = (v) => {
  if (v == null) return null;
  const s = String(typeof v === 'object' ? (v.value ?? '') : v).trim();
  return s || null;
};
/** <x><value>…</value></x> -> the value, or null when only a footnote is given. */
const val = (node) => (node && typeof node === 'object' ? str(node.value) : str(node));
const num = (node) => {
  const s = val(node);
  if (s == null) return null;
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};
const flag = (v) => {
  const s = str(v);
  return s === '1' || s === 'true' || s === 'Y';
};
const isoDate = (s) => {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(String(s || ''));
  return m ? m[1] : null;
};
const cleanCik = (s) => {
  const d = String(s || '').replace(/\D/g, '');
  return d ? String(parseInt(d, 10)) : null;
};

function txRow(t, tableKind, lineNo) {
  const coding = t.transactionCoding || {};
  const amounts = t.transactionAmounts || {};
  const post = t.postTransactionAmounts || {};
  const nature = t.ownershipNature || {};
  const ad = val(amounts.transactionAcquiredDisposedCode);
  const di = val(nature.directOrIndirectOwnership);
  return {
    tableKind,
    lineNo,
    securityTitle: val(t.securityTitle),
    transactionDate: isoDate(val(t.transactionDate)),
    transactionCode: str(coding.transactionCode),
    acquiredDisposed: ad === 'A' || ad === 'D' ? ad : null,
    shares: num(amounts.transactionShares),
    price: num(amounts.transactionPricePerShare),
    sharesOwnedAfter: num(post.sharesOwnedFollowingTransaction),
    directIndirect: di === 'D' || di === 'I' ? di : null,
  };
}

/**
 * @returns {{ formType, issuer: { cik, name, ticker }, reporters: Array<object>, rows: Array<object> } | null}
 */
export function parseForm4Xml(xml) {
  if (!xml || !/<ownershipDocument\b/.test(xml)) return null;
  const doc = parser.parse(xml)?.ownershipDocument;
  if (!doc) return null;

  const issuer = doc.issuer || {};
  const sym = str(issuer.issuerTradingSymbol);
  const ticker = sym && sym.toUpperCase() !== 'NONE' ? sym.toUpperCase() : null;

  const reporters = arr(doc.reportingOwner).map((o) => {
    const id = o.reportingOwnerId || {};
    const rel = o.reportingOwnerRelationship || {};
    return {
      cik: cleanCik(id.rptOwnerCik),
      name: str(id.rptOwnerName),
      title: str(rel.officerTitle) || str(rel.otherText),
      isDirector: flag(rel.isDirector),
      isOfficer: flag(rel.isOfficer),
      isTenPctOwner: flag(rel.isTenPercentOwner),
      isOther: flag(rel.isOther),
    };
  });

  const rows = [];
  arr(doc.nonDerivativeTable?.nonDerivativeTransaction).forEach((t, i) =>
    rows.push(txRow(t, 'non_derivative', i)),
  );
  arr(doc.derivativeTable?.derivativeTransaction).forEach((t, i) =>
    rows.push(txRow(t, 'derivative', i)),
  );

  return {
    formType: str(doc.documentType),
    periodOfReport: isoDate(str(doc.periodOfReport)),
    issuer: { cik: cleanCik(issuer.issuerCik), name: str(issuer.issuerName), ticker },
    reporters,
    rows,
  };
}

/** Parsed Form 4 -> sec_insider_transactions rows. */
export function form4ToRows(parsed, { accessionNo, filedAt = null, source = 'form4_xml' }) {
  if (!parsed) return [];
  const first = parsed.reporters[0] || {};
  const names = parsed.reporters.map((r) => r.name).filter(Boolean);
  return parsed.rows.map((r) => ({
    accession_no: accessionNo,
    table_kind: r.tableKind,
    line_no: r.lineNo,
    form_type: parsed.formType,
    filed_at: filedAt ? String(filedAt).slice(0, 10) : null,
    issuer_cik: parsed.issuer.cik,
    issuer_name: parsed.issuer.name,
    issuer_ticker: parsed.issuer.ticker,
    reporter_cik: first.cik || null,
    reporter_name: names.length ? names.join(' and ') : null,
    reporter_title: first.title || null,
    is_director: !!first.isDirector,
    is_officer: !!first.isOfficer,
    is_ten_pct_owner: !!first.isTenPctOwner,
    is_other: !!first.isOther,
    security_title: r.securityTitle,
    transaction_date: r.transactionDate,
    transaction_code: r.transactionCode,
    acquired_disposed: r.acquiredDisposed,
    shares: r.shares,
    price: r.price,
    value_usd:
      r.shares != null && r.price != null ? Math.round(r.shares * r.price * 100) / 100 : null,
    shares_owned_after: r.sharesOwnedAfter,
    direct_indirect: r.directIndirect,
    source,
  }));
}

/* EDGAR links the rendered view (…/xslF345X05/file.xml); the raw XML is the
   same filename one level up. */
export const rawForm4Url = (url) => String(url || '').replace(/\/xslF345X\d+\//i, '/');

export { TRANSACTION_CODES } from './form4-codes.js';

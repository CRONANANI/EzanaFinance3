/**
 * Form N-PORT: find a fund series' latest NPORT-P filing and parse its
 * schedule of investments. The parser is pure and unit tested by
 * scripts/check-titans-2.mjs against a real filing in scripts/fixtures/nport.
 *
 * Finding filings, in order (the first that answers wins, and the cron
 * reports which one it used):
 *   1. EDGAR's company browse Atom feed queried with the SERIES id as the CIK
 *      (browse-edgar?action=getcompany&CIK=S000…&type=NPORT-P&output=atom).
 *   2. The trust's submissions JSON: recent NPORT-P filings by the filer CIK,
 *      opened newest first until one carries this series id (bounded).
 *
 * Only public NPORT-P filings are disseminated by EDGAR; a filing whose
 * schedule of investments is absent is reported as such, never filled in.
 */
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  parseTagValue: false,
  trimValues: true,
  removeNSPrefix: true,
  isArray: (name) => name === 'invstOrSec' || name === 'entry',
});

const arr = (v) => (Array.isArray(v) ? v : v == null ? [] : [v]);
const text = (v) => {
  if (v == null) return null;
  if (typeof v === 'object') return text(v['#text'] ?? v['@value'] ?? null);
  const s = String(v).trim();
  return s && s.toUpperCase() !== 'N/A' ? s : null;
};
const num = (v) => {
  const s = text(v);
  if (s == null) return null;
  const n = Number(s.replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
};
const isoDay = (s) => /^(\d{4}-\d{2}-\d{2})/.exec(String(s || ''))?.[1] || null;

/**
 * NPORT-P primary XML -> { seriesId, classIds, seriesName, regName, reportDate,
 * netAssets, holdings[], hasHoldings }. reportDate is the period date
 * (repPdDate), the quarter-end the holdings describe.
 */
export function parseNportXml(xml) {
  if (!xml || !/<(\w+:)?edgarSubmission\b/.test(xml)) return null;
  const root = parser.parse(xml)?.edgarSubmission;
  if (!root) return null;
  const header = root.headerData || {};
  const form = root.formData || {};
  const gen = form.genInfo || {};
  const fund = form.fundInfo || {};
  const sci = header.filerInfo?.seriesClassInfo || {};
  const holdingsNode = form.invstOrSecs;

  const holdings = arr(holdingsNode?.invstOrSec).map((h, i) => {
    const ids = h.identifiers || {};
    const cusip = text(h.cusip);
    return {
      lineNo: i,
      name: text(h.name),
      title: text(h.title),
      cusip: cusip && /^[0-9A-Z]{9}$/i.test(cusip) ? cusip.toUpperCase() : null,
      isin: text(ids.isin?.['@value'] ?? ids.isin),
      lei: text(h.lei),
      balance: num(h.balance),
      units: text(h.units),
      valueUsd: num(h.valUSD),
      pctValue: num(h.pctVal),
      assetCategory: text(h.assetCat) || text(h.assetConditional?.['@desc']),
      issuerCategory: text(h.issuerCat) || text(h.issuerConditional?.['@desc']),
      country: text(h.invCountry),
    };
  });

  return {
    submissionType: text(header.submissionType),
    seriesId: text(gen.seriesId) || text(sci.seriesId),
    classIds: arr(sci.classId).map(text).filter(Boolean),
    seriesName: text(gen.seriesName),
    regName: text(gen.regName),
    reportDate: isoDay(text(gen.repPdDate)),
    fiscalYearEnd: isoDay(text(gen.repPdEnd)),
    netAssets: num(fund.netAssets),
    hasHoldings: holdingsNode != null,
    holdings,
  };
}

/** The series id from an NPORT-P XML header without parsing the holdings. */
export function nportSeriesIdFromHead(xml) {
  const head = String(xml || '').slice(0, 4000);
  return /<(?:\w+:)?seriesId>\s*(S\d{9})\s*</.exec(head)?.[1] || null;
}

/** browse-edgar Atom feed -> [{ accessionNo, filedAt, cik }] newest first. */
export function parseBrowseAtom(xml) {
  const feed = parser.parse(String(xml || ''))?.feed;
  return arr(feed?.entry)
    .map((e) => {
      const c = e.content || {};
      const href = text(c['filing-href']) || '';
      return {
        accessionNo: text(c['accession-number'] ?? c['accession-nunber']),
        filedAt: isoDay(text(c['filing-date'])),
        form: text(c['filing-type']) || text(e.category?.['@term']),
        cik: /\/data\/(\d+)\//.exec(href)?.[1] || null,
      };
    })
    .filter((e) => e.accessionNo && (!e.form || /^NPORT-P$/i.test(e.form)));
}

/** company_tickers_mf.json -> Map ticker -> { cik, seriesId, classId }. */
export function buildMfIndex(json) {
  const fields = json?.fields || [];
  const at = (name) => fields.indexOf(name);
  const iCik = at('cik');
  const iSeries = at('seriesId');
  const iClass = at('classId');
  const iSym = at('symbol');
  const out = new Map();
  for (const row of json?.data || []) {
    const sym = String(row[iSym] || '').toUpperCase();
    if (!sym || out.has(sym)) continue;
    out.set(sym, {
      cik: String(row[iCik]),
      seriesId: row[iSeries] || null,
      classId: row[iClass] || null,
    });
  }
  return out;
}

/**
 * SEC EDGAR public read client (server-only).
 *
 * Uses the FREE, no-auth public services — NOT the EDGAR Next filer-submission
 * APIs (which are for filing TO the SEC):
 *   - efts.sec.gov/LATEST/search-index  — metadata search across all filers
 *   - data.sec.gov/submissions/CIK*.json — one entity's full filing history
 *   - www.sec.gov/files/company_tickers.json — ticker/name → CIK map
 *
 * TWO SEC rules are enforced here and MUST NOT be removed — dropping either gets
 * the deploy's IP blocked for every user:
 *   1. A descriptive User-Agent on every request (SEC rejects requests without
 *      one). This is why these calls are server-side only, never from the browser.
 *   2. <= 10 requests/second. We throttle to ~6/s to leave headroom.
 */
const UA = process.env.SEC_USER_AGENT || 'Ezana Finance admin@ezana.world';
const EFTS = 'https://efts.sec.gov/LATEST/search-index';

// Simple sliding-window throttle: SEC caps at 10 req/s. Stay at ~6/s.
let lastBatch = [];
let requestCount = 0;

async function throttle() {
  const now = Date.now();
  lastBatch = lastBatch.filter((t) => now - t < 1000);
  if (lastBatch.length >= 6) {
    await new Promise((r) => setTimeout(r, 1000 - (now - lastBatch[0])));
  }
  lastBatch.push(Date.now());
}

/** Total SEC requests made this process — surfaced in the cron for the QA log. */
export function secRequestCount() {
  return requestCount;
}

async function secFetch(url) {
  await throttle();
  requestCount += 1;
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`SEC ${res.status} for ${url}`);
  return res.json();
}

/** Fetch a raw text document (e.g. a 13F INFORMATION TABLE XML exhibit). */
export async function secFetchText(url) {
  await throttle();
  requestCount += 1;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`SEC ${res.status} for ${url}`);
  return res.text();
}

/**
 * Newest filings of one or more form types across all filers.
 * @param {{forms:string, from?:number, startdt:string, enddt:string}} opts
 *   forms: '13F-HR' | 'SC 13D,SC 13G' | '4'
 */
export async function searchFilings({ forms, from = 0, startdt, enddt }) {
  const params = new URLSearchParams({
    q: '', // metadata browse (form + date), not a full-text query
    forms,
    from: String(from),
    dateRange: 'custom',
    startdt,
    enddt,
  });
  return secFetch(`${EFTS}?${params.toString()}`);
}

/** Full filing history for one entity (10-digit zero-padded CIK). */
export async function getSubmissions(cik) {
  const padded = String(cik).replace(/\D/g, '').padStart(10, '0');
  return secFetch(`https://data.sec.gov/submissions/CIK${padded}.json`);
}

/** ticker/name → CIK map. Changes rarely; cache aggressively at the caller. */
export async function getTickerMap() {
  return secFetch('https://www.sec.gov/files/company_tickers.json');
}

/**
 * Build a CIK(int, unpadded string) → ticker lookup from company_tickers.json,
 * so a filing's CIK can be resolved to a public ticker where one exists.
 */
export function buildCikTickerIndex(tickerMap) {
  const idx = new Map();
  for (const k of Object.keys(tickerMap || {})) {
    const row = tickerMap[k];
    if (row?.cik_str != null && row?.ticker) idx.set(String(row.cik_str), row.ticker);
  }
  return idx;
}

/** EDGAR archive URLs from an accession + a filer CIK. */
export function edgarUrls({ accessionNo, cik, primaryDoc }) {
  const accNoDash = String(accessionNo).replace(/-/g, '');
  const cikInt = String(parseInt(String(cik).replace(/\D/g, ''), 10) || '');
  const base = `https://www.sec.gov/Archives/edgar/data/${cikInt}/${accNoDash}`;
  const indexUrl = `${base}/${accessionNo}-index.htm`;
  const primaryDocUrl = primaryDoc ? `${base}/${primaryDoc}` : indexUrl;
  return { indexUrl, primaryDocUrl, base };
}

/** The filing's directory listing (JSON) — lists every document in the filing. */
export async function getFilingIndexJson({ cik, accessionNo }) {
  const { base } = edgarUrls({ accessionNo, cik });
  return secFetch(`${base}/index.json`);
}

/**
 * Locate the 13F INFORMATION TABLE XML within a filing's directory. Prefers a
 * name that looks like an info table; falls back to an .xml that isn't the
 * primary (cover) doc. Returns null when none is present.
 */
export function find13FInfoTableUrl(indexJson, { cik, accessionNo }) {
  const { base } = edgarUrls({ accessionNo, cik });
  const items = indexJson?.directory?.item || [];
  const xmls = items.filter((it) => /\.xml$/i.test(it?.name || ''));
  const named = xmls.find((it) =>
    /info.?table|informationtable|form13f.*table/i.test(it.name),
  );
  const chosen =
    named || xmls.find((it) => !/primary_?doc/i.test(it.name)) || xmls[0] || null;
  return chosen ? `${base}/${chosen.name}` : null;
}

/** Strip the " (CIK 000...) (Filer)" suffix EDGAR appends to display names. */
export function cleanFilerName(name) {
  return String(name || '')
    .replace(/\s*\(CIK\s*\d+\)\s*/i, ' ')
    .replace(/\s*\((Filer|Subject|Reporting)\)\s*/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

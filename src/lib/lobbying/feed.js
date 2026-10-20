/**
 * Lobbying feed rows and the Quiver ticker harvest: pure helpers, no I/O.
 *
 * The feed (/api/lobbying/feed) serves our own lobbying_filings in the row
 * shape the home page, Inside the Capitol and Sonar already read
 * ({ Client, Registrant, Date, Amount, Ticker, Issue, ... }), so retiring
 * the Quiver lobbying route needs only a URL change at each caller.
 */

const TICKER_RE = /^[A-Z][A-Z0-9.-]{0,9}$/;

/** Upper-cased, trimmed ticker when it looks like one, else null. */
export function cleanTicker(v) {
  const t = String(v || '')
    .trim()
    .toUpperCase();
  return TICKER_RE.test(t) ? t : null;
}

/** Client names are stored upper-cased and trimmed in lobbying_filings. */
export function clientKey(v) {
  const s = String(v || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
  return s || null;
}

/**
 * One lobbying_filings row (+ its lobbying_client_tickers row, if any) as a
 * feed row. Date is the day LDA posted the report, the same field the Quiver
 * feed called Date. Issue lists the general issue areas.
 */
export function toFeedRow(f, tickerRow) {
  const issues = Array.isArray(f.issues) ? f.issues : [];
  const issue = issues
    .map((it) => it?.display || it?.code)
    .filter(Boolean)
    .join(', ');
  const amount = f.amount == null ? null : Number(f.amount);
  return {
    Client: f.client_name || null,
    Registrant: f.registrant_name || null,
    Date: f.dt_posted ? String(f.dt_posted).slice(0, 10) : null,
    Amount: Number.isFinite(amount) ? amount : null,
    Ticker: tickerRow?.ticker || null,
    Issue: issue || null,
    Specific_Issue: null,
    Year: f.filing_year ?? null,
    Period: f.filing_period ?? null,
    uuid: f.uuid,
    documentUrl: f.document_url || null,
  };
}

/**
 * Client-to-ticker pairs from Quiver lobbying rows. A client seen with more
 * than one ticker is ambiguous and left out rather than guessed.
 * @returns {{ pairs: {client_name:string, ticker:string}[], ambiguous: string[], skipped: number }}
 */
export function pickTickerPairs(rows) {
  const seen = new Map();
  let skipped = 0;
  for (const r of rows || []) {
    const client = clientKey(r?.Client ?? r?.client);
    const ticker = cleanTicker(r?.Ticker ?? r?.ticker);
    if (!client || !ticker) {
      skipped += 1;
      continue;
    }
    if (!seen.has(client)) seen.set(client, new Set());
    seen.get(client).add(ticker);
  }
  const pairs = [];
  const ambiguous = [];
  for (const [client, tickers] of seen) {
    if (tickers.size === 1) pairs.push({ client_name: client, ticker: [...tickers][0] });
    else ambiguous.push(client);
  }
  pairs.sort((a, b) => a.client_name.localeCompare(b.client_name));
  ambiguous.sort();
  return { pairs, ambiguous, skipped };
}

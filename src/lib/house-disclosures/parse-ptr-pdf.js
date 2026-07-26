/**
 * Electronic House PTR (Periodic Transaction Report) PDF parsing.
 *
 * Two layers:
 *   - extractPdfText(buffer): pdfjs text extraction (I/O-ish, Node only). Returns
 *     the reconstructed text, or a short/empty string for scanned filings.
 *   - parsePtrText(text): PURE transaction-table parser (unit-tested). Given the
 *     extracted text it returns { trades, ... }; no network, no PDF library.
 *
 * ONLY electronic PTRs are handled here. Scanned (short-DocID) filings yield
 * little/no text — looksScanned() flags them so the cron marks needs_ocr and
 * skips, rather than guessing. Tickers are taken ONLY from a parenthesized symbol
 * in the asset string; a non-security (bond, fund, real estate) gets ticker=null,
 * never a guessed symbol. Amounts resolve to a canonical BRACKET, never an exact
 * figure.
 *
 * NB: real electronic-PTR text layout varies; parsePtrText targets the documented
 * row grammar [owner] asset (TICKER) TX txDate notifDate $low - $high. Validate
 * against a live Clerk PDF on first run and tune the row regex if the layout
 * differs — this cannot be exercised in-sandbox (gov egress is blocked here).
 */
import { matchBracket } from './brackets.js';
import { toISO } from './parse-index.js';

const DATE_RE = /\b\d{1,2}\/\d{1,2}\/\d{4}\b/;
const DATE_RE_G = /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g;

/** A PDF with almost no extractable text is a scanned image → needs OCR. */
export function looksScanned(text, minChars = 200) {
  return String(text || '').replace(/\s+/g, ' ').trim().length < minChars;
}

/**
 * Parse reconstructed PTR text into trade rows. Only lines that carry BOTH a
 * recognizable amount bracket and a transaction date are treated as transactions
 * — headers/footers/asset-note lines are ignored, not guessed.
 */
export function parsePtrText(text) {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const trades = [];
  for (const line of lines) {
    const bracket = matchBracket(line);
    if (!bracket) continue; // no disclosed amount → not a transaction row
    const dates = line.match(DATE_RE_G) || [];
    if (!dates.length) continue;

    // Everything before the first date is the "head": [owner] asset (TICKER) TX.
    const head = line.slice(0, line.search(DATE_RE)).trim();

    // Transaction type is a trailing standalone P/S/E in the head.
    let txType = null;
    let assetHead = head;
    const tx = head.match(/\b([PSE])\b\s*$/);
    if (tx) {
      txType = tx[1];
      assetHead = head.slice(0, tx.index).trim();
    }

    // Ticker: ONLY a parenthesized 1–5 letter symbol. Null otherwise.
    const tk = assetHead.match(/\(([A-Z]{1,5})\)/);
    const ticker = tk ? tk[1] : null;

    let asset = assetHead
      .replace(/\([A-Z]{1,5}\)/, '')
      .replace(/^(SP|DC|JT)\b[\s:.-]*/, '') // strip owner code
      .replace(/[\s|]+$/, '')
      .trim();
    if (!asset) continue;

    trades.push({
      ticker,
      asset_name: asset,
      tx_type: txType,
      tx_date: toISO(dates[0]),
      notification_date: dates[1] ? toISO(dates[1]) : null,
      amount_low: bracket.low,
      amount_high: bracket.high,
      amount_midpoint: bracket.midpoint,
      amount_bracket_label: bracket.label,
      raw_row: line,
    });
  }
  return { trades };
}

/** Group pdfjs text items into visual lines (by rounded y), left-to-right. */
function reconstructLines(items) {
  const byLine = new Map();
  for (const it of items) {
    const str = it.str;
    if (str == null || str === '') continue;
    const y = Math.round((it.transform?.[5] ?? 0) / 2) * 2; // ~2pt buckets
    const x = it.transform?.[4] ?? 0;
    if (!byLine.has(y)) byLine.set(y, []);
    byLine.get(y).push({ x, str });
  }
  return [...byLine.entries()]
    .sort((a, b) => b[0] - a[0]) // top of page (higher y) first
    .map(([, parts]) =>
      parts
        .sort((a, b) => a.x - b.x)
        .map((p) => p.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .join('\n');
}

/**
 * Extract text from a PDF buffer using pdfjs (Node, no worker). Returns '' if the
 * document can't be read. The caller uses looksScanned() on the result.
 */
export async function extractPdfText(buffer) {
  // Legacy build + dynamic import keeps pdfjs out of the client/edge bundle.
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  try {
    const task = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      isEvalSupported: false,
      useSystemFonts: true,
    });
    const doc = await task.promise;
    let out = '';
    for (let p = 1; p <= doc.numPages; p++) {
      // eslint-disable-next-line no-await-in-loop
      const page = await doc.getPage(p);
      // eslint-disable-next-line no-await-in-loop
      const content = await page.getTextContent();
      out += `${reconstructLines(content.items)}\n`;
    }
    await doc.destroy();
    return out;
  } catch {
    return '';
  }
}

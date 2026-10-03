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

/** A PDF with almost no extractable text is a scanned image → needs OCR. */
export function looksScanned(text, minChars = 200) {
  return (
    String(text || '')
      .replace(/\s+/g, ' ')
      .trim().length < minChars
  );
}

/* A PTR row is one visual line in the PDF (owner, the first line of the
   asset cell, type, dates, amount), but the asset cell WRAPS: the ticker and
   the asset-type code usually land on the next line or two, e.g.
     JT Alphabet Inc. - Class C Capital Stock S 01/13/2025 01/13/2025 $1,001 - $15,000
     (GOOG) [ST]
   Reading the row line alone left about four in five stocks without a ticker.
   The lines after a row, up to the next row or the filing-status / owner /
   description block, are the rest of that asset cell. */
/* The row anchor: transaction type, then the transaction and notification
   dates. Anchoring on the type + two dates, not on the first date in the
   line, matters for bonds, whose names carry a maturity date
   ("PA ST UNIV 5.0% 09/01/2035 ... P 04/08/2025 04/08/2025"); the first date
   there is the maturity, which used to become the trade date. */
const ROW_RE =
  /(?:^|\s)([PSE])(\s*\(partial\))?\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}\/\d{1,2}\/\d{4})(?=\s|$)/i;
/* Case-insensitive because pre-2021 PTRs embed a font whose capitals extract
   as lowercase glyphs: "8x8 Inc (EgHT) [ST]", "[gS]". A candidate still needs
   an uppercase letter, so "(partial)" and other lowercase words never match. */
const TICKER_RE = /\(([A-Za-z][A-Za-z0-9]{0,5}(?:[.\-][A-Za-z0-9]{1,2})?)\)/g;
const ASSET_TYPE_RE = /\[([A-Za-z]{2})\]/;
/* The cap-gains checkbox renders as a run of single glyphs ("g f e d c b"). */
const GLYPH_LINE_RE = /^(?:[a-z]\s)+[a-z]?$/i;

/** True for a line that ends an asset cell: a labelled block (filing status,
    subholding of, description, location: all "X  Y : value"), a footnote,
    or the next section's spaced-out heading. */
function endsAssetCell(line) {
  if (/:/.test(line)) return true;
  if (/^\*/.test(line)) return true;
  if (/^(?:[A-Z]\s{2,}){2,}/.test(line)) return true; // "I    V    D" section heads
  return false;
}

/* Amount after the row anchor: a canonical STOCK Act bracket, or, for the
   small trades some members report exactly (under $1,001, e.g. "$581.86"),
   that exact figure as both bounds. Those were dropped before because no
   bracket matched. */
function amountAfter(text) {
  const b = matchBracket(text);
  if (b) return b;
  const m = text.match(/\$\s*([\d,]+(?:\.\d{1,2})?)/);
  if (!m) return null;
  const v = Number(m[1].replace(/,/g, ''));
  if (!Number.isFinite(v) || v <= 0 || v >= 1001) return null;
  return { low: v, high: v, midpoint: v, label: `$${m[1]}` };
}

function isRow(line) {
  return ROW_RE.test(line) && Boolean(amountAfter(line.slice(line.search(ROW_RE))));
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
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!isRow(line)) continue; // no disclosed amount + date → not a transaction row
    const m = line.match(ROW_RE);
    // The amount is read after the anchor, so a dollar figure inside an asset
    // name cannot be taken for it.
    const bracket = amountAfter(line.slice(m.index));
    const dates = [m[3], m[4]];

    // Transaction type: P / S / E, where a sale may read "S (partial)". The
    // old trailing-letter pattern missed the partial form, which left tx_type
    // null and the row dropped by the congress ingest.
    const txType = m[2] ? 'S (partial)' : m[1].toUpperCase();
    // Everything before the anchor is the "head": [owner] asset.
    const assetHead = line.slice(0, m.index).trim();

    // The wrapped remainder of the asset cell. Stray amount fragments that
    // wrapped onto the same visual line ("$100,000") are not asset text.
    const cont = [];
    for (let j = i + 1; j < lines.length && cont.length < 4; j += 1) {
      const next = lines[j];
      if (isRow(next) || endsAssetCell(next)) break;
      if (GLYPH_LINE_RE.test(next)) continue;
      const textPart = next.replace(/\$\s*[\d,]+/g, '').trim();
      if (textPart) cont.push(textPart);
    }
    const cell = [assetHead, ...cont].join(' ').replace(/\s+/g, ' ').trim();

    // Ticker: ONLY a parenthesized symbol, the last one in the cell (a
    // company name can itself contain parentheses). Null otherwise.
    const tks = [...cell.matchAll(TICKER_RE)].filter((t) => /[A-Z]/.test(t[1]));
    const ticker = tks.length ? tks[tks.length - 1][1].toUpperCase() : null;
    const at = cell.match(ASSET_TYPE_RE);

    // Owner code at the start of the row: SP spouse, JT joint, DC dependent
    // child; none means the member. Part of the congress_trades key, so a
    // member's and a spouse's identical same-day trades stay two rows.
    const ow = assetHead.match(/^(SP|DC|JT)\b/);
    let asset = cell
      .replace(tks.length ? tks[tks.length - 1][0] : /(?!)/, '')
      .replace(ASSET_TYPE_RE, '')
      .replace(/^(SP|DC|JT)\b[\s:.-]*/, '') // strip owner code
      .replace(/[\s|]+$/, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!asset) continue;

    trades.push({
      ticker,
      asset_name: asset,
      asset_type: at ? at[1].toUpperCase() : null,
      owner: ow ? ow[1] : null,
      tx_type: txType,
      tx_date: toISO(dates[0]),
      notification_date: dates[1] ? toISO(dates[1]) : null,
      amount_low: bracket.low,
      amount_high: bracket.high,
      amount_midpoint: bracket.midpoint,
      amount_bracket_label: bracket.label,
      raw_row: [line, ...cont].join(' | '),
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
 * Extract text from a PDF buffer.
 *
 * unpdf ships a pdfjs build made for serverless Node, with no DOM and no
 * native canvas requirement. That is the whole reason it is here: this used
 * to import `pdfjs-dist/legacy/build/pdf.mjs` directly, and from v4 onward
 * pdfjs's Node path expects the browser geometry classes (DOMMatrix, Path2D,
 * ImageData) and only polyfills them when the OPTIONAL native package
 * `@napi-rs/canvas` happens to be installed. It is present in local
 * node_modules as a transitive dependency, so everything worked here — and
 * absent on Vercel's Node runtime, where every single getDocument threw
 * "DOMMatrix is not defined" and parse-house-ptrs reported
 * filings_parsed: 0 for every run.
 *
 * Throws rather than returning '' on a read failure. The old version
 * swallowed the error, and '' is indistinguishable from a scan with no text
 * layer — so an infrastructure failure would have been recorded as
 * needs_ocr on a perfectly readable filing, permanently. Letting it throw
 * leaves the filing untouched for the next run; looksScanned() only gets to
 * decide when the document was actually read.
 */
export async function extractPdfText(buffer) {
  /* Dynamic import keeps the pdfjs build out of the client and edge bundles. */
  const { getDocumentProxy } = await import('unpdf');
  let doc;
  try {
    doc = await getDocumentProxy(new Uint8Array(buffer));
    let out = '';
    for (let p = 1; p <= doc.numPages; p++) {
      // eslint-disable-next-line no-await-in-loop
      const page = await doc.getPage(p);
      // eslint-disable-next-line no-await-in-loop
      const content = await page.getTextContent();
      out += `${reconstructLines(content.items)}\n`;
    }
    return out;
  } catch (e) {
    throw new Error(`pdf-extract: ${e?.message || e}`);
  } finally {
    /* In `finally` so a page that throws midway still releases the worker;
       optional because the proxy's shape is unpdf's, not ours. */
    try {
      await doc?.destroy?.();
    } catch {
      /* Already torn down, or never opened. */
    }
  }
}

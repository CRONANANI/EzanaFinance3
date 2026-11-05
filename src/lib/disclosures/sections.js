/**
 * Company disclosures from 10-Q and 10-K filings (Nov 2026, deep research).
 *
 * The passages an analyst reads for an investment risk assessment are in the
 * filing text, not in any structured feed: customer concentration ("one
 * direct customer accounted for 16% of revenue"), export controls and China,
 * purchase and supply obligations. This module finds those passages in a
 * filing's text and checks an extraction against them. The rule that makes
 * the result safe to show as a verified fact: the quote must appear in the
 * filing word for word, and every figure must appear in the quote.
 *
 * Pure. Unit-tested in scripts/check-sonar-step3.mjs.
 */

export const DISCLOSURE_KINDS = {
  customer_concentration: {
    label: 'Customer concentration',
    re: /\b(customer [A-Z]\b|direct customers?\b[^.]{0,120}\d{1,2}(?:\.\d)?%|indirect customers?\b[^.]{0,160}\d{1,2}(?:\.\d)?%|accounted for (?:approximately |about )?\d{1,2}(?:\.\d)?% of (?:our )?(?:total )?(?:revenue|net revenue|net sales|sales)|\d{1,2}(?:\.\d)?% of (?:our )?(?:total )?(?:revenue|net revenue|net sales)[^.]{0,80}customers?)/i,
  },
  export_risk: {
    label: 'Export controls and China',
    re: /\b(export controls?|export restrictions?|export licen[cs]es?|Entity List|Bureau of Industry and Security|licen[cs]e requirements?[^.]{0,80}(?:China|PRC))\b/i,
  },
  purchase_obligations: {
    label: 'Purchase and supply obligations',
    re: /\b(purchase obligations?|outstanding inventory purchases?|supply and capacity (?:commitments|obligations|agreements)|inventory purchase (?:commitments|obligations)|non-?cancell?able purchase)\b/i,
  },
};

const ENTITIES = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
  ndash: '–',
  mdash: String.fromCharCode(8212),
};

/* U+2014 written by code point, so the source itself carries none. */
const EM_DASH = new RegExp(`\\s*${String.fromCharCode(8212)}\\s*`, 'g');

/** A filing's HTML as text, one paragraph per line. */
export function htmlToText(html) {
  return (
    String(html || '')
      .replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<ix:header[\s\S]*?<\/ix:header>/gi, ' ')
      .replace(/<\s*(br|\/p|\/div|\/tr|\/li|\/h[1-6]|\/table)\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
      .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
      .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n.toLowerCase()] ?? m)
      /* House style has no em dashes, quotes included: render one as a comma. */
      .replace(EM_DASH, ', ')
      .replace(/[ \t\r\f\v ]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .replace(/\n{2,}/g, '\n')
      .trim()
  );
}

/**
 * The passages of each kind: paragraphs that match, with the paragraph after
 * a match kept when it continues the same note (a table of customers often
 * follows its lead sentence). At most `max` passages per kind, each capped.
 * @returns {Array<{ kind: string, text: string }>}
 */
export function findSections(text, { max = 3, cap = 3000 } = {}) {
  const paras = String(text || '')
    .split('\n')
    .map((p) => p.trim())
    .filter((p) => p.length >= 40);
  const out = [];
  for (const [kind, { re }] of Object.entries(DISCLOSURE_KINDS)) {
    const seen = new Set();
    let n = 0;
    for (let i = 0; i < paras.length && n < max; i += 1) {
      if (seen.has(i) || !re.test(paras[i])) continue;
      const block = [paras[i]];
      seen.add(i);
      if (paras[i + 1] && paras[i + 1].length < 600 && /\d/.test(paras[i + 1])) {
        block.push(paras[i + 1]);
        seen.add(i + 1);
      }
      out.push({ kind, text: block.join('\n').slice(0, cap) });
      n += 1;
    }
  }
  return out;
}

const squash = (s) =>
  String(s || '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

/**
 * Whether an extracted item is supported by its passage: the quote appears
 * in the passage verbatim (whitespace and curly quotes aside), and every
 * figure's text appears in the quote.
 */
export function validateExtraction(passage, item) {
  const quote = String(item?.quote || '').trim();
  if (quote.length < 20) return { ok: false, reason: 'quote_too_short' };
  if (!squash(passage).includes(squash(quote))) return { ok: false, reason: 'quote_not_in_filing' };
  const figures = Array.isArray(item?.figures) ? item.figures : [];
  for (const f of figures) {
    const t = String(f?.text || '').trim();
    if (!t || !squash(quote).includes(squash(t))) {
      return { ok: false, reason: `figure_not_in_quote:${t || 'empty'}` };
    }
  }
  return { ok: true, reason: null };
}

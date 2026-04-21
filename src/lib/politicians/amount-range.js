/**
 * Helpers for normalizing congressional trade disclosures.
 *
 * FMP returns amounts as opaque ranges ("$1,001 - $15,000") because the
 * STOCK Act itself only requires politicians to disclose amounts in bands.
 * We translate each range into a midpoint dollar figure so the rest of the
 * pipeline can treat it like a numeric position size. Every downstream use
 * of `midpoint` is explicitly labelled "estimated" on the UI.
 */

/**
 * Parse an FMP disclosed amount range string into min/max/midpoint.
 * Handles "$1,001 - $15,000", "Over $50,000,000", "$15,001-$50,000" and
 * the occasional bare number.
 *
 * @param {string} amount
 * @returns {{ min: number, max: number, midpoint: number }}
 */
export function parseAmountRange(amount) {
  if (!amount || typeof amount !== 'string') {
    return { min: 0, max: 0, midpoint: 0 };
  }

  const clean = amount.replace(/\$|,/g, '').toLowerCase().trim();

  if (clean.startsWith('over')) {
    const num = parseFloat(clean.replace('over', '').trim());
    const cap = Number.isFinite(num) ? num : 50_000_000;
    return { min: cap, max: cap, midpoint: cap };
  }

  const match = clean.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
  if (match) {
    const min = parseFloat(match[1]);
    const max = parseFloat(match[2]);
    return { min, max, midpoint: (min + max) / 2 };
  }

  const num = parseFloat(clean);
  if (Number.isFinite(num)) {
    return { min: num, max: num, midpoint: num };
  }

  return { min: 0, max: 0, midpoint: 0 };
}

/**
 * Build a deterministic slug-ish id from first/last name so we can aggregate
 * trades across disclosure batches (FMP does not expose a stable politician
 * id of its own, and names come in with inconsistent casing/whitespace).
 *
 * @param {string} firstName
 * @param {string} lastName
 * @returns {string}
 */
export function normalizePoliticianId(firstName = '', lastName = '') {
  return `${firstName}-${lastName}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Collapse FMP's verbose transaction labels ("Purchase", "Sale (Full)", "Sale
 * (Partial)", "Exchange", etc.) into a small set of directional buckets the
 * simulator understands.
 *
 * @param {string} type
 * @returns {'buy' | 'sell' | 'exchange' | 'other'}
 */
export function normalizeTransactionType(type) {
  const t = (type ?? '').toLowerCase();
  if (t.includes('purchase') || t.includes('buy')) return 'buy';
  if (t.includes('sale') || t.includes('sell') || t.includes('sold')) return 'sell';
  if (t.includes('exchange')) return 'exchange';
  return 'other';
}

/**
 * Normalize party codes to the single-letter form we store ('D', 'R', 'I').
 * Returns null for anything we can't confidently classify.
 *
 * @param {string | null | undefined} party
 * @returns {'D' | 'R' | 'I' | null}
 */
export function normalizeParty(party) {
  const p = (party ?? '').toString().trim().toLowerCase();
  if (!p) return null;
  if (p === 'd' || p.startsWith('dem')) return 'D';
  if (p === 'r' || p.startsWith('rep')) return 'R';
  if (p === 'i' || p.startsWith('ind')) return 'I';
  return null;
}

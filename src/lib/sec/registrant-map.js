/**
 * Predecessor and successor SEC registrants (Sonar 6.4 final integration, Nov 28 2026). Pure.
 *
 * When a company reorganizes under a new holding company (Form 8-K12B: a successor issuer),
 * SEC's ticker list moves the ticker to the new registrant's CIK, while every filing before the
 * effective date stays under the old CIK. The frames ingest maps a CIK to a ticker through
 * SEC's current list only, so the predecessor's facts (Exxon's FY2025 10-K under CIK 34088)
 * were dropped and the ticker showed quarterly facts without annual ones.
 *
 * Rules:
 *   - a predecessor CIK maps to the successor's ticker only through a reviewed row of
 *     public.sec_registrant_successions with verified = true and a source filing
 *   - only for periods that END BEFORE the effective date (no look-ahead: the successor's own
 *     filings cover everything after), and never for periods outside `applies_from`/
 *     `applies_to` when those are set
 *   - matching ticker symbols alone never join two legal entities
 *   - the row keeps both CIKs, so every stored fact still names the registrant that filed it
 */

/** The relationship types a row may declare. */
export const SUCCESSION_TYPES = Object.freeze([
  'holding_company_reorganization', // 8-K12B: new parent, same business (Exxon 2026)
  'redomiciliation', // reincorporation in another jurisdiction under a new CIK
  'merger_successor', // the surviving issuer of a merger takes the ticker
]);

/**
 * Validate one succession row (used by the tests and before any backfill).
 * @returns {string[]} problems; empty when the row is usable
 */
export function validateSuccession(r) {
  const p = [];
  const cik = (v) => /^\d{1,10}$/.test(String(v || ''));
  if (!r?.ticker) p.push('ticker missing');
  if (!cik(r?.successor_cik)) p.push('successor_cik invalid');
  if (!cik(r?.predecessor_cik)) p.push('predecessor_cik invalid');
  if (String(r?.successor_cik) === String(r?.predecessor_cik)) p.push('same CIK on both sides');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(r?.effective_date || '')))
    p.push('effective_date invalid');
  if (!SUCCESSION_TYPES.includes(r?.relationship)) p.push('relationship type unknown');
  if (!/^\d{10}-\d{2}-\d{6}$/.test(String(r?.source_accession || '')))
    p.push('source filing missing');
  return p;
}

const norm = (c) => String(c).replace(/^0+/, '');

/**
 * Index verified rows: predecessor CIK -> [{ ticker, successorCik, effective, from, to }].
 * Unverified or invalid rows are ignored.
 */
export function indexSuccessions(rows = []) {
  const out = new Map();
  for (const r of rows || []) {
    if (r?.verified !== true || validateSuccession(r).length) continue;
    const k = norm(r.predecessor_cik);
    const list = out.get(k) || [];
    list.push({
      ticker: String(r.ticker).toUpperCase(),
      successorCik: norm(r.successor_cik),
      effective: r.effective_date,
      from: r.applies_from || null,
      to: r.applies_to || null,
    });
    out.set(k, list);
  }
  return out;
}

/**
 * The ticker a fact filed by `cik` for a period ending `periodEnd` belongs to: the current
 * SEC mapping first; else a verified predecessor row whose effective date is after the period.
 * @param {Map<string,string>} current  cik -> ticker from SEC's current list
 * @param {Map<string,object[]>} successions  indexSuccessions output
 * @returns {{ ticker: string, via: 'current'|'predecessor', successorCik?: string } | null}
 */
export function tickerForFact(cik, periodEnd, current, successions) {
  const k = norm(cik);
  const direct = current.get(k) || current.get(String(cik));
  if (direct) return { ticker: direct, via: 'current' };
  for (const s of successions.get(k) || []) {
    if (!periodEnd || !(periodEnd < s.effective)) continue;
    if (s.from && periodEnd < s.from) continue;
    if (s.to && periodEnd > s.to) continue;
    return { ticker: s.ticker, via: 'predecessor', successorCik: s.successorCik };
  }
  return null;
}

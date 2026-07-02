/**
 * Canonical STOCK Act trade record — the single mapping from raw FMP
 * senate-trades / house-trades rows to the shape every UI surface binds to.
 * Nothing in the UI should read raw FMP fields; everything goes through here
 * (+ enrichTrade in member-directory.js for party/chamber/state).
 *
 * Confirmed FMP fields (senate-trades / house-trades): symbol, firstName,
 * lastName, office, senateID (== official BioGuideID), district,
 * transactionDate, disclosureDate, type, amount (band string), owner,
 * assetDescription, assetType, capitalGainsOver200USD, link, comment.
 */

/**
 * Parse a disclosed-amount band string into { raw, min, max, mid }.
 * Handles "$1,001 - $15,000", "$50,000,000 +" (open-ended max), and en/em dashes.
 * Extracted here as the single band parser (do not duplicate).
 */
export function parseAmountBand(raw) {
  const s = String(raw || '').trim();
  const nums = (s.match(/[\d,]+/g) || [])
    .map((x) => Number(x.replace(/,/g, '')))
    .filter(Number.isFinite);
  if (!nums.length) return { raw: s || null, min: null, max: null, mid: null };
  const openEnded = /\+\s*$/.test(s); // e.g. "$50,000,000 +"
  if (nums.length >= 2 && !openEnded) {
    const [min, max] = [nums[0], nums[1]];
    return { raw: s, min, max, mid: (min + max) / 2 };
  }
  // single number, or open-ended (no upper bound)
  const min = nums[0];
  return { raw: s, min, max: openEnded ? null : min, mid: min };
}

/** Normalize an FMP transaction `type` → canonical side + keep the raw. */
export function normalizeSide(type) {
  const t = String(type || '').toLowerCase();
  if (t.includes('purchase') || t.includes('buy')) return 'purchase';
  if (t.includes('exchange')) return 'exchange';
  if (t.includes('sale') || t.includes('sell')) return 'sale'; // covers Sale, Sale (Partial), Sale (Full)
  return 'other';
}

/** True if a raw FMP `type` is specifically a partial sale. */
export function isPartialSale(type) {
  return /partial/i.test(String(type || '')) && /sale|sell/i.test(String(type || ''));
}

/**
 * @param {object} raw  A raw FMP senate/house trade row.
 * @param {'Senate'|'House'} chamber  Which endpoint returned it (not in payload).
 * @returns {object} canonical trade record.
 */
export function normalizeFmpTrade(raw = {}, chamber) {
  const first = (raw.firstName || '').trim();
  const last = (raw.lastName || '').trim();
  const name =
    [first, last].filter(Boolean).join(' ') ||
    raw.office ||
    raw.representative ||
    raw.senator ||
    'Unknown';

  // senateID is the official BioGuideID. House rows may use a different key —
  // try the common variants; enrichment/headshots fall back to name resolution
  // when absent.
  const bioguideId = raw.senateID || raw.houseID || raw.bioguideId || raw.bioguideID || null;

  // district: Senate rows carry the state ("WV"); House rows carry a district
  // code ("TX02") → derive the 2-letter state from its prefix.
  const districtRaw = raw.district || raw.state || null;
  let state = null;
  let district = null;
  if (chamber === 'House' && districtRaw && /^[A-Za-z]{2}/.test(districtRaw)) {
    state = String(districtRaw).slice(0, 2).toUpperCase();
    district = districtRaw;
  } else if (districtRaw) {
    state = String(districtRaw).slice(0, 2).toUpperCase();
  }

  const capitalGainsOver200 =
    typeof raw.capitalGainsOver200USD === 'boolean'
      ? raw.capitalGainsOver200USD
      : /true/i.test(String(raw.capitalGainsOver200USD || ''));

  return {
    ticker: raw.symbol ? String(raw.symbol).toUpperCase() : null,
    bioguideId,
    name,
    chamber: chamber || null,
    state,
    district,
    tradedAt: raw.transactionDate || null,
    filedAt: raw.disclosureDate || null,
    side: normalizeSide(raw.type),
    sideRaw: raw.type || null,
    amountBand: parseAmountBand(raw.amount),
    owner: raw.owner || null,
    assetName: raw.assetDescription || null,
    assetType: raw.assetType || null,
    capitalGainsOver200,
    sourceUrl: raw.link || null,
    comment: raw.comment || null,
    // party is NOT in FMP for most rows — attached by enrichTrade(). FMP does
    // occasionally include politicalParty, so pass it through as a hint.
    partyHint: raw.politicalParty || raw.party || null,
  };
}

/**
 * Pure helpers shared by the CHIPS award importers (USAspending + NIST).
 * No I/O; unit tested in scripts/check-chips-ingest.mjs. Nothing here
 * estimates a figure: an amount that does not parse is null, never guessed.
 */

const SUFFIXES = new Set([
  'INC',
  'INCORPORATED',
  'CORP',
  'CORPORATION',
  'LLC',
  'LTD',
  'LIMITED',
  'CO',
  'COMPANY',
  'AMERICA',
  'USA',
  'LP',
  'PLC',
  'THE',
]);

/** Upper-case, punctuation stripped, trailing legal suffixes dropped. */
export function normalizeRecipient(name) {
  const words = String(name || '')
    .toUpperCase()
    .replace(/&/g, ' AND ')
    .replace(/[^A-Z0-9 ]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  /* Trailing legal suffixes and their joiners: "CORP OF AMERICA", "CO AND". */
  const drop = (w) => SUFFIXES.has(w) || w === 'OF' || w === 'AND';
  while (words.length > 1 && drop(words[words.length - 1])) words.pop();
  return words.join(' ');
}

const SCALE = { thousand: 1e3, million: 1e6, billion: 1e9, trillion: 1e12, k: 1e3, m: 1e6, b: 1e9 };

/**
 * "$4.745 billion" -> 4745000000, "up to $105 million" -> 105000000,
 * "$10.3 million" -> 10300000, "$900,000" -> 900000. The FIRST dollar figure
 * in the text; null when there is none.
 */
export function parseAmount(text) {
  const m = /\$\s*([\d,]+(?:\.\d+)?)\s*(thousand|million|billion|trillion|[kmb]\b)?/i.exec(
    String(text || ''),
  );
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  if (!Number.isFinite(n)) return null;
  const scale = m[2] ? SCALE[m[2].toLowerCase()] : 1;
  return Math.round(n * scale);
}

/** NIST: "Award Amount:" is final; "Proposed Award Amount:" is proposed. */
export function awardStatusFromLabel(text) {
  const s = String(text || '');
  if (/proposed\s+award\s+amount/i.test(s)) return 'proposed';
  if (/award\s+amount/i.test(s)) return 'final';
  return null;
}

/** "split across ..." marks one award covering several sites. */
export function isSplitAward(text) {
  return /\bsplit\s+(across|between|among)\b/i.test(String(text || ''));
}

/** URL-safe slug, for NIST source_record_id (company + location). */
export function slugify(...parts) {
  return parts
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 160);
}

/** USAspending award-type code -> our award_type. */
export function awardTypeFromCode(code) {
  const c = String(code || '').toUpperCase();
  if (c === '02') return 'grant'; // block grant
  if (c === '03' || c === '04') return 'grant'; // formula / project grant
  if (c === '05') return 'cooperative_agreement';
  if (c === '07') return 'loan'; // direct loan
  if (c === '08') return 'loan_guarantee';
  return 'unknown';
}

/** Amounts differ by more than `pct` (default 5%) of the larger. */
export function amountsConflict(a, b, pct = 0.05) {
  const x = Number(a);
  const y = Number(b);
  if (!Number.isFinite(x) || !Number.isFinite(y) || x <= 0 || y <= 0) return false;
  return Math.abs(x - y) / Math.max(x, y) > pct;
}

/** US state names -> postal codes, for the NIST "(State)" heading part. */
export const STATE_CODES = {
  alabama: 'AL',
  alaska: 'AK',
  arizona: 'AZ',
  arkansas: 'AR',
  california: 'CA',
  colorado: 'CO',
  connecticut: 'CT',
  delaware: 'DE',
  'district of columbia': 'DC',
  florida: 'FL',
  georgia: 'GA',
  hawaii: 'HI',
  idaho: 'ID',
  illinois: 'IL',
  indiana: 'IN',
  iowa: 'IA',
  kansas: 'KS',
  kentucky: 'KY',
  louisiana: 'LA',
  maine: 'ME',
  maryland: 'MD',
  massachusetts: 'MA',
  michigan: 'MI',
  minnesota: 'MN',
  mississippi: 'MS',
  missouri: 'MO',
  montana: 'MT',
  nebraska: 'NE',
  nevada: 'NV',
  'new hampshire': 'NH',
  'new jersey': 'NJ',
  'new mexico': 'NM',
  'new york': 'NY',
  'north carolina': 'NC',
  'north dakota': 'ND',
  ohio: 'OH',
  oklahoma: 'OK',
  oregon: 'OR',
  pennsylvania: 'PA',
  'rhode island': 'RI',
  'south carolina': 'SC',
  'south dakota': 'SD',
  tennessee: 'TN',
  texas: 'TX',
  utah: 'UT',
  vermont: 'VT',
  virginia: 'VA',
  washington: 'WA',
  'west virginia': 'WV',
  wisconsin: 'WI',
  wyoming: 'WY',
  'puerto rico': 'PR',
};

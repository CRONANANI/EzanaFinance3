/**
 * Normalises a company or contractor name to the key contractor_tickers is
 * keyed on. Mirrors public.contractor_name_key() in
 * supabase/migrations/20261003140000_contractor_resolution.sql exactly; the
 * check script pins the two to one corpus so they cannot drift.
 *
 *   nameKey('FEDEX SUPPLY CHAIN DISTRIBUTION SYSTEM, INC.')
 *     → 'FEDEX SUPPLY CHAIN DISTRIBUTION SYSTEM'
 *   nameKey('The Boeing Company') → 'BOEING'
 *
 * Upper-case, "&" → AND, punctuation → space, corporate suffixes and
 * share-class words dropped, bare numbers dropped, whitespace collapsed.
 */
const STOP = [
  'INCORPORATED',
  'INC',
  'CORPORATION',
  'CORP',
  'COMPANY',
  'CO',
  'LLC',
  'LLP',
  'LTD',
  'LIMITED',
  'PLC',
  'LP',
  'THE',
  'HOLDINGS',
  'HOLDING',
  'GROUP',
  'INTERNATIONAL',
  'INTL',
  'AND',
  'OF',
  'COMMON',
  'STOCK',
  'CLASS',
  'ORDINARY',
  'SHARES',
  'SHARE',
  'DEPOSITARY',
  'EACH',
  'REPRESENTING',
  'AMERICAN',
  'ADR',
  'ADS',
  'NV',
  'SA',
  'AG',
  'SE',
  'USA',
  'US',
  'A',
  'B',
  'C',
];
const STOP_RE = new RegExp(`\\b(${STOP.join('|')})\\b`, 'g');

export function nameKey(name) {
  return String(name ?? '')
    .toUpperCase()
    .replace(/&/g, ' AND ')
    .replace(/[^A-Z0-9 ]/g, ' ')
    .replace(STOP_RE, ' ')
    .replace(/\b\d+\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** The Postgres expression, for anything that wants to assert equivalence. */
export const SQL_STOP_WORDS = STOP;

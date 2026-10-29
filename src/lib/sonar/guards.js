/**
 * Ezana Sonar — matching guards.
 *
 * For a country/topic ping (no specific org/person), a record must not count
 * as a match only because an organization or recipient name contains a country
 * word. "UNITED STATES VETERANS INITIATIVE" is not a match for a United States
 * country ping unless a real place/country column matched.
 */
import { COUNTRY_NAMES } from './resolveQuery';

const COUNTRY_WORD_RE = new RegExp(
  `\\b(${Object.values(COUNTRY_NAMES)
    .map((n) => n.replace(/ /g, '\\s+'))
    .join('|')}|america|american)\\b`,
  'i',
);

/**
 * @param {{ intent?: string }} q  resolved query
 * @param {{ nameField?: string, hasStructuredCountryMatch?: boolean }} rec
 * @returns {boolean} true to keep the record
 */
export function passesCountryIntentGuard(q, { nameField, hasStructuredCountryMatch } = {}) {
  if (q?.intent !== 'country') return true;
  if (hasStructuredCountryMatch) return true;
  return !COUNTRY_WORD_RE.test(nameField ?? '');
}

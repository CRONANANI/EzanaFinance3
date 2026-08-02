/** Bidirectional lexical aliases. Expansion feeds ONLY tsquery/ILIKE branches. */
export const TICKER_ALIASES = {
  LMT: ['Lockheed Martin'],
  BAH: ['Booz Allen'],
  PLTR: ['Palantir'],
  MSFT: ['Microsoft'],
  AMZN: ['Amazon'],
  CAT: ['Caterpillar'],
  GOOGL: ['Google', 'Alphabet'],
  CMCSA: ['Comcast'],
  HPQ: ['HP'],
};
export const AGENCY_ALIASES = {
  DOD: ['Department of Defense', 'Defense Dept'],
  DHS: ['Homeland Security'],
  HHS: ['Health and Human Services'],
  GSA: ['General Services Administration'],
  VA: ['Veterans Affairs'],
  DOE: ['Department of Energy'],
  NASA: [],
};

export function expandLexicalQuery(query) {
  const terms = new Set([query]);
  const upper = String(query || '').toUpperCase();
  for (const [key, names] of [
    ...Object.entries(TICKER_ALIASES),
    ...Object.entries(AGENCY_ALIASES),
  ]) {
    const hitKey = new RegExp(`\\b${key}\\b`).test(upper);
    const hitName = names.some((n) => upper.includes(n.toUpperCase()));
    if (hitKey) names.forEach((n) => terms.add(n));
    if (hitName) terms.add(key);
  }
  return [...terms];
}

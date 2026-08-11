/**
 * Ezana Echo — map `geos` taxonomy values to continents.
 *
 * Pure, deterministic, no imports. The map is built from the exhaustive set of
 * distinct `geos` values actually used across the Echo article modules
 * (`src/lib/ezana-echo-article-*.js`), plus the canonical geo vocabulary in
 * `src/lib/notifications/event-classifier.js` (`GEO_ALIASES`).
 *
 * UNMAPPED: (none) — every distinct geos value found was confidently mapped.
 *
 * Notes on judgment calls:
 *  - 'Russia' is transcontinental; mapped to 'Europe' (conventional single-
 *    continent classification: capital and majority population are European).
 *  - 'Iran' and 'Middle East' are placed under 'Asia'.
 *  - 'Africa' / 'Sub-Saharan Africa' are region values that resolve to 'Africa'.
 *  - The GLOBAL tokens ('Global', 'Worldwide', 'International') do not currently
 *    appear in any article's `geos`, but are wired defensively so the utility
 *    handles them if introduced.
 */

export const CONTINENTS = ['North America', 'South America', 'Europe', 'Africa', 'Asia', 'Oceania'];

// Sentinel: a geo that spans every continent.
export const GLOBAL = 'GLOBAL';

// Every distinct geos value -> its continent (one of CONTINENTS) or GLOBAL.
export const GEO_TO_CONTINENT = {
  // --- North America ---
  'United States': 'North America',
  USA: 'North America',
  US: 'North America',

  // --- South America ---
  Brazil: 'South America',
  Chile: 'South America',

  // --- Europe ---
  'European Union': 'Europe',
  France: 'Europe',
  Netherlands: 'Europe',
  Portugal: 'Europe',
  Russia: 'Europe',
  Spain: 'Europe',
  'United Kingdom': 'Europe',
  UK: 'Europe',
  Ukraine: 'Europe',

  // --- Africa ---
  Africa: 'Africa',
  'Sub-Saharan Africa': 'Africa',
  'Democratic Republic of Congo': 'Africa',
  Nigeria: 'Africa',
  'South Africa': 'Africa',

  // --- Asia ---
  China: 'Asia',
  India: 'Asia',
  Indonesia: 'Asia',
  Iran: 'Asia',
  Japan: 'Asia',
  'Middle East': 'Asia',
  Pakistan: 'Asia',
  Taiwan: 'Asia',

  // --- Global (defensive; not currently present in any article) ---
  Global: GLOBAL,
  Worldwide: GLOBAL,
  International: GLOBAL,
};

/**
 * Resolve an array of `geos` values to the Set of continents they touch.
 *
 * - Non-array or empty input returns an empty Set.
 * - If any value maps to GLOBAL, returns a Set of all six CONTINENTS.
 * - Values not present in GEO_TO_CONTINENT are skipped (never throws).
 *
 * @param {string[]} geos
 * @returns {Set<string>}
 */
export function continentsForGeos(geos) {
  if (!Array.isArray(geos) || geos.length === 0) {
    return new Set();
  }

  const out = new Set();
  for (const geo of geos) {
    const continent = GEO_TO_CONTINENT[geo];
    if (continent === undefined) continue;
    if (continent === GLOBAL) {
      return new Set(CONTINENTS);
    }
    out.add(continent);
  }
  return out;
}

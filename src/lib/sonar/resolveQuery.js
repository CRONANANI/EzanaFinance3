/**
 * Ezana Sonar — deterministic ping resolver.
 *
 * Turns a raw ping into a structured query ({ countries, themes, tickers,
 * people, organizations, window }) so country/topic pings (not only tickers)
 * select the right datasets. Dependency-free and pure, so it is cheap to run
 * before the orchestrator and easy to test. The orchestrator's own entity
 * extractor (extractEntities) still runs for the structured corpora; this
 * resolver adds the geography/theme signal those corpora do not infer.
 *
 * Countries are ISO-2 codes; the per-source adapters map ISO to the names and
 * program codes their data uses (e.g. IR -> "Iran", "IRGC").
 */

/** ISO-2 -> lowercase aliases that imply that country when found as a word. */
export const COUNTRY_ALIASES = {
  US: ['us', 'u.s.', 'usa', 'united states', 'america', 'american', 'washington'],
  IR: ['iran', 'iranian', 'tehran', 'irgc', 'islamic republic'],
  RU: ['russia', 'russian', 'moscow', 'kremlin'],
  CN: ['china', 'chinese', 'beijing', 'prc'],
  IL: ['israel', 'israeli'],
  SA: ['saudi', 'saudi arabia', 'riyadh'],
  VE: ['venezuela', 'venezuelan'],
  KP: ['north korea', 'dprk', 'pyongyang'],
  SY: ['syria', 'syrian', 'damascus'],
  CU: ['cuba', 'cuban', 'havana'],
  UA: ['ukraine', 'ukrainian', 'kyiv', 'kiev'],
  VN: ['vietnam', 'vietnamese', 'hanoi'],
};

/** Theme -> substrings that imply it (matched on the lowercased query). */
export const THEME_KEYWORDS = {
  sanctions: ['sanction', 'ofac', 'embargo', 'designation', 'blacklist', 'export control'],
  conflict: ['involvement', 'war', 'strike', 'military', 'conflict', 'escalation', 'invasion'],
  macro: ['economic outlook', 'economy', 'gdp', 'inflation', 'recession', 'rates', 'growth'],
  energy: ['oil', 'crude', 'brent', 'opec', 'energy', 'strait of hormuz', 'gas'],
  defense: ['defense', 'defence', 'contractor', 'weapons', 'pentagon'],
};

const TICKER_RE = /\$?\b[A-Z]{1,5}\b/g;

/** Word-boundary match so "us" never matches inside "business". */
function hasTerm(text, term) {
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z])${esc}([^a-z]|$)`, 'i').test(text);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/**
 * @param {string} raw
 * @param {{ knownTickers?: Set<string> }} [opts]
 * @returns {{ raw: string, tickers: string[], countries: string[], people: string[],
 *   organizations: string[], themes: string[], window: { from: string, to: string } }}
 */
export function resolveQuery(raw, { knownTickers = new Set() } = {}) {
  const text = ` ${String(raw || '').toLowerCase()} `;

  const countries = Object.entries(COUNTRY_ALIASES)
    .filter(([, aliases]) => aliases.some((a) => hasTerm(text, a)))
    .map(([iso]) => iso);

  const themes = Object.entries(THEME_KEYWORDS)
    .filter(([, kws]) => kws.some((k) => text.includes(k)))
    .map(([t]) => t);

  // A country plus conflict or macro framing implies sanctions relevance, even
  // when the word "sanctions" is never typed (the Iran outlook case).
  if (countries.length >= 1 && (themes.includes('conflict') || themes.includes('macro'))) {
    if (!themes.includes('sanctions')) themes.push('sanctions');
  }

  // Only accept uppercase tokens the caller recognises as real tickers, so a
  // word like "US" is never mistaken for a symbol.
  const tickers = [
    ...new Set(
      (String(raw || '').match(TICKER_RE) || [])
        .map((t) => t.replace('$', ''))
        .filter((t) => knownTickers.has(t)),
    ),
  ];

  return {
    raw: String(raw || ''),
    tickers,
    countries,
    people: [],
    organizations: [],
    themes,
    window: { from: daysAgo(365 * 2), to: new Date().toISOString().slice(0, 10) },
  };
}

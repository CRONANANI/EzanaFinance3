/**
 * Ezana Sonar — deterministic ping resolver.
 *
 * Turns a raw ping into a structured query so country/topic pings (not only
 * tickers) select the right datasets. Pure and dependency-free, so it is cheap
 * to run before the pipeline and easy to test.
 *
 * It extracts EVERY country (not just the first), handles the ambiguous word
 * "us" safely (a country only when written "US"/"U.S." or in phrases like
 * "the us", "us economy", "us involvement", never "affect us"/"for us"),
 * derives themes, and exposes `subjects` for UI labels, an `intent`, and
 * `hasSanctionedJurisdiction` so a foreign sanctioned jurisdiction drives
 * source selection and ranking.
 *
 * Countries are ISO-2 codes; adapters map ISO to the names/program codes their
 * data uses (e.g. IR -> "Iran", "IRGC").
 */

/** ISO-2 -> lowercase aliases that imply that country as a whole word. "us" is
 *  deliberately excluded here; it is handled by US_AS_COUNTRY below. */
export const COUNTRY_ALIASES = {
  US: ['u.s.', 'u.s.a.', 'usa', 'united states', 'america', 'american'],
  IR: ['iran', 'iranian', 'tehran', 'irgc', 'islamic republic'],
  RU: ['russia', 'russian', 'kremlin', 'moscow'],
  CN: ['china', 'chinese', 'beijing', 'prc'],
  IL: ['israel', 'israeli'],
  SA: ['saudi', 'saudi arabia', 'riyadh'],
  VE: ['venezuela', 'venezuelan'],
  KP: ['north korea', 'dprk', 'pyongyang'],
  CU: ['cuba', 'cuban', 'havana'],
  SY: ['syria', 'syrian', 'damascus'],
  BY: ['belarus', 'belarusian'],
  UA: ['ukraine', 'ukrainian', 'kyiv', 'kiev'],
};

/** ISO-2 -> display name for subject labels. */
export const COUNTRY_NAMES = {
  US: 'United States',
  IR: 'Iran',
  RU: 'Russia',
  CN: 'China',
  IL: 'Israel',
  SA: 'Saudi Arabia',
  VE: 'Venezuela',
  KP: 'North Korea',
  CU: 'Cuba',
  SY: 'Syria',
  BY: 'Belarus',
  UA: 'Ukraine',
};

/** Theme -> substrings that imply it (matched on the lowercased query). */
export const THEME_KEYWORDS = {
  sanctions: ['sanction', 'ofac', 'embargo', 'designation', 'blacklist', 'export control'],
  conflict: [
    'involvement',
    'war',
    'strike',
    'military',
    'conflict',
    'escalation',
    'tension',
    'invasion',
  ],
  macro: [
    'economic outlook',
    'economy',
    'gdp',
    'inflation',
    'recession',
    'rates',
    'outlook',
    'growth',
  ],
  energy: ['oil', 'crude', 'brent', 'opec', 'energy', 'hormuz', 'gas'],
  defense: ['defense', 'defence', 'weapons', 'pentagon', 'contractor'],
};

/** Jurisdictions whose presence (with conflict/macro/sanctions framing) makes
 *  US Sanctions the leading source. */
export const SANCTIONED = new Set(['IR', 'RU', 'KP', 'VE', 'CU', 'SY', 'BY']);

/** "us" is a country only in these shapes; never "affect us" / "for us". */
const US_AS_COUNTRY = [
  /\bUS\b/, // uppercase anywhere
  /\bthe us\b/i,
  /\bus (economy|economic|involvement|military|government|dollar|treasury|market|markets|stocks|policy|sanctions|troops|strikes?|sanctioned?)\b/i,
  /\b(in|to|from|against|with|on) the us\b/i,
];

const TICKER_RE = /\$?\b[A-Z]{1,5}\b/g;

/** Whole-word match so "us" never matches inside "business". */
function hasTerm(text, term) {
  const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z])${esc}([^a-z]|$)`, 'i').test(text);
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

/** Every country named in the ping, ISO-2. Sanctioned jurisdictions sort first
 *  so they drive source selection. */
export function extractCountries(raw) {
  const lower = ` ${String(raw || '').toLowerCase()} `;
  const found = new Set();
  for (const [iso, aliases] of Object.entries(COUNTRY_ALIASES)) {
    if (aliases.some((a) => hasTerm(lower, a))) found.add(iso);
  }
  if (US_AS_COUNTRY.some((re) => re.test(String(raw || '')))) found.add('US');
  return [...found].sort((a, b) => Number(SANCTIONED.has(b)) - Number(SANCTIONED.has(a)));
}

/** Themes present in the ping; a sanctioned jurisdiction implies sanctions. */
export function extractThemes(raw, countries = []) {
  const lower = String(raw || '').toLowerCase();
  const themes = Object.entries(THEME_KEYWORDS)
    .filter(([, kws]) => kws.some((k) => lower.includes(k)))
    .map(([t]) => t);
  if (countries.some((c) => SANCTIONED.has(c)) && !themes.includes('sanctions')) {
    themes.push('sanctions');
  }
  return themes;
}

/** Subjects for the UI label: countries (US last so "United States and Iran"
 *  reads naturally with the foreign subject last), then orgs, then people. */
function subjectsFor(countries, organizations, people) {
  const labelOrder = [...countries].sort((a, b) => (a === 'US' ? -1 : b === 'US' ? 1 : 0));
  return [...labelOrder.map((c) => COUNTRY_NAMES[c] ?? c), ...organizations, ...people];
}

/**
 * @param {string} raw
 * @param {{ knownTickers?: Set<string>, organizations?: string[], people?: string[], tickers?: string[] }} [opts]
 */
export function resolveQuery(raw, opts = {}) {
  const { knownTickers = new Set(), organizations = [], people = [] } = opts;
  const countries = extractCountries(raw);
  const themes = extractThemes(raw, countries);

  const knownTickerHits = [
    ...new Set(
      (String(raw || '').match(TICKER_RE) || [])
        .map((t) => t.replace('$', ''))
        .filter((t) => knownTickers.has(t)),
    ),
  ];
  const tickers = (opts.tickers && opts.tickers.length ? opts.tickers : knownTickerHits) || [];

  const intent =
    organizations.length || people.length || tickers.length
      ? 'entity'
      : countries.length
        ? 'country'
        : 'topic';

  const intents = extractIntents(raw, themes);

  return {
    raw: String(raw || ''),
    tickers,
    countries,
    themes,
    organizations,
    people,
    intent,
    /* Event intents layered on top of the entity/country/topic intent:
       'ipo' and 'recentEvent'. A recent-event ping must sweep live web. */
    intents,
    forceLiveWeb: intents.includes('recentEvent'),
    subjects: subjectsFor(countries, organizations, people),
    hasSanctionedJurisdiction: countries.some((c) => SANCTIONED.has(c)),
    window: { from: daysAgo(365 * 2), to: new Date().toISOString().slice(0, 10) },
  };
}

/* Event intents (Oct 30, SpaceX IPO false negative). 'ipo' sends the ping to
   the IPO filings source at the top weight; 'recentEvent' marks a question
   whose answer may postdate any model's training, so live web is swept. */
const INTENT_PATTERNS = {
  ipo: /\b(ipo'?s?|ipoed|ipo'd|initial public offerings?|went public|go(?:es|ing)? public|gone public|listing|listed|debut(?:ed|s)?|offering price|priced at|public offering)\b/i,
  recentEvent:
    /\b(ipo'?s?|ipoed|ipo'd|initial public offerings?|went public|go(?:es|ing)? public|gone public|acquir\w*|merger|merged|earnings|elected|appointed|resign\w*|died|death|launch(?:ed|es)?|announced|this year|latest|recent(?:ly)?)\b/i,
};

/**
 * Event intents for a ping. "Listed" means an OFAC listing on a sanctions
 * ping, never a stock listing, so a sanctions ping never carries 'ipo'.
 * @param {string} raw
 * @param {string[]} [themes]
 * @returns {string[]}
 */
export function extractIntents(raw, themes = extractThemes(raw, extractCountries(raw))) {
  const text = String(raw || '');
  return Object.entries(INTENT_PATTERNS)
    .filter(([k, re]) => re.test(text) && !(k === 'ipo' && themes.includes('sanctions')))
    .map(([k]) => k);
}

/* Words that frame an IPO question rather than name its subject. */
const IPO_FRAME_WORDS = new Set(
  (
    'what whats when where which who how why much many was were is are be been being did does do ' +
    'has have had will would could should can the a an of its it their they them this that for in ' +
    'on at by to from with about and or value valued valuation price priced pricing size raise raised ' +
    'raising proceeds ipo ipos ipoed initial public offering offerings went go goes going gone listing ' +
    'listed list debut debuted debuts stock stocks share shares ticker yet ever company tell me give ' +
    'show date day first trade trading market cap s ' +
    /* Oct 30 (v2): "can you give me details on the spacex ipo" left "you
       details spacex" as the subject, and "spacex ipo filing sec 2026" left
       "SpaceX filing SEC 2026". Conversational and filing words go too. */
    'i me my we us our you your please know explain summary summarize details detail info ' +
    'information any all more everything happened happen happening recent recently latest news ' +
    'update updates filing filings filed file sec s-1 prospectus registration earlier last ago ' +
    'year years month months week summer spring fall autumn winter today big biggest largest ' +
    'record results result performance since after before opening opened open close closed so far'
  ).split(' '),
);

/**
 * The company an IPO ping is about, with the question framing stripped:
 * "what was the ipo value of spacex" -> "spacex", "has Stripe gone public"
 * -> "Stripe". Null when nothing is left.
 * @param {string} raw
 */
export function ipoSubject(raw) {
  const words = String(raw || '')
    .replace(/[’']s\b/g, '')
    .replace(/[^\p{L}\p{N}&.\s-]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => !IPO_FRAME_WORDS.has(w.toLowerCase().replace(/[.]+$/, '')))
    /* A bare year or number frames the question ("in 2026"), never names it. */
    .filter((w) => !/^\d+$/.test(w));
  const subject = words.join(' ').replace(/[.]+$/, '').trim();
  return subject || null;
}

/** "United States and Iran"; "A, B and C". */
export function subjectLabel(subjects = []) {
  if (!subjects.length) return '';
  if (subjects.length === 1) return subjects[0];
  return `${subjects.slice(0, -1).join(', ')} and ${subjects[subjects.length - 1]}`;
}

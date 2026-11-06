/**
 * Which macro data a question needs (Nov 2026). Pure, synchronous, no database.
 *
 *   routeMacro("Is Turkey's lira under pressure?")
 *     -> { countries: ['TUR'], themes: ['currency'], families: [...], commodity: null,
 *          ranking: null, region: null }
 *
 * Countries are found by name, common alias and demonym (any country, not only the dozen the
 * ping resolver knows). Themes come from THEME_CUES; a family whose own cue matches leads
 * ("policy rate" -> policy_rate). A ranking needs ranking words AND a rankable family cue, so
 * "which countries have the most UN sanctions listings" is not a macro ranking.
 */
import countries from 'i18n-iso-countries';
import {
  FAMILIES,
  FAMILY_BY_ID,
  THEME_CUES,
  THEME_FAMILIES,
  COMMODITY_WORDS,
  COMMODITY_PINK,
  REGIONS,
  WEAK_THEMES,
} from './catalog.js';
import { findCurrency } from './currencies.js';
import { selectFrameworks } from './playbook.js';

const DISPLAY = new Intl.DisplayNames(['en'], { type: 'region' });

/* Aliases and demonyms people write. Ambiguous everyday words are handled below. */
const EXTRA_NAMES = {
  USA: ['united states', 'u.s.', 'usa', 'america', 'american economy', 'the us economy'],
  GBR: ['uk', 'u.k.', 'britain', 'great britain', 'british', 'england'],
  KOR: ['korea', 'south korea', 'korean', 'south korean'],
  PRK: ['north korea', 'north korean', 'dprk'],
  RUS: ['russia', 'russian', 'kremlin'],
  CHN: ['china', 'chinese', 'prc', 'mainland china'],
  TWN: ['taiwan', 'taiwanese'],
  HKG: ['hong kong'],
  TUR: ['turkiye', 'türkiye', 'turkish'],
  IRN: ['iran', 'iranian'],
  VNM: ['vietnam', 'vietnamese'],
  CZE: ['czech republic', 'czechia', 'czech'],
  COD: ['dr congo', 'drc', 'democratic republic of the congo'],
  CIV: ["cote d'ivoire", "côte d'ivoire", 'ivory coast'],
  ARE: ['uae', 'united arab emirates', 'emirati'],
  SAU: ['saudi', 'saudi arabia', 'saudi arabian'],
  DEU: ['german', 'germany'],
  FRA: ['french', 'france'],
  ITA: ['italian', 'italy'],
  ESP: ['spanish', 'spain'],
  JPN: ['japanese', 'japan'],
  IND: ['indian', 'india'],
  BRA: ['brazilian', 'brazil'],
  MEX: ['mexican', 'mexico'],
  ARG: ['argentine', 'argentinian', 'argentina'],
  CAN: ['canadian', 'canada'],
  AUS: ['australian', 'australia'],
  ZAF: ['south africa', 'south african'],
  NGA: ['nigerian', 'nigeria'],
  KEN: ['kenyan', 'kenya'],
  EGY: ['egyptian', 'egypt'],
  ISR: ['israeli', 'israel'],
  UKR: ['ukrainian', 'ukraine'],
  POL: ['polish economy', 'poland'],
  NLD: ['dutch', 'netherlands', 'holland'],
  CHE: ['swiss economy', 'switzerland'],
  SWE: ['swedish', 'sweden'],
  NOR: ['norwegian', 'norway'],
  IDN: ['indonesian', 'indonesia'],
  PAK: ['pakistani', 'pakistan'],
  PHL: ['philippine', 'filipino', 'philippines'],
  THA: ['thai', 'thailand'],
  MYS: ['malaysian', 'malaysia'],
  CHL: ['chilean', 'chile'],
  COL: ['colombian', 'colombia'],
  PER: ['peruvian', 'peru'],
  VEN: ['venezuelan', 'venezuela'],
  GRC: ['greek', 'greece'],
  PRT: ['portuguese', 'portugal'],
  IRL: ['irish', 'ireland'],
  BEL: ['belgian', 'belgium'],
  AUT: ['austrian', 'austria'],
  DNK: ['danish economy', 'denmark'],
  FIN: ['finnish', 'finland'],
  HUN: ['hungarian', 'hungary'],
  ROU: ['romanian', 'romania'],
  BGD: ['bangladeshi', 'bangladesh'],
  ETH: ['ethiopian', 'ethiopia'],
  GHA: ['ghanaian', 'ghana'],
  QAT: ['qatari', 'qatar'],
  KWT: ['kuwaiti', 'kuwait'],
  IRQ: ['iraqi', 'iraq'],
  SYR: ['syrian', 'syria'],
  NZL: ['new zealand'],
  SGP: ['singapore', 'singaporean'],
};

/* Country names that are everyday words: only a country with a capital letter, a possessive,
   or a macro word next to it ("Turkey's lira", "Chad's economy"). */
const AMBIGUOUS = {
  turkey: 'TUR',
  chad: 'TCD',
  jordan: 'JOR',
  georgia: 'GEO',
  niger: 'NER',
  guinea: 'GIN',
  jersey: 'JEY',
};
const MACRO_NEAR =
  /^(?:'s\b|’s\b|\s+(?:economy|economic|inflation|lira|central bank|government|gdp|debt|currency|exports?|imports?|interest|rates?|growth|bonds?))/i;

const norm = (s) =>
  String(s || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

let INDEX = null;
function nameIndex() {
  if (INDEX) return INDEX;
  const terms = new Map();
  for (const a2 of Object.keys(countries.getAlpha2Codes())) {
    const a3 = countries.alpha2ToAlpha3(a2);
    let name = null;
    try {
      name = DISPLAY.of(a2);
    } catch {
      name = null;
    }
    if (!a3 || !name || name === a2) continue;
    const n = norm(name);
    if (n.length >= 4 && !AMBIGUOUS[n]) terms.set(n, a3);
  }
  for (const [a3, list] of Object.entries(EXTRA_NAMES))
    for (const t of list) terms.set(norm(t), a3);
  // Longest first, so "south korea" wins over "korea" and "south africa" over "africa".
  INDEX = [...terms.entries()]
    .sort((a, b) => b[0].length - a[0].length)
    .map(([t, a3]) => ({
      a3,
      re: new RegExp(`(^|[^\\p{L}])${esc(t)}(?=[^\\p{L}]|$)`, 'u'),
      len: t.length,
    }));
  return INDEX;
}

/** Every country the text names, in order of first mention (ISO3). */
/* Region phrases that contain a country-like word ("Latin America" is not the USA). */
const REGION_MASK = /\b(latin|south|central|north) america\b|\bnew mexico\b|\bnew jersey\b/gi;

export function findCountries(text) {
  const raw = String(text || '').replace(REGION_MASK, (m) => ' '.repeat(m.length));
  const t = norm(raw);
  const hits = [];
  const taken = []; // [start, end) spans already claimed by a longer name
  for (const { a3, re, len } of nameIndex()) {
    const g = new RegExp(re.source, 'gu');
    let m;
    while ((m = g.exec(t))) {
      const start = m.index + m[1].length;
      const end = start + len;
      if (taken.some(([s, e]) => start < e && end > s)) continue;
      taken.push([start, end]);
      hits.push({ a3, at: start });
    }
  }
  for (const [word, a3] of Object.entries(AMBIGUOUS)) {
    const g = new RegExp(`(^|[^\\p{L}])${word}(?=[^\\p{L}]|$)`, 'giu');
    let m;
    while ((m = g.exec(raw))) {
      const start = m.index + m[1].length;
      const surface = raw.slice(start, start + word.length);
      const after = raw.slice(start + word.length);
      if (/^[A-Z]/.test(surface) || MACRO_NEAR.test(after)) hits.push({ a3, at: start });
    }
  }
  hits.sort((a, b) => a.at - b.at);
  return [...new Set(hits.map((h) => h.a3))];
}

/** The region the text names (Latin America, G7, ...), or null. */
export function findRegion(text) {
  for (const [id, r] of Object.entries(REGIONS)) if (r.re.test(String(text || ''))) return id;
  return null;
}

/** The commodity the text names (Pink Sheet id), or null. */
export function findCommodity(text) {
  const t = String(text || '');
  for (const [id, re] of COMMODITY_WORDS) if (re.test(t)) return id;
  return null;
}

/** Themes the text signals, in THEME_CUES order. */
export function findThemes(text) {
  const t = String(text || '');
  return Object.entries(THEME_CUES)
    .filter(([, re]) => re.test(t))
    .map(([id]) => id);
}

const RANK_WORDS =
  /\b(which|what) (countr(y|ies)|nations?|economies)\b|\b(highest|lowest|most|least|largest|biggest|smallest|top \d+|top|ranking|rank|ranked|leaders?|leading)\b/i;
const ASC_WORDS = /\b(lowest|least|smallest|weakest|fewest|bottom)\b/i;

/**
 * Ranking request: { family, order, region } or null. Needs ranking wording plus a family
 * whose cue matches and which can be ranked across countries.
 */
/* A ranking across countries says so: "countries", "economies", "producers", a region. */
const RANK_CONTEXT =
  /\b(countr(y|ies)|nations?|economies|economy|world|global|worldwide|producers?|exporters?|importers?|consumers?|central banks?)\b/i;

export function findRanking(text, { themes = findThemes(text) } = {}) {
  const t = String(text || '');
  if (!RANK_WORDS.test(t)) return null;
  if (!RANK_CONTEXT.test(t) && !findRegion(t)) return null;
  // A family named outright ("produce the most crude oil", "highest inflation").
  let fam = FAMILIES.find((f) => f.rankable && f.rank && f.cues && f.cues.test(t));
  // Inflation rankings use the monthly IMF CPI (current, one method for every country).
  if (fam?.id === 'inflation_annual') fam = FAMILY_BY_ID.inflation_monthly;
  if (!fam) {
    for (const th of themes) {
      const id = (THEME_FAMILIES[th] || []).find(
        (x) => FAMILY_BY_ID[x]?.rankable && FAMILY_BY_ID[x]?.rank,
      );
      if (id) {
        fam = FAMILY_BY_ID[id];
        break;
      }
    }
  }
  if (!fam) return null;
  return { family: fam.id, order: ASC_WORDS.test(t) ? 'asc' : 'desc', region: findRegion(t) };
}

/** Families whose own cue the text matches, in catalogue priority order. */
export function cueFamilies(text) {
  const t = String(text || '');
  return FAMILIES.filter((f) => f.cues && f.cues.test(t))
    .sort((a, b) => a.priority - b.priority)
    .map((f) => f.id);
}

/**
 * The full routing for a question. `ranking` wins when present (a ranking question is not a
 * country brief); otherwise countries take a country brief and the rest a theme brief.
 */
export function routeMacro(text) {
  const t = String(text || '');
  const themes = findThemes(t);
  const commodity = findCommodity(t);
  const region = findRegion(t);
  let found = findCountries(t);
  /* A currency word implies its country and the currency theme ("Is the lira under
     pressure?" -> TUR). A shared word (peso) with no country named stays ambiguous. */
  const currency = findCurrency(t, found);
  if (currency) {
    if (!themes.includes('currency')) themes.unshift('currency');
    if (currency.iso3 && !found.includes(currency.iso3)) found = [currency.iso3, ...found];
  }
  // A region word is not a country ("South Africa" yes, "Africa" no: the index has no "africa").
  const ranking = findRanking(t, { themes });
  /* Theme families, cue families first. A commodity question counts as the commodity theme. */
  const fromCues = cueFamilies(t);
  const fromThemes = themes.flatMap((th) => THEME_FAMILIES[th] || []);
  const families = [...new Set([...fromCues, ...fromThemes])];
  if (ranking) found = []; // a ranking across countries, not a brief
  /* A sanctions question names countries as list issuers ("sanctioned by the EU and UK"):
     with no macro theme, commodity or ranking it is not a macro question. */
  const macroAsk = themes.length || commodity || ranking;
  if (SANCTIONS_RE.test(t) && !macroAsk) found = [];
  return {
    countries: found.slice(0, 4),
    themes,
    families,
    commodity: commodity && COMMODITY_PINK[commodity] ? commodity : null,
    ranking,
    region,
    currency,
  };
}

const SANCTIONS_RE = /sanction|\bofac\b|designat|blacklist|listed by|on the .* list/i;
const ECONOMY_WORDS = /\b(econom(y|ies)|macro|global|world|worldwide)\b/i;

/**
 * Anything for the macro source to answer: a country, a commodity, a ranking, or a theme.
 * A broad theme alone (growth, risk, trade, ...) counts only with economy wording, and never
 * in a question about a company (`hasCompany`).
 */
export function isMacroRelevant(route, { hasCompany = false, text = '' } = {}) {
  if (!route) return false;
  if (route.countries.length || route.ranking || route.commodity) return true;
  if (route.currency) return true;
  if (route.region && route.themes.length) return true;
  const strong = route.themes.filter((t) => !WEAK_THEMES.has(t));
  if (strong.length) return true;
  return route.themes.length > 0 && !hasCompany && ECONOMY_WORDS.test(String(text || ''));
}

/**
 * The playbook frameworks a routed question needs (max 3). External-financing and currency
 * themes read as currency questions; a currency word always does.
 */
export function frameworksForRoute(route) {
  const themes = route?.themes || [];
  return selectFrameworks({
    ...route,
    currency:
      Boolean(route?.currency) || themes.includes('external') || themes.includes('currency'),
  });
}

/**
 * Currency words -> countries (Nov 2026). Pure.
 *
 * "Is the lira under pressure?" names no country, but the lira is Turkey's: a currency word
 * implies its country and the currency theme. Ambiguous words (peso, rupee, shilling, riyal,
 * dollar) take a country named in the same question first; otherwise the route carries the
 * candidates, and the answer says which ones Ezana holds data for. Ordinary-word currencies
 * ("real", "won", "pound", "rand" are fine) need context so "the real issue" or "won the
 * election" never route to Brazil or Korea.
 */

/** ISO3 -> { code, name } for the currencies the map knows. 'EUR' is the euro area. */
export const CURRENCY_OF = {
  TUR: { code: 'TRY', name: 'Turkish lira', short: 'lira' },
  JPN: { code: 'JPY', name: 'Japanese yen', short: 'yen' },
  KOR: { code: 'KRW', name: 'South Korean won', short: 'won' },
  ZAF: { code: 'ZAR', name: 'South African rand', short: 'rand' },
  NGA: { code: 'NGN', name: 'Nigerian naira', short: 'naira' },
  RUS: { code: 'RUB', name: 'Russian ruble', short: 'ruble' },
  CHN: { code: 'CNY', name: 'Chinese yuan', short: 'yuan' },
  GBR: { code: 'GBP', name: 'Pound sterling', short: 'pound' },
  EUR: { code: 'EUR', name: 'Euro', short: 'euro' },
  ISR: { code: 'ILS', name: 'Israeli shekel', short: 'shekel' },
  HUN: { code: 'HUF', name: 'Hungarian forint', short: 'forint' },
  POL: { code: 'PLN', name: 'Polish zloty', short: 'zloty' },
  CZE: { code: 'CZK', name: 'Czech koruna', short: 'koruna' },
  UKR: { code: 'UAH', name: 'Ukrainian hryvnia', short: 'hryvnia' },
  GHA: { code: 'GHS', name: 'Ghanaian cedi', short: 'cedi' },
  EGY: { code: 'EGP', name: 'Egyptian pound', short: 'pound' },
  IDN: { code: 'IDR', name: 'Indonesian rupiah', short: 'rupiah' },
  MYS: { code: 'MYR', name: 'Malaysian ringgit', short: 'ringgit' },
  THA: { code: 'THB', name: 'Thai baht', short: 'baht' },
  BRA: { code: 'BRL', name: 'Brazilian real', short: 'real' },
  IND: { code: 'INR', name: 'Indian rupee', short: 'rupee' },
  PAK: { code: 'PKR', name: 'Pakistani rupee', short: 'rupee' },
  LKA: { code: 'LKR', name: 'Sri Lankan rupee', short: 'rupee' },
  NPL: { code: 'NPR', name: 'Nepalese rupee', short: 'rupee' },
  ARG: { code: 'ARS', name: 'Argentine peso', short: 'peso' },
  MEX: { code: 'MXN', name: 'Mexican peso', short: 'peso' },
  COL: { code: 'COP', name: 'Colombian peso', short: 'peso' },
  CHL: { code: 'CLP', name: 'Chilean peso', short: 'peso' },
  PHL: { code: 'PHP', name: 'Philippine peso', short: 'peso' },
  KEN: { code: 'KES', name: 'Kenyan shilling', short: 'shilling' },
  UGA: { code: 'UGX', name: 'Ugandan shilling', short: 'shilling' },
  TZA: { code: 'TZS', name: 'Tanzanian shilling', short: 'shilling' },
  SAU: { code: 'SAR', name: 'Saudi riyal', short: 'riyal' },
  QAT: { code: 'QAR', name: 'Qatari riyal', short: 'riyal' },
  OMN: { code: 'OMR', name: 'Omani rial', short: 'riyal' },
  USA: { code: 'USD', name: 'US dollar', short: 'dollar' },
  CAN: { code: 'CAD', name: 'Canadian dollar', short: 'dollar' },
  AUS: { code: 'AUD', name: 'Australian dollar', short: 'dollar' },
  NZL: { code: 'NZD', name: 'New Zealand dollar', short: 'dollar' },
  SGP: { code: 'SGD', name: 'Singapore dollar', short: 'dollar' },
  HKG: { code: 'HKD', name: 'Hong Kong dollar', short: 'dollar' },
  TWN: { code: 'TWD', name: 'New Taiwan dollar', short: 'dollar' },
  CHE: { code: 'CHF', name: 'Swiss franc', short: 'franc' },
  SWE: { code: 'SEK', name: 'Swedish krona', short: 'krona' },
  NOR: { code: 'NOK', name: 'Norwegian krone', short: 'krone' },
};

/* Unambiguous words (or phrases), most specific first. */
const UNIQUE = [
  [/\begyptian pounds?\b/i, 'EGY'],
  [/\b(pound sterling|sterling|british pounds?|the pound\b(?! of))/i, 'GBR'],
  [/\b(turkish )?lira\b/i, 'TUR'],
  [/\b(japanese )?yen\b/i, 'JPN'],
  [/\b(korean won|the won\b|won (is|has|was|fell|rose|slid|weaken|strengthen|under))/i, 'KOR'],
  /* "Rand Paul", "Ayn Rand" and the RAND Corporation are not the currency. */
  [
    /\b(south african rand|the rand\b(?! corporation)|rands?\b(?= (is|has|was|fell|rose|slid|weaken|strengthen|under|against)\b))/i,
    'ZAF',
  ],
  [/\bnaira\b/i, 'NGA'],
  [/\b(rubles?|roubles?)\b/i, 'RUS'],
  [/\b(yuan|renminbi|rmb)\b/i, 'CHN'],
  [/\bthe euro\b|\beuro (is|has|was|fell|rose|weak|strong|against|under)|\beur\/usd\b/i, 'EUR'],
  [/\bshekels?\b/i, 'ISR'],
  [/\bforints?\b/i, 'HUN'],
  [/\bzloty\b/i, 'POL'],
  [/\bkoruna\b/i, 'CZE'],
  [/\bhryvnia\b/i, 'UKR'],
  [/\bcedis?\b/i, 'GHA'],
  [/\brupiah\b/i, 'IDN'],
  [/\bringgit\b/i, 'MYS'],
  [/\bbaht\b/i, 'THA'],
  [
    /\b(brazilian real|brazil'?s real|the real (is|has|was|fell|rose|slid|weak|strong|against|under))\b/i,
    'BRA',
  ],
  [/\b(swiss francs?|the franc\b|francs?\b(?= (is|has|was|fell|rose|against|under)\b))/i, 'CHE'],
];

/* Words shared by several countries. A country named in the question picks one. */
const SHARED = [
  [/\brupees?\b/i, 'rupee', ['IND', 'PAK', 'LKA', 'NPL']],
  [/\bpesos?\b/i, 'peso', ['ARG', 'MEX', 'COL', 'CHL', 'PHL']],
  [/\bshillings?\b/i, 'shilling', ['KEN', 'UGA', 'TZA']],
  [/\b(riyals?|rials?)\b/i, 'riyal', ['SAU', 'QAT', 'OMN']],
  [/\bdollars?\b|\busd\b/i, 'dollar', ['USA', 'CAN', 'AUS', 'NZL', 'SGP', 'HKG', 'TWN']],
];

/* "Canadian dollar", "Mexican peso": the adjective names the country. */
const QUALIFIED = [
  [/\b(canadian|loonie)\b/i, 'CAN'],
  [/\baustralian\b|\baussie dollar\b/i, 'AUS'],
  [/\bnew zealand\b|\bkiwi dollar\b/i, 'NZL'],
  [/\bsingapore\b/i, 'SGP'],
  [/\bhong kong\b/i, 'HKG'],
  [/\btaiwan(ese)?\b/i, 'TWN'],
  [/\b(us|u\.s\.|american|greenback)\b/i, 'USA'],
  [/\bindian?\b/i, 'IND'],
  [/\bpakistan(i)?\b/i, 'PAK'],
  [/\bsri lanka(n)?\b/i, 'LKA'],
  [/\bnepal(ese|i)?\b/i, 'NPL'],
  [/\bargentin(a|e|ian)\b/i, 'ARG'],
  [/\bmexic(o|an)\b/i, 'MEX'],
  [/\bcolombia(n)?\b/i, 'COL'],
  [/\bchile(an)?\b/i, 'CHL'],
  [/\bphilippines?\b|\bphilippine\b|\bfilipino\b/i, 'PHL'],
  [/\bkenya(n)?\b/i, 'KEN'],
  [/\buganda(n)?\b/i, 'UGA'],
  [/\btanzania(n)?\b/i, 'TZA'],
  [/\bsaudi\b/i, 'SAU'],
  [/\bqatar(i)?\b/i, 'QAT'],
  [/\boman(i)?\b/i, 'OMN'],
];

/**
 * The currency a question names: { word, iso3, candidates, ambiguous } or null.
 * `named` are ISO3 countries the question names (they settle a shared word).
 */
export function findCurrency(text, named = []) {
  const t = String(text || '');
  for (const [re, iso3] of UNIQUE) {
    if (re.test(t))
      return { word: CURRENCY_OF[iso3].short, iso3, candidates: [iso3], ambiguous: false };
  }
  for (const [re, word, candidates] of SHARED) {
    if (!re.test(t)) continue;
    // "the dollar" alone in a question about another country's currency is the benchmark, not
    // the subject; skip it when a unique currency or another shared word already matched.
    const byName = candidates.find((c) => named.includes(c));
    const byAdj = QUALIFIED.find(([q, c]) => candidates.includes(c) && q.test(t));
    const iso3 = byName || (byAdj ? byAdj[1] : null);
    if (word === 'dollar' && !iso3) {
      // A plain "dollar" is the US dollar; with another country named it is the benchmark.
      if (named.length) return null;
      return { word, iso3: 'USA', candidates: ['USA'], ambiguous: false };
    }
    if (iso3) return { word, iso3, candidates: [iso3], ambiguous: false };
    return { word, iso3: null, candidates, ambiguous: true };
  }
  return null;
}

/** Currency code and name for a country (ISO3), from the map, or null. */
export function currencyOf(iso3) {
  return CURRENCY_OF[iso3] || null;
}

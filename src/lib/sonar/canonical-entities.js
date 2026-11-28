/**
 * Canonical entity identities (Sonar 6.4 hardening, Nov 28 2026).
 *
 * Multi-word names that collide with generic words are resolved here, once, into typed
 * identities that every Sonar layer shares: understanding (phrase pass), the canonical
 * intent (subject and signature keys), the Composer (company resolution), follow-ups and
 * result signatures. The rule is the longest canonical name wins over its parts, so
 * "Bank of America" is the company BAC, never the banking industry plus the United States;
 * "Royal Bank of Canada" is RY, never the Bank of Canada; "Bank of Canada" is Canada's
 * central bank, never a bank company.
 *
 * Types:
 *   central_bank  { id, label, country (ISO2), iso3 }  the monetary authority of a country
 *   company       { id (ticker), label }                a listed issuer
 *
 * The registry holds only names that are verifiable facts (an issuer's legal or common
 * name and its listed symbol; a central bank and its country). It is not a universe or a
 * classification; industries stay in composer/industries.js. Browser-safe, no imports.
 */

export const CENTRAL_BANKS = [
  {
    id: 'fed',
    label: 'Federal Reserve',
    country: 'US',
    iso3: 'USA',
    names: [
      'federal reserve',
      'federal reserve board',
      'federal reserve system',
      'the fed',
      'fomc',
      'federal open market committee',
      'fed funds',
    ],
  },
  { id: 'boc', label: 'Bank of Canada', country: 'CA', iso3: 'CAN', names: ['bank of canada'] },
  {
    id: 'boe',
    label: 'Bank of England',
    country: 'GB',
    iso3: 'GBR',
    names: ['bank of england'],
  },
  { id: 'boj', label: 'Bank of Japan', country: 'JP', iso3: 'JPN', names: ['bank of japan'] },
  {
    id: 'ecb',
    label: 'European Central Bank',
    country: 'EU',
    iso3: 'EUR',
    names: ['european central bank', 'ecb'],
  },
  { id: 'bok', label: 'Bank of Korea', country: 'KR', iso3: 'KOR', names: ['bank of korea'] },
  {
    id: 'banxico',
    label: 'Bank of Mexico',
    country: 'MX',
    iso3: 'MEX',
    names: ['bank of mexico', 'banxico'],
  },
  { id: 'boi', label: 'Bank of Israel', country: 'IL', iso3: 'ISR', names: ['bank of israel'] },
  {
    id: 'bot',
    label: 'Bank of Thailand',
    country: 'TH',
    iso3: 'THA',
    names: ['bank of thailand'],
  },
  {
    id: 'rba',
    label: 'Reserve Bank of Australia',
    country: 'AU',
    iso3: 'AUS',
    names: ['reserve bank of australia'],
  },
  {
    id: 'rbnz',
    label: 'Reserve Bank of New Zealand',
    country: 'NZ',
    iso3: 'NZL',
    names: ['reserve bank of new zealand'],
  },
  {
    id: 'rbi',
    label: 'Reserve Bank of India',
    country: 'IN',
    iso3: 'IND',
    names: ['reserve bank of india'],
  },
  {
    id: 'sarb',
    label: 'South African Reserve Bank',
    country: 'ZA',
    iso3: 'ZAF',
    names: ['south african reserve bank'],
  },
  {
    id: 'pboc',
    label: "People's Bank of China",
    country: 'CN',
    iso3: 'CHN',
    names: ["people's bank of china", 'peoples bank of china', 'pboc'],
  },
  {
    id: 'snb',
    label: 'Swiss National Bank',
    country: 'CH',
    iso3: 'CHE',
    names: ['swiss national bank'],
  },
  {
    id: 'bcb',
    label: 'Central Bank of Brazil',
    country: 'BR',
    iso3: 'BRA',
    names: ['central bank of brazil', 'banco central do brasil'],
  },
  {
    id: 'cbrt',
    label: 'Central Bank of Turkey',
    country: 'TR',
    iso3: 'TUR',
    names: ['central bank of turkey', 'central bank of the republic of turkey'],
  },
];

/* Issuers whose names contain a generic word (bank, america, canada, morgan, national,
   state, general) and so must be claimed whole. Symbols are their primary US listing. */
export const COMPANY_NAMES = [
  { id: 'BAC', label: 'Bank of America', names: ['bank of america', 'bofa'] },
  { id: 'GS', label: 'Goldman Sachs', names: ['goldman sachs', 'goldman'] },
  { id: 'MS', label: 'Morgan Stanley', names: ['morgan stanley'] },
  {
    id: 'JPM',
    label: 'JPMorgan Chase',
    names: ['jpmorgan chase', 'jpmorgan', 'jp morgan', 'j.p. morgan', 'chase bank'],
  },
  { id: 'WFC', label: 'Wells Fargo', names: ['wells fargo'] },
  { id: 'C', label: 'Citigroup', names: ['citigroup', 'citibank'] },
  {
    id: 'BK',
    label: 'Bank of New York Mellon',
    names: ['bank of new york mellon', 'bny mellon', 'bank of new york'],
  },
  { id: 'BOTJ', label: 'Bank of the James', names: ['bank of the james'] },
  { id: 'USB', label: 'U.S. Bancorp', names: ['u.s. bancorp', 'us bancorp'] },
  { id: 'PNC', label: 'PNC Financial Services', names: ['pnc financial', 'pnc bank'] },
  { id: 'SCHW', label: 'Charles Schwab', names: ['charles schwab'] },
  { id: 'STT', label: 'State Street', names: ['state street'] },
  { id: 'NTRS', label: 'Northern Trust', names: ['northern trust'] },
  { id: 'COF', label: 'Capital One', names: ['capital one'] },
  { id: 'AXP', label: 'American Express', names: ['american express', 'amex'] },
  { id: 'RY', label: 'Royal Bank of Canada', names: ['royal bank of canada', 'rbc'] },
  {
    id: 'TD',
    label: 'Toronto-Dominion Bank',
    names: ['toronto-dominion bank', 'toronto dominion bank', 'toronto-dominion', 'td bank'],
  },
  { id: 'BMO', label: 'Bank of Montreal', names: ['bank of montreal'] },
  {
    id: 'BNS',
    label: 'Bank of Nova Scotia',
    names: ['bank of nova scotia', 'scotiabank'],
  },
  {
    id: 'CM',
    label: 'Canadian Imperial Bank of Commerce',
    names: ['canadian imperial bank of commerce', 'cibc'],
  },
  { id: 'GE', label: 'General Electric', names: ['general electric'] },
  { id: 'GD', label: 'General Dynamics', names: ['general dynamics'] },
  { id: 'GM', label: 'General Motors', names: ['general motors'] },
  { id: 'LMT', label: 'Lockheed Martin', names: ['lockheed martin', 'lockheed'] },
  { id: 'NOC', label: 'Northrop Grumman', names: ['northrop grumman', 'northrop'] },
  /* Sonar 6.5.1: federal-contractor comparisons name these issuers; claimed whole. */
  {
    id: 'RTX',
    label: 'RTX',
    names: ['rtx corporation', 'rtx', 'raytheon technologies', 'raytheon'],
  },
  { id: 'PLTR', label: 'Palantir Technologies', names: ['palantir technologies', 'palantir'] },
  { id: 'TXN', label: 'Texas Instruments', names: ['texas instruments'] },
  { id: 'AMD', label: 'Advanced Micro Devices', names: ['advanced micro devices'] },
  { id: 'MU', label: 'Micron Technology', names: ['micron technology', 'micron'] },
  { id: 'ADI', label: 'Analog Devices', names: ['analog devices'] },
  { id: 'AMAT', label: 'Applied Materials', names: ['applied materials'] },
];

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/* All names, longest first, each with its typed identity. */
const ENTRIES = [
  ...CENTRAL_BANKS.flatMap((b) =>
    b.names.map((n) => ({
      name: n,
      identity: {
        type: 'central_bank',
        id: b.id,
        label: b.label,
        country: b.country,
        iso3: b.iso3,
      },
    })),
  ),
  ...COMPANY_NAMES.flatMap((c) =>
    c.names.map((n) => ({ name: n, identity: { type: 'company', id: c.id, label: c.label } })),
  ),
]
  .map((e) => ({ ...e, re: new RegExp(`(?<![\\w.&-])${escape(e.name)}(?![\\w&-])`, 'gi') }))
  .sort((a, b) => b.name.length - a.name.length);

/**
 * Canonical entities named in a text, non-overlapping, longest name first.
 * @returns {{ type, id, label, country?, iso3?, surface, start, end }[]} in text order
 */
export function canonicalMatches(text) {
  const src = String(text || '').replace(/[‘’]/g, "'");
  const taken = [];
  const out = [];
  for (const e of ENTRIES) {
    e.re.lastIndex = 0;
    for (const m of src.matchAll(e.re)) {
      const start = m.index;
      const end = start + m[0].length;
      if (taken.some(([a, b]) => start < b && end > a)) continue;
      /* "goldman" alone or "lockheed" alone must not swallow a longer different name
         already taken; overlapping spans were skipped above. */
      taken.push([start, end]);
      out.push({ ...e.identity, surface: m[0], start, end });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

/** The canonical identity a whole name denotes (a subject phrase), or null. */
export function canonicalFor(name) {
  const n = norm(name).replace(/['\u2019]s$/, '');
  const bare = n.replace(/^the\s+/, '');
  const hit = ENTRIES.find((e) => e.name === n) || ENTRIES.find((e) => e.name === bare);
  return hit ? { ...hit.identity } : null;
}

/** Stable identity key for signatures and follow-up comparison: "company:BAC". */
export function entityKey(identity) {
  return identity?.type && identity?.id ? `${identity.type}:${identity.id}` : null;
}

/**
 * ISR Feed — seed dataset.
 *
 * ISR = Intelligence, Surveillance & Reconnaissance.
 *
 * IMPORTANT SCOPE NOTE: This is a geolocated *public news aggregation* feed, not a
 * real-time surveillance tool. Events here are drawn from public reporting (wire
 * services, public news APIs) and geocoded to a city/country. Do NOT describe this
 * feature as "surveillance" in user-facing copy. The UI subtitle is:
 *   "Live geolocated news from public sources · Polymarket signals"
 *
 * For now this returns a curated seed list. Production wiring target is one of:
 *   - GDELT v2 Doc API    (https://api.gdeltproject.org/api/v2/doc/doc)
 *   - NewsData.io         (https://newsdata.io/)
 *   - Event Registry      (https://eventregistry.org/)
 * The route handler in app/api/isr/feed/route.js is the place to swap in a live
 * provider — the filtering, severity scoring, and shape normalization stay identical.
 */

const SEVERITY_ORDER = { Low: 0, Medium: 1, High: 2, Critical: 3 };

/** @typedef {'Low'|'Medium'|'High'|'Critical'} Severity */
/** @typedef {'Geopolitics'|'Conflict'|'Economy'|'Energy'|'Health'|'Tech'} Topic */

/**
 * @typedef {Object} IsrEvent
 * @property {string} id
 * @property {string} headline
 * @property {string} [summary]
 * @property {string} source
 * @property {string} [url]           // Seeds: publisher homepage/section; cache: real article URL.
 * @property {boolean} [isSeed]       // True for demo/fallback entries (no reliable article URL).
 * @property {string} publishedAt  ISO timestamp
 * @property {string} [city]
 * @property {string} country
 * @property {string} countryCode  ISO 3166-1 alpha-2 (or a region group like "EU", "ME", "LATAM")
 * @property {number} [lat]
 * @property {number} [lng]
 * @property {Topic} topic
 * @property {Severity} severity
 * @property {string[]} [impactedSymbols]
 * @property {string[]} [impactedKeywords]
 */

// Curated demo events when the news cache is empty. `url` values are publisher sections,
// not specific articles — consumers must check `isSeed` and avoid misleading "open article" UX.
// Timestamps are computed dynamically (relative to "now") so the feed always
// reads as recent regardless of when the seed list is served.
function minutesAgo(mins) {
  return new Date(Date.now() - mins * 60 * 1000).toISOString();
}

/** @type {IsrEvent[]} */
const SEED_EVENTS = [
  {
    id: 'isr-seed-001',
    headline: 'Fed minutes signal steady rates amid cooling core inflation',
    summary:
      'Federal Reserve meeting minutes describe a cautious posture with participants split on the timing of the next rate move. Core PCE trends modestly lower but services inflation remains sticky.',
    source: 'Reuters',
    url: 'https://www.reuters.com/markets/',
    isSeed: true,
    publishedAt: minutesAgo(12),
    city: 'Washington',
    country: 'United States',
    countryCode: 'US',
    lat: 38.9072,
    lng: -77.0369,
    topic: 'Economy',
    severity: 'High',
    impactedSymbols: ['SPY', 'QQQ', 'TLT'],
    impactedKeywords: ['fed', 'rates', 'inflation', 'powell'],
  },
  {
    id: 'isr-seed-002',
    headline: 'ECB officials float deeper rate cut path as growth stalls',
    summary:
      'Several Governing Council members argue for an accelerated easing cycle as German industrial production prints a fifth consecutive decline.',
    source: 'Financial Times',
    url: 'https://www.ft.com/',
    isSeed: true,
    publishedAt: minutesAgo(28),
    city: 'Frankfurt',
    country: 'Germany',
    countryCode: 'DE',
    lat: 50.1109,
    lng: 8.6821,
    topic: 'Economy',
    severity: 'High',
    impactedSymbols: ['EURUSD', 'EWG'],
    impactedKeywords: ['ecb', 'euro', 'rate cut', 'lagarde'],
  },
  {
    id: 'isr-seed-003',
    headline: 'OPEC+ delegates preview voluntary output cut extension',
    summary:
      'People familiar with discussions say the group is leaning toward rolling forward the 2.2mbpd voluntary cuts through the next quarter, citing weaker-than-expected demand signals.',
    source: 'Bloomberg',
    url: 'https://www.bloomberg.com/energy',
    isSeed: true,
    publishedAt: minutesAgo(41),
    city: 'Vienna',
    country: 'Austria',
    countryCode: 'AT',
    lat: 48.2082,
    lng: 16.3738,
    topic: 'Energy',
    severity: 'High',
    impactedSymbols: ['USO', 'XLE', 'CL=F'],
    impactedKeywords: ['opec', 'oil', 'crude', 'production cut'],
  },
  {
    id: 'isr-seed-004',
    headline: 'Taiwan reports fresh PLA incursions near median line',
    summary:
      'Taiwanese MND tracked a combined arms exercise including J-16 fighters and naval vessels crossing the Taiwan Strait median line for the third time this week.',
    source: 'Reuters',
    url: 'https://www.reuters.com/world/asia-pacific/',
    isSeed: true,
    publishedAt: minutesAgo(55),
    city: 'Taipei',
    country: 'Taiwan',
    countryCode: 'TW',
    lat: 25.033,
    lng: 121.5654,
    topic: 'Geopolitics',
    severity: 'Critical',
    impactedSymbols: ['TSM', 'EWT', 'FXI'],
    impactedKeywords: ['taiwan', 'china', 'pla', 'strait'],
  },
  {
    id: 'isr-seed-005',
    headline: 'Red Sea shipping attack disrupts container traffic',
    summary:
      'Maritime security firms confirm a missile strike on a Panamanian-flagged container vessel; traffic via the Bab el-Mandeb strait slows as insurers re-price war risk.',
    source: 'AP News',
    url: 'https://apnews.com/',
    isSeed: true,
    publishedAt: minutesAgo(72),
    city: "Sana'a",
    country: 'Yemen',
    countryCode: 'YE',
    lat: 15.3694,
    lng: 44.191,
    topic: 'Conflict',
    severity: 'Critical',
    impactedSymbols: ['DAC', 'MATX', 'BDRY'],
    impactedKeywords: ['red sea', 'shipping', 'houthi', 'suez'],
  },
  {
    id: 'isr-seed-006',
    headline: 'BoJ policy board member signals openness to further hikes',
    summary:
      'Comments from a BoJ board member suggest the bank could tighten further if wage growth sustains above 3%, reversing years of ultra-loose policy.',
    source: 'Nikkei',
    url: 'https://asia.nikkei.com/',
    isSeed: true,
    publishedAt: minutesAgo(90),
    city: 'Tokyo',
    country: 'Japan',
    countryCode: 'JP',
    lat: 35.6762,
    lng: 139.6503,
    topic: 'Economy',
    severity: 'High',
    impactedSymbols: ['USDJPY', 'EWJ'],
    impactedKeywords: ['boj', 'japan', 'yen', 'rate hike'],
  },
  {
    id: 'isr-seed-007',
    headline: 'UK CMA clears major cloud computing merger with remedies',
    summary:
      'The Competition and Markets Authority approved the deal subject to behavioral remedies covering egress fees and interoperability.',
    source: 'The Guardian',
    url: 'https://www.theguardian.com/business',
    isSeed: true,
    publishedAt: minutesAgo(105),
    city: 'London',
    country: 'United Kingdom',
    countryCode: 'GB',
    lat: 51.5074,
    lng: -0.1278,
    topic: 'Tech',
    severity: 'Medium',
    impactedSymbols: ['MSFT', 'AMZN', 'GOOGL'],
    impactedKeywords: ['cma', 'cloud', 'antitrust', 'merger'],
  },
  {
    id: 'isr-seed-008',
    headline: 'Beijing outlines new semiconductor subsidy package',
    summary:
      'State planners announce an expanded fund targeting mature-node fabrication and domestic EDA tools, aiming to blunt the impact of export controls.',
    source: 'SCMP',
    url: 'https://www.scmp.com/business',
    isSeed: true,
    publishedAt: minutesAgo(130),
    city: 'Beijing',
    country: 'China',
    countryCode: 'CN',
    lat: 39.9042,
    lng: 116.4074,
    topic: 'Tech',
    severity: 'High',
    impactedSymbols: ['SMIC', 'ASML', 'NVDA'],
    impactedKeywords: ['china', 'chips', 'semiconductor', 'export controls'],
  },
  {
    id: 'isr-seed-009',
    headline: 'WHO flags respiratory cluster in northern Vietnam',
    summary:
      'A surveillance bulletin reports a cluster of severe respiratory illness under investigation; sequencing is underway and no travel advisories have been issued.',
    source: 'WHO',
    url: 'https://www.who.int/',
    isSeed: true,
    publishedAt: minutesAgo(160),
    city: 'Hanoi',
    country: 'Vietnam',
    countryCode: 'VN',
    lat: 21.0285,
    lng: 105.8542,
    topic: 'Health',
    severity: 'Medium',
    impactedSymbols: ['MRNA', 'PFE'],
    impactedKeywords: ['vietnam', 'respiratory', 'outbreak', 'who'],
  },
  {
    id: 'isr-seed-010',
    headline: 'Argentina unveils fresh FX liberalization measures',
    summary:
      'The economy ministry details a sequenced removal of capital controls alongside a new IMF staff-level agreement on macro anchors.',
    source: 'Bloomberg',
    url: 'https://www.bloomberg.com/latin-america',
    isSeed: true,
    publishedAt: minutesAgo(185),
    city: 'Buenos Aires',
    country: 'Argentina',
    countryCode: 'AR',
    lat: -34.6037,
    lng: -58.3816,
    topic: 'Economy',
    severity: 'Medium',
    impactedSymbols: ['ARGT', 'YPF'],
    impactedKeywords: ['argentina', 'peso', 'imf', 'milei'],
  },
  {
    id: 'isr-seed-011',
    headline: 'Berlin coalition talks stall over fiscal package',
    summary:
      'Coalition partners disagree on the scale of a supplementary defense and infrastructure package; debt brake reform is back on the table.',
    source: 'Deutsche Welle',
    url: 'https://www.dw.com/en/',
    isSeed: true,
    publishedAt: minutesAgo(210),
    city: 'Berlin',
    country: 'Germany',
    countryCode: 'DE',
    lat: 52.52,
    lng: 13.405,
    topic: 'Geopolitics',
    severity: 'Medium',
    impactedSymbols: ['EWG', 'BUND'],
    impactedKeywords: ['germany', 'coalition', 'debt brake', 'defense'],
  },
  {
    id: 'isr-seed-012',
    headline: 'Sao Paulo megacity reports record dengue caseload',
    summary:
      'Health officials in Brazil activate an emergency response framework as dengue cases exceed the prior full-year record; vector-control programs expand.',
    source: 'Reuters',
    url: 'https://www.reuters.com/world/americas/',
    isSeed: true,
    publishedAt: minutesAgo(240),
    city: 'São Paulo',
    country: 'Brazil',
    countryCode: 'BR',
    lat: -23.5505,
    lng: -46.6333,
    topic: 'Health',
    severity: 'Medium',
    impactedSymbols: ['EWZ', 'TAK'],
    impactedKeywords: ['brazil', 'dengue', 'outbreak'],
  },
  {
    id: 'isr-seed-013',
    headline: 'Saudi Aramco signals capex trim, returns focus on dividends',
    summary:
      'Aramco guidance highlights a lower medium-term capex envelope, with management flagging buybacks and sustained dividend payouts.',
    source: 'Bloomberg',
    url: 'https://www.bloomberg.com/energy',
    isSeed: true,
    publishedAt: minutesAgo(275),
    city: 'Riyadh',
    country: 'Saudi Arabia',
    countryCode: 'SA',
    lat: 24.7136,
    lng: 46.6753,
    topic: 'Energy',
    severity: 'Medium',
    impactedSymbols: ['ARAMCO', 'XOM', 'CVX'],
    impactedKeywords: ['aramco', 'saudi', 'oil', 'capex'],
  },
  {
    id: 'isr-seed-014',
    headline: 'Indian central bank holds rates, tweaks liquidity framework',
    summary:
      'RBI keeps the repo rate unchanged but signals a calibrated shift toward neutral stance; dollar-rupee pair edges lower on the announcement.',
    source: 'Livemint',
    url: 'https://www.livemint.com/',
    isSeed: true,
    publishedAt: minutesAgo(310),
    city: 'Mumbai',
    country: 'India',
    countryCode: 'IN',
    lat: 19.076,
    lng: 72.8777,
    topic: 'Economy',
    severity: 'Medium',
    impactedSymbols: ['INDA', 'USDINR'],
    impactedKeywords: ['rbi', 'india', 'rupee', 'repo rate'],
  },
  {
    id: 'isr-seed-015',
    headline: 'Kyiv reports drone strikes targeting grain logistics',
    summary:
      'Ukrainian authorities describe overnight drone strikes on Black Sea grain export infrastructure; wheat futures climb in early European trade.',
    source: 'Reuters',
    url: 'https://www.reuters.com/world/europe/',
    isSeed: true,
    publishedAt: minutesAgo(345),
    city: 'Kyiv',
    country: 'Ukraine',
    countryCode: 'UA',
    lat: 50.4501,
    lng: 30.5234,
    topic: 'Conflict',
    severity: 'High',
    impactedSymbols: ['WEAT', 'ADM'],
    impactedKeywords: ['ukraine', 'wheat', 'grain', 'black sea'],
  },
  {
    id: 'isr-seed-016',
    headline: 'Mexico proposes mining royalty reform',
    summary:
      'A draft bill raises royalties on lithium and rare earths, amid a push to bring more of the battery supply chain onshore.',
    source: 'Reuters',
    url: 'https://www.reuters.com/world/americas/',
    isSeed: true,
    publishedAt: minutesAgo(380),
    city: 'Mexico City',
    country: 'Mexico',
    countryCode: 'MX',
    lat: 19.4326,
    lng: -99.1332,
    topic: 'Economy',
    severity: 'Low',
    impactedSymbols: ['EWW', 'LIT'],
    impactedKeywords: ['mexico', 'mining', 'lithium', 'royalty'],
  },
  {
    id: 'isr-seed-017',
    headline: 'Singapore MAS tightens rules on retail crypto distribution',
    summary:
      'Updated guidelines restrict incentives for retail participation and mandate enhanced disclosures; large exchanges accept the new bar.',
    source: 'Channel News Asia',
    url: 'https://www.channelnewsasia.com/business',
    isSeed: true,
    publishedAt: minutesAgo(420),
    city: 'Singapore',
    country: 'Singapore',
    countryCode: 'SG',
    lat: 1.3521,
    lng: 103.8198,
    topic: 'Tech',
    severity: 'Low',
    impactedSymbols: ['COIN', 'BTC'],
    impactedKeywords: ['singapore', 'mas', 'crypto', 'retail'],
  },
  {
    id: 'isr-seed-018',
    headline: 'Iran FX parallel market under pressure after US sanctions note',
    summary:
      'Fresh OFAC designations targeting shadow-banking intermediaries trigger renewed pressure on the parallel rial; state media dismisses the action.',
    source: 'AP News',
    url: 'https://apnews.com/middle-east',
    isSeed: true,
    publishedAt: minutesAgo(455),
    city: 'Tehran',
    country: 'Iran',
    countryCode: 'IR',
    lat: 35.6892,
    lng: 51.389,
    topic: 'Geopolitics',
    severity: 'High',
    impactedSymbols: ['USO', 'DXY'],
    impactedKeywords: ['iran', 'sanctions', 'ofac', 'rial'],
  },
  {
    id: 'isr-seed-019',
    headline: 'Australia posts stronger-than-expected jobs print',
    summary:
      'Full-time employment surprises to the upside; the AUD strengthens modestly while swap markets trim rate cut expectations.',
    source: 'ABC News',
    url: 'https://www.abc.net.au/news/business',
    isSeed: true,
    publishedAt: minutesAgo(490),
    city: 'Sydney',
    country: 'Australia',
    countryCode: 'AU',
    lat: -33.8688,
    lng: 151.2093,
    topic: 'Economy',
    severity: 'Low',
    impactedSymbols: ['EWA', 'AUDUSD'],
    impactedKeywords: ['australia', 'jobs', 'rba'],
  },
  {
    id: 'isr-seed-020',
    headline: 'South Africa energy sector reports further grid stabilization',
    summary:
      'Eskom reports a second consecutive week without load-shedding; independent monitors note underlying plant performance still fragile.',
    source: 'News24',
    url: 'https://www.news24.com/business',
    isSeed: true,
    publishedAt: minutesAgo(540),
    city: 'Johannesburg',
    country: 'South Africa',
    countryCode: 'ZA',
    lat: -26.2041,
    lng: 28.0473,
    topic: 'Energy',
    severity: 'Low',
    impactedSymbols: ['EZA'],
    impactedKeywords: ['south africa', 'eskom', 'load shedding'],
  },
];

// Region-group convenience buckets users can select in the UI. Server-side we
// fan these out into the real list of ISO codes.
export const REGION_GROUPS = {
  US: ['US'],
  EU: ['DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'PL', 'SE', 'IE', 'FI', 'AT', 'PT', 'GR', 'DK'],
  GB: ['GB'],
  ME: ['SA', 'AE', 'IR', 'IQ', 'IL', 'TR', 'YE', 'QA', 'JO', 'LB', 'EG'],
  CN: ['CN', 'HK', 'TW'],
  RU: ['RU', 'UA', 'BY'],
  IN: ['IN'],
  JP: ['JP', 'KR'],
  LATAM: ['BR', 'AR', 'MX', 'CL', 'CO', 'PE', 'VE'],
  AF: ['ZA', 'NG', 'KE', 'EG', 'ET'],
  OC: ['AU', 'NZ'],
};

function expandCountries(codes) {
  const out = new Set();
  for (const raw of codes) {
    const c = (raw || '').toUpperCase();
    const group = REGION_GROUPS[c];
    if (group) {
      for (const iso of group) out.add(iso);
    } else if (c) {
      out.add(c);
    }
  }
  return out;
}

function windowToMillis(win) {
  switch (win) {
    case '1h':
      return 60 * 60 * 1000;
    case '6h':
      return 6 * 60 * 60 * 1000;
    case '24h':
      return 24 * 60 * 60 * 1000;
    case '7d':
      return 7 * 24 * 60 * 60 * 1000;
    default:
      return 24 * 60 * 60 * 1000;
  }
}

/**
 * @param {{ countries?: string[], topic?: string, minSeverity?: string, window?: string }} filters
 * @returns {IsrEvent[]}
 */
export function getSeedIsrEvents(filters = {}) {
  const {
    countries = [],
    topic = 'All',
    minSeverity = 'Low',
    window: win = '24h',
  } = filters;

  const expanded = countries.length > 0 ? expandCountries(countries) : null;
  const threshold = SEVERITY_ORDER[minSeverity] ?? 0;
  const cutoff = Date.now() - windowToMillis(win);

  return SEED_EVENTS.filter((e) => {
    if (expanded && !expanded.has((e.countryCode || '').toUpperCase())) return false;
    if (topic && topic !== 'All' && e.topic !== topic) return false;
    if ((SEVERITY_ORDER[e.severity] ?? 0) < threshold) return false;
    if (new Date(e.publishedAt).getTime() < cutoff) return false;
    return true;
  }).sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

export function getAllSeedIsrEvents() {
  return SEED_EVENTS;
}

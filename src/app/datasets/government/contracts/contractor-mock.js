/**
 * Client-side MOCK ENRICHMENT for the contractor quick-view + dossier
 * (gov-contracts dataset only; no other page imports this). Real award
 * aggregates come from the page's rollup of usaspending rows — everything on
 * the market/capitol side here (price series, congressional activity, platform
 * signals, KPIs like book-to-bill) is mock until those datasets ship.
 * Deterministic throughout (seeded-sin, charcode hashing, zero randomness) so
 * SSR and client renders match byte-for-byte.
 */

export function seededSeries({ seed, n, base, amp, drift = 0 }) {
  return Array.from({ length: n }, (_, i) =>
    Math.max(0, base + amp * Math.sin(seed + i * 0.9) + drift * i),
  );
}

export function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// FY axis helper: obligations series index 0 = FY 2008 ("FY '08").
export function fyLabel(index, firstFy = 8) {
  return `FY '${String(firstFy + index).padStart(2, '0')}`;
}

// Seed chosen so the sine crest lands exactly on index 16 (FY '24) and the
// curve cools afterwards — matching the "off the FY '24 peak" signal copy.
// peak value = base + amp + drift * 16 = 24.2 + 14 + 14.4 = $52.6B.
const LMT_OBLIGATION_SEED = Math.PI / 2 - 16 * 0.9 + 4 * Math.PI;

const DOD_PRIME_PEERS = [
  { t: 'BA', name: 'The Boeing Company', v: '$411.4B' },
  { t: 'RTX', name: 'RTX Corporation', v: '$281.4B' },
  { t: 'NOC', name: 'Northrop Grumman', v: '$181.9B' },
  { t: 'GD', name: 'General Dynamics', v: '$134.0B' },
];

const PROVENANCE = "USAspending FY '26 Q3 · updated Sep 12, 2026";
const PRIVATE_NOTE = 'Privately held, no listed security. Track exposure via public peers below.';
const SOURCES_LINE =
  'Sources: USAspending.gov, SEC EDGAR, Senate LDA filings, House/Senate PTR disclosures.';
const PLATFORM_FOOTNOTE =
  'Signal strength shown for datasets loaded on this page. Others activate as data ships.';

const LMT = {
  slug: 'lockheed-martin-corporation',
  name: 'Lockheed Martin Corporation',
  monogram: 'LM',
  ticker: 'LMT',
  exchange: 'NYSE',
  isPublic: true,
  rankChip: '#1 DOD RECIPIENT',
  meta: 'Department of Defense (primary) · Aerospace & Defense · Bethesda, MD',
  heroMeta:
    'Aerospace & Defense · Bethesda, MD · 122,000 employees · Prime since 1995 · CAGE 1J9L4',
  provenance: PROVENANCE,
  lifetime: '$599.9B',
  rankLine: { rank: '#1', rest: 'of 12,400 DoD primes' },
  stats: [
    { label: 'Total awarded', value: '$599.9B', sub: "FY '08 through FY '26" },
    { label: 'Awards', value: '606,111', sub: 'individual award actions' },
    { label: 'Avg contract', value: '$990K', sub: 'median $84K' },
    { label: 'YoY obligations', value: '−12.4%', sub: "FY '26 vs FY '25", neg: true },
  ],
  firstFy: 8, // FY '08
  obligations: seededSeries({ seed: LMT_OBLIGATION_SEED, n: 19, base: 24.2, amp: 14, drift: 0.9 }),
  peakIndex: 16, // FY '24
  peakCallout: "FY '24 PEAK $52.6B",
  chartEyebrow: 'AWARD VALUE OVER TIME',
  agencies: [
    { name: 'Dept. of Defense', value: '$594.5B', pct: '99.1%', w: 1 },
    { name: 'NASA', value: '$2.5B', pct: '0.4%', w: 0.05 },
    { name: 'Natl. Science Fdn.', value: '$873.4M', pct: '0.2%', w: 0.03 },
    { name: 'Social Security Adm.', value: '$841.2M', pct: '0.1%', w: 0.028 },
    { name: 'Dept. of Transportation', value: '$441.5M', pct: '0.1%', w: 0.02 },
    { name: 'Dept. of Commerce', value: '$403.0M', pct: '<0.1%', w: 0.018 },
    { name: 'Dept. of Justice', value: '$221.9M', pct: '<0.1%', w: 0.012 },
    { name: 'GSA', value: '$172.2M', pct: '<0.1%', w: 0.008 },
  ],
  agenciesMore: '+ 5 more agencies · $2.3B combined',
  quote: {
    price: '$472.10',
    change: '+$3.82 today',
    y1: '+18.4%',
    series: seededSeries({ seed: 1.7, n: 40, base: 430, amp: 18, drift: 1.1 }),
  },
  marketNote: 'Govt revenue share ~96% · directly exposed to this data',
  peersLabel: 'SIMILAR RECIPIENTS · DOD PRIMES',
  peers: DOD_PRIME_PEERS,
  signal: "Signal: obligations cooling off the FY '24 peak. Watch Q1 sustainment renewals.",

  // ── dossier-only enrichment ──
  kpis: [
    { label: "FY '26 OBLIGATIONS", value: '$38.2B', sub: '−12.4% YoY', tone: 'neg' },
    { label: 'ACTIVE CONTRACTS', value: '3,214', sub: '941 expiring in 12 mo' },
    { label: 'AVG CONTRACT', value: '$990K', sub: 'median $84K' },
    { label: 'BOOK-TO-BILL', value: '1.08×', sub: 'backlog growing', tone: 'pos' },
    { label: 'COMPETED SHARE', value: '34%', sub: '66% sole-source' },
    { label: 'GOVT REV. SHARE', value: '~96%', sub: 'of company revenue' },
  ],
  vehicleMix: {
    label: 'CONTRACT VEHICLE MIX',
    segments: [
      { name: 'Definitive', pct: 62 },
      { name: 'IDIQ', pct: 28 },
      { name: 'BPA', pct: 6 },
      { name: 'Other', pct: 4 },
    ],
  },
  pricingMix: {
    label: 'PRICING STRUCTURE',
    segments: [
      { name: 'Fixed-price', pct: 54 },
      { name: 'Cost-plus', pct: 38 },
      { name: 'T&M', pct: 8 },
    ],
  },
  marketStats: [
    { label: 'MKT CAP', value: '$108.4B' },
    { label: 'P/E FWD', value: '16.8×' },
    { label: 'DIV YIELD', value: '2.9%' },
    { label: 'BACKLOG', value: '$166B' },
  ],
  // Fictional members — the real Capitol Watch dataset replaces these.
  congress: [
    {
      member: 'J. Whitmore',
      detail: 'R · TX-12',
      tx: 'PURCHASE',
      amount: '$15K–$50K',
      filed: 'SEP 02',
    },
    {
      member: 'D. Okafor',
      detail: 'D · VA-08',
      tx: 'PURCHASE',
      amount: '$1K–$15K',
      filed: 'AUG 27',
    },
    {
      member: 'M. Castellanos',
      detail: 'D · CA-25',
      tx: 'SALE',
      amount: '$50K–$100K',
      filed: 'AUG 19',
    },
    {
      member: 'R. Beaumont',
      detail: 'R · AL-05',
      tx: 'PURCHASE',
      amount: '$15K–$50K',
      filed: 'AUG 04',
    },
  ],
  // [text, bold] spans — rendered with 600-weight <span>s, never em dashes.
  congressSummary: [
    ['3 buys vs 1 sell', true],
    [' · net bullish · Lobbying: ', false],
    ['$3.4M last quarter', true],
    [' · ', false],
    ['44 registered lobbyists', true],
  ],
  platformSignals: [
    { name: 'Capitol Watch', score: 92, live: true },
    { name: 'Regulatory Winds', score: 41 },
    { name: 'Titans Shadow', score: 18 },
    { name: 'Eyes Above', score: 12 },
    { name: 'Consumer Whispers', score: 7 },
    { name: 'The Hive', score: 4 },
    { name: 'Global Empire Lighthouse', score: 2 },
  ],
  platformFootnote: PLATFORM_FOOTNOTE,
  recentAwards: [
    {
      date: 'SEP 04',
      agency: 'DoD · Navy',
      desc: 'Trident II D5 missile production & deployed systems support',
      vehicle: 'SOLE-SOURCE',
      amount: '$2.10B',
    },
    {
      date: 'AUG 22',
      agency: 'DoD · Air Force',
      desc: 'F-35 Lot 20 sustainment & spares, CONUS depots',
      vehicle: 'IDIQ TASK',
      amount: '$1.44B',
    },
    {
      date: 'AUG 09',
      agency: 'DoD · Army',
      desc: "PAC-3 MSE interceptor production, FY '27 long-lead",
      vehicle: 'DEFINITIVE',
      amount: '$946.0M',
    },
    {
      date: 'JUL 28',
      agency: 'NASA',
      desc: 'Orion crew module production, Artemis VI–VIII',
      vehicle: 'COST-PLUS',
      amount: '$611.2M',
    },
    {
      date: 'JUL 15',
      agency: 'DoD · Space Force',
      desc: 'Next-Gen OPIR GEO block, space vehicles 5–6',
      vehicle: 'DEFINITIVE',
      amount: '$488.5M',
    },
  ],
  awardsAllLink: 'View all 606,111 ›',
  sources: SOURCES_LINE,
};

const REGISTRY = { [LMT.slug]: LMT };

/* ── deterministic fallback generator ─────────────────────────────────────
   Any recipient the registry doesn't know resolves to a payload derived
   entirely from the slug's charcodes, so the dossier route works for every
   slug and SSR/client output is identical. */

function hashSlug(slug) {
  let h = 7;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) % 9973;
  return h;
}

function titleCase(str) {
  return str
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

const fmtInt = (n) => n.toLocaleString('en-US');

// Format a value expressed in $B down to B/M/K.
function fmtMoney(billions) {
  if (billions >= 1) return `$${billions.toFixed(1)}B`;
  const m = billions * 1000;
  if (m >= 1) return `$${m.toFixed(1)}M`;
  return `$${Math.max(1, Math.round(m * 1000))}K`;
}

const FALLBACK_AGENCY_POOL = [
  'Dept. of Defense',
  'Dept. of Energy',
  'NASA',
  'Dept. of Homeland Security',
  'GSA',
  'Health & Human Services',
  'Dept. of Veterans Affairs',
  'Dept. of Commerce',
];
const FALLBACK_AGENCY_SHARES = [0.62, 0.21, 0.09, 0.05, 0.015, 0.01, 0.003, 0.002];

const FALLBACK_MEMBER_POOL = [
  ['A. Hollis', 'R · OH-04'],
  ['T. Nakamura', 'D · WA-09'],
  ['C. Reyes', 'D · NM-02'],
  ['S. Whitfield', 'R · GA-11'],
  ['E. Marsh', 'R · MO-07'],
  ['L. Duvall', 'D · IL-14'],
];
const FALLBACK_AMOUNT_POOL = ['$1K–$15K', '$15K–$50K', '$50K–$100K', '$100K–$250K'];
const FALLBACK_FILED_POOL = ['SEP 05', 'AUG 30', 'AUG 21', 'AUG 12'];

const FALLBACK_AWARD_DESCS = [
  'Logistics & sustainment support services',
  'Engineering services, task order recompete',
  'IT modernization & systems integration',
  'Facilities operations & maintenance',
  'Professional support services, follow-on',
];
const FALLBACK_VEHICLES = ['DEFINITIVE', 'IDIQ TASK', 'BPA CALL', 'SOLE-SOURCE', 'COST-PLUS'];
const FALLBACK_AWARD_DATES = ['SEP 03', 'AUG 24', 'AUG 10', 'JUL 29', 'JUL 16'];

function generateFallback(slug, rawName) {
  const h = hashSlug(slug);
  const seed = (h % 628) / 100; // 0..6.27 rad
  const words = slug.split('-').filter(Boolean);
  const name =
    rawName && rawName !== slug
      ? titleCase(rawName)
      : words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Unknown Recipient';
  const monogram = (words[0]?.[0] || 'X').toUpperCase() + (words[1]?.[0] || '').toUpperCase();

  const totalB = 1.2 + (h % 90) / 4; // $1.2B .. $23.6B lifetime
  const awardCount = 1200 + (h % 800) * 41;
  const avgK = 120 + (h % 40) * 18;
  const yoy = (h % 240) / 10 - 12; // −12.0 .. +11.9
  const yoyNeg = yoy < 0;
  const yoyStr = `${yoyNeg ? '−' : '+'}${Math.abs(yoy).toFixed(1)}%`;

  const base = 2 + totalB * 0.08;
  const obligations = seededSeries({ seed, n: 19, base, amp: base * 0.6, drift: base * 0.035 });
  const peakIndex = obligations.indexOf(Math.max(...obligations));
  const latest = obligations[obligations.length - 1];

  const rot = h % FALLBACK_AGENCY_POOL.length;
  const agencies = FALLBACK_AGENCY_SHARES.map((share, i) => ({
    name: FALLBACK_AGENCY_POOL[(rot + i) % FALLBACK_AGENCY_POOL.length],
    value: fmtMoney(totalB * share),
    pct: share >= 0.001 ? `${(share * 100).toFixed(1)}%` : '<0.1%',
    w: share / FALLBACK_AGENCY_SHARES[0],
  }));
  const tailB = FALLBACK_AGENCY_SHARES.slice(4).reduce((a, s) => a + s, 0) * totalB;

  const buys = 2 + (h % 3); // 2..4 of 4
  const congress = FALLBACK_MEMBER_POOL.slice(0, 4).map(([member, detail], i) => ({
    member,
    detail,
    tx: i < buys ? 'PURCHASE' : 'SALE',
    amount: FALLBACK_AMOUNT_POOL[(h + i) % FALLBACK_AMOUNT_POOL.length],
    filed: FALLBACK_FILED_POOL[i],
  }));
  const netWord = buys > 2 ? 'net bullish' : buys < 2 ? 'net bearish' : 'net neutral';
  const lobbyM = (0.2 + (h % 30) / 10).toFixed(1);
  const lobbyists = (h % 50) + 6;

  const platformBases = [90, 45, 20, 14, 8, 5, 2];
  const platformNames = [
    'Capitol Watch',
    'Regulatory Winds',
    'Titans Shadow',
    'Eyes Above',
    'Consumer Whispers',
    'The Hive',
    'Global Empire Lighthouse',
  ];
  const platformSignals = platformNames.map((pname, i) => {
    const score = Math.round(platformBases[i] * (0.4 + ((h >> i) % 7) / 7));
    return { name: pname, score, live: i === 0 && score >= 50 };
  });

  const v1 = 38 + (h % 28);
  const v2 = Math.round((100 - v1) * 0.6);
  const v3 = Math.round((100 - v1) * 0.28);
  const p1 = 45 + (h % 25);
  const p2 = Math.round((100 - p1) * 0.8);
  const bookToBill = 0.82 + (h % 60) / 100;
  const competed = 15 + (h % 70);

  const recentAwards = FALLBACK_AWARD_DATES.map((date, i) => ({
    date,
    agency: agencies[i % 3].name,
    desc: FALLBACK_AWARD_DESCS[(h + i) % FALLBACK_AWARD_DESCS.length],
    vehicle: FALLBACK_VEHICLES[(h + i) % FALLBACK_VEHICLES.length],
    amount: fmtMoney(totalB * [0.008, 0.006, 0.0045, 0.003, 0.002][i]),
  }));

  return {
    slug,
    name,
    monogram,
    ticker: null,
    exchange: null,
    isPublic: false,
    rankChip: `#${(h % 480) + 12} FEDERAL RECIPIENT`,
    meta: `${agencies[0].name} (primary) · Federal contractor · United States`,
    heroMeta: `Federal contractor · United States · Prime since ${2008 + (h % 10)} · profile from award records`,
    provenance: PROVENANCE,
    lifetime: fmtMoney(totalB),
    rankLine: { rank: `#${(h % 480) + 12}`, rest: 'of 12,400 federal primes' },
    stats: [
      { label: 'Total awarded', value: fmtMoney(totalB), sub: "FY '08 through FY '26" },
      { label: 'Awards', value: fmtInt(awardCount), sub: 'individual award actions' },
      {
        label: 'Avg contract',
        value: `$${fmtInt(avgK)}K`,
        sub: `median $${fmtInt(Math.round(avgK / 8))}K`,
      },
      { label: 'YoY obligations', value: yoyStr, sub: "FY '26 vs FY '25", neg: yoyNeg },
    ],
    firstFy: 8,
    obligations,
    peakIndex,
    peakCallout: `${fyLabel(peakIndex).toUpperCase()} PEAK ${fmtMoney(obligations[peakIndex])}`,
    chartEyebrow: 'AWARD VALUE OVER TIME',
    agencies,
    agenciesMore: `+ 4 more agencies · ${fmtMoney(tailB)} combined`,
    quote: null,
    marketNote: PRIVATE_NOTE,
    peersLabel: 'SIMILAR RECIPIENTS · TOP PRIMES',
    peers: DOD_PRIME_PEERS,
    signal: yoyNeg
      ? "Signal: obligations easing versus FY '25. Watch renewal cadence into Q1."
      : "Signal: obligations building versus FY '25. Watch new award flow into Q1.",
    kpis: [
      {
        label: "FY '26 OBLIGATIONS",
        value: fmtMoney(latest),
        sub: `${yoyStr} YoY`,
        tone: yoyNeg ? 'neg' : 'pos',
      },
      {
        label: 'ACTIVE CONTRACTS',
        value: fmtInt(80 + (h % 3000)),
        sub: `${fmtInt(20 + (h % 900))} expiring in 12 mo`,
      },
      {
        label: 'AVG CONTRACT',
        value: `$${fmtInt(avgK)}K`,
        sub: `median $${fmtInt(Math.round(avgK / 8))}K`,
      },
      {
        label: 'BOOK-TO-BILL',
        value: `${bookToBill.toFixed(2)}×`,
        sub: bookToBill >= 1 ? 'backlog growing' : 'backlog thinning',
        tone: bookToBill >= 1 ? 'pos' : 'neg',
      },
      { label: 'COMPETED SHARE', value: `${competed}%`, sub: `${100 - competed}% sole-source` },
      { label: 'GOVT REV. SHARE', value: `~${(h % 60) + 30}%`, sub: 'of company revenue' },
    ],
    vehicleMix: {
      label: 'CONTRACT VEHICLE MIX',
      segments: [
        { name: 'Definitive', pct: v1 },
        { name: 'IDIQ', pct: v2 },
        { name: 'BPA', pct: v3 },
        { name: 'Other', pct: Math.max(0, 100 - v1 - v2 - v3) },
      ],
    },
    pricingMix: {
      label: 'PRICING STRUCTURE',
      segments: [
        { name: 'Fixed-price', pct: p1 },
        { name: 'Cost-plus', pct: p2 },
        { name: 'T&M', pct: Math.max(0, 100 - p1 - p2) },
      ],
    },
    marketStats: null,
    congress,
    congressSummary: [
      [`${buys} buys vs ${4 - buys} ${4 - buys === 1 ? 'sell' : 'sells'}`, true],
      [` · ${netWord} · Lobbying: `, false],
      [`$${lobbyM}M last quarter`, true],
      [' · ', false],
      [`${lobbyists} registered lobbyists`, true],
    ],
    platformSignals,
    platformFootnote: PLATFORM_FOOTNOTE,
    recentAwards,
    awardsAllLink: `View all ${fmtInt(awardCount)} ›`,
    sources: SOURCES_LINE,
  };
}

export function getContractor(slugOrName) {
  const raw = String(slugOrName || '');
  const slug = slugify(raw);
  return REGISTRY[slug] ?? generateFallback(slug, raw);
}

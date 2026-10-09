/**
 * Industry news for the Sonar landing band's news card.
 *
 * A ping on Lockheed Martin should surface defense-industry coverage even when
 * the article never names Lockheed: a Northrop munitions contract, a Pentagon
 * budget story, a peer's CEO change. The card's title follows the company's
 * industry ("Defense Industry Relevant News"), so the industry label and the
 * matching rules live together here.
 *
 * Matching runs against public.news_articles_cache (the cached feed the city
 * news surfaces already read), over titles only. Titles are the honest signal:
 * descriptions mention every adjacent theme, and the first draft of this that
 * matched descriptions pulled in a card-issuer analyst note and a local payroll
 * story. Candidates are fetched with a broad ilike and then confirmed with a
 * word-boundary regex, because a bare ilike on "nato" matches "senator".
 */

/* FMP's `industry` strings (and Finnhub's finnhubIndustry) map onto a short
   label plus the terms that mark an article as belonging to that industry.
   `peers` are company names: a story about a peer is industry news. Anything
   unlisted falls back to the industry string itself as both label and term. */
const INDUSTRIES = [
  {
    match: /aerospace|defen[cs]e/i,
    label: 'Defense',
    terms: [
      'defense',
      'defence',
      'Pentagon',
      'Department of Defense',
      'DoD',
      'military',
      'missile',
      'munitions',
      'NATO',
      'Army',
      'Navy',
      'Air Force',
      'Space Force',
      'fighter jet',
      'F-35',
      'hypersonic',
      'warship',
      'shipbuilding',
      'arms',
      'aerospace',
    ],
    peers: [
      'Lockheed',
      'Northrop',
      'General Dynamics',
      'Raytheon',
      'RTX',
      'L3Harris',
      'Huntington Ingalls',
      'Kratos',
      'Anduril',
      'BAE Systems',
      'Leidos',
      'Boeing Defense',
      'Palantir',
    ],
  },
  {
    match: /semiconductor/i,
    label: 'Semiconductor',
    terms: ['semiconductor', 'chip', 'chips', 'chipmaker', 'foundry', 'wafer', 'TSMC', 'GPU'],
    peers: ['Nvidia', 'AMD', 'Intel', 'Broadcom', 'Qualcomm', 'Micron', 'ASML', 'Arm Holdings'],
  },
  {
    match: /software|information technology|internet content/i,
    label: 'Software',
    terms: ['software', 'cloud', 'SaaS', 'AI model', 'artificial intelligence', 'cybersecurity'],
    peers: ['Microsoft', 'Oracle', 'Salesforce', 'Adobe', 'ServiceNow', 'Google', 'Alphabet'],
  },
  {
    match: /bank|capital markets|financial/i,
    label: 'Banking',
    terms: ['bank', 'banks', 'lender', 'Federal Reserve', 'Fed', 'interest rate', 'deposits'],
    peers: ['JPMorgan', 'Goldman', 'Morgan Stanley', 'Citigroup', 'Wells Fargo', 'Bank of America'],
  },
  {
    match: /oil|gas|energy/i,
    label: 'Energy',
    terms: ['oil', 'crude', 'natural gas', 'LNG', 'OPEC', 'refinery', 'drilling', 'pipeline'],
    peers: ['Exxon', 'Chevron', 'ConocoPhillips', 'Shell', 'BP', 'Occidental'],
  },
  {
    match: /pharma|biotech|drug/i,
    label: 'Pharma',
    terms: ['drug', 'FDA', 'biotech', 'pharmaceutical', 'clinical trial', 'vaccine'],
    peers: ['Pfizer', 'Eli Lilly', 'Merck', 'AbbVie', 'Johnson & Johnson', 'Novo Nordisk'],
  },
  {
    match: /auto|vehicle/i,
    label: 'Auto',
    terms: ['automaker', 'EV', 'electric vehicle', 'auto', 'car sales', 'tariff'],
    peers: ['Tesla', 'Ford', 'General Motors', 'Stellantis', 'Toyota', 'Rivian'],
  },
  {
    match: /retail|department stores|discount stores/i,
    label: 'Retail',
    terms: ['retail', 'retailer', 'consumer spending', 'holiday sales', 'store'],
    peers: ['Walmart', 'Target', 'Costco', 'Amazon', 'Home Depot'],
  },
  {
    match: /consumer electronics|hardware/i,
    label: 'Hardware',
    terms: ['smartphone', 'iPhone', 'PC', 'devices', 'hardware'],
    peers: ['Apple', 'Samsung', 'Dell', 'HP', 'Sony'],
  },
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const clean = (s) =>
  String(s || '')
    .replace(/[,()%*\\]/g, ' ')
    .trim();

/**
 * @param {string|null} industry  FMP/Finnhub industry string, e.g. "Aerospace & Defense"
 * @returns {{ label: string, name: string, terms: string[] } | null}
 */
export function industryProfile(industry) {
  const name = String(industry || '').trim();
  if (!name) return null;
  const hit = INDUSTRIES.find((i) => i.match.test(name));
  if (hit) return { label: hit.label, name, terms: [...hit.terms, ...hit.peers] };
  /* Unlisted: the industry's own words are the terms ("Railroads" matches
     railroad stories), and its first word is the label. */
  const words = name
    .split(/[\s&/,-]+/)
    .filter((w) => w.length > 3 && !/^(and|services|products|other)$/i.test(w));
  if (!words.length) return null;
  return { label: words[0], name, terms: words };
}

/** "Defense Industry Relevant News". */
export function industryNewsTitle(profile) {
  return profile?.label ? `${profile.label} Industry Relevant News` : 'Relevant News';
}

/* Same story syndicated three times ("General Dynamics taps insider ... as
   next CEO" ran in three outlets) collapses to its first copy. */
const storyKey = (t) =>
  String(t || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 7)
    .join(' ');

/**
 * Recent industry stories from the cached news feed. Fail-soft: any error is
 * an empty list, never a lost dossier.
 *
 * @param {object} admin   service-role Supabase client
 * @param {object} profile result of industryProfile()
 * @param {{ days?: number, limit?: number }} opts
 */
export async function fetchIndustryNews(admin, profile, { days = 21, limit = 3 } = {}) {
  if (!admin || !profile?.terms?.length) return [];
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const terms = profile.terms.map(clean).filter(Boolean);
    const { data, error } = await admin
      .from('news_articles_cache')
      .select('title, article_url, publisher_name, published_utc')
      .gte('published_utc', since)
      .or(terms.map((t) => `title.ilike.%${t}%`).join(','))
      .order('published_utc', { ascending: false })
      .limit(40);
    if (error || !Array.isArray(data)) return [];

    /* Case-sensitive for acronyms (NATO, DoD, RTX, EV) so "senator" and
       "every" do not match; case-insensitive for ordinary words. */
    const res = terms.map((t) =>
      /^[A-Z0-9-]{2,5}$/.test(t)
        ? new RegExp(`\\b${escapeRe(t)}\\b`)
        : new RegExp(`\\b${escapeRe(t)}\\b`, 'i'),
    );
    const seen = new Set();
    const out = [];
    for (const r of data) {
      if (!r?.title || !r?.article_url) continue;
      if (!res.some((re) => re.test(r.title))) continue;
      const key = storyKey(r.title);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        title: String(r.title),
        url: String(r.article_url),
        source: String(r.publisher_name || 'News'),
        publishedAt: r.published_utc || null,
        scope: 'industry',
      });
      if (out.length >= limit) break;
    }
    return out;
  } catch (e) {
    console.error('[sonar-industry-news] failed:', e?.message);
    return [];
  }
}

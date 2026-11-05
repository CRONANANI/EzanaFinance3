/**
 * The AI infrastructure frame for Sonar's strategic positioning assessment
 * (Nov 2026). "How is Microsoft positioning itself to capture value from the
 * AI infrastructure boom?" is answered against three reference structures:
 *
 *   HYPERSCALERS     the listed companies building AI compute at scale, with
 *                    their SEC CIKs (so their filings are read by CIK, never
 *                    by a ticker string) and the reported segment line that
 *                    carries their cloud revenue
 *   AI_VALUE_CHAIN   Ezana's map of the value chain, layer by layer, with
 *                    representative listed companies in each. An analytical
 *                    framework, not an exhaustive list and not a ranking
 *   POSITIONS        where a company operates in that chain, product by
 *                    product, as the company itself names its products
 *
 * Pure and client-safe. Unit-tested in scripts/check-sonar-positioning.mjs.
 */

/** Listed hyperscalers and AI clouds. `cloud` matches the segment line that
    carries cloud revenue in the company's reported segments (null: the
    company reports no cloud line, so only its capital spending is shown). */
export const HYPERSCALERS = [
  {
    ticker: 'MSFT',
    cik: '789019',
    name: 'Microsoft',
    cloud: /azure|intelligent cloud|server products and cloud services|agents and infra/i,
  },
  {
    ticker: 'AMZN',
    cik: '1018724',
    name: 'Amazon',
    cloud: /amazon web services|^aws$|\baws\b/i,
  },
  { ticker: 'GOOGL', cik: '1652044', name: 'Alphabet', cloud: /google cloud/i },
  { ticker: 'META', cik: '1326801', name: 'Meta Platforms', cloud: null },
  {
    ticker: 'ORCL',
    cik: '1341439',
    name: 'Oracle',
    cloud: /cloud services and license support|^cloud$|cloud services/i,
  },
];

export const isHyperscaler = (ticker) =>
  HYPERSCALERS.some((h) => h.ticker === String(ticker || '').toUpperCase());

/** The other hyperscalers, as peers for a hyperscaler subject. */
export function hyperscalerPeers(ticker) {
  const t = String(ticker || '').toUpperCase();
  if (!isHyperscaler(t)) return [];
  return HYPERSCALERS.filter((h) => h.ticker !== t).map((h) => ({
    ticker: h.ticker,
    name: h.name,
  }));
}

/**
 * The cloud line in one period's reported segments, or null.
 * @param {Record<string, number>} segments  segment name -> revenue
 */
export function cloudLine(ticker, segments) {
  const h = HYPERSCALERS.find((x) => x.ticker === String(ticker || '').toUpperCase());
  if (!h?.cloud) return null;
  const hits = Object.entries(segments || {})
    .map(([k, v]) => [k, Number(v)])
    .filter(([k, v]) => h.cloud.test(k) && Number.isFinite(v) && v > 0);
  if (!hits.length) return null;
  /* The most specific match: an exact cloud name beats a broad segment. */
  hits.sort((a, b) => b[1] - a[1]);
  const exact = hits.find(([k]) => /azure|web services|aws|google cloud/i.test(k));
  const [label, value] = exact || hits[0];
  return { label, value };
}

/** Ezana's AI infrastructure value chain, upstream to downstream. */
export const AI_VALUE_CHAIN = [
  {
    id: 'energy',
    label: 'Energy and power',
    role: 'Electricity generation, grid connection and power contracts',
    companies: ['CEG', 'VST', 'NEE', 'GEV'],
  },
  {
    id: 'electrical',
    label: 'Electrical and cooling equipment',
    role: 'Power distribution, backup and thermal management inside the data center',
    companies: ['VRT', 'ETN', 'GEV'],
  },
  {
    id: 'semiconductors',
    label: 'Accelerators, memory and CPUs',
    role: 'GPUs, custom accelerators, high-bandwidth memory and processors',
    companies: ['NVDA', 'AMD', 'AVGO', 'MRVL', 'MU', 'INTC'],
  },
  {
    id: 'systems',
    label: 'Servers, networking and storage',
    role: 'The systems the chips are built into and the fabric that connects them',
    companies: ['DELL', 'SMCI', 'HPE', 'ANET', 'CSCO'],
  },
  {
    id: 'data_centers',
    label: 'Data centers',
    role: 'Land, buildings and operation of the facilities',
    companies: ['EQIX', 'DLR', 'MSFT', 'AMZN', 'GOOGL', 'META', 'ORCL'],
  },
  {
    id: 'compute',
    label: 'Cloud compute',
    role: 'Selling compute, storage and networking as a service',
    companies: ['AMZN', 'MSFT', 'GOOGL', 'ORCL', 'CRWV'],
  },
  {
    id: 'platform',
    label: 'AI platforms and models',
    role: 'Model access, developer tools and services for building AI applications',
    companies: ['MSFT', 'GOOGL', 'AMZN', 'META'],
  },
  {
    id: 'applications',
    label: 'Enterprise and consumer applications',
    role: 'Software that puts AI in front of users and charges for it',
    companies: ['MSFT', 'GOOGL', 'CRM', 'NOW', 'ADBE', 'META'],
  },
];

/**
 * Where a company operates in the chain, in the company's own product names.
 * `monetization` says how the layer turns into revenue for that company.
 */
export const POSITIONS = {
  MSFT: {
    data_centers: { products: 'Azure data center regions', monetization: 'Owner and operator' },
    semiconductors: {
      products: 'Maia accelerators',
      monetization: 'Custom silicon for its own data centers',
    },
    compute: { products: 'Azure', monetization: 'Consumption of compute, storage and networking' },
    platform: {
      products: 'Azure AI services and developer tools, GitHub',
      monetization: 'Platform consumption and subscriptions',
    },
    applications: {
      products: 'Microsoft 365 Copilot, GitHub Copilot, Dynamics 365',
      monetization: 'Per-seat subscriptions in existing enterprise contracts',
    },
  },
  AMZN: {
    data_centers: { products: 'AWS regions', monetization: 'Owner and operator' },
    semiconductors: {
      products: 'Trainium and Inferentia',
      monetization: 'Custom silicon for its own data centers',
    },
    compute: { products: 'Amazon Web Services', monetization: 'Consumption' },
    platform: { products: 'Amazon Bedrock', monetization: 'Platform consumption' },
  },
  GOOGL: {
    data_centers: { products: 'Google Cloud regions', monetization: 'Owner and operator' },
    semiconductors: { products: 'TPU', monetization: 'Custom silicon for its own data centers' },
    compute: { products: 'Google Cloud', monetization: 'Consumption' },
    platform: { products: 'Gemini models, Vertex AI', monetization: 'Platform consumption' },
    applications: { products: 'Google Workspace', monetization: 'Per-seat subscriptions' },
  },
  META: {
    data_centers: { products: 'Its own data centers', monetization: 'Owner and operator' },
    semiconductors: { products: 'MTIA', monetization: 'Custom silicon for its own data centers' },
    platform: { products: 'Llama models', monetization: 'Indirect, through its own products' },
  },
  ORCL: {
    data_centers: { products: 'Oracle Cloud regions', monetization: 'Owner and operator' },
    compute: { products: 'Oracle Cloud Infrastructure', monetization: 'Consumption' },
  },
};

/** The chain with the subject's positions marked; null when it has none. */
export function valueChainFor(ticker) {
  const t = String(ticker || '').toUpperCase();
  const pos = POSITIONS[t];
  if (!pos) return null;
  return AI_VALUE_CHAIN.map((layer) => ({
    ...layer,
    subject: pos[layer.id] || null,
    others: layer.companies.filter((c) => c !== t),
  }));
}

/** Federal fiscal year of a date (October to September). */
export const federalFy = (d) => {
  const x = new Date(d);
  return x.getUTCMonth() >= 9 ? x.getUTCFullYear() + 1 : x.getUTCFullYear();
};

/**
 * Whether a federal fiscal year's contract records are complete at `now`.
 * The year ends on 30 September, and the Department of Defense publishes
 * contract actions with a 90-day delay, so a year counts as complete from
 * 1 January after it ends.
 */
export function contractYearComplete(fy, now = new Date()) {
  return new Date(now).getTime() >= Date.UTC(Number(fy), 11, 31) + 864e5;
}

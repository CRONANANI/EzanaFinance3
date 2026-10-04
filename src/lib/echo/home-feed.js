/**
 * Ezana Echo home: the feed model behind the bento. Pure (no React, no `@/`
 * imports) so scripts/check-echo-home.mjs can test it under plain Node.
 *
 *   hub card (src/lib/echo-data.js mapCard)  ->  toStory()  ->  story
 *   story[] + filters                        ->  filterStories()
 *   URL query  <->  filters                  ->  parseFilters() / filtersToSearch()
 *
 * Sections are the six article categories (article_category ids, unchanged);
 * regions are the six continents of geo-continents.js, matched through each
 * article's `geos`; ranges are publish-date windows.
 */
import { continentsForGeos } from './geo-continents.js';

export const SECTIONS = [
  { id: 'markets-companies', label: 'Markets & Companies', short: 'Markets' },
  { id: 'politics-policy', label: 'Politics & Policy', short: 'Politics' },
  { id: 'tech-founders', label: 'Tech & Founders', short: 'Tech' },
  { id: 'commodities-energy', label: 'Commodities & Energy', short: 'Commodities' },
  { id: 'crypto', label: 'Crypto', short: 'Crypto' },
  { id: 'global-emerging', label: 'Global & Emerging Markets', short: 'Global' },
];

export const REGIONS = [
  { slug: '', label: 'All regions', continent: null },
  { slug: 'n-america', label: 'N. America', continent: 'North America' },
  { slug: 's-america', label: 'S. America', continent: 'South America' },
  { slug: 'europe', label: 'Europe', continent: 'Europe' },
  { slug: 'africa', label: 'Africa', continent: 'Africa' },
  { slug: 'asia', label: 'Asia', continent: 'Asia' },
  { slug: 'oceania', label: 'Oceania', continent: 'Oceania' },
];

// Default is ALL, not the board's 30D: Echo publishes in batches, and a 30-day
// default would open the grid on one or two stories for most of a month.
export const RANGES = [
  { id: '24h', label: '24H', days: 1, phrase: 'the last 24 hours' },
  { id: '7d', label: '7D', days: 7, phrase: 'the last 7 days' },
  { id: '30d', label: '30D', days: 30, phrase: 'the last 30 days' },
  { id: '90d', label: '90D', days: 90, phrase: 'the last 90 days' },
  { id: '1y', label: '1Y', days: 365, phrase: 'the last year' },
  { id: 'all', label: 'ALL', days: null, phrase: 'all time' },
];

export const DEFAULT_FILTERS = Object.freeze({ section: '', region: '', range: 'all', q: '' });

/* Every Echo article carries a subcategory (one of its category's subs). Hub
   cards come from the DB, which does not store it yet, so this map is the
   authoritative id -> subcategory source; the same value lives on each
   article's source file. It is the tile TAG; without one the tile shows the
   short section name. When adding an article, tag it in BOTH places. */
export const ARTICLE_SUBCATEGORY = {
  'nvidia-worlds-second-most-valuable-asset-2026': 'Equities',
  'private-credit-maturity-wall-2026': 'Credit',
  'fda-peptides-bpc157-compounding-vote-2026': 'Equities',
  'dominating-us-stock-market-sectors-through-the-times': 'Equities',
  'hantavirus-from-four-corners-to-open-sea': 'Equities',
  'ballroom-donors-federal-contracts-2026': 'Congress',
  'trump-portfolio-q1-2026': 'Congress',
  'peter-thiel-worldview-2026': 'Founders',
  'silicon-shield-taiwan-semiconductor-dominance': 'Semiconductors',
  'fiber-optic-cable-ai-boom-benny-fazio': 'Infrastructure',
  'acquirers-buy-the-pipeline-not-the-model-2026': 'AI',
  'critical-minerals-reserve-concentration-2026': 'Critical Minerals',
  'best-performing-commodities-iran-war-2026': 'Oil & Gas',
  'africa-refining-capacity-dangote-inflection-2026': 'Oil & Gas',
  'africa-billion-dollar-companies-2026': 'Africa',
  'johnny-mnemonic-tech-consolidation-2026': 'AI',
  'tokenization-collateral-2026': 'DeFi',
  'bitcoin-institutional-holders-13f-2026': 'Bitcoin',
  'stablecoin-settlement-layer-2026': 'Stablecoins',
  'crypto-legislation-prediction-markets-2026': 'Regulation',
  'gulf-sovereign-funds-us-equities-2026': 'Sovereign Funds',
  'yen-carry-trade-unwind-2026': 'Asia',
  'latam-capital-markets-after-the-cows-2026': 'LatAm',
  'midterm-trade-2026': 'Elections',
  'tariff-winners-contract-losers-2026': 'Trade Policy',
  'central-bank-gold-cycle-2026': 'Metals',
  'datacenter-power-crunch-2026': 'Renewables',
  'sovereign-wealth-league-table-2026': 'Sovereign Funds',
  // empire-rankings-1500-2026 is deliberately absent: no Global & Emerging
  // sub fits a country-power framework piece; its tile shows GLOBAL.
};

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAY_MS = 86400000;

export const sectionById = (id) => SECTIONS.find((s) => s.id === id) || null;

/** 'AUG 11' from an ISO timestamp, in UTC so the label never shifts a day. */
export function shortDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, '0')}`;
}

/** 'ARTICLE OF THE MONTH · AUGUST 2026' from AOTM_HISTORY's 'August 2026'. */
export function monthKicker(month) {
  return month ? `ARTICLE OF THE MONTH · ${String(month).toUpperCase()}` : 'ARTICLE OF THE MONTH';
}

/** The image a card can show: the hero image, else the cover. */
export function cardImage(card) {
  return card?.heroImage?.src || card?.coverImage || null;
}

/** Hub card -> the story shape the packer and tiles read. */
export function toStory(card) {
  const section = sectionById(card.category);
  const tag = card.subcategory || ARTICLE_SUBCATEGORY[card.id] || section?.short || '';
  return {
    id: card.id,
    title: card.title || '',
    dek: card.excerpt || '',
    tag,
    section: card.category,
    date: shortDate(card.publishedAt),
    mins: card.readTime || 1,
    image: cardImage(card),
    imageAlt: card.heroImage?.alt || '',
    href: `/ezana-echo/${card.id}`,
    publishedAt: card.publishedAt || null,
    geos: Array.isArray(card.geos) ? card.geos : [],
    views: card.views || 0,
    searchText: [card.title, card.excerpt, tag, ...(card.tickers || []), ...(card.tags || [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase(),
  };
}

/** Bento filters: section AND region AND range AND search text. */
export function filterStories(stories, filters = DEFAULT_FILTERS, now = Date.now()) {
  const f = { ...DEFAULT_FILTERS, ...filters };
  const continent = REGIONS.find((r) => r.slug === f.region)?.continent || null;
  const days = RANGES.find((r) => r.id === f.range)?.days || null;
  const terms = String(f.q || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  return stories.filter((s) => {
    if (f.section && s.section !== f.section) return false;
    if (continent && !continentsForGeos(s.geos).has(continent)) return false;
    if (days && s.publishedAt) {
      const t = new Date(s.publishedAt).getTime();
      if (!Number.isNaN(t) && now - t > days * DAY_MS) return false;
    }
    if (terms.length && !terms.every((t) => (s.searchText || '').includes(t))) return false;
    return true;
  });
}

/** URLSearchParams (or a plain object) -> validated filters. */
export function parseFilters(params) {
  const get = (k) =>
    (params && typeof params.get === 'function' ? params.get(k) : params?.[k]) || '';
  const section = get('section');
  const region = get('region');
  const range = get('range');
  return {
    section: SECTIONS.some((s) => s.id === section) ? section : '',
    region: REGIONS.some((r) => r.slug && r.slug === region) ? region : '',
    range: RANGES.some((r) => r.id === range) ? range : DEFAULT_FILTERS.range,
    q: get('q').slice(0, 80),
  };
}

/** Filters -> '?section=…&region=…' with defaults omitted ('' when all default). */
export function filtersToSearch(filters) {
  const p = new URLSearchParams();
  if (filters.section) p.set('section', filters.section);
  if (filters.region) p.set('region', filters.region);
  if (filters.range && filters.range !== DEFAULT_FILTERS.range) p.set('range', filters.range);
  if (filters.q && filters.q.trim()) p.set('q', filters.q.trim());
  const s = p.toString();
  return s ? `?${s}` : '';
}

export function isDefaultFilters(filters) {
  return filtersToSearch(filters) === '';
}

/** The empty-filter line. */
export function emptyMessage(filters) {
  const f = { ...DEFAULT_FILTERS, ...filters };
  const section = sectionById(f.section)?.label || 'any section';
  const region = REGIONS.find((r) => r.slug === f.region && r.slug)?.label || 'any region';
  const range = RANGES.find((r) => r.id === f.range)?.phrase || 'all time';
  const q = f.q && f.q.trim() ? ` matching "${f.q.trim()}"` : '';
  const tail = f.range === 'all' ? '' : ' Try a wider range.';
  return `No stories${q} in ${section} in ${region} for ${range}.${tail}`;
}

/** Top N by cumulative views; zero-view stories never rank. */
export function mostRead(stories, n = 5) {
  return [...stories]
    .filter((s) => (s.views || 0) > 0)
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, n);
}

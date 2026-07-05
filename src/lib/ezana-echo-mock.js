/**
 * Ezana Echo — article hub data (restored from pre-dashboard Echo + ongoing catalog).
 * Featured / sections / latest feed all read from this single ARTICLES array.
 *
 * Article content can use either:
 *   - A legacy array of plain-text paragraph strings
 *   - contentBlocks: [Block]       (rich, supports headings, charts, callouts, quotes)
 *
 * Block types supported by EchoArticleClient:
 *   - paragraph  → <p>
 *   - heading    → <h2> or <h3> based on level
 *   - callout    → labeled statistic card
 *   - stat-grid  → row of statistic tiles
 *   - chart      → inline SVG chart
 *   - quote      → pull quote with source
 *
 * The renderer prefers contentBlocks when present, falling back to
 * legacy paragraph strings so all existing articles continue to render unchanged.
 *
 * Long-form rich article: best-performing-commodities-iran-war-2026
 * (see ./ezana-echo-article-iran-commodities-2026.js)
 */

import { africaBillionCompaniesArticle } from './ezana-echo-article-africa-billion-companies.js';
import { nvidiaSecondMostValuableArticle } from './ezana-echo-article-nvidia-most-valuable.js';
import { iranWarCommoditiesArticle2026 } from './ezana-echo-article-iran-commodities-2026.js';
import { sectorDominanceArticle } from './ezana-echo-article-sector-dominance.js';
import { fiberOpticArticle } from './ezana-echo-article-fiber-optic.js';
import { hantavirusArticle } from './ezana-echo-article-hantavirus.js';
import { semiconductorArticle } from './ezana-echo-article-semiconductors.js';
import { trumpPortfolio2026 } from './ezana-echo-article-trump-portfolio-2026.js';
import { peterThiel2026 } from './ezana-echo-article-peter-thiel-2026.js';
import { privateCreditMaturityWallArticle2026 } from './ezana-echo-article-private-credit-maturity-wall-2026.js';
import { criticalMineralsArticle2026 } from './ezana-echo-article-critical-minerals-2026.js';

const ARTICLES = [
  criticalMineralsArticle2026,
  peterThiel2026,
  trumpPortfolio2026,
  nvidiaSecondMostValuableArticle,
  sectorDominanceArticle,
  iranWarCommoditiesArticle2026,
  africaBillionCompaniesArticle,
  fiberOpticArticle,
  hantavirusArticle,
  semiconductorArticle,
  privateCreditMaturityWallArticle2026,
];

export const ECHO_TRENDING = {
  mostRead: [
    {
      title: 'Who Controls the World’s Critical Minerals',
      reads: 7300,
      id: 'critical-minerals-reserve-concentration-2026',
    },
    {
      title: "Peter Thiel's Worldview, Decoded",
      reads: 11200,
      id: 'peter-thiel-worldview-2026',
    },
    {
      title: "Inside Trump's Q1 2026 Trading Blitz",
      reads: 9800,
      id: 'trump-portfolio-q1-2026',
    },
    {
      title: "Nvidia Is the World's Second Most Valuable Asset",
      reads: 15200,
      id: 'nvidia-worlds-second-most-valuable-asset-2026',
    },
    {
      title: "Tech Reigns, But Falls Short of History's Heavyweights",
      reads: 12400,
      id: 'dominating-us-stock-market-sectors-through-the-times',
    },
    {
      title: 'Fiber Optic Cable: Alotta Money In This Stuff',
      reads: 5840,
      id: 'fiber-optic-cable-ai-boom-benny-fazio',
    },
    {
      title: 'Best Performing Commodities During the Iran Conflict',
      reads: 8900,
      id: 'best-performing-commodities-iran-war-2026',
    },
    {
      title: 'Africa Has at Least 345 Companies with Revenues of $1B or More',
      reads: 4200,
      id: 'africa-billion-dollar-companies-2026',
    },
  ],
  mostDiscussed: [
    {
      title: 'Fiber Optic Cable: Alotta Money In This Stuff',
      comments: 64,
      id: 'fiber-optic-cable-ai-boom-benny-fazio',
    },
    {
      title: "Tech Reigns, But Falls Short of History's Heavyweights",
      comments: 42,
      id: 'dominating-us-stock-market-sectors-through-the-times',
    },
  ],
  bookmarks: [
    {
      title: "Nvidia Is the World's Second Most Valuable Asset",
      id: 'nvidia-worlds-second-most-valuable-asset-2026',
    },
    {
      title: 'Best Performing Commodities During the Iran Conflict',
      id: 'best-performing-commodities-iran-war-2026',
    },
    {
      title: 'Fiber Optic Cable: Alotta Money In This Stuff',
      id: 'fiber-optic-cable-ai-boom-benny-fazio',
    },
  ],
};

/** @type {Record<string, { id: string; author: { name: string; initials: string; id?: string }; content: string; createdAt: string }[]>} */
export const ECHO_MOCK_COMMENTS_BY_ARTICLE = {
  'critical-minerals-reserve-concentration-2026': [
    {
      id: 'c-minerals-1',
      author: { name: 'Ingrid Solberg', initials: 'IS' },
      content:
        'The reserves-vs-resources distinction up front is what most of these pieces skip. Concentration of *reserves* is the number that actually binds supply, and 83% PGMs in one country is genuinely shocking laid out this way.',
      createdAt: '2026-07-05T13:10:00Z',
    },
    {
      id: 'c-minerals-2',
      author: { name: 'Rafael Mendes', initials: 'RM' },
      content:
        'Glad the rare-earths number is the USGS ~48% and not the 52% infographic everyone keeps reposting. The point that reserves understate China because processing is the real lever is the whole ballgame.',
      createdAt: '2026-07-05T15:35:00Z',
    },
    {
      id: 'c-minerals-3',
      author: { name: 'Wei Tan', initials: 'WT' },
      content:
        'The battery-metals chart makes the additive-not-interchangeable argument better than any paragraph could. You are exposed to DRC, Indonesia, Chile, and China all at once, and you cannot substitute your way out.',
      createdAt: '2026-07-05T18:02:00Z',
    },
  ],
  'peter-thiel-worldview-2026': [
    {
      id: 'c-thiel-1',
      author: { name: 'Elena Vasquez', initials: 'EV' },
      content:
        'Appreciate that this quotes the 2009 essay directly instead of paraphrasing it. The "freedom and democracy" line lands very differently in his own words.',
      createdAt: '2026-06-21T11:15:00Z',
    },
    {
      id: 'c-thiel-2',
      author: { name: 'Tobias Lindqvist', initials: 'TL' },
      content:
        'The "warns of surveillance, builds surveillance" tension is the whole story. PLTR is up on every defense headline and this explains why better than any sell-side note.',
      createdAt: '2026-06-21T14:40:00Z',
    },
    {
      id: 'c-thiel-3',
      author: { name: 'Maya Okonkwo', initials: 'MO' },
      content:
        'Glad the chart is labeled as a share of the named set and not the full roster. Too many writeups would have faked a clean percentage there.',
      createdAt: '2026-06-21T17:05:00Z',
    },
  ],
  'trump-portfolio-q1-2026': [
    {
      id: 'c-trump-1',
      author: { name: 'Dana Whitfield', initials: 'DW' },
      content:
        'The ranges-not-weights point is the part everyone misses. Good to see it called out instead of slapping fake percentages on a pie chart.',
      createdAt: '2026-06-20T13:30:00Z',
    },
    {
      id: 'c-trump-2',
      author: { name: 'Andre Kessler', initials: 'AK' },
      content:
        'Would love a saved screen for the AI-chip basket mentioned here — NVDA/AMD/AVGO/INTC/MU/TXN. The disclosure-lag framing is exactly right.',
      createdAt: '2026-06-20T16:05:00Z',
    },
  ],
  'dominating-us-stock-market-sectors-through-the-times': [
    {
      id: 'c-sector-1',
      author: { name: 'Morgan Ellis', initials: 'ME' },
      content: 'The finance era dominance at 90% is staggering — great visualization.',
      createdAt: '2026-04-20T12:00:00Z',
    },
  ],
  'fiber-optic-cable-ai-boom-benny-fazio': [
    {
      id: 'c-fiber-1',
      author: { name: 'David Kim', initials: 'DK' },
      content:
        'The Benny Fazio opening is legendary. Also, MCF at 4x density is a bigger deal than people realize.',
      createdAt: '2026-05-02T14:00:00Z',
    },
    {
      id: 'c-fiber-2',
      author: { name: 'Lisa Park', initials: 'LP' },
      content:
        "That interactive map is incredible — clicked through every company. Corning profile card is chef's kiss.",
      createdAt: '2026-05-02T16:20:00Z',
    },
  ],
  'best-performing-commodities-iran-war-2026': [
    {
      id: 'c-iran-1',
      author: { name: 'Jordan R.', initials: 'JR' },
      content:
        'Oil price projections seem conservative given the escalation timeline. Great data though.',
      createdAt: '2026-04-15T18:00:00Z',
    },
  ],
  'nvidia-worlds-second-most-valuable-asset-2026': [
    {
      id: 'c-nvda-val-1',
      author: { name: 'Marcus Chen', initials: 'MC' },
      content:
        'The NVDA/GLD ratio as a trade expression is brilliant. Long intelligence, short inertia.',
      createdAt: '2026-05-19T10:00:00Z',
    },
    {
      id: 'c-nvda-val-2',
      author: { name: 'Priya Sharma', initials: 'PS' },
      content:
        'Aramco dropping from #1 to #10 in five years is the single most important chart in macro right now.',
      createdAt: '2026-05-19T12:30:00Z',
    },
    {
      id: 'c-nvda-val-3',
      author: { name: 'David Oyelaran', initials: 'DO' },
      content: 'The $26B R&D spend exceeding AMD entire revenue — that is the moat in one number.',
      createdAt: '2026-05-19T15:45:00Z',
    },
  ],
  'africa-billion-dollar-companies-2026': [
    {
      id: 'c-africa-1',
      author: { name: 'Nneka Okafor', initials: 'NO' },
      content:
        'The 54 foreign-HQ companies stat is the most important number here. That is value extraction in real time.',
      createdAt: '2026-05-19T14:00:00Z',
    },
    {
      id: 'c-africa-2',
      author: { name: 'James Mensah', initials: 'JM' },
      content:
        'Mauritius with 3 companies at 1.3M population is wild. Financial hub effects are real.',
      createdAt: '2026-05-19T16:30:00Z',
    },
  ],
};

export function getAllArticles() {
  return ARTICLES;
}

export function getArticleById(id) {
  return ARTICLES.find((a) => a.id === id) ?? null;
}

export function getFeaturedArticle() {
  return ARTICLES.find((a) => a.featured) ?? ARTICLES[0];
}

export function getArticlesByCategory(category) {
  if (category === 'markets')
    return ARTICLES.filter((a) => a.category === 'markets' && !a.featured);
  if (category === 'companies') return ARTICLES.filter((a) => a.category === 'companies');
  if (category === 'policy') return ARTICLES.filter((a) => a.category === 'policy');
  if (category === 'crypto') return ARTICLES.filter((a) => a.category === 'crypto');
  return [];
}

export function getArticleListForSection(section) {
  const map = {
    marketAnalysis: 'markets',
    companySpotlights: 'companies',
    politicalPolicy: 'policy',
  };
  const cat = map[section];
  return getArticlesByCategory(cat).slice(0, 3);
}

export function getRelatedArticles(category, excludeId, limit = 3) {
  return ARTICLES.filter((a) => a.category === category && a.id !== excludeId).slice(0, limit);
}

export function formatPublishedDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatPublishedShort(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

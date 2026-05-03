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

import { iranWarCommoditiesArticle2026 } from './ezana-echo-article-iran-commodities-2026.js';
import { sectorDominanceArticle } from './ezana-echo-article-sector-dominance.js';
import { fiberOpticArticle } from './ezana-echo-article-fiber-optic.js';

const ARTICLES = [
  sectorDominanceArticle,
  iranWarCommoditiesArticle2026,
  fiberOpticArticle,
];

export const ECHO_TRENDING = {
  mostRead: [
    { title: "Tech Reigns, But Falls Short of History's Heavyweights", reads: 12400, id: 'dominating-us-stock-market-sectors-through-the-times' },
    { title: 'Fiber Optic Cable: Alotta Money In This Stuff', reads: 5840, id: 'fiber-optic-cable-ai-boom-benny-fazio' },
    { title: 'Best Performing Commodities During the Iran Conflict', reads: 8900, id: 'best-performing-commodities-iran-war-2026' },
  ],
  mostDiscussed: [
    { title: 'Fiber Optic Cable: Alotta Money In This Stuff', comments: 64, id: 'fiber-optic-cable-ai-boom-benny-fazio' },
    { title: "Tech Reigns, But Falls Short of History's Heavyweights", comments: 42, id: 'dominating-us-stock-market-sectors-through-the-times' },
  ],
  bookmarks: [
    { title: 'Best Performing Commodities During the Iran Conflict', id: 'best-performing-commodities-iran-war-2026' },
    { title: 'Fiber Optic Cable: Alotta Money In This Stuff', id: 'fiber-optic-cable-ai-boom-benny-fazio' },
  ],
};

/** @type {Record<string, { id: string; author: { name: string; initials: string; id?: string }; content: string; createdAt: string }[]>} */
export const ECHO_MOCK_COMMENTS_BY_ARTICLE = {
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
      content: 'The Benny Fazio opening is legendary. Also, MCF at 4x density is a bigger deal than people realize.',
      createdAt: '2026-05-02T14:00:00Z',
    },
    {
      id: 'c-fiber-2',
      author: { name: 'Lisa Park', initials: 'LP' },
      content: "That interactive map is incredible — clicked through every company. Corning profile card is chef's kiss.",
      createdAt: '2026-05-02T16:20:00Z',
    },
  ],
  'best-performing-commodities-iran-war-2026': [
    {
      id: 'c-iran-1',
      author: { name: 'Jordan R.', initials: 'JR' },
      content: 'Oil price projections seem conservative given the escalation timeline. Great data though.',
      createdAt: '2026-04-15T18:00:00Z',
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
  if (category === 'markets') return ARTICLES.filter((a) => a.category === 'markets' && !a.featured);
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

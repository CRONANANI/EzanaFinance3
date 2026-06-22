import { CURATED_SLUGS } from '@/lib/echo/curated-seed';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ezana.world';

/**
 * XML sitemap. Enumerates the curated Ezana Echo articles (the editorial
 * catalog) plus core pages so crawlers can discover article URLs even though
 * the Echo index is client-rendered.
 */
export default function sitemap() {
  const now = new Date();

  const core = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/ezana-echo`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/pricing`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
  ];

  const articles = CURATED_SLUGS.map((slug) => ({
    url: `${SITE_URL}/ezana-echo/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  return [...core, ...articles];
}

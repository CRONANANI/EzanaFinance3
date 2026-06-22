import { getPublishedArticles } from '@/lib/echo-data';
import { getArchivedArticleIds } from '@/lib/echo-article-status';
import { CURATED_SLUGS } from '@/lib/echo/curated-seed';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ezana.world';

// Regenerate hourly so newly published (or archived) articles propagate to the
// sitemap without a redeploy.
export const revalidate = 3600;

function entry(url, lastModified, priority, changeFrequency = 'weekly') {
  return { url, lastModified, changeFrequency, priority };
}

/**
 * XML sitemap.
 *
 * Article URLs are derived from what is actually PUBLISHED in the data layer
 * (the same source the reader uses) and filtered to exclude archived pieces, so
 * the sitemap can never drift from the live catalog the way a hand-maintained
 * list does. If the database is unavailable (e.g. at build time with no
 * credentials), it falls back to the static curated registry, which already
 * enumerates every curated article.
 */
export default async function sitemap() {
  const now = new Date();

  const core = [
    entry(`${SITE_URL}/`, now, 1, 'weekly'),
    entry(`${SITE_URL}/ezana-echo`, now, 0.9, 'daily'),
    entry(`${SITE_URL}/pricing`, now, 0.6, 'monthly'),
  ];

  let articleEntries = [];
  try {
    const [published, archivedRows] = await Promise.all([
      getPublishedArticles(),
      getArchivedArticleIds().catch(() => []),
    ]);
    const archived = new Set((archivedRows || []).map((r) => r.article_id));
    const live = (published || []).filter((a) => a.slug && !archived.has(a.slug));
    articleEntries = live.map((a) =>
      entry(`${SITE_URL}/ezana-echo/${a.slug}`, a.publishedAt ? new Date(a.publishedAt) : now, 0.8),
    );
  } catch {
    articleEntries = [];
  }

  // Build-time / DB-unavailable fallback: the curated module registry, which
  // includes every curated article id.
  if (articleEntries.length === 0) {
    articleEntries = CURATED_SLUGS.map((slug) => entry(`${SITE_URL}/ezana-echo/${slug}`, now, 0.8));
  }

  return [...core, ...articleEntries];
}

import { getPublishedArticles } from '@/lib/echo-data';
import { getArchivedArticleIds } from '@/lib/echo-article-status';
import { PUBLISHED_CURATED_SLUGS } from '@/lib/echo/curated-seed';
import {
  USER_CATEGORIES,
  USER_ARTICLES,
  PARTNER_CATEGORIES,
  PARTNER_ARTICLES,
} from '@/lib/help-center-content';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://ezana.world';

// Regenerate hourly so newly published (or archived) articles propagate to the
// sitemap without a redeploy.
export const revalidate = 3600;

function entry(url, lastModified, priority, changeFrequency = 'weekly') {
  return { url, lastModified, changeFrequency, priority };
}

/* Public dataset pages. Keep in step with COMING_SOON_ROUTES in
   ./datasets/layout.js: a gated route renders a placeholder, and a placeholder
   in the sitemap is a thin page Google will index and then hold against us.
   (sec-filings, institutional, activist, whale-moves are gated today.) */
const DATASET_PATHS = [
  '/datasets',
  '/datasets/politician-tracker',
  '/datasets/government',
  '/datasets/government/contracts',
  '/datasets/government/lobbying',
  '/datasets/political',
  '/datasets/campaignfinancerecords',
  '/datasets/committees',
  '/datasets/insider',
  '/datasets/executive-compensation',
  '/datasets/etf-holdings',
  '/datasets/institutional',
  '/datasets/activist',
  '/datasets/whale-moves',
  '/datasets/sec-filings',
  '/datasets/prediction-markets',
  '/datasets/markets',
  '/datasets/global',
  '/datasets/oecd-macro',
  '/datasets/alternative',
];

/* Marketing + legal pages that exist as routes and are reachable signed out. */
const STATIC_PATHS = [
  ['/ezana-api', 0.7, 'monthly'],
  ['/brokerages-integrations', 0.6, 'monthly'],
  ['/help-center', 0.6, 'weekly'],
  ['/help-center/user', 0.6, 'weekly'],
  ['/help-center/partner', 0.5, 'weekly'],
  ['/accessibility', 0.2, 'yearly'],
  ['/privacy-policy', 0.2, 'yearly'],
  ['/terms-of-service', 0.2, 'yearly'],
];

/* Help-centre URLs are derived from the content module the pages render, so
   an article added there is in the sitemap on the next hourly regeneration. */
function helpEntries(base, categories, articles, now) {
  const cats = categories.map((c) =>
    entry(`${SITE_URL}${base}/category/${c.id}`, now, 0.4, 'monthly'),
  );
  const arts = Object.keys(articles).map((slug) =>
    entry(`${SITE_URL}${base}/article/${slug}`, now, 0.4, 'monthly'),
  );
  return [...cats, ...arts];
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
    ...DATASET_PATHS.map((p, i) =>
      entry(`${SITE_URL}${p}`, now, i < 2 ? 0.9 : 0.7, i < 2 ? 'daily' : 'weekly'),
    ),
    ...STATIC_PATHS.map(([p, pri, freq]) => entry(`${SITE_URL}${p}`, now, pri, freq)),
    ...helpEntries('/help-center/user', USER_CATEGORIES, USER_ARTICLES, now),
    ...helpEntries('/help-center/partner', PARTNER_CATEGORIES, PARTNER_ARTICLES, now),
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

  // Build-time / DB-unavailable fallback: the curated module registry,
  // filtered to published modules so drafts never leak into the sitemap.
  if (articleEntries.length === 0) {
    articleEntries = PUBLISHED_CURATED_SLUGS.map((slug) =>
      entry(`${SITE_URL}/ezana-echo/${slug}`, now, 0.8),
    );
  }

  return [...core, ...articleEntries];
}

/**
 * The Echo home's data, server side and cached. One read of the published
 * cards and the Chart of the Week, trimmed to the fields the home reads and
 * cleaned of local images that are not in public/ (build-time manifest), held
 * in the data cache for five minutes and busted by revalidateTag(ECHO_HUB_TAG)
 * on reseed, archive / republish and article writes. View counts on the home
 * may be up to five minutes stale.
 */
import { unstable_cache } from 'next/cache';
import { getHubData, getChartOfTheWeek } from '@/lib/echo-data';
import { getArchivedArticleIds } from '@/lib/echo-article-status';
import PUBLIC_IMAGES from '@/lib/echo/public-images.json';

export const ECHO_HUB_TAG = 'echo-hub';

const present = new Set(PUBLIC_IMAGES);
/** A local image that is not in public/ becomes null, so the packer lays out a
 *  text tile instead of an empty picture box. Remote URLs pass through. */
const keep = (src) =>
  typeof src === 'string' && src && (!src.startsWith('/') || present.has(src)) ? src : null;

/** Only the fields the Echo home (toStory, hero pick, filters, search) reads. */
function slim(card) {
  const heroSrc = keep(card.heroImage?.src);
  return {
    id: card.id,
    title: card.title,
    excerpt: card.excerpt,
    category: card.category,
    subcategory: card.subcategory || null,
    readTime: card.readTime,
    publishedAt: card.publishedAt,
    views: card.views,
    geos: card.geos,
    tags: card.tags,
    tickers: card.tickers,
    featured: card.featured,
    articleOfMonth: card.articleOfMonth || null,
    heroImage: heroSrc
      ? { src: heroSrc, alt: card.heroImage?.alt || '', position: card.heroImage?.position || null }
      : null,
    coverImage: keep(card.coverImage),
  };
}

/** Published, non-archived cards plus the Chart of the Week. */
export const getEchoHubCached = unstable_cache(
  async () => {
    const [{ articles }, chart, archived] = await Promise.all([
      getHubData(),
      getChartOfTheWeek().catch(() => null),
      getArchivedArticleIds().catch(() => []),
    ]);
    const archivedIds = new Set((archived || []).map((a) => a.article_id));
    return {
      articles: articles.filter((a) => !archivedIds.has(a.id)).map(slim),
      chart: chart && !archivedIds.has(chart.slug) ? chart : null,
    };
  },
  ['echo-hub-v1'],
  { revalidate: 300, tags: [ECHO_HUB_TAG] },
);

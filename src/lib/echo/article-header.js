/**
 * Ezana Echo article header data (Nov 19th, 2026 redesign): the image, the
 * eyebrow and the Story Snapshot for the top of every article page, derived
 * from data the article already carries. Nothing here introduces a new
 * dataset; it only picks from the article module / DB row.
 *
 * Image: the article header shows EXACTLY the image the Echo home shows for
 * the same story. The home builds it in two steps, and this file runs the
 * same two steps on the article:
 *   1. hub-cache.js `slim`: the article's heroImage.src (else coverImage),
 *      dropped when it is a local path that is not in public/.
 *   2. home-card-images.js `withHomeImage`: an uploaded
 *      public/images/ezana-echo/<slug>-card.<ext> overrides it, with that
 *      entry's alt and crop position.
 * Because step 2 is the very same function the home calls, a card image
 * override (for example the NYSE photograph on the tokenized-money article)
 * reaches the article header automatically.
 */
import PUBLIC_IMAGES from '@/lib/echo/public-images.json';
import { withHomeImage } from '@/lib/echo/home-card-images';
import { ARTICLE_SUBCATEGORY, sectionById } from '@/lib/echo/home-feed';

const present = new Set(PUBLIC_IMAGES);
/* Same rule as hub-cache.js: a local image missing from public/ becomes null,
   remote URLs pass through. */
const keep = (src) =>
  typeof src === 'string' && src && (!src.startsWith('/') || present.has(src)) ? src : null;
const POSITION = /^\d{1,3}% \d{1,3}%$/;

const slugOf = (article) => article?.slug || article?.id || '';

/** { src, alt, position } for the header image, or null for a text-only header. */
export function articleHeaderImage(article) {
  if (!article) return null;
  const heroSrc = keep(article.heroImage?.src);
  const story = withHomeImage({
    id: slugOf(article),
    image: heroSrc || keep(article.coverImage),
    imageAlt: article.heroImage?.alt || '',
    imagePosition:
      heroSrc && POSITION.test(article.heroImage?.position || '')
        ? article.heroImage.position
        : null,
  });
  if (!story?.image) return null;
  return {
    src: story.image,
    alt: story.imageAlt || article.heroImage?.alt || article.title || '',
    position: story.imagePosition || null,
  };
}

const titleCase = (s) =>
  String(s || '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());

/** Eyebrow parts: { primary: section name, secondary: subcategory or null }. */
export function articleEyebrow(article) {
  const section = sectionById(article?.category);
  const primary = section?.short || titleCase(article?.category || 'markets');
  const sub = article?.subcategory || ARTICLE_SUBCATEGORY[slugOf(article)] || null;
  const secondary = sub && sub.toLowerCase() !== primary.toLowerCase() ? sub : null;
  return { primary, secondary };
}

/* The stat grid sits right after the opening paragraph by protocol; one found
   deeper than this is a mid-article figure and stays where it is. */
const SNAPSHOT_MAX_INDEX = 6;

/**
 * The article's own key stats for the Story Snapshot. Returns the index of the
 * stat-grid block it came from, so the body can skip that block and the
 * article keeps exactly one authoritative stat grid. { index: -1 } when the
 * article has none near the top.
 */
export function articleSnapshot(blocks) {
  if (!Array.isArray(blocks)) return { index: -1, stats: [] };
  const index = blocks.findIndex(
    (b) => b?.type === 'stat-grid' && Array.isArray(b.stats) && b.stats.length > 0,
  );
  if (index < 0 || index > SNAPSHOT_MAX_INDEX) return { index: -1, stats: [] };
  return { index, stats: blocks[index].stats.slice(0, 4) };
}

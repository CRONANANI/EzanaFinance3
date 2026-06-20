/**
 * Server-only seed source for the curated Echo editorial catalog.
 *
 * The curated articles ship as plain, JSON-serializable modules. This module
 * imports them ONCE to populate the database; the reader never imports them —
 * it reads exclusively from public.echo_articles. Seeding is idempotent
 * (upsert on article_slug) and guarded so it runs at most once per process.
 *
 * Server-only: depends on the service-role admin client.
 */
import { africaBillionCompaniesArticle } from '@/lib/ezana-echo-article-africa-billion-companies.js';
import { nvidiaSecondMostValuableArticle } from '@/lib/ezana-echo-article-nvidia-most-valuable.js';
import { iranWarCommoditiesArticle2026 } from '@/lib/ezana-echo-article-iran-commodities-2026.js';
import { sectorDominanceArticle } from '@/lib/ezana-echo-article-sector-dominance.js';
import { fiberOpticArticle } from '@/lib/ezana-echo-article-fiber-optic.js';
import { hantavirusArticle } from '@/lib/ezana-echo-article-hantavirus.js';
import { semiconductorArticle } from '@/lib/ezana-echo-article-semiconductors.js';

const SOURCE = [
  nvidiaSecondMostValuableArticle,
  sectorDominanceArticle,
  iranWarCommoditiesArticle2026,
  africaBillionCompaniesArticle,
  fiberOpticArticle,
  hantavirusArticle,
  semiconductorArticle,
];

// Seeded read counts for the curated set (so the trending widget has signal).
const SEED_READS = {
  'nvidia-worlds-second-most-valuable-asset-2026': 15200,
  'dominating-us-stock-market-sectors-through-the-times': 12400,
  'fiber-optic-cable-ai-boom-benny-fazio': 5840,
  'best-performing-commodities-iran-war-2026': 8900,
  'africa-billion-dollar-companies-2026': 4200,
};

function stripKw(s) {
  return String(s || '')
    .replace(/\[\[kw:[^\]]+\]\]/g, '')
    .replace(/\[\[\/kw\]\]/g, '');
}

// Plaintext body from blocks/paragraphs — satisfies NOT NULL + powers search.
function plainBody(a) {
  const parts = [];
  if (Array.isArray(a.contentBlocks)) {
    for (const b of a.contentBlocks) {
      if (b?.type === 'paragraph' || b?.type === 'heading' || b?.type === 'quote') {
        if (b.text) parts.push(stripKw(b.text));
      }
    }
  }
  if (Array.isArray(a.contentParagraphs)) parts.push(...a.contentParagraphs.map(stripKw));
  return parts.join('\n\n').trim() || stripKw(a.excerpt) || a.title;
}

export const CURATED_SLUGS = SOURCE.map((a) => a.id);

function toRow(a) {
  return {
    article_slug: a.id,
    article_title: a.title,
    article_excerpt: a.excerpt,
    article_body: plainBody(a),
    article_category: a.category || 'markets',
    content_blocks: a.contentBlocks || null,
    content_paragraphs: a.contentParagraphs || null,
    hero_image: a.heroImage || null,
    tags: a.tags || null,
    tickers: a.tickers || null,
    author_name: a.author || 'Ezana Finance Editorial',
    author_id: null,
    is_featured: !!a.featured,
    article_status: 'published',
    read_time_minutes: Number.isFinite(a.readTime) ? a.readTime : 1,
    view_count: SEED_READS[a.id] || 0,
    like_count: 0,
    published_at: a.publishedAt || new Date().toISOString(),
  };
}

let seedPromise = null;

/**
 * Ensure the curated catalog exists in the DB. Idempotent and cached per
 * process. Never throws — a failed seed must not break the reader.
 */
export function ensureCuratedSeeded(admin) {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    try {
      const { count } = await admin
        .from('echo_articles')
        .select('id', { count: 'exact', head: true })
        .in('article_slug', CURATED_SLUGS);
      if ((count ?? 0) >= CURATED_SLUGS.length) return;

      const rows = SOURCE.map(toRow);
      const { error } = await admin
        .from('echo_articles')
        .upsert(rows, { onConflict: 'article_slug' });
      if (error) console.error('[echo] curated seed upsert failed:', error.message);
    } catch (e) {
      console.error('[echo] curated seed error:', e?.message || e);
      // allow a retry on a later request
      seedPromise = null;
    }
  })();
  return seedPromise;
}
